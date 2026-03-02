import Papa from 'papaparse'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const text = await request.text()
    if (!text.trim()) {
      return Response.json({ error: 'Empty CSV content' }, { status: 400 })
    }

    const result = Papa.parse<string[]>(text, {
      header: false,
      skipEmptyLines: true,
    })

    if (result.errors.length > 0 && result.data.length === 0) {
      return Response.json({ error: 'Failed to parse CSV' }, { status: 400 })
    }

    const [headers, ...rows] = result.data as string[][]
    return Response.json({ headers, rows })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
