import * as fs from "fs"
import * as path from "path"
import { tool } from "@openai/agents"
import { z } from "zod"
import { readFile, listFiles, listAllFiles, analyzeFile, done } from "./basic.js"
import { AnalyzerConfig } from "."

export function logAnalyzer (dir: string, emit: (msg: string) => void): AnalyzerConfig {
    const systemPrompt = "You are a log analyzer and assistant. Use your tools to help the user with their task. CRITICAL RULES: EVERY conversation must end with calling the 'done' tool. Call 'done' as soon as you've sufficiently completed the user's request. If you're unsire about whether to continue, call 'done', the user will follow up if they need to. You're helping power users, so make sure to keep out any fluff or rambling"

    function emitToolMessage(msg: string) {
        console.log("[TOOL]", msg)
    }

    const readFileTool = readFile(emitToolMessage)
    const listFilesTool = listFiles(emitToolMessage)
    const listAllFilesTool = listAllFiles(dir, emitToolMessage)
    const analyzeFileTool = analyzeFile(dir, emitToolMessage)
    const doneTool = done(emitToolMessage)

    const tailLog = tool({
        name: "tail_log",
        description: "Show the last N lines of a log file",
        parameters: z.object({ file: z.string(), lines: z.number().default(10) }),
        execute: async ({ file, lines }: { file: string, lines?: number }) => {
            const content = fs.readFileSync(path.join(dir, file), 'utf-8').trim().split('\n')
            const tail = content.slice(-(lines ?? 10)).join('\n')
            emit(`taillog ${file}\n${tail}`)
        }
    })

    return {
        instructions: systemPrompt,
        tools: [
            readFileTool,
            listAllFilesTool,
            listFilesTool,
            analyzeFileTool,
            doneTool,
            tailLog
        ]
    }
}