/**
 * Postmark email sending helper.
 *
 * Requires POSTMARK_SERVER_TOKEN in environment.
 * The token is the "Server API token" found in Postmark → Servers → <your server> → API Tokens.
 */

export interface OutboundAttachment {
  name: string
  content: string      // base64
  contentType: string
}

interface SendReplyParams {
  from: string
  to: string
  subject: string
  body: string
  inReplyTo?: string
  attachments?: OutboundAttachment[]
}

export async function sendReply(params: SendReplyParams): Promise<void> {
  const token = process.env.POSTMARK_SERVER_TOKEN
  if (!token) {
    throw new Error('POSTMARK_SERVER_TOKEN is not configured')
  }

  const subject = /^re:/i.test(params.subject.trim())
    ? params.subject
    : `Re: ${params.subject}`

  const payload: Record<string, unknown> = {
    From: params.from,
    To: params.to,
    Subject: subject,
    TextBody: params.body,
  }

  if (params.inReplyTo) {
    payload.Headers = [{ Name: 'In-Reply-To', Value: params.inReplyTo }]
  }

  if (params.attachments && params.attachments.length > 0) {
    payload.Attachments = params.attachments.map((a) => ({
      Name: a.name,
      Content: a.content,
      ContentType: a.contentType,
    }))
  }

  const res = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'X-Postmark-Server-Token': token,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Postmark send failed [${res.status}]: ${detail}`)
  }
}
