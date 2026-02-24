// Notion push helper — used after GPT-4o structuring

interface StructuredLog {
  summary: string
  workCompleted: string[]
  issues: string[]
  safety: string[]
  nextSteps: string[]
  tags: string[]
  jobType: string
  structuredLog: string
}

export async function pushLogToNotion(
  token: string,
  databaseId: string,
  logData: {
    projectName: string
    address: string
    date: string
    structured: StructuredLog
  }
) {
  const { projectName, address, date, structured } = logData

  // Create the page in the user's ProFieldHub Dust Logs database
  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: {
        Name: {
          title: [{ text: { content: `${date} — ${projectName}` } }],
        },
        Date: { date: { start: date } },
        Location: {
          rich_text: [{ text: { content: address } }],
        },
        'Job Type': structured.jobType
          ? { select: { name: structured.jobType } }
          : undefined,
        Tags: {
          multi_select: structured.tags.map(t => ({ name: t })),
        },
        Summary: {
          rich_text: [{ text: { content: structured.summary } }],
        },
      },
      children: buildNotionBlocks(structured),
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Notion API error: ${err}`)
  }

  return response.json()
}

function buildNotionBlocks(structured: StructuredLog) {
  const blocks: any[] = []

  if (structured.safety.length > 0) {
    blocks.push(heading('⚠️ SAFETY', 'red'))
    structured.safety.forEach(s => blocks.push(bullet(s)))
  }

  if (structured.workCompleted.length > 0) {
    blocks.push(heading('✓ WORK COMPLETED', 'green'))
    structured.workCompleted.forEach(w => blocks.push(bullet(w)))
  }

  if (structured.issues.length > 0) {
    blocks.push(heading('⚡ ISSUES / RFIs', 'orange'))
    structured.issues.forEach(i => blocks.push(bullet(i)))
  }

  if (structured.nextSteps.length > 0) {
    blocks.push(heading('→ NEXT STEPS', 'blue'))
    structured.nextSteps.forEach(n => blocks.push(bullet(n)))
  }

  return blocks
}

function heading(text: string, color: string) {
  return {
    object: 'block',
    type: 'heading_3',
    heading_3: {
      rich_text: [{ text: { content: text }, annotations: { bold: true, color } }],
    },
  }
}

function bullet(text: string) {
  return {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [{ text: { content: text } }],
    },
  }
}
