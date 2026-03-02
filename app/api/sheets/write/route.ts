import { google } from 'googleapis'
import { buildGoogleAuth } from '@/lib/google-sheets'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const gsaB64 = request.headers.get('x-gsa-b64') ?? undefined
    const { spreadsheetId, rowIndex, values } = await request.json()

    if (!spreadsheetId || rowIndex == null || !Array.isArray(values)) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const auth = buildGoogleAuth(gsaB64)
    const sheets = google.sheets({ version: 'v4', auth })

    // rowIndex is 0-based data row. +2 accounts for header row and 1-based indexing.
    const sheetRow = rowIndex + 2
    const range = `A${sheetRow}:Z${sheetRow}`

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [values] },
    })

    return Response.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
