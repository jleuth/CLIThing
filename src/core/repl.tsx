import React, { useState, useEffect } from "react";
import { Box, Text, useApp, useInput } from 'ink'
import TextInput from "ink-text-input";
import BigText from "ink-big-text";
import Spinner from 'ink-spinner'
import AnalyzerSession, { ChatMessage } from "./analyzer.js";
import chokidar from 'chokidar'
import * as fs from 'fs'
import * as path from 'path'
import { FileCache } from "../utils/cache.js";
import OpenAI from "openai";
import ProgressBar from 'ink-progress-bar'
import { getRepoMetrics } from "@/utils/metrics.js";

const openai = new OpenAI();

async function getLoadingMessage(query: string): Promise<string> {
    try {
        const res = await openai.responses.create({
            model: 'gpt-4.1-nano',
            input: `A 3-word silly loading message about cookies and related to query: ${query}. End with a statement, no punctuation.`
        })

        return res.output_text.concat("...") ?? "Thinking..."
    } catch {
        return "Thinking..."
    }
}

type Message = ChatMessage | { text: string; type: 'user'}

interface Props {
    dir: string
    model: string
    analyzer: string
    compareDir?: string
}

export default function Repl({ dir, model, analyzer, compareDir }: Props) {
    const { exit } = useApp()
    const [session] = useState(() => new AnalyzerSession(dir, model, analyzer, compareDir))
    const [cache] = useState(() => new FileCache(dir))
    const [input, setInput] = useState('')
    const [messages, setMessages] = useState<Message[]>([])
    const [busy, setBusy] = useState(false)
    const [autoAnalyze, setAutoAnalyze] = useState(false)
    const [loadingMessage, setLoadingMessage] = useState("Thinking...")
    const [deepProgress, setDeepProgress] = useState<number | null>(null)

    useInput((input, key) => {
        if (key.shift && key.tab) { // shift + tab
            setAutoAnalyze(a => {
                const next = !a;
                setMessages(m => [...m, { text: `Auto-analyze ${next ? 'enabled' : 'disabled'}`, type: 'assistant' }]);
                return next;
            });
        }
    })
    
    useEffect(() => {
        if (!autoAnalyze) return

        // Only detect file add/remove, or file changes >1KB
        // Use a function for 'ignored' to ensure folders are ignored properly
        const watcher = chokidar.watch(dir, {
            ignored: (filePath: string) => {
                // Normalize both dir and filePath
                const rel = path.relative(path.resolve(dir), path.resolve(filePath)).replace(/\\/g, '/')
                return (
                    rel.startsWith('node_modules/') ||
                    rel === 'node_modules' ||
                    rel.startsWith('.git/') ||
                    rel === '.git' ||
                    rel.startsWith('dist/') ||
                    rel === 'dist'
                )
            },
            persistent: true,
            ignoreInitial: true
        })

        // Handler for add/unlink events (always triggers)
        const handleAddOrUnlink = async (file: string, type: 'add' | 'unlink') => {
            if (!cache.isImportant(file)) return

            if (type === 'unlink') {
                cache.invalidate(file)
            } else {
                cache.computeDiff(file)
            }
            setMessages(m => [
                ...m,
                { text: type === 'add' ? `File added: ${path.relative(dir, file)}` : `File removed: ${path.relative(dir, file)}`, type: 'assistant' }
            ])
            setBusy(true)
            try {
                for await (const msg of session.askStream(
                    type === 'add'
                        ? `A new file was added: ${file}. Provide some useful insights on the change.`
                        : `A file was removed: ${file}. Provide some useful insights on the change.`
                )) {
                    setMessages(m => [...m, msg])
                }
            } finally {
                setBusy(false)
            }
        }

        // Handler for change events (only triggers if file size > 1KB)
        const handleChange = async (file: string) => {
            let size = 0
            try {
                size = fs.statSync(file).size
            } catch {
                return
            }
            if (size > 1024 && cache.isImportant(file)) {
                const diffText = cache.computeDiff(file) || ''
            
                setMessages(m => [
                    ...m,
                    { text: `Significant change detected in ${path.relative(dir, file)}`, type: 'assistant' }
                ])
                setBusy(true)
                try {
                    for await (const msg of session.askStream(
                        `A significant change (over 1KB) occurred in ${file}. Here is the diff:\n\n${diffText}\n\nProvide some useful insights on the change.`
                    )) {
                        setMessages(m => [...m, msg])
                    }
                } finally {
                    setBusy(false)
                }
            }
        }

        watcher.on('add', file => handleAddOrUnlink(file, 'add'))
        watcher.on('unlink', file => handleAddOrUnlink(file, 'unlink'))
        watcher.on('change', handleChange)

        return () => {
            watcher.close()
        }
    }, [autoAnalyze])
    

    const handleSubmit = async () => {
        const q = input.trim()
        if (q.toLowerCase() === 'exit') {
            exit()
            return
        }

        if (q.startsWith(":model ")) {
            const newModel = q.slice(7).trim()
            session.setModel(newModel)
            setMessages(m => [...m, { text: q, type: "user"}, { text: `Model set to ${newModel}`, type: 'assistant'}])
            setInput('')
            return
        }

        if (q.startsWith(":metrics")) {
            const metrics = getRepoMetrics(dir)
            const extSummary = Object.entries(metrics.linesByExt)
                .map(([e, c]) => `${e}: ${c}`)
                .join(', ')
            const msg = `Files: ${metrics.fileCount}\nTotal lines: ${metrics.totalLines}\n${extSummary}`
            setMessages(m => [...m, { text: q, type: 'user' }, { text: msg, type: 'assistant' }])
            setInput('')
            return
        }

        if (q.startsWith(":deep-report")) {
            const userQuery = q.slice(12).trim()
            if (!userQuery) {
                setMessages(m => [
                    ...m,
                    { text: q, type: "user" },
                    { text: "Please provide a query or context after ':deep-report'.", type: "assistant" }
                ])
                setInput('')
                return
            }
            setMessages(m => [...m, {text: q, type: "user"}])
            setInput('')
            setBusy(true)
            setDeepProgress(0)
            const progressTimer = setInterval(() => {
                setDeepProgress(p => p !== null && p < 0.95 ? p + 0.01 : p)
            }, 500)
            const lm = await getLoadingMessage(userQuery)
            setLoadingMessage(lm)
            try {
                const prompt = `Provide a deep, comprehensive markdown report of this directory and its contents. Focus on structure, purpose, and notable issues or patterns. End with actionable recommendations.\n\nAdditional context or request: ${userQuery}`
                const outputs = await session.ask(prompt)
                const content = outputs.filter(o => o.type === 'assistant').map(o => o.text).join('');
                const reportFile = 'deep-report.md';
                fs.writeFileSync(path.resolve(reportFile), content, 'utf-8');
                setMessages(m => [...m, {text: `Deep report saved to ${reportFile}`, type: "assistant"}]);
            } finally {
                clearInterval(progressTimer)
                setDeepProgress(null)
                setBusy(false);
            }
            return;
        }
        const lm = await getLoadingMessage(q)
        setLoadingMessage(lm)
        setMessages(m => [...m, { text: q, type: "user" }])
        setInput('')
        setBusy(true)


        try {
            for await (const msg of session.askStream(q)) {
                setMessages(m => [...m, msg])
            }
        } finally {
            setBusy(false)
        }
    }

    return (
        <Box flexDirection="column">
            <BigText text="CLIThing" font="3d" />
            <Text color="cyan">Auto-analyze {autoAnalyze ? "ON" : "OFF"} (Shift+Tab)</Text>
            {messages.map((m, i) => (
                <Text key={i}>
                    {m.type === 'tool' ? (
                        <Text color="magenta">• {m.text.trim()}</Text>
                    ) : m.type === 'user' ? (
                        `> ${m.text}`
                    ) : m.type === 'reasoning' ? (
                        <Text color="gray" italic>{m.text.trim()}</Text>
                    ) : (
                        m.text.trim() // assistant
                    )}
                </Text>
            ))}
            {busy ? (
                deepProgress !== null ? (
                    <Box>
                        <Text color='magenta'>{loadingMessage} </Text>
                        <ProgressBar percent={deepProgress} />
                    </Box>
                ) : (
                    <Text color="magenta"><Spinner type="dots" />{loadingMessage}</Text>
                )
            ) : (
                <Box>
                    <Text color="green">?</Text>
                    <TextInput value={input} onChange={setInput} onSubmit={handleSubmit} />
                </Box>
            )}
        </Box>
    )
}