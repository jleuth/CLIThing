import { tool } from "@openai/agents"
import { z } from "zod"
import { AnalyzerConfig } from "."
import { streamFileLines } from "../pipeline/streamProcessing.js"
import { analyzeBinary } from "../pipeline/binaryAnalysis.js"
import { detectFormat } from '../pipeline/formatDetection.js'
import { listZipEntries, listTarEntries, inspectGzip } from "../pipeline/compressionAnalysis.js"
import { BatchQueue } from '../pipeline/batchQueue.js'

export function advancedFileAnalyzer(dir: string, emit: (msg: string) => void): AnalyzerConfig {
    const queue = new BatchQueue()
    const instructions = 'You are an advanced file analyzing and processing assistant. You can stream large files, detect formats, analyze binaries and archives. Always finish your response with the done tool.'

    const streamTool = tool({
        name: 'stream_file',
        description: 'Stream a text file line by line',
        parameters: z.object({ file: z.string() }),
        execute: async ({ file }) => {
            const lines: string[] = []
            for await (const line of streamFileLines(file)) {
                lines.push(line)
                if (lines.length >= 50) break
            }
            emit(`Streamed ${lines.length} lines from ${file}`)
            return lines.join('\n')
        }
    })

    const detectTool = tool({
        name: 'detect_format',
        description: 'Detect file format using magic numbers',
        parameters: z.object({ file: z.string() }),
        execute: async ({ file }) => {
            const info = await detectFormat(file)
            emit(`Detected format of file ${file}`)
            return JSON.stringify(info)
        }
    })

    const binaryTool = tool({
        name: "analyze_binary",
        description: "Analyze a PE or ELF binary's headers",
        parameters: z.object({ file: z.string() }),
        execute: async ({ file }) => {
            const info = await analyzeBinary(file)
            emit(`Analyzed binary ${file}`)
            return JSON.stringify(info)
        }
    })

    const zipTool = tool({
        name: 'list_zip',
        description: 'List entries inside a zip archive',
        parameters: z.object({ file: z.string() }),
        execute: async ({ file }) => {
            const entries = await listZipEntries(file)
            emit(`Read zip archive ${file}`)
            return entries.join('\n')
        }
    })

    const tarTool = tool({
        name: "list_tar",
        description: "List entries inside a tar archive",
        parameters: z.object({ file: z.string() }),
        execute: async ({ file }) => {
            const entries = await listTarEntries(file)
            emit(`Read tar archive ${file}`)
            return entries.join('\n')
        }
    })

    const gzipTool = tool({
        name: 'inspect_gzip',
        description: 'Inspect a gzip file without extracting it',
        parameters: z.object({ file: z.string() }),
        execute: async ({ file }) => {
            const info = await inspectGzip(file)
            emit(`Inspected gzip ${file}`)
            return JSON.stringify(info)
        }
    })

    const queueTool = tool({
        name: 'queue_tool',
        description: 'Queue a file for batch processing',
        parameters: z.object({ file: z.string() }),
        execute: async ({ file }) => {
            queue.add(async () => {
                emit(`Processing queued file ${file}`)
                const info = await detectFormat(file)
                emit(JSON.stringify(info))
            }) 
            return 'queued'
        }
    })

    const doneTool = tool({
        name: 'done',
        description: 'Call this when finished',
        parameters: z.object({}),
        execute: async () => {
            emit('Turn done')
        }
    })

    return {
        instructions,
        tools: [
            streamTool,
            detectTool,
            binaryTool,
            zipTool,
            tarTool,
            gzipTool,
            queueTool,
            doneTool
        ]
    }
}