import * as fs from 'fs';
import * as path from 'path'
import { createHash } from 'crypto'
import { createPatch } from 'diff'

interface CacheRecord {
    hash: string;
    content: string;
    mtimeMs: number
}

export class FileCache {
    private cacheFile: string;
    private records: Record<string, CacheRecord> = {}

    constructor(private root: string) {
        const dir = path.join(root, '.clithingcache')
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
        this.cacheFile = path.join(dir, 'cache.json')
        if (fs.existsSync(this.cacheFile)) {
            try {
                this.records = JSON.parse(fs.readFileSync(this.cacheFile, 'utf-8'))
            } catch {
                this.records = {}
            }
        }
    }

    private save() { // Saving Private JSON :3
        fs.writeFileSync(this.cacheFile, JSON.stringify(this.records, null, 2), 'utf-8')
    }

    isImportant(file: string): boolean {
        const importantNames = ['README.md', 'package.json', 'tsconfig.json']
        const ext = path.extname(file).toLowerCase()
        const importantExts = [
            '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt', '.py', '.rb',
            '.go', '.java', '.css', '.html'
        ]
        return (
            importantNames.some(name => path.basename(file).startsWith(name)) ||
            importantExts.includes(ext)
        )
    }

    computeDiff(file: string): string | null {
        if (!this.isImportant(file)) return null

        const abs = path.resolve(file)
        const key = path.relative(this.root, abs)
        const content = fs.readFileSync(abs, 'utf-8')
        const stat = fs.statSync(abs)
        const hash = createHash('sha1').update(content).digest('hex')
        const record = this.records[key];

        if (!record) {
            this.records[key] = { hash, content, mtimeMs: stat.mtimeMs }
            this.save()
            return createPatch(path.basename(file), '', content)
        }

        if (record.hash === hash && record.mtimeMs === stat.mtimeMs) {
            return null
        }

        const diffText = createPatch(path.basename(file), record.content, content)
        this.records[key] = { hash, content, mtimeMs: stat.mtimeMs}
        this.save()
        return diffText
    }

    invalidate(file: string) {
        const abs = path.resolve(file)
        const key = path.relative(this.root, abs)
        if (this.records[key]) {
            delete this.records[key]
            this.save()
        }
    }
}