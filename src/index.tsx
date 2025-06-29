#!/usr/bin/env node

import { Command } from 'commander';
import React, { useEffect, useState } from 'react';
import { render, Box, Text } from 'ink';
import analyzeDirectory from './core/analyzer.js';

const program = new Command();

program
    .name('clithing')
    .description('CLI tool for directory analysis')
    .version('1.0.0');

program
    .command('analyze <directory>')
    .description('Load the directory you\'d like to analyze')
    .action((directory: string) => {
        render(<AnalyzeUI dir={directory} />);
    });

program.parse(process.argv);

interface AnalyzeProps {
    dir: string;
}
function AnalyzeUI({ dir }: AnalyzeProps) {
    const [files, setFiles] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const prompt = "prompt"

    useEffect(() => {
        analyzeDirectory(dir, prompt)
            .then((result) => {
                // Assuming the result is a newline-separated string of file paths
                // based on the lint error and the component's usage of the `files` state.
                if (typeof result === 'string') {
                    setFiles(result.split('\n').filter(Boolean));
                } else {
                    // If the result is not a string, it might be an array already.
                    // This handles cases where type inference might be incorrect.
                    setFiles(result);
                }
            })
            .catch((err: any) => {
                setError(err.message || String(err));
            });
    }, [dir, prompt]);

    if (error) {
        return (
            <Text color='red'>Failed to analyze {dir}: {error}</Text>
        );
    }

    return (
        <Box flexDirection='column'>
            {files.map((f: string) => (
                <Text key={f}>{f}</Text>
            ))}
        </Box>
    );
}