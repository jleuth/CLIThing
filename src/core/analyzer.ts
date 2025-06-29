import * as fs from 'fs';
import * as path from 'path';
import { Agent, run, tool, AgentInputItem, system } from '@openai/agents';
import * as readline from 'readline'
import { z } from 'zod'
import { config } from "dotenv"
import chalk from 'chalk';
import { useInput } from 'ink';
config()

export interface ChatMessage{
    text: string
    type: 'assistant' | 'tool'
}

export default class AnalyzerSession {
    private history: AgentInputItem[] = [];
    private running = false;
    private agent!: Agent;
    private context: { dir: string; files: string[] };
    private dir: string;
    private toolMessages: string[] = []
    private systemPrompt!: string
    private tools: any[] = []
    private model!: string

    constructor(dir: string, model = "gpt-4.1-mini") {
        this.dir = dir;
        const files = fs.readdirSync(this.dir);
        const systemPrompt = fs.readFileSync(`${this.dir}/PROMPT.txt`).toString();
        this.systemPrompt = systemPrompt;
        this.context = { dir: this.dir, files };

        const getAllFiles = (directory: string, base = directory): string[] => {
            const entries = fs.readdirSync(directory, { withFileTypes: true });
            let results: string[] = [];

            // Directories to ignore
            const ignoreDirs = [
                'node_modules', '.next', '.git', 'dist', 'build', 
                '.cache', '.parcel-cache', '.turbo', 'coverage',
                '.nyc_output', '.vscode', '.idea', 'target',
                'bin', 'obj', '.vs', '__pycache__', '.pytest_cache'
            ];

            for (const entry of entries) {
                const full = path.join(directory, entry.name);
                if (entry.isDirectory()) {
                    // Skip ignored directories
                    if (!ignoreDirs.includes(entry.name)) {
                        results = results.concat(getAllFiles(full, base));
                    }
                } else {
                    results.push(path.relative(base, full));
                }
            }
            return results;
        };

        const listFiles = tool({
            name: 'list_files',
            description: "List all the files in a certain directory",
            parameters: z.object({ dir: z.string() }),
            execute: async ({ dir }) => {
                const items = fs.readdirSync(dir).join('\n');
                this.toolMessages.push(`CLIThing read directory ${dir}`)
                return items;
            }
        });

        const listAllFiles = tool({
            name: "list_all_files",
            description: "Recursively list all files in every subdirectory of the current working directory",
            parameters: z.object({}),
            execute: async () => {
                const items = getAllFiles(this.dir).join('\n');
                this.toolMessages.push('CLIThing recursively read this directory')
                return items;
            }
        });

        const readFile = tool({
            name: "read_file",
            description: "Read the contents of a file in the current working directory",
            parameters: z.object({ file: z.string() }),
            execute: async ({ file }) => {
                const full = path.join(this.dir, file);
                if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) {
                    throw new Error('File not found.');
                }
                const read = fs.readFileSync(full, 'utf-8');     
                this.toolMessages.push(`CLIThing read file ${file}`)       
                return read;
            },
        });

        const done = tool({
            name: "done",
            description: "Call this tool when you are done responding",
            parameters: z.object({}),
            execute: async () => {
                this.running = false;
            }
        });

        this.tools = [readFile, listFiles, listAllFiles, done]
        this.initializeAgent(model);
    }

    private initializeAgent(model: string) {
        this.agent = new Agent({
            name: "Directory analyzer",
            model: model, // Cheap model to test with
            instructions: this.systemPrompt,
                tools: this.tools
            });
        }

        setModel(model: string) {
            this.initializeAgent(model)
        }
    

     async *askStream(userInput: string): AsyncGenerator<ChatMessage> {
        this.running = true;
        let turn = 0;
        //const outputs: ChatMessage[] = []

        while (this.running) {
            if (turn >= 10) { // Turn limit
                this.running = false;
            }

            const input: AgentInputItem[] = this.history.concat({ type: 'message', role: "user", content: userInput });
            const result = await run(this.agent, input, { context: this.context, stream: true });

            let buffer = '';
            for await (const chunk of result.toTextStream()) {
                buffer += chunk;
                let newlineIndex;
                while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                    const line = buffer.slice(0, newlineIndex + 1); // include the newline
                    yield { text: line, type: 'assistant' };
                    buffer = buffer.slice(newlineIndex + 1);
                }
            }
            if (buffer.length > 0) {
                yield { text: buffer, type: 'assistant' };
            }
            await result.completed;

            // Collect tool messages generated during this turn
            for (const msg of this.toolMessages) {
                yield { text: msg, type: 'tool' };
            }
            this.toolMessages = [];

            this.history = result.history as AgentInputItem[];
            if (result.finalOutput) {
                turn = turn + 1;
            }
        }
        this.running = false;
    }

    async ask(userInput: string): Promise<ChatMessage[]> {
        const outputs: ChatMessage[] = []
        for await (const msg of this.askStream(userInput)) {
            outputs.push(msg)
        }
        return outputs
    }
}

