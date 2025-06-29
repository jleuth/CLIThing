import { tool } from "@openai/agents"
import { z } from "zod"
import { AnalyzerConfig } from "."
import { readFile, listFiles, listAllFiles, analyzeFile, done } from "./basic.js"

export function envAnalyzer(dir: string, emit: (msg: string) => void): AnalyzerConfig {
    const systemPrompt = ''

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