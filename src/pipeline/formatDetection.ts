import * as fs from 'fs'
import {fileTypeFromBuffer} from "file-type"

export async function detectFormat(file: string): Promise<{ ext?: string; mime?: string }> {
    const handle = await fs.promises.open(file, 'r')
    const buffer = Buffer.alloc(4100)
    await handle.read(buffer, 0, 4100, 0)
    await handle.close()
    const info = await fileTypeFromBuffer(buffer)
    if (!info) return {}
    return { ext: info.ext, mime: info.mime}
}