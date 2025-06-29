import * as fs from "fs"
import * as path from "path"
import { tool } from "@openai/agents"
import { z } from 'zod'
import yaml from 'yaml'
import { AnalyzerConfig } from "."
import { readFile, listFiles, listAllFiles, analyzeFile, done } from "./basic.js"

export function configAnalyzer(dir: string, emit: (msg: string) => void): AnalyzerConfig {
    const systemPrompt = "You are a configuration analyzer and assistant. Use your tools parse YAML and read env files. CRITICAL RULES: EVERY conversation must end with calling the 'done' tool. Call 'done' as soon as you've sufficiently completed the user's request. If you're unsire about whether to continue, call 'done', the user will follow up if they need to. You're helping power users, to make sure to keep out any fluff or rambling."


    function emitToolMessage(msg: string) {
        console.log("[TOOL]:", msg)
    }

    const readFileTool = readFile(emitToolMessage)
    const listFilesTool = listFiles(emitToolMessage)
    const doneTool = done(emitToolMessage)
    const listAllFilesTool = listAllFiles(dir, emitToolMessage)
    const analyzeFileTool = analyzeFile(dir, emitToolMessage)

    const parseYaml = tool({
        name: 'parse_yaml',
        description: "Parse a YAML file and return JSON",
        parameters: z.object({ file: z.string() }),
        execute: async ({ file }) => {
            const content = fs.readFileSync(path.join(dir, file), 'utf-8')
            const data = yaml.parse(content)
            emit(`Parsed YAML: ${file}`)
            return JSON.stringify(data, null, 2)
        }
    })

    const showEnv = tool({
        name: 'show_env',
        description: "Read a .env file and return its contents",
        parameters: z.object({ file: z.string() }),
        execute: async ({ file }) => {
            const content = fs.readFileSync(path.join(dir, file), 'utf-8')
        }
    })

    return {
        instructions: systemPrompt,
        tools: [
            readFileTool,
            listAllFilesTool,
            listFilesTool,
            analyzeFileTool,
            parseYaml,
            showEnv,
            doneTool

        ]
    }
}