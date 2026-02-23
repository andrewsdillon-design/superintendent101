// Notion integration helper
// Requires NOTION_CLIENT_ID, NOTION_CLIENT_SECRET, NOTION_DATABASE_ID env vars

export async function pushToNotion(token: string, logData: {
  projectName: string
  address: string
  content: string
  tags: string[]
  date: string
  jobType?: string
  client?: string
}) {
  if (!process.env.NOTION_DATABASE_ID) {
    throw new Error('NOTION_DATABASE_ID not configured')
  }

  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: { database_id: process.env.NOTION_DATABASE_ID },
      properties: {
        Name: {
          title: [{ text: { content: `${logData.date} — ${logData.projectName}` } }],
        },
        Location: {
          rich_text: [{ text: { content: logData.address } }],
        },
        Tags: {
          multi_select: logData.tags.map(tag => ({ name: tag })),
        },
        Date: {
          date: { start: logData.date },
        },
      },
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ text: { content: logData.content } }],
          },
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`Notion API error: ${response.statusText}`)
  }

  return response.json()
}
