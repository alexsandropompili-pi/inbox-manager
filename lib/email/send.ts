/**
 * Postmark email sending helper.
 *
 * Requires POSTMARK_SERVER_TOKEN in environment.
 * The token is the "Server API token" found in Postmark → Servers → <your server> → API Tokens.
 */

interface SendReplyParams {
  /** Sending address — must be a verified Postmark sender signature */
  from: string
  /** Recipient (the original message sender) */
  to: string
  /** Subject — "Re: " prefix is added automatically if not already present */
  subject: string
  /** Plain-text body of the reply */
  body: string
  /** Original Postmark MessageID — used for email threading via In-Reply-To */
  inReplyTo?: string
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
