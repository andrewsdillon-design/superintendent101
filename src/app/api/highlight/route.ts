// Highlight error ingestion endpoint for App Router
import { AppRouterHighlight } from '@highlight-run/next/server'

const withHighlight = AppRouterHighlight({ projectID: '3' })

export const GET = withHighlight(async () => new Response('OK'))
export const POST = withHighlight(async () => new Response('OK'))

