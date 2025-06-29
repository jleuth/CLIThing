export interface AnalyzerConfig {
    instructions: string
    tools: any[]
}

export type AnalyzerFactory = (dir: string, emit: (msg: string) => void ) => AnalyzerConfig

import { createBasicAnalyzer } from './basic.js'
import { codeAnalyzer } from './code.js'
import { configAnalyzer } from './config.js'
import { docsAnalyzer } from './docs.js'

export const analyzers: Record<string, AnalyzerFactory> = {
    basic: createBasicAnalyzer,
    code: codeAnalyzer,
    config: configAnalyzer,
    docs: docsAnalyzer
}