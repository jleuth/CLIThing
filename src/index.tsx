#!/usr/bin/env node

import { Command } from 'commander'
import { render } from 'ink'
import chalk from 'chalk'
import Repl from './core/repl.js';
import AnalyzerSession from './core/analyzer.js'

const program = new Command();

program
    .name('clithing')
    .description('Analyze any file or directory with AI right in the command line.')
    .option('-m, --model <model>', "OpenAI model to use for this session", "gpt-4.1-mini")
    .option('-a, --analyzer <analyzer>', "Analyzer to use (basic, code)", "basic")
    .argument('<directory>', "Diretory to analyze in")
    .argument('[question]', 'Run in non-interactive mode by supplying a single question')
    .action(async (directory: string, question?: string, opts?: any) => {
        const model = opts.model as string
        const analyzer = opts.analyzer as string
        if (question) { // Non interactive
            const session = new AnalyzerSession(directory, model, analyzer)
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
            render(<Repl dir={directory} model={model} analyzer={analyzer} />)
        }
    })

program.parse(process.argv)