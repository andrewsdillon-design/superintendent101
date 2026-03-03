import { Resend } from 'resend'
import nodemailer from 'nodemailer'
import { prisma } from '@/lib/db'
import { randomBytes } from 'crypto'
import { decrypt } from './encrypt'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

const BASE_URL = process.env.NEXTAUTH_URL ?? 'https://profieldhub.com'

// ─── Shared HTML wrapper ──────────────────────────────────────────────────────

function emailWrapper({
  headerColor = '#00e5ff',
  logoUrl,
  companyName,
  body,
}: {
  headerColor?: string
  logoUrl?: string | null
  companyName?: string | null
  body: string
}) {
  const displayName = companyName ?? 'ProFieldHub'
  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${displayName}" style="height:40px;object-fit:contain;margin-bottom:8px;" />`
    : ''

  return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#0a0f1a;font-family:sans-serif;">
      <div style="max-width:520px;margin:0 auto;padding:32px 16px;">
        <div style="margin-bottom:24px;">
          ${logoHtml}
          <h1 style="color:${headerColor};font-size:22px;margin:0;letter-spacing:1px;font-weight:800;">
            ${displayName}
          </h1>
          ${companyName ? `<p style="color:#64748b;font-size:12px;margin:4px 0 0 0;">powered by ProFieldHub</p>` : ''}
        </div>
        ${body}
        <hr style="border:none;border-top:1px solid #1e293b;margin:32px 0 16px;" />
        <p style="color:#475569;font-size:11px;margin:0;">
          ProFieldHub — Daily Log Builder for Construction Teams<br/>
          If you didn't expect this email, you can safely ignore it.
        </p>
      </div>
    </body>
    </html>
  `
}

// ─── Welcome email (company member add) ──────────────────────────────────────

export async function sendCompanyWelcomeEmail({
  toEmail,
  toName,
  companyName,
  companyLogoUrl,
  companyBrandColor,
}: {
  toEmail: string
  toName: string | null
  companyName: string
  companyLogoUrl?: string | null
  companyBrandColor?: string | null
}) {
  // Generate a password reset token so they can set their own password
  await prisma.passwordResetToken.deleteMany({ where: { email: toEmail } })
  const token = randomBytes(32).toString('hex')
  await prisma.passwordResetToken.create({
    data: {
      token,
      email: toEmail,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 72), // 72 hours
    },
  })

  const setPasswordUrl = `${BASE_URL}/reset-password?token=${token}`
  const brandColor = companyBrandColor ?? '#00e5ff'
  const greeting = toName ? `Hi ${toName.split(' ')[0]},` : 'Hi there,'

  const body = `
    <p style="color:#e2e8f0;font-size:16px;line-height:1.6;">${greeting}</p>
    <p style="color:#e2e8f0;font-size:15px;line-height:1.6;">
      You've been added to <strong style="color:${brandColor};">${companyName}</strong> on ProFieldHub —
      the daily log builder for construction field teams.
    </p>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6;">
      Use the button below to set your password and start logging. This link expires in <strong>72 hours</strong>.
    </p>
    <div style="margin:28px 0;">
      <a href="${setPasswordUrl}"
         style="display:inline-block;background:${brandColor};color:#000;padding:14px 28px;
                text-decoration:none;font-weight:800;font-size:14px;letter-spacing:0.5px;">
        SET YOUR PASSWORD →
      </a>
    </div>
    <p style="color:#64748b;font-size:13px;line-height:1.6;">
      Your login email is: <strong style="color:#e2e8f0;">${toEmail}</strong>
    </p>
  `

  await getResend().emails.send({
    from: 'ProFieldHub <noreply@profieldhub.com>',
    to: toEmail,
    subject: `You've been added to ${companyName} on ProFieldHub`,
    html: emailWrapper({ headerColor: brandColor, logoUrl: companyLogoUrl, companyName, body }),
  })
}

// ─── Admin-created user welcome email ────────────────────────────────────────

