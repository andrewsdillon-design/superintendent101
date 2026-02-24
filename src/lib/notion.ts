// Notion helper — push and fetch dust logs

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

const NOTION_VERSION = '2022-06-28'

function notionHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  }
}

/**
 * Searches the user's Notion workspace for the best database to store this log.
 * Priority: 1) database name matches project name, 2) matches job type, 3) default DB.
 */
export async function findBestDatabase(
  token: string,
  defaultDbId: string,
  projectName: string,
  jobType: string
): Promise<{ id: string; name: string }> {
  try {
    const res = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: notionHeaders(token),
      body: JSON.stringify({
        filter: { value: 'database', property: 'object' },
        sort: { direction: 'descending', timestamp: 'last_edited_time' },
      }),
    })

    if (!res.ok) return { id: defaultDbId, name: 'default' }

    const data = await res.json()
    const databases: any[] = data.results || []

    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
    const project = normalize(projectName)
    const job = normalize(jobType)

    // 1. Project name match (DB title contains project name or vice versa)
    const projectMatch = databases.find((db) => {
      const title = normalize(db.title?.[0]?.plain_text || '')
      return title && (title.includes(project) || project.includes(title))
    })
    if (projectMatch) {
      return {
        id: projectMatch.id,
        name: projectMatch.title?.[0]?.plain_text || 'project-matched',
      }
    }

    // 2. Job type match
    const jobMatch = databases.find((db) => {
      const title = normalize(db.title?.[0]?.plain_text || '')
      return title && title.includes(job)
    })
    if (jobMatch) {
      return {
        id: jobMatch.id,
        name: jobMatch.title?.[0]?.plain_text || 'job-type-matched',
      }
    }

    return { id: defaultDbId, name: 'default' }
  } catch {
    return { id: defaultDbId, name: 'default' }
  }
}

/**
 * Pushes a structured log to the target Notion database.
 */
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

  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: notionHeaders(token),
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
        ...(structured.jobType
          ? { 'Job Type': { select: { name: structured.jobType } } }
          : {}),
        Tags: {
          multi_select: structured.tags.map((t) => ({ name: t })),
        },
        Summary: {
          rich_text: [{ text: { content: structured.summary || '' } }],
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

/**
 * Fetches logs from the user's Notion database, sorted newest first.
 */
export async function fetchLogsFromNotion(token: string, databaseId: string) {
  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: 'POST',
    headers: notionHeaders(token),
    body: JSON.stringify({
      sorts: [{ property: 'Date', direction: 'descending' }],
      page_size: 50,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Notion query failed: ${err}`)
  }

  const data = await res.json()

  return (data.results || []).map((page: any) => {
    const props = page.properties
    const rawTitle = props.Name?.title?.[0]?.plain_text || 'Untitled'
    // Title format: "2026-02-24 — Project Name"
    const titleParts = rawTitle.split(' — ')
    const projectName = titleParts.length > 1 ? titleParts.slice(1).join(' — ') : rawTitle

    return {
      id: page.id,
      projectName,
      address: props.Location?.rich_text?.[0]?.plain_text || '',
      date: props.Date?.date?.start || '',
      summary: props.Summary?.rich_text?.[0]?.plain_text || '',
      tags: props.Tags?.multi_select?.map((t: any) => t.name) || [],
      jobType: props['Job Type']?.select?.name || '',
      status: 'COMPLETED',
      notionUrl: page.url,
    }
  })
}

// ── Block builders ────────────────────────────────────────────────────────────

function buildNotionBlocks(structured: StructuredLog) {
  const blocks: any[] = []

  if (structured.summary) {
    blocks.push(paragraph(structured.summary))
    blocks.push(divider())
  }

  if (structured.safety?.length > 0) {
    blocks.push(heading('⚠️ SAFETY', 'red'))
    structured.safety.forEach((s) => blocks.push(bullet(s)))
  }

  if (structured.workCompleted?.length > 0) {
    blocks.push(heading('✓ WORK COMPLETED', 'green'))
    structured.workCompleted.forEach((w) => blocks.push(bullet(w)))
  }

  if (structured.issues?.length > 0) {
    blocks.push(heading('⚡ ISSUES / RFIs', 'orange'))
    structured.issues.forEach((i) => blocks.push(bullet(i)))
  }

  if (structured.nextSteps?.length > 0) {
    blocks.push(heading('→ NEXT STEPS', 'blue'))
    structured.nextSteps.forEach((n) => blocks.push(bullet(n)))
  }

  if (structured.structuredLog) {
    blocks.push(divider())
    blocks.push(heading('📋 FULL LOG', 'default'))
    blocks.push(paragraph(structured.structuredLog))
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
    bulleted_list_item: { rich_text: [{ text: { content: text } }] },
  }
}

function paragraph(text: string) {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: { rich_text: [{ text: { content: text } }] },
  }
}

function divider() {
  return { object: 'block', type: 'divider', divider: {} }
}
