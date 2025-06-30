import * as fs from 'fs'
import { detectFormat } from './formatDetection.js'

interface PEInfo {
    type: 'pe'
    machine: number
    numberOfSections: number
}

interface ELFInfo {
    type: 'elf'
    class: number
    endianness: number
    entry: number
}

export type BinaryInfo = PEInfo | ELFInfo | { type: 'unknown' }

export async function analyzeBinary(file: string): Promise<BinaryInfo> {
    const fd = await fs.promises.open(file, 'r')
    const header = Buffer.alloc(64)
    await fd.read(header, 0, 64, 0)
    await fd.close()

    if (header.slice(0, 2).toString('ascii') === "MZ") {
        const peOffset = header.readUInt32LE(0x3c)
        const fd2 = await fs.promises.open(file, 'r')
        const peHeader = Buffer.alloc(24)
        await fd2.read(peHeader, 0, 24, peOffset)
        await fd2.close()
        if (peHeader.slice(0, 4).toString('ascii') === 'PE\0\0') {
            return {
                type: 'pe',
                machine: peHeader.readUInt16LE(4),
                numberOfSections: peHeader.readUInt16LE(6)
            }
        }
    }

    if (header.slice(0, 4).toString('ascii') === '\x7fELF') {
        return {
            type: 'elf',
            class: header[4],
            endianness: header[5],
            entry: header.readUInt32LE(24)
        }
    }

    const fmt = await detectFormat(file) 
    if (fmt.ext) {
        return { type: 'unknown' }
    }
    return { type: 'unknown'}
}