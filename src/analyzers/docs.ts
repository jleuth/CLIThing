import * as fs from "fs"
import * as path from "path"
import { tool } from "@openai/agents"
import { z } from 'zod'
import { AnalyzerConfig } from "." 
import { readFile, listFiles, listAllFiles, analyzeFile, done, getAllFiles } from './basic.js'

export function docsAnalyzer(dir: string, emit: (msg: string) => void): AnalyzerConfig {
    const systemPrompt = "You are a documentation analyzer and assistant. Use your tools to search through and read documentation files like markdown or text. CRITICAL RULES: EVERY conversation must end with calling the 'done' tool. Call 'done' as soon as you've sufficiently completed the user's request. If you're unsire about whether to continue, call 'done', the user will follow up if they need to. You're helping power users, so make sure to keep out any fluff or rambling."

    function emitToolMessage(msg: string) {
        console.log('[TOOL]', msg)
    }

    const readFileTool = readFile(emitToolMessage)
    const listFilesTool = listFiles(emitToolMessage)
    const listAllFilesTool = listAllFiles(dir, emitToolMessage)
    const analyzeFileTool = analyzeFile(dir, emitToolMessage)
    const doneTool = done(emitToolMessage)


    const searchDocs = tool({
        name: "search_docs",
        description: "Search large markdown and text files for keywords",
        parameters: z.object({ keywords: z.array(z.string()) }),
        execute: async ({ keywords }) => {
            const files = getAllFiles(dir)
            const matches: string[] = []

            for (const f of files) {
                const ext = path.extname(f).toLowerCase()
                if (['.md', '.txt'].includes(ext)) {
                    const content = fs.readFileSync(path.join(dir, f), 'utf-8')
                    if (keywords.some(keyword => content.toLowerCase().includes(keyword.toLowerCase()))) {
                        matches.push(f)
                    }
                }
            }

            emit(`Search for keyword(s): ${keywords}`)
            return matches.join('\n')
        }
    })

    return {
        instructions: systemPrompt,
        tools: [
            readFileTool,
            listAllFilesTool,
            listFilesTool,
            analyzeFileTool,
            searchDocs,
            doneTool
        ]
    }
}