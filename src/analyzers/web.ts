import axios from 'axios'
import * as cheerio from 'cheerio'
import { webSearchTool, type HostedTool, tool } from '@openai/agents'
import { z } from 'zod'
import { AnalyzerConfig } from '.'
import { readFile, listFiles, listAllFiles, analyzeFile, done } from './basic.js'

export function webAnalyzer(dir: string, emit: (msg: string) => void): AnalyzerConfig {
    const systemPrompt = `You are a web analysis assistant. Use the web_search_preview hosted tool to search the web and your scraping tools to fetch pages. Always end by calling the "done" tool.`

    function emitToolMessage(msg: string) {
        console.log('[TOOL]', msg)
    }

    const readFileTool = readFile(emitToolMessage)
    const listFilesTool = listFiles(emitToolMessage)
    const listAllFilesTool = listAllFiles(dir, emitToolMessage)
    const analyzeFileTool = analyzeFile(dir, emitToolMessage)
    const doneTool = done(emitToolMessage)

    const fetchUrl = tool({
        name: 'fetch_url',
        description: 'Fetch a web page from a URL and return the raw HTML',
        parameters: z.object({ url: z.string() }),
        execute: async ({ url }: { url: string }) => {
            const res = await axios.get(url)
            emit(`Fetched URL: ${url}`)
            return res.data
        }
    })

    const scrapePage = tool({
        name: 'scrape_page',
        description: 'Scrape page with a CSS selector',
        parameters: z.object({ url: z.string(), selector: z.string() }),
        execute: async ({ url, selector }: { url: string; selector: string }) => {
            const res = await axios.get(url)
            const $ = cheerio.load(res.data)
            const text = $(selector).text().trim()
            emit(`Scraped ${selector} from ${url}`)
            return text
        }
    })

    const searchTool: HostedTool = webSearchTool()

    return {
        instructions: systemPrompt,
        tools: [
            readFileTool,
            listAllFilesTool,
            listFilesTool,
            analyzeFileTool,
            fetchUrl,
            scrapePage,
            searchTool,
            doneTool,
        ]
    }
}