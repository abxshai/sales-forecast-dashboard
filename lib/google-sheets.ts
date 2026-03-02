import { google } from 'googleapis'
import { JWT } from 'google-auth-library'

export function buildGoogleAuth(b64Override?: string): JWT {
  const b64 = b64Override || process.env.GOOGLE_SERVICE_ACCOUNT_B64
  if (!b64) throw new Error('Google Service Account not configured. Add it via the API Keys panel or set GOOGLE_SERVICE_ACCOUNT_B64.')

  const credentials = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'))

  return new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

export function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : null
}
