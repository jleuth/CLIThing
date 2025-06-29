import * as fs from 'fs';
import * as path from 'path';
import { Agent, run } from '@openai/agents';

export default async function analyzeDirectory(dir: string, prompt: string) {

    const agent = new Agent({
        name: "Directory analyzer",
        instructions: "You are an analysis helper, analyzing files and folders according to the user's prompt."
    })

    const dirList = fs.readdirSync(dir).map((f: string) => path.join(dir, f));

    const result = await run(agent, prompt)

    return result.finalOutput as string
}