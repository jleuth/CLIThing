#!/usr/bin/env node

import { Command } from 'commander'
import analyzeDirectory from './core/analyzer.js'

const program = new Command();

program
    .name('clithing')
    .description('Analyze any file or directory with AI right in the command line.')
    .argument('<directory>', "Diretory to analyze in")
    .action((directory: string) => {
        analyzeDirectory(directory);
    })

program.parse(process.argv)