import * as fs from "fs"
import * as path from "path"
import { tool } from "@openai/agents"
import { z } from "zod"
import { readFile, listFiles, listAllFiles, analyzeFile, done } from "./basic.js"
import { AnalyzerConfig } from "."

export function logAnalyzer (dir: string, emit: (msg: string) => void): AnalyzerConfig {
    const systemPrompt = ""

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