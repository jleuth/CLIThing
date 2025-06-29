import * as fs from 'fs';
import { system, tool } from '@openai/agents'
import { z } from 'zod'
import { AnalyzerConfig } from '.';
import { readFile, listFiles, listAllFiles, analyzeFile, done } from "./basic.js"
import path from 'path';

function getValue(obj: any, path: string[]): any {
    return path.reduce((acc: any, key: string) => (acc &&  acc[key] != null ? acc[key] : undefined), obj);
}

export function jsonAnalyzer(dir: string, emit: (msg: string) => void): AnalyzerConfig {
    const systemPrompt = `You are a JSON analyzer and assistant. Use your tools to read JSON files and help the user with their tasks. CRITICAL RULES: EVERY conversation must end with calling the 'done' tool. Call 'done' as soon as you've sufficiently completed the user's request. If you're unsire about whether to continue, call 'done', the user will follow up if they need to. You're helping power users, so make sure to keep out any fluff or rambling`

    function emitToolMessage(msg: string) {
        console.log("[TOOL]", msg)
    }

    const readFileTool = readFile(emitToolMessage)
    const listFilesTool = listFiles(emitToolMessage)
    const listAllFilesTool = listAllFiles(dir, emitToolMessage)
    const analyzeFilesTool = analyzeFile(dir, emitToolMessage)

    const queryJson = tool({
        name: 'query_json',
        description: "Query a JSON file using a dot separated path",
        parameters: z.object({ file: z.string(), path: z.string() }),
        execute: async ({ file, path: p }) => {
            const content = fs.readFileSync(`${dir}/${file}`, 'utf-8')
            const data = JSON.parse(content)
            const value = getValue(data, p.split('.'))
            emit(`Query JSON file ${file}`)
            return JSON.stringify(value, null, 2)
        }
    })

    return {
        instructions: systemPrompt,
        tools: [
            readFileTool,
            listFilesTool,
            listAllFilesTool,
            analyzeFilesTool,
            queryJson
        ]
    }
}