import { tool } from "@openai/agents"
import { z } from "zod"
import { AnalyzerConfig } from "."
import { readFile, listFiles, listAllFiles, analyzeFile, done } from './basic.js'
import { exec } from "child_process"

export function securityAnalyzer(dir: string, emit: (msg: string) => void): AnalyzerConfig {
    const systemPrompt = "You area security testing analyzer and assistant. Use your tools to run limited security scans and inspect files. Always finish by calling the 'done' tool"
    
    function emitToolMessage(msg: string) {
        console.log('[TOOL]', msg)
    }

    const readFileTool = readFile(emitToolMessage)
    const listFilesTool = listFiles(emitToolMessage)
    const listAllFilesTool = listAllFiles(dir, emitToolMessage)
    const analyzeFileTool = analyzeFile(dir, emitToolMessage)
    const doneTool = done(emitToolMessage)

    const runSecurityCmd = tool({
        name: 'run_security_command',
        description: "Run a security testing command like nmap or curl",
        parameters: z.object({ cmd: z.string() }),
        execute: async ({ cmd }) => {
            const allowed = [
                "nmap",
                "curl",
                "wget",
                "ping",
                "traceroute",
                "whois",
                "dig",
                "host",
                "nslookup",
                "openssl",
                "tcpdump",
                "netcat",
                "nc",
                "sslyze",
                "nikto",
                "hydra",
                "enum4linux",
                "whatweb",
                "theharvester"
            ]

            if (!allowed.some(a => cmd.startsWith(a))) {
                throw new Error(`Command not allowed. Allowed commands: ${allowed.join(', ')}`)
            }
            return new Promise<string>((resolve, reject) => {
                exec(cmd, (err, stdout, stderr) => {
                    emit(`Ran security command: ${cmd}`)
                    if (err) {
                        resolve(stderr ? stderr.toString() : err.message)
                    } else {
                        resolve(stdout ? stdout.toString() : '')
                    }
                })
            })
        }
    })

    return {
        instructions: systemPrompt,
        tools: [
            readFileTool,
            listAllFilesTool,
            listFilesTool,
            analyzeFileTool,
            runSecurityCmd,
            doneTool
        ]
    }

}