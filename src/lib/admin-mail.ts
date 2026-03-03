import { ImapFlow } from 'imapflow'
import nodemailer from 'nodemailer'

export type MailAccount = 'dillon' | 'ron'

export interface MessageSummary {
  uid: number
  subject: string
  from: string
  date: string
  seen: boolean
  preview: string
}

export interface MessageFull extends MessageSummary {
  to: string
  html: string | null
  text: string | null
}

export interface FolderInfo {
  name: string
  path: string
  unread: number
}

export function getMailAccount(account: MailAccount) {
  if (account === 'dillon') {
    return {
      email: process.env.ADMIN_MAIL_DILLON_EMAIL!,
      name: process.env.ADMIN_MAIL_DILLON_NAME!,
      pass: process.env.ADMIN_MAIL_DILLON_PASS!,
    }
  }
  return {
    email: process.env.ADMIN_MAIL_RON_EMAIL!,
    name: process.env.ADMIN_MAIL_RON_NAME!,
    pass: process.env.ADMIN_MAIL_RON_PASS!,
  }
}

function makeClient(account: MailAccount) {
  const creds = getMailAccount(account)
  return new ImapFlow({
    host: process.env.ADMIN_MAIL_IMAP_HOST ?? 'imap.hostinger.com',
    port: Number(process.env.ADMIN_MAIL_IMAP_PORT ?? 993),
    secure: true,
    auth: { user: creds.email, pass: creds.pass },
    logger: false,
  })
}

/** Paginated message list (most recent first, 25 per page). */
export async function fetchMessages(
  account: MailAccount,
  folder: string,
  page: number,
): Promise<{ messages: MessageSummary[]; total: number }> {
  const client = makeClient(account)
  await client.connect()
  try {
    const mailbox = await client.mailboxOpen(folder, { readOnly: true })
    const total = mailbox.exists

    if (total === 0) return { messages: [], total: 0 }

    const pageSize = 25
    // Newest first: UID range end is the highest, paginate backwards
    const highUid = mailbox.uidNext - 1
    const low = Math.max(1, highUid - (page * pageSize) + 1)
    const high = Math.max(1, highUid - ((page - 1) * pageSize))

    const messages: MessageSummary[] = []

    for await (const msg of client.fetch(`${low}:${high}`, {
      uid: true,
      flags: true,
      envelope: true,
      bodyStructure: true,
    })) {
      const env = msg.envelope
      const from = env.from?.[0]
        ? (env.from[0].name || env.from[0].address || '')
        : ''
      messages.push({
        uid: msg.uid,
        subject: env.subject ?? '(no subject)',
        from,
        date: env.date ? env.date.toISOString() : '',
        seen: msg.flags.has('\\Seen'),
        preview: '',
      })
    }

    // Reverse so newest is first
    messages.reverse()
    return { messages, total }
  } finally {
    await client.logout()
  }
}

/** Full message body. */
export async function fetchMessage(
  account: MailAccount,
  folder: string,
  uid: number,
): Promise<MessageFull | null> {
  const client = makeClient(account)
  await client.connect()
  try {
    await client.mailboxOpen(folder, { readOnly: false })

    // Mark as read
    await client.messageFlagsAdd({ uid }, ['\\Seen'], { uid: true })

    let result: MessageFull | null = null

    for await (const msg of client.fetch(
      { uid },
      { uid: true, flags: true, envelope: true, source: true },
      { uid: true },
    )) {
      const env = msg.envelope
      const from = env.from?.[0]
        ? (env.from[0].name
            ? `${env.from[0].name} <${env.from[0].address}>`
            : env.from[0].address ?? '')
        : ''
      const to = env.to?.[0]?.address ?? ''

      // Parse source to extract HTML/text parts
      let rawSource = ''
      if (msg.source) {
        rawSource = msg.source.toString()
      }

      const { html, text } = parseBodyFromSource(rawSource)

      result = {
        uid: msg.uid,
        subject: env.subject ?? '(no subject)',
        from,
        to,
        date: env.date ? env.date.toISOString() : '',
        seen: true,
        preview: '',
        html: html || null,
        text: text || null,
      }
    }

    return result
  } finally {
    await client.logout()
  }
}

/** Simple multipart parser — extracts first text/html and text/plain from raw RFC822 source. */
function parseBodyFromSource(source: string): { html: string; text: string } {
  let html = ''
  let text = ''

  // Find boundary
  const boundaryMatch = source.match(/boundary="?([^"\r\n;]+)"?/i)
  if (boundaryMatch) {
    const boundary = '--' + boundaryMatch[1]
    const parts = source.split(boundary)
    for (const part of parts) {
      const lower = part.toLowerCase()
      if (lower.includes('content-type: text/html') && !html) {
        html = extractPartBody(part)
      } else if (lower.includes('content-type: text/plain') && !text) {
        text = extractPartBody(part)
      }
    }
  } else {
    // No multipart — try simple split at double CRLF
    const idx = source.indexOf('\r\n\r\n')
    if (idx !== -1) {
      const body = source.slice(idx + 4)
      const headerSection = source.slice(0, idx).toLowerCase()
      if (headerSection.includes('text/html')) {
        html = decodeBody(body, source)
      } else {
        text = decodeBody(body, source)
      }
    }
  }

  return { html, text }
}

