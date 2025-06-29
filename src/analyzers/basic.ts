import * as fs from 'fs'
import * as path from 'path'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import { tool } from '@openai/agents'
import { z } from 'zod'
import { AnalyzerConfig } from './index.js'

// Helper for recursive file listing
export const getAllFiles = (directory: string, base = directory): string[] => {
    const entries = fs.readdirSync(directory, { withFileTypes: true })
    let results: string[] = []
    const ignoreDirs = [
        'node_modules', '.next', '.git', 'dist', 'build',
        '.cache', '.parcel-cache', '.turbo', 'coverage',
        '.nyc_output', '.vscode', '.idea', 'target',
        'bin', 'obj', '.vs', '__pycache__', '.pytest_cache'
    ]

    for (const entry of entries) {
        const full = path.join(directory, entry.name)
        if (entry.isDirectory()) {
            if (!ignoreDirs.includes(entry.name)) {
                results = results.concat(getAllFiles(full, base))
            }
        } else {
            results.push(path.relative(base, full))
        }
    }
    return results
}

export const listFiles = (emit: (msg: string) => void) => tool({
    name: 'list_files',
    description: 'List all the files in a specified directory',
    parameters: z.object({ dir: z.string() }),
    execute: async ({ dir }) => {
        const items = fs.readdirSync(dir).join('\n')
        emit(`CLIThing read directory: ${dir}`)
        return items
    }
})

export const listAllFiles = (dir: string, emit: (msg: string) => void) => tool({
    name: 'list_all_files',
    description: 'Recursively list all files in every subdirectory of the current working directory',
    parameters: z.object({}),
    execute: async () => {
        const items = getAllFiles(dir).join('\n')
        emit(`CLIThing read the ${dir} directory recursively`)
        return items
    }
})

export const readFile = (emit: (msg: string) => void) => tool({
    name: "read_file",
    description: "Read the contents of a file",
    parameters: z.object({ filePath: z.string() }),
    execute: async ({ filePath }) => {
        if (!fs.existsSync(filePath)) {
            throw new Error('File not found or path is invalid')
        }
        const items = fs.readFileSync(filePath)
        emit(`CLIThing read a file: ${filePath}`)
        return items;
    }
})

export const analyzeFile = (dir: string, emit: (msg: string) => void) => tool({
    name: "analyze_file",
    description: "Analyze a non text-based file, like an Excel spreadsheet or PDF. Supported types: .docx, .xlsx, .xls, .csv",
    parameters: z.object({ file: z.string(), question: z.string().nullable().optional() }),
    execute: async ({ file, question }) => {
        const full = path.join(dir, file as string)
        if (!fs.existsSync(full)) {
            throw new Error('File not found or path is invalid')
        }
        const ext = path.extname(full).toLowerCase()
        try {
            if (ext === '.docx') {
                const result = await mammoth.extractRawText({ path: full })
                emit(`CLIThing analyzed doc ${file}`)
                return result
            } else if (['.xlsx', '.xls', '.csv'].includes(ext)) {
                const workbook = XLSX.readFile(full)
                const sheet = workbook.SheetNames[0]
                const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheet])
                emit(`CLIThing analyzed spreadsheet: ${file}`)
                return csv
            } else {
                throw new Error(`Unsupported file type. Supported types: .docx, .xlsx, .xls, .csv`)
            }
        } catch (err) {
            throw new Error(`Error analyzing: ${err}`)
        }
    }
})

export const done = (emit: (msg: string) => void) => tool({
    name: 'done',
    description: "Call this tool when you are done responding.",
    parameters: z.object({}),
    execute: async () => {
        emit('Turn done')
    }
})

export function createBasicAnalyzer(dir: string, emit: (msg: string) =>  void): AnalyzerConfig {
    const systemPrompt = fs.readFileSync(path.join(dir, 'PROMPT.txt'), 'utf-8')
    return {
        instructions: systemPrompt,
        tools: [
            readFile(emit),
            listAllFiles(dir, emit),
            listFiles(emit),
            analyzeFile(dir, emit),
            done(emit)
        ]
    }
}

export const baseTools = { readFile, listAllFiles, listFiles, analyzeFile, done };