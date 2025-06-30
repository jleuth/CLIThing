import * as fs from "fs"
import * as path from "path"

export interface RepoMetrics {
    fileCount: number
    totalLines: number
    linesByExt: Record<string, number>
}

function shouldIgnore(rel: string): boolean {
    return rel.startsWith('node_modules/') ||
    rel === 'node_modules' ||
    rel.startsWith('.git/') ||
    rel === '.git' ||
    rel.startsWith('dist/') ||
    rel === 'dist' ||
    rel.startsWith('.clithingcache')
}

function walk(dir: string, base: string, files: string[]): void {
    for (const entry of fs.readdirSync(dir)) {
        const abs = path.join(dir, entry)
        const rel = path.relative(base, abs).replace(/\\/g, '/')
        if (shouldIgnore(rel)) continue
        const stat = fs.statSync(abs)
        if (stat.isDirectory()) {
            walk(abs, base, files)
        } else {
            files.push(abs)
        }
    }
}

export function getRepoMetrics(dir: string): RepoMetrics {
    const files: string[] = []
    walk(dir, dir, files)
    const linesByExt: Record<string, number> = {}
    let totalLines = 0

    for (const file of files) {
        const ext = path.extname(file) || 'noext'
        const content = fs.readFileSync(file, 'utf-8')
        const lineCount = content.split(/\r?\n/).length
        totalLines += lineCount
        linesByExt[ext] = (linesByExt[ext] || 0) + lineCount
    }

    return {
        fileCount: files.length,
        totalLines,
        linesByExt
    }
}