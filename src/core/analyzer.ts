import * as fs from 'fs';
import * as path from 'path';
import { Agent, run, tool, AgentInputItem, system } from '@openai/agents';
import * as readline from 'readline'
import { z } from 'zod'
import { config } from "dotenv"
import chalk from 'chalk';
config()

export default async function analyzeDirectory(dir: string, question?: string) { // This analyzer doesn't go in the analyzers dir because it's the default one, /analyzers/ is for specialized analyzers

    const files = fs.readdirSync(dir)
    const systemPrompt = fs.readFileSync(`${dir}/PROMPT.txt`).toString()
    const context = { dir, files };

    const getAllFiles = (directory: string, base = directory): string[] => { // This is different than list_files tool because this does it recursively
        const entries = fs.readdirSync(directory, { withFileTypes: true })
        let results: string[] = []

        for (const entry of entries) {
            const full = path.join(directory, entry.name)
            if (entry.isDirectory()) {
                results = results.concat(getAllFiles(full, base))
            } else {
                results.push(path.relative(base, full))
            }
        }
        return results
    }

    let running = false

    const listFiles = tool({
        name: 'list_files',
        description: "List all the files in a certain directory",
        parameters: z.object({ dir: z.string() }),
        execute: async ({ dir }) => {

            const items = fs.readdirSync(dir).join('\n')
            console.log(chalk.blue("MODEL: listed a directory", items))
            return items
        }
    })

    const listAllFiles = tool({
        name: "list_all_files",
        description: "Recursively list all files in every subdirectory of the current working directory",
        parameters: z.object({}),
        execute: async () => {
            const items = getAllFiles(dir).join('\n')
            console.log(chalk.blue("MODEL: lists recursively:", items))
            return items
        }
    })

    const readFile = tool({
        name: "read_file",
        description: "Read the contents of a file in the current working directory",
        parameters: z.object({ file: z.string() }),
        execute: async ({ file }) => {
            const full = path.join(dir, file);
            if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) {
                throw new Error('File not found.')
            }

            const read = fs.readFileSync(full, 'utf-8')
            console.log(chalk.blue("MODEL: read file", read))
            return read
        },
    })

    const done = tool({
        name: "done",
        description: "Call this tool when you are done responding",
        parameters: z.object({}),
        execute: async () => {
            console.log(chalk.green("MODEL: called done"))
            running = false
        }
    })
    
    const agent = new Agent({
        name: "Directory analyzer",
        model: "gpt-4.1-mini", // Cheap model to test with
        instructions: systemPrompt,
        tools: [readFile, listFiles, listAllFiles, done]
    })

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    let history: AgentInputItem[] = [];

    const ask = (q: string) => new Promise<string>(resolve => rl.question(chalk.yellow(q), resolve))

    const processInput = async (userInput: string) => {
        running = true
        let turn = 0
    

        while (running === true) {
            if (turn >= 10) {
                running = false
            }

            const input: AgentInputItem[] = history.concat({ type: 'message', role: "user", content: userInput })
            const result = await run(agent, input, { context });
            if (result.finalOutput) {
                console.log(result.finalOutput)
                turn = turn + 1
                console.log(turn)
            }
            history = result.history as AgentInputItem[]
        }
        
        // Reset running to false after processing
        running = false
    }

    if (question) {
        await processInput(question);
        rl.close()
        return
    }

    while (true) {
        const userInput = (await ask('> ')).trim()
            if (userInput.toLowerCase() === 'exit') break

            await processInput(userInput)
    }

    rl.close()
}
