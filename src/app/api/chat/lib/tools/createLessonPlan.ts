import type { ChatTool, ToolContext } from './shared'

/** Delivers a complete markdown lesson plan to the UI as a downloadable file card. */
export const createLessonPlan: ChatTool = {
  declaration: {
    type: 'function',
    name: 'create_lesson_plan',
    description:
      'Delivers a finished lesson plan to the tutor as a downloadable markdown file for their next live lesson. Fetch real metrics with the other tools first and base the plan on them. Write the complete document: objectives, warm-up, timed activities, vocabulary focus, and homework.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short human title, e.g. "Maria — Travel Vocabulary Review".' },
        markdown: { type: 'string', description: 'The complete lesson plan document in markdown.' },
      },
      required: ['title', 'markdown'],
    },
  },
  execute: (args, ctx: ToolContext) => {
    let title = 'Lesson plan'
    if (typeof args.title === 'string' && args.title.trim()) {
      title = args.title.trim()
    }

    let markdown = ''
    if (typeof args.markdown === 'string') {
      markdown = args.markdown.trim()
    }
    if (!markdown) return { error: 'markdown is required — write the full lesson plan document.' }

    const date = new Date().toISOString().slice(0, 10)
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'lesson-plan'
    const filename = `${slug}-${date}.md`

    ctx.emit({ type: 'lesson_plan', plan: { title, filename, markdown } })
    return {
      status: 'delivered',
      filename,
      note: 'The lesson plan is displayed with a download button. Keep your chat reply to a short summary — do not repeat the whole plan.',
    }
  },
}
