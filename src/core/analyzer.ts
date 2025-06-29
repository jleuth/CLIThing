import * as fs from 'fs';
import * as path from 'path';
import { Agent, run, tool, AgentInputItem } from '@openai/agents';
import * as readline from 'readline'
import { z } from 'zod'
import { config } from "dotenv"
config()

export default async function analyzeDirectory(dir: string) {

    const files = fs.readdirSync(dir)
    const context = { dir, files };
    let running = false

    const listFiles = tool({
        name: 'list_files',
        description: "List all the files in the current working directory",
        parameters: z.object({ file: z.string() }),
        execute: async () => {

            const items = files.join('\n')
            console.log(items)
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
            console.log("MODEL:", read)
            return read
        },
    })

    const done = tool({
        name: "done",
        description: "Call this tool when you are done responding",
        parameters: z.object({}),
        execute: async () => {
            console.log("MODEL: called done")
            running = false
        }
    })
    
    const agent = new Agent({
        name: "Directory analyzer",
        model: "gpt-4.1-mini", // Cheap model to test with
        instructions: `
IMPORTANT: At the end of every task, you MUST call the "done" tool. If you do not, the program will hang and you will be stuck in an infinite loop. 
Even if you only answer a question and do not use any other tools, you MUST call the "done" tool as your last action.
Use your available tools through multiple turns to complete the user's task, then ALWAYS call "done" to finish.
`,
        tools: [readFile, listFiles, done]
    })

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    let history: AgentInputItem[] = [];

    const ask = (q: string) => new Promise<string>(resolve => rl.question(q, resolve))

    while (true) {
        const userInput = (await ask('>')).trim()
        if (userInput.toLowerCase() === 'exit') break;

        // Set running to true when user hits enter (provides input)
        running = true
        let turn = 0
        
        while (running === true) {
            if (turn > 10) {
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

    rl.close()
}
