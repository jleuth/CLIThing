import { tool } from "@openai/agents"
import { z } from "zod"
import { AnalyzerConfig } from "."
import { readFile, listFiles, listAllFiles, analyzeFile, done } from "./basic.js"

export function envAnalyzer(dir: string, emit: (msg: string) => void): AnalyzerConfig {
    const systemPrompt = "You are an environment analyzer and assistant. Use your tools to read environment variable files and help the user analyze the overall environment. CRITICAL RULES: EVERY conversation must end with calling the 'done' tool. Call 'done' as soon as you've sufficiently completed the user's request. If you're unsire about whether to continue, call 'done', the user will follow up if they need to. You're helping power users, so make sure to keep out any fluff or rambling"

    function emitToolMessage(msg: string) {
        console.log("[TOOL]:", msg)
    }

    const readFileTool = readFile(emitToolMessage)
    const listFilesTool = listFiles(emitToolMessage)
    const listAllFilesTool = listAllFiles(dir, emitToolMessage)
    const analyzeFileTool = analyzeFile(dir, emitToolMessage)
    const doneTool = done(emitToolMessage)

    const listEnv = tool({
        name: 'list_env_vars',
        description: "Lists all the variables in an environmen variable file",
        parameters: z.object({}),
        execute: async () => {
            emit('Listed environment variables')
            return Object.keys(process.env).join('\n')
        }
    })

    const getEnv = tool({
        name: 'get_env_var',
        description: 'Get the value of an environment variable',
        parameters: z.object({ name: z.string() }),
        execute: async ({ name }) => {
            emit(`Got env var: ${name}`)
            return process.env[name] ?? ''
        }
    })

    return {
        instructions: systemPrompt,
        tools: [
            
        ]
    }
}