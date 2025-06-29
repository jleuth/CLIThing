# CLIThing
Like Claude Code, but for analyzing any directory of any kind.

CLIThing uses OpenAI Agents and special purpose-build analyzing agents with domain-specific tooling to help you analyze any data in any directory. CLIThing is useful for getting up to speed on projects you're joining, trying to figure out complex and obfuscated app structures, and any other analysis things a power user might need.

CLIThing was built for power users, that's why it's extensible. Anyone can write an analyzer and PR/Fork CLIThing and set it up for themselves. Just pop in your OpenAI API key and you're ready.

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