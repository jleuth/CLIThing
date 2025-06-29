import React, { useState } from "react";
import { Box, Text, useApp } from 'ink'
import TextInput from "ink-text-input";
import BigText from "ink-big-text";
import Spinner from 'ink-spinner'
import AnalyzerSession, { ChatMessage } from "./analyzer.js";

type Message = ChatMessage | { text: string; type: 'user'}

interface Props {
    dir: string
    model: string
}

export default function Repl({ dir }: Props) {
    const { exit } = useApp()
    const [session] = useState(() => new AnalyzerSession(dir))
    const [input, setInput] = useState('')
    const [messages, setMessages] = useState<Message[]>([])
    const [busy, setBusy] = useState(false)

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