function extractPartBody(part: string): string {
  // Skip part headers (up to double CRLF)
  const idx = part.indexOf('\r\n\r\n')
  if (idx === -1) return ''
  const body = part.slice(idx + 4).replace(/\r\n--$/, '').trim()
  return decodeBody(body, part)
}

function decodeBody(body: string, headers: string): string {
  const enc = (headers.match(/content-transfer-encoding:\s*(\S+)/i) ?? [])[1] ?? ''
  if (enc.toLowerCase() === 'base64') {
    try {
      return Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf-8')
    } catch {
      return body
    }
  }
  if (enc.toLowerCase() === 'quoted-printable') {
    return body
      .replace(/=\r\n/g, '')
      .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  }
  return body
}

/** Send email via SMTP. */
export async function sendMail(
  account: MailAccount,
  to: string,
  subject: string,
  html: string,
  text?: string,
) {
  const creds = getMailAccount(account)
  const transporter = nodemailer.createTransport({
    host: process.env.ADMIN_MAIL_SMTP_HOST ?? 'smtp.hostinger.com',
    port: Number(process.env.ADMIN_MAIL_SMTP_PORT ?? 465),
    secure: true,
    auth: { user: creds.email, pass: creds.pass },
  })

  await transporter.sendMail({
    from: `"${creds.name}" <${creds.email}>`,
    to,
    subject,
    html,
    text: text ?? html.replace(/<[^>]+>/g, ''),
  })
}

/** Mark message as read or unread. */
export async function markRead(
  account: MailAccount,
  folder: string,
  uid: number,
  seen: boolean,
) {
  const client = makeClient(account)
  await client.connect()
  try {
    await client.mailboxOpen(folder, { readOnly: false })
    if (seen) {
      await client.messageFlagsAdd({ uid }, ['\\Seen'], { uid: true })
    } else {
      await client.messageFlagsRemove({ uid }, ['\\Seen'], { uid: true })
    }
  } finally {
    await client.logout()
  }
}

/** Move message to Trash folder. */
export async function trashMessage(
  account: MailAccount,
  folder: string,
  uid: number,
) {
  const client = makeClient(account)
  await client.connect()
  try {
    await client.mailboxOpen(folder, { readOnly: false })
    // Try standard Trash names
    const trashNames = ['Trash', 'INBOX.Trash', '[Gmail]/Trash', 'Deleted Messages']
    let moved = false
    for (const trashFolder of trashNames) {
      try {
        await client.messageMove({ uid }, trashFolder, { uid: true })
        moved = true
        break
      } catch {
        // try next
      }
    }
    if (!moved) {
      // Just delete it
      await client.messageDelete({ uid }, { uid: true })
    }
  } finally {
    await client.logout()
  }
}

/** List folders with unread counts. */
export async function listFolders(account: MailAccount): Promise<FolderInfo[]> {
  const client = makeClient(account)
  await client.connect()
  try {
    const allFolders = await client.list()
    const wantedPaths = ['INBOX', 'Sent', 'Sent Messages', 'INBOX.Sent', 'Trash', 'INBOX.Trash', 'Spam', 'INBOX.Spam']

    const results: FolderInfo[] = []

    for (const folder of allFolders) {
      const path = folder.path
      const nameLower = folder.name.toLowerCase()
      const pathLower = path.toLowerCase()

      // Include INBOX, Sent, Trash, Spam variants
      const wantedNames = ['inbox', 'sent', 'sent messages', 'trash', 'spam', 'junk']
      if (!wantedNames.some(w => nameLower === w || pathLower.endsWith(w))) continue

      let unread = 0
      try {
        const status = await client.status(path, { unseen: true })
        unread = status.unseen ?? 0
      } catch {
        // ignore
      }

      results.push({
        name: folder.name === 'INBOX' ? 'Inbox' : folder.name,
        path,
        unread,
      })
    }

    // Sort: Inbox first, then Sent, then Trash, then others
    const order = ['inbox', 'sent', 'sent messages', 'trash', 'spam', 'junk']
    results.sort((a, b) => {
      const ai = order.indexOf(a.name.toLowerCase())
      const bi = order.indexOf(b.name.toLowerCase())
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })

    return results
  } finally {
    await client.logout()
  }
}
