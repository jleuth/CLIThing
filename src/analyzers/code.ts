import { listFiles, done, listAllFiles, readFile } from "./basic.js";
import { AnalyzerConfig } from ".";
import { tool } from "@openai/agents";
import { z } from 'zod'
import { exec } from "node:child_process";

export function codeAnalyzer(dir: string, emit: (msg: string) => void): AnalyzerConfig {
    const systemPrompt = `You are a code analysis assistant. You can read files, list directories, and run approved commands to help analyze codebases. 

Your capabilities include:
- Reading and analyzing source code files
- Understanding project structure and dependencies  
- Running build commands, tests, and other development tools
- Providing insights about code quality, patterns, and potential issues

When analyzing code:
1. Start by understanding the project structure
2. Look at key files like package.json, README, configuration files
3. Analyze the codebase for patterns, architecture, and potential improvements
4. Use the run_command tool for build/test operations when appropriate

Always call the 'done' tool when you have finished your analysis.`

    function emitToolMessage(msg: string) {
        console.log('[TOOL]', msg)
    }

    const readFileTool = readFile(emitToolMessage)
    const listFilesTool = listFiles(emitToolMessage)
    const doneTool = done(emitToolMessage)
    const listAllFilesTool = listAllFiles(dir, emitToolMessage)

    const runCommand = tool({
        name: "run_command",
        description: "Run an approved command, like a build command or a curl command",
        parameters: z.object({ cmd: z.string() }),
        execute: async ({ cmd }) => {
            const approvedCommands = ["npm", "curl", "wget", "python3", "python", "pip", "pip3", "node"]


            if (!approvedCommands.some(approved => cmd.includes(approved))) {
                throw new Error(`Command not allowed. Approved commands: ${approvedCommands.join(', ')}`)
            }

            const run = exec(cmd)

            emit(`Run tool called command: ${cmd}`)
            return run
        }
    })

    

    return {
        instructions: systemPrompt,
        tools: [readFileTool, listFilesTool, doneTool, listAllFilesTool, runCommand]
    }

}