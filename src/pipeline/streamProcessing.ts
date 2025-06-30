import * as fs from "fs"
import * as readline from "readline"

export async function* streamFileLines(file: string): AsyncGenerator<string> {
    const stream = fs.createReadStream(file, { encoding: 'utf-8' })
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })
    for await (const line of rl) {
        yield line as string
    }
}