import * as fs from 'fs'
import * as zlib from 'zlib'
import * as tar from 'tar-stream'
import * as yauzl from "yauzl"

export async function listZipEntries(file: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const entries: string[] = []
        yauzl.open(file, { lazyEntries: true }, (err: any, zipfile: any) => {
            if (err || !zipfile) return reject(err)
            zipfile.readEntry()
            zipfile.on('entry', (entry: any) => {
                entries.push(entry.fileName)
                zipfile.readEntry()
            })
            zipfile.on('end', () => resolve(entries))
            zipfile.on('error', reject)
        })
    })
}

export async function listTarEntries(file: string): Promise<string[]> {
    const extract = tar.extract()
    const entries: string[] = []
    return new Promise((resolve, reject) => {
        extract.on('entry', (header: any, stream: any, next: () => void) => {
            entries.push(header.name)
            stream.resume()
            stream.on('end', next)
        })
        extract.on('finish', () => resolve(entries))
        extract.on('error', reject)
        fs.createReadStream(file).pipe(extract)
    })
}

export async function inspectGzip(file: string): Promise<{ originalSize: number }> {
    const buffer = await fs.promises.readFile(file)
    const decompressed = zlib.gunzipSync(buffer)
    return { originalSize: decompressed.length }
}