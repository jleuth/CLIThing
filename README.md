# CLIThing
Like Claude Code, but for analyzing any directory of any kind.

CLIThing uses OpenAI Agents and special purpose-build analyzing agents with domain-specific tooling to help you analyze any data in any directory. CLIThing is useful for getting up to speed on projects you're joining, trying to figure out complex and obfuscated app structures, and any other analysis things a power user might need.

CLIThing was built for power users, that's why it's extensible. Anyone can write an analyzer and PR/Fork CLIThing and set it up for themselves. Just pop in your OpenAI API key and you're ready.

## Usage
`clithing [options] <directory> [query (use this if you don't want interactive mode, just a one-off question)]`

Avaliable options:
 -m, --model | pick any availiable OpenAI model. Compatable with reasoning models as well, so if you're a masochist you can use o1-pro and pay $600/mTok out and $150/mTok in!
 -a --analyzer | Pick an analyzer to get more focused results on tasks.
 -d --deep-report <question> | Get a detailed markdown report on the current directory and any questions you have on it. NOTE: To use this, you must have the model flag set an o-series model.

### Setup
To set up CLIThing, pull the repository

```bash
git pull https://github.com/jleuth/CLIThing.git && cd CLIThing
```

Then build it with
```bash
npm i && npm run build
```
this should only take a few seconds

After that, make a `.env` and enter `OPENAI_API_KEY=sk-proj-xxx`. If you don't have an API key, learn more here: https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key

*NOTE: You have to pay for your own credits. Don't worry, it's like $5 min*

That's it! Run `clithing .` and analyze your first directory/file

### Why not just upload my files to ChatGPT/Claude/Gemini?
Since CLIThing is meant for power users, I wanted to make two things certain:

1. It was a CLI utility
2. It worked in bulk
3. It was fast to get in-and-out of

Those platforms are great, but suck for working with bulk files. CLIThing uploads, indexes, and prunes your files for you in bulk, so you don't have to worry too much about the context window. 

Often times I find myself saying "WHY CAN'T A POWER USER JUST DO HIS THING??" when faced with "user friendliness" limitations. That's why CLIThing just analyzes, answers questions, and gets out of your way.

### Why not use Claude Code/Gemini CLI/OpenAI Codex?
Technically, they work fine. However, they're meant for agentic coding/vibe coding, not general terminal use. The closest contender would be Gemini CLI, which does more general work, especially with it's high free usage limits. But IMO OpenAI still leads in model polish, so I wanted an OpenAI version.

### How do I use a specific analyzer?
To use a specific analyzer for a domain-specific task, you'll want to run "clithing -a <chosen analyzer> ." The currently availiable analyzers are:

 -Basic (default)
 -Code (for coding and code analysis)
 -Config (Helps with configuration files, great for ricing a linux distro)
 -Docs (Comb through documentation quickly)
 -Env (Handle and set up environments faster)
 -Logs (Comb through logs and find what you're looking for faster)

Each one has domain-specific tools to help them in answering your questions.

### Deep report mode
To get an in-depth report on a question regarding your directory, you can run "clithing -m o3 -d What is going on in this project?" or ":model o3" ":deep-research What is going on in this project?", and it'll think harder before giving a response. You must use an o-series reasoning model in Deep Report mode. 

### Rules and Flags
Inside the interactive environment you can control the model's behavior without needing to rewrite the system prompt with rules and flags.

`:flag <name> [on|off]` - enable or disable a named flag
`:flags` - list all active flags
`:clear-flags` - remove all current flags
`:rule <text>` - add an additional instruction to persist through your session
`:rules` - show currently set rules
`:clear-rules` - remove all custom rules

#### Rules vs. Flags
Rules are custom text-based instructions for the model. It's basically just adding your own stuff to the system prompt right in the interactive environent, no reload necessary. An example of this might be `:rule Always respond in Spanish`

Flags are simple booleans to turn on or off certain pre-written aspects of CLIThing or an analyzer. They don't change the model's behavior past allowing/blocking certain things. A good example of this would be `:flag ARBITRARY_COMMAND_EXECUTION off`.


### How do I write my own analyzer?
CLIThing is designed to be extensible, so you can write your own analyzer for your needs. An "analyzer" is just a small function that registers extra new tools with OpenAI Agents, change the allowed toolset, and changes the system prompt to whatever you need. 

1. **Create a new file in src/analyzers with a useful name**
2. **Write your analyzer**
    ```ts
        import { AnalyzerConfig } from "./index.js"
        import { tools } from "@openai/agents"
        import { readFile, listFiles, listAllFiles, analyzeFile, done } from "./basic.js" // if you want the full basic toolset. The only NECESSARY one is "done".
        import { z } from "zod" // Highly recommended with OpenAI Agents tool definitions, doing all that JSON is confusing and no fun.
    ```
3. **Register your analyzer in src/analyzers/index.ts**
To do this, just import it like `import { cookieAnalyzer } from "./cookies.ts"` and add it to AnalyzerFactory

```ts
export const analyzers: Record<string, AnalyzerFactory> = {
    basic: createBasicAnalyzer,
    cookie: cookieAnalyzer, // the key is what you want people to type when calling the analyzer "-a cookie", the value is whatever your export/import was called.
}
```

4. **Run `npm run build` and that's it!***
