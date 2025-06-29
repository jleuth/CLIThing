import * as fs from 'fs';
import * as path from 'path';
import { Agent, run, tool, AgentInputItem, system } from '@openai/agents';
import * as readline from 'readline'
import { z } from 'zod'
import { config } from "dotenv"
import chalk from 'chalk';
config()

export default class AnalyzerSession {
    private history: AgentInputItem[] = [];
    private running = false;
    private agent: Agent;
    private context: { dir: string; files: string[] };
    private dir: string;

    constructor(dir: string) {
        this.dir = dir;
        const files = fs.readdirSync(this.dir);
        const systemPrompt = fs.readFileSync(`${this.dir}/PROMPT.txt`).toString();
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
                console.log(chalk.blue("MODEL: listed a directory", items));
                return items;
            }
        });

        const listAllFiles = tool({
            name: "list_all_files",
            description: "Recursively list all files in every subdirectory of the current working directory",
            parameters: z.object({}),
            execute: async () => {
                const items = getAllFiles(this.dir).join('\n');
                console.log(chalk.blue("MODEL: lists recursively:", items));
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
                console.log(chalk.blue("MODEL: read file", read));
                return read;
            },
        });

        const done = tool({
            name: "done",
            description: "Call this tool when you are done responding",
            parameters: z.object({}),
            execute: async () => {
                console.log(chalk.green("MODEL: called done"));
                this.running = false;
            }
        });

        this.agent = new Agent({
            name: "Directory analyzer",
            model: "gpt-4.1-mini", // Cheap model to test with
            instructions: systemPrompt,
            tools: [readFile, listFiles, listAllFiles, done]
        });
    }

     async ask(userInput: string): Promise<string[]> {
        this.running = true
        let turn = 0
        const outputs: string[] = []

        while (this.running) {
            if (turn >= 10) { // Turn limit
                this.running = false
            }
            const input: AgentInputItem[] = this.history.concat({ type: 'message', role: "user", content: userInput })
            const result = await run(this.agent, input, { context: this.context })
            if (result.finalOutput) {
                outputs.push(result.finalOutput);
                turn = turn + 1;
            }
            this.history = result.history as AgentInputItem[]
        }
        this.running = false
        return outputs;
    }
}
