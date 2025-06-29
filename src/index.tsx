#!/usr/bin/env node

import { Command } from 'commander'
import { render } from 'ink'
import Repl from './core/repl.js';
import AnalyzerSession from './core/analyzer.js'

const program = new Command();

program
    .name('clithing')
    .description('Analyze any file or directory with AI right in the command line.')
    .argument('<directory>', "Diretory to analyze in")
    .argument('[question]', 'Run in non-interactive mode by supplying a single question')
    .action(async (directory: string, question?: string) => {
        if (question) { // Non interactive
            const session = new AnalyzerSession(directory)
            const outputs = await session.ask(question)
            outputs.forEach((o: any) => console.log(o))
        } else { //Interactive
            render(<Repl dir={directory} />)
        }
    })

program.parse(process.argv)