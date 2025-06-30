import * as fs from 'fs';
import * as path from 'path';
import { Agent, run, tool, AgentInputItem, system } from '@openai/agents';
import * as readline from 'readline'
import { z } from 'zod'
import { config } from "dotenv"
import chalk from 'chalk';
import { useInput } from 'ink';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { analyzers } from '../analyzers/index.js'
import { directoryDiff } from '../utils/directoryDiff.js';
//import { parsePDF } from '../utils/pdf-parser.js';
config()

export interface ChatMessage{
    text: string
    type: 'assistant' | 'tool' | 'reasoning'
}

export default class AnalyzerSession {
    private history: AgentInputItem[] = [];
    private running = false;
    private agent!: Agent;
    private context: { dir: string; files: string[]; compareDir?: string; diff?: string };
    private dir: string;
    private toolMessages: string[] = []
    private basePrompt!: string 
    private systemPrompt!: string
    private tools: any[] = []
    private model!: string
    private flags = new Set<string>()
    private rules: string[] = []

    constructor(dir: string, model = "gpt-4.1-mini", analyzerType = "basic", compareDir?: string) {
        this.dir = dir;
        const files = fs.readdirSync(this.dir);
        let diff: string | undefined
        if (compareDir) {
            try {
                diff = directoryDiff(dir, compareDir)
            } catch {
                diff = undefined
            }
        }
        // Load analyzer config (tools and instructions) from the specified analyzer
        const analyzer = analyzers[analyzerType];
        if (!analyzer) {
            throw new Error(`Unknown analyzer: ${analyzerType}. Available analyzers: ${Object.keys(analyzers).join(', ')}`);
        }
        const analyzerConfig = analyzer(this.dir, this.emitToolMessage.bind(this));
        this.tools = analyzerConfig.tools;
        this.basePrompt = analyzerConfig.instructions;
        if (compareDir) {
            this.basePrompt += `\n\nA comparison directory is availiable at ${compareDir}. The diff between the directories is provided in the context under 'diff'. Use this to contrast them`
        }
        this.context = compareDir ? { dir: this.dir, files, compareDir, diff } : { dir: this.dir, files }
        this.model = model;
        this.initializeAgent(model);
    }

    private buildPrompt(): string {
        let prompt = this.basePrompt
        if (this.flags.size > 0) {
            prompt += '\n\nActive flags:\n' + [...this.flags].map(f => `-${f}`).join('\n')
        }
        if (this.rules.length > 0) {
            prompt += '\n\nAdditional rules:\n' + this.rules.map(r => `-${r}`).join('\n')
        }
        return prompt
    }

    private initializeAgent(model: string) {
        this.systemPrompt = this.buildPrompt();
        this.model = model;
        this.agent = new Agent({
            name: "Directory analyzer",
            model,
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
            if (turn >= 20) { // Turn limit
                this.running = false;
            }

            const input: AgentInputItem[] = this.history.concat({ type: 'message', role: "user", content: userInput });
            const result = await run(this.agent, input, { context: this.context, stream: true });

            let buffer = '';
            let doneSignal = false;
            outer: for await (const event of result.toStream()) {
                if (event.type === 'raw_model_stream_event' && event.data.type === 'output_text_delta') {
                    const chunk = event.data.delta;
                    buffer += chunk;
                    let newlineIndex;
                    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                        const line = buffer.slice(0, newlineIndex + 1);
                        yield { text: line, type: 'assistant' };
                        buffer = buffer.slice(newlineIndex + 1);
                    }
                } else if (event.type === 'run_item_stream_event' && event.item.type === 'reasoning_item') {
                    const text = event.item.rawItem.content.map((c: any) => c.text).join(' ');
                    const words = text.split(/\s+/).slice(0, 50).join(' ');
                    yield { text: words, type: 'reasoning' };
                }
                // Stream tool messages as soon as they're added
                while (this.toolMessages.length > 0) {
                    const msg = this.toolMessages.shift();
                    if (msg !== undefined) {
                        yield { text: msg, type: 'tool' };
                        if (msg.trim().toLowerCase().includes('done')) {
                            this.running = false;
                            return; // Exit the generator immediately
                        }
                    }
                }
            }
            // Flush any remaining buffer as a final assistant message
            if (buffer.length > 0) {
                yield { text: buffer, type: 'assistant' };
            }
            await result.completed;
            this.history = result.history as AgentInputItem[];
            if (result.finalOutput) {
                turn = turn + 1;
            }
            if (this.running === false) {
                break;
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

    emitToolMessage(msg: string) {
        this.toolMessages.push(msg)
    }

    setFlag(name: string, value: boolean) {
        if (value) {
            this.flags.add(name)
        } else {
            this.flags.delete(name)
        }
    }

    getFlags(): string[] {
        return [...this.flags]
    }

    clearFlags() {
        this.flags.clear()
        this.initializeAgent(this.model)
    }

    addRule(rule: string) {
        this.rules.push(rule)
        this.initializeAgent(this.model)
    }

    clearRules() {
        this.rules = []
        this.initializeAgent(this.model)
    }

    getRules(): string[] {
        return [...this.rules]
    }
}

