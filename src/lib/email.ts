import { Resend } from 'resend'
import { prisma } from '@/lib/db'
import { randomBytes } from 'crypto'

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
