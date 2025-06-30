export interface AnalyzerConfig {
    instructions: string
    tools: any[]
}

export type AnalyzerFactory = (dir: string, emit: (msg: string) => void ) => AnalyzerConfig

import { createBasicAnalyzer } from './basic.js'
import { codeAnalyzer } from './code.js'
import { configAnalyzer } from './config.js'
import { docsAnalyzer } from './docs.js'
import { jsonAnalyzer } from './json.js'
import { logAnalyzer } from './logs.js'
import { securityAnalyzer } from './security.js'
import { webAnalyzer } from './web.js'

export const analyzers: Record<string, AnalyzerFactory> = {
    basic: createBasicAnalyzer,
    code: codeAnalyzer,
    config: configAnalyzer,
    docs: docsAnalyzer,
    json: jsonAnalyzer,
    logs: logAnalyzer,
    security: securityAnalyzer,
    web: webAnalyzer
}