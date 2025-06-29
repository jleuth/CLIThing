#!/usr/bin/env node

import { Command } from 'commander'
import analyzeDirectory from './core/analyzer.js'

const program = new Command();

program
    .name('clithing')
    .description('Analyze any file or directory with AI right in the command line.')
    .argument('<directory>', "Diretory to analyze in")
    .argument('[question]', 'Run in non-interactive mode by supplying a single question')
    .action((directory: string, question?: string) => {
        if (question) {
        analyzeDirectory(directory, question); //Non interactive mode
        } else {
            analyzeDirectory(directory) //Interactive mode
        }
    })

program.parse(process.argv)