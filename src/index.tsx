#!/usr/bin/env node

import { Command } from 'commander'
import { render } from 'ink'
import chalk from 'chalk'
import Repl from './core/repl.js';
import AnalyzerSession from './core/analyzer.js'
import * as fs from 'fs'
import * as path from 'path'
import { getRepoMetrics } from './utils/metrics.js';

const program = new Command();

program
    .name('clithing')
    .description('Analyze any file or directory with AI right in the command line.')
    .option('-m, --model <model>', "OpenAI model to use for this session", "gpt-4.1-mini")
    .option('-M, --metrics', "Get quick metrics about your code and exit")
    .option('-a, --analyzer <analyzer>', "Analyzer to use (basic, code)", "basic")
    .option('-c, --compare <directory>', "Compare the target directory to another directory")
    .option('-d, --deep-report <question>', "Generate a full markdown report of a deep analysis on your question with a reasoning model. Note: Deep Report must be ran with a reasoning model.")
    .argument('<directory>', "Diretory to analyze in")
    .argument('[question]', 'Run in non-interactive mode by supplying a single question')
    .action(async (directory: string, question?: string, opts?: any) => {
        const model = opts.model as string
        const analyzer = opts.analyzer as string
        const compareDir = opts.compare as string
        const deepReportQuestion = opts.deepReport as string | undefined
        const metricsFlag = opts.metrics as boolean

        if (metricsFlag) {
            const metrics = getRepoMetrics(directory)
            console.log(JSON.stringify(metrics, null, 2))
            return
        }
        
        if (deepReportQuestion) { // Deep report generation
            // Check if model is an o-series model (starts with 'o1' or 'o3', 'o4', 'o4-mini', etc)
            if (!/^o\d|^o\d?-?mini/i.test(model)) {
                console.error(chalk.red("Deep report must be run with an o-series reasoning model (e.g., o3, o4-mini)."))
                process.exit(1)
            }
            const session = new AnalyzerSession(directory, model, analyzer, compareDir)
            const prompt = `Provide a deep, comprehensive markdown report of this directory and its contents. Focus on structure, purpose and any notable patterns or issues. End with recommendations.\n\nAdditional context or request: ${deepReportQuestion}`
            const outputs = await session.ask(prompt)
            const content = outputs.filter(o => o.type === 'assistant').map(o => o.text).join('')
            const out = path.resolve('deep-report.md')
            fs.writeFileSync(out, content, 'utf8')
            console.log(chalk.green(`Deep report written to ${out}`))
        } else if (question) { // Non interactive
            const session = new AnalyzerSession(directory, model, analyzer, compareDir)
            for await (const msg of session.askStream(question)) {
                if (msg.type === 'tool') {
                    process.stdout.write(`* ${msg.text}`)
                } else if (msg.type === 'reasoning') {
                    process.stdout.write(chalk.gray.italic(msg.text))
                } else if (msg.type === 'assistant') {
                    process.stdout.write(msg.text)
                }
            }
        } else { //Interactive
            render(<Repl dir={directory} model={model} analyzer={analyzer} compareDir={compareDir} />)
        }
    })

program.parse(process.argv)