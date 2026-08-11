import 'server-only'

import { GoogleGenAI } from '@google/genai'

export const GEMINI_MODEL = 'gemini-3.6-flash'

let client: GoogleGenAI | null = null

/** Singleton Gemini client. Throws early if GEMINI_API_KEY is missing. */
export function getGemini(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set — add it to .env')
    }
    client = new GoogleGenAI({ apiKey })
  }
  return client
}
