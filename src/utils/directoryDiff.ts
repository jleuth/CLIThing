import { execSync } from 'child_process'

export function directoryDiff(dir1: string, dir2: string): string {
    try {
        const output = execSync(`git diff --no-index -u ${dir1}, ${dir2}`, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 })
            return output
    } catch (err: any) {
        if (err.stdout) {
            return err.stdout.toString()
        }
        return ''
    }
}