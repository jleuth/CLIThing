import React, { useState } from "react";
import { Box, Text, useApp } from 'ink'
import TextInput from "ink-text-input";
import BigText from "ink-big-text";
import Spinner from 'ink-spinner'
import AnalyzerSession from "./analyzer.js";

interface Props {
    dir: string
}

export default function Repl({ dir }: Props) {
    const { exit } = useApp()
    const [session] = useState(() => new AnalyzerSession(dir))
    const [input, setInput] = useState('')
    const [messages, setMessages] = useState<string[]>([])
    const [busy, setBusy] = useState(false)

    const handleSubmit = async () => {
        const q = input.trim()
        if (q.toLowerCase() === 'exit') {
            exit()
            return
        }

        setInput('')
        setBusy(true)
        const outputs = await session.ask(q)
        setMessages(m => [...m, `> ${q}`, ...outputs])
        setBusy(false)
    }

    return (
        <Box flexDirection="column">
            <BigText text="CLIThing" font="tiny" />
            {messages.map((m, i) => (
                <Text key={i}>{m}</Text>
            ))}
            {busy ? (
                <Text color="magenta"><Spinner type="dots" />Big think...</Text>
            ) : (
                <Box>
                    <Text color="green">?</Text>
                    <TextInput value={input} onChange={setInput} onSubmit={handleSubmit} />
                </Box>
            )}
        </Box>
    )
}