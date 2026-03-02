import { google } from 'googleapis'
import { buildGoogleAuth, extractSpreadsheetId } from '@/lib/google-sheets'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const sheetUrl = request.nextUrl.searchParams.get('url')
    if (!sheetUrl) {
      return Response.json({ error: 'Missing url parameter' }, { status: 400 })
    }

    const spreadsheetId = extractSpreadsheetId(sheetUrl)
    if (!spreadsheetId) {
      return Response.json({ error: 'Invalid Google Sheet URL' }, { status: 400 })
    }

    const gsaB64 = request.headers.get('x-gsa-b64') ?? undefined
    const auth = buildGoogleAuth(gsaB64)
    const sheets = google.sheets({ version: 'v4', auth })

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'A1:Z1000',
    })

    const values = response.data.values ?? []
    if (values.length === 0) {
      return Response.json({ headers: [], rows: [], spreadsheetId })
    }

    const [headers, ...rows] = values
    return Response.json({ headers, rows, spreadsheetId })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