export async function sendAdminWelcomeEmail({
  toEmail,
  toName,
}: {
  toEmail: string
  toName: string | null
}) {
  await prisma.passwordResetToken.deleteMany({ where: { email: toEmail } })
  const token = randomBytes(32).toString('hex')
  await prisma.passwordResetToken.create({
    data: { token, email: toEmail, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 72) },
  })

  const setPasswordUrl = `${BASE_URL}/reset-password?token=${token}`
  const greeting = toName ? `Hi ${toName.split(' ')[0]},` : 'Hi there,'

  const body = `
    <p style="color:#e2e8f0;font-size:16px;line-height:1.6;">${greeting}</p>
    <p style="color:#e2e8f0;font-size:15px;line-height:1.6;">
      Your <strong style="color:#00e5ff;">ProFieldHub</strong> account has been created.
      ProFieldHub is a daily log builder built for construction field teams.
    </p>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6;">
      Click below to set your password and get started. This link expires in <strong>72 hours</strong>.
    </p>
    <div style="margin:28px 0;">
      <a href="${setPasswordUrl}"
         style="display:inline-block;background:#00e5ff;color:#000;padding:14px 28px;
                text-decoration:none;font-weight:800;font-size:14px;letter-spacing:0.5px;">
        SET YOUR PASSWORD →
      </a>
    </div>
    <p style="color:#64748b;font-size:13px;line-height:1.6;">
      Your login email is: <strong style="color:#e2e8f0;">${toEmail}</strong>
    </p>
  `

  await getResend().emails.send({
    from: 'ProFieldHub <noreply@profieldhub.com>',
    to: toEmail,
    subject: 'Welcome to ProFieldHub — Set your password',
    html: emailWrapper({ body }),
  })
}

// ─── Password reset email ─────────────────────────────────────────────────────

export async function sendPasswordResetEmail({ toEmail, resetUrl }: { toEmail: string; resetUrl: string }) {
  const body = `
    <p style="color:#e2e8f0;font-size:15px;line-height:1.6;">
      You requested a password reset. Click below to set a new password. This link expires in <strong>1 hour</strong>.
    </p>
    <div style="margin:28px 0;">
      <a href="${resetUrl}"
         style="display:inline-block;background:#00e5ff;color:#000;padding:14px 28px;
                text-decoration:none;font-weight:800;font-size:14px;letter-spacing:0.5px;">
        RESET PASSWORD →
      </a>
    </div>
    <p style="color:#64748b;font-size:13px;">If you didn't request this, ignore this email. Your password won't change.</p>
  `

  await getResend().emails.send({
    from: 'ProFieldHub <noreply@profieldhub.com>',
    to: toEmail,
    subject: 'Reset your ProFieldHub password',
    html: emailWrapper({ body }),
  })
}

// ─── Report sending (Option A: user SMTP / Option C: Resend fallback) ────────

export interface SmtpConfig {
  host: string
  port: number
  secure: boolean
  user: string
  passEnc: string
  fromName: string
  fromEmail: string
}

export interface ReportEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  attachments?: Array<{ filename: string; content: Buffer; contentType: string }>
  replyTo?: string   // user's real email for Resend Reply-To
}

export async function sendReportEmail(opts: ReportEmailOptions, smtp?: SmtpConfig | null) {
  if (smtp) {
    const pass = decrypt(smtp.passEnc)
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.user, pass },
      tls: { rejectUnauthorized: false },
    })
    await transporter.sendMail({
      from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      attachments: opts.attachments?.map(a => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    })
  } else {
    if (!process.env.RESEND_API_KEY) throw new Error('Email not configured — add RESEND_API_KEY or set up SMTP in your profile.')
    const from = process.env.RESEND_FROM_ADDRESS ?? 'reports@profieldhub.com'
    const { error } = await getResend().emails.send({
      from: `ProFieldHub <${from}>`,
      to: opts.to,
      reply_to: opts.replyTo,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      attachments: opts.attachments?.map(a => ({
        filename: a.filename,
        content: a.content.toString('base64'),
      })),
    })
    if (error) throw new Error(error.message)
  }
}

export function buildDailyLogEmailHtml(params: {
  logDate: string
  projectName: string | null
  userName: string
  note?: string
}): string {
  const { logDate, projectName, userName, note } = params
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
        <tr><td style="background:#0a0f1a;padding:24px 32px;">
          <span style="font-size:22px;font-weight:800;color:#f97316;letter-spacing:2px;">PROFIELDHUB</span>
          <p style="margin:4px 0 0;color:#6b7280;font-size:12px;letter-spacing:1px;">DAILY FIELD REPORT</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">Report from <strong style="color:#111827">${userName}</strong></p>
          <h1 style="margin:0 0 4px;font-size:24px;font-weight:800;color:#111827;">${logDate}</h1>
          ${projectName ? `<p style="margin:0 0 24px;font-size:14px;color:#f97316;font-weight:600;">${projectName}</p>` : '<p style="margin:0 0 24px;"></p>'}
          ${note ? `<div style="background:#f9fafb;border-left:3px solid #f97316;padding:12px 16px;margin-bottom:24px;border-radius:0 4px 4px 0;">
            <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${note.replace(/\n/g, '<br>')}</p>
          </div>` : ''}
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">
            The full daily field report is attached as a PDF. Open it to view crew counts, work performed, deliveries, inspections, and safety notes.
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
            Sent via <a href="https://profieldhub.com" style="color:#f97316;text-decoration:none;">ProFieldHub</a> · Field reporting for superintendents
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
