/**
 * Tool registry: assembles every chat tool (one file each under ./tools/) into
 * the declaration list Gemini receives and the dispatcher runChatTurn calls.
 * To add a tool, create a file in ./tools/ exporting a ChatTool and list it here.
 */
import { createLessonPlan } from './tools/createLessonPlan'
import { getAssignmentPerformance } from './tools/getAssignmentPerformance'
import { getStudentOverview } from './tools/getStudentOverview'
import { listVocabWords } from './tools/listVocabWords'
import { proposeVocabAdditions } from './tools/proposeVocabAdditions'
import { proposeVocabRemovals } from './tools/proposeVocabRemovals'
import type { ChatTool, ToolContext } from './tools/shared'

export type { ToolContext } from './tools/shared'

const TOOLS: ChatTool[] = [
  getStudentOverview,
  getAssignmentPerformance,
  listVocabWords,
  proposeVocabAdditions,
  proposeVocabRemovals,
  createLessonPlan,
]

const TOOLS_BY_NAME = new Map(TOOLS.map((tool) => [tool.declaration.name, tool]))

/** What Gemini sees: every tool's schema, passed on each interactions.create call. */
export const TOOL_DECLARATIONS = TOOLS.map((tool) => tool.declaration)

/**
 * Runs one model-requested tool call and returns the JSON-serializable result
 * that goes back to Gemini. Never throws — errors are returned to the model.
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<unknown> {
  const tool = TOOLS_BY_NAME.get(name)
  if (!tool) return { error: `Unknown tool: ${name}` }
  try {
    return await tool.execute(args, ctx)
  } catch (err) {
    console.error(`[chat] tool ${name} failed:`, err)
    return { error: 'The tool failed to run. Tell the tutor you could not fetch this data right now.' }
  }
}
