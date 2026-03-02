import Groq from 'groq-sdk'
import type { SalesRow, ColumnMap, ForecastResult } from '@/types'
import { STAGE_WEIGHTS } from '@/lib/data-model'

export const runtime = 'nodejs'

function extractJSON(text: string): unknown {
  // Direct parse
  try { return JSON.parse(text) } catch {}
  // Markdown code block
  const block = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (block) { try { return JSON.parse(block[1].trim()) } catch {} }
  // First { … last }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)) } catch {}
  }
  const preview = text.trim().slice(0, 400)
  throw new Error(`Could not extract JSON from model response. Raw output: ${preview}`)
}

const REVOPS_SYSTEM_PROMPT = `You are a senior B2B RevOps pipeline forecast analyst specializing in AI/technology solution sales.

BUSINESS CONTEXT:
The company has 13 shortlisted use cases, each targeted at 4 customer buckets.

CUSTOMER BUCKETS — avg accounts per use case:
- Startups: ~20 accounts, ~10 qualified personas each
- Big Tech: ~10 accounts, ~50 qualified personas each
- AI Labs: ~7 accounts, ~20 qualified personas each
- Enterprises: ~15 accounts, ~30 qualified personas each

PIPELINE STAGE WEIGHTS (for weighted pipeline calculation):
- Discovery: 10%
- Qualified: 15%
- Technical Validation (Demo / Pilot / POC): 30%
- Decision Process: 70%
- Commit: 90%

AVERAGE TICKET SIZES:
- Big Tech    → Pilot: $30,000  | Production: $250,000
- Enterprise  → Pilot: $10,000  | Production: $150,000
- AI Labs     → Pilot: $10,000  | Production: $200,000
- Startups    → Pilot: $7,000   | Production: $100,000

CAMPAIGN STRUCTURE:
- 8 campaigns run per quarter (mix of Sales-led and Marketing-led)
- SQL = a qualified conversation that led to a discovery call where pain was identified OR solution fit was confirmed
- Target SQLs are generated from both Sales and Marketing campaigns
- INTEREST GENERATED: Measures engagement/interest from outreach — numeric (1–5 scale) or categorical (High/Medium/Low). High interest with no SQL yet = prime conversion opportunity.

Use this context to provide highly specific, accurate forecasting. Reference stage weights, ticket size benchmarks, and interest generated data explicitly in your analysis. Flag deals with high interest that haven't converted to SQL. Flag deals where deal value is misaligned with the expected ticket size for the customer bucket.

CRITICAL OUTPUT RULE: Your ENTIRE response must be a single raw JSON object. Do NOT include any text, explanation, commentary, or markdown before or after the JSON. Do NOT wrap it in a code block. Begin your response with { and end with }.`

export async function POST(request: Request) {
  try {
    const groqApiKey = request.headers.get('x-groq-api-key') || process.env.GROQ_API_KEY
    if (!groqApiKey) {
      return Response.json({ error: 'Groq API key not configured. Add it via the API Keys panel.' }, { status: 400 })
    }
    const groq = new Groq({ apiKey: groqApiKey })

    const { rows, columnMap }: { rows: SalesRow[]; columnMap: ColumnMap } = await request.json()

    if (!rows || rows.length === 0) {
      return Response.json({ error: 'No data provided' }, { status: 400 })
    }

    // Pre-compute aggregates
    const rawPipeline = rows.reduce((s, r) => s + (r.dealValue ?? 0), 0)
    const weightedPipeline = rows.reduce((s, r) => s + (r.weightedValue ?? 0), 0)
    const sqlCount = rows.filter(r => r.isSQL === true).length

    // Stage breakdown
    const stageBreakdown: Record<string, { count: number; rawValue: number; weightedValue: number }> = {}
    rows.forEach(r => {
      const s = r.status || 'Unknown'
      if (!stageBreakdown[s]) stageBreakdown[s] = { count: 0, rawValue: 0, weightedValue: 0 }
      stageBreakdown[s].count++
      stageBreakdown[s].rawValue += r.dealValue ?? 0
      stageBreakdown[s].weightedValue += r.weightedValue ?? 0
    })

    // Bucket breakdown
    const bucketBreakdown: Record<string, { count: number; rawValue: number; weightedValue: number }> = {}
    rows.forEach(r => {
      const b = r.customerBucket || 'Unknown'
      if (!bucketBreakdown[b]) bucketBreakdown[b] = { count: 0, rawValue: 0, weightedValue: 0 }
      bucketBreakdown[b].count++
      bucketBreakdown[b].rawValue += r.dealValue ?? 0
      bucketBreakdown[b].weightedValue += r.weightedValue ?? 0
    })

    // Use case breakdown
    const useCaseCounts: Record<string, number> = {}
    rows.forEach(r => {
      if (r.useCase) useCaseCounts[r.useCase] = (useCaseCounts[r.useCase] ?? 0) + 1
    })

    // Campaign breakdown
    const campaignCounts: Record<string, number> = {}
    rows.forEach(r => {
      if (r.campaignType) campaignCounts[r.campaignType] = (campaignCounts[r.campaignType] ?? 0) + 1
    })

    // Interest generated breakdown
    const interestRows = rows.filter(r => r.interestLevel != null && r.interestLevel !== '')
    const numericInterest = interestRows.map(r => parseFloat(r.interestLevel ?? '')).filter(n => !isNaN(n))
    const avgInterest = numericInterest.length > 0
      ? (numericInterest.reduce((a, b) => a + b, 0) / numericInterest.length).toFixed(2)
      : null
    const interestDistribution: Record<string, number> = {}
    interestRows.forEach(r => {
      const v = r.interestLevel!.trim()
      interestDistribution[v] = (interestDistribution[v] ?? 0) + 1
    })

    const dataRows = rows.map((row, i) => ({
      index: i + 1,
      company: row.leadName ?? 'Unknown',
      bucket: row.customerBucket ?? 'Unknown',
      useCase: row.useCase ?? null,
      stage: row.status ?? 'Unknown',
      dealType: row.dealType ?? null,
      dealValue: row.dealValue ?? 0,
      weightedValue: row.weightedValue ?? 0,
      isSQL: row.isSQL ?? false,
      interestGenerated: row.interestLevel ?? null,
      campaign: row.campaignType ?? null,
      campaignName: row.campaignName ?? null,
      qualifiedPersonas: row.qualifiedPersonas ?? null,
      closeDate: row.closeDate ?? null,
      owner: row.owner ?? null,
      notes: row.notes ? row.notes.slice(0, 120) : null,
    }))

    const userPrompt = `Analyze this RevOps pipeline and return a structured JSON forecast.

PIPELINE SUMMARY:
- Total deals: ${rows.length}
- Raw pipeline value: $${rawPipeline.toLocaleString()}
- Weighted pipeline (stage-adjusted): $${weightedPipeline.toLocaleString()}
- SQLs in pipeline: ${sqlCount}
- Interest generated (rows with data): ${interestRows.length}${avgInterest != null ? ` — avg: ${avgInterest}` : ''}
- Interest distribution: ${Object.keys(interestDistribution).length > 0 ? JSON.stringify(interestDistribution) : 'not available'}
- Stage weights applied: ${JSON.stringify(STAGE_WEIGHTS)}

STAGE BREAKDOWN:
${JSON.stringify(stageBreakdown, null, 2)}

BUCKET BREAKDOWN:
${JSON.stringify(bucketBreakdown, null, 2)}

USE CASE DISTRIBUTION:
${JSON.stringify(useCaseCounts, null, 2)}

CAMPAIGN DISTRIBUTION:
${JSON.stringify(campaignCounts, null, 2)}

DETAILED DEAL DATA:
${JSON.stringify(dataRows, null, 2)}

OUTPUT INSTRUCTIONS: Begin your response with { immediately. Do not write anything before {. Return a JSON object with exactly these fields and types:

{
  "weightedPipelineTotal": 255000,
  "rawPipelineTotal": 748000,
  "quarterlyForecast": 320000,
  "sqlCount": 7,
  "targetSQLsPerCampaign": 4,
  "sqlConversionRate": 28.5,
  "pipelineByStage": {
    "discovery": 12000,
    "qualified": 22500,
    "technicalValidation": 117000,
    "decisionProcess": 87500,
    "commit": 16000
  },
  "pipelineByBucket": {
    "startup": 8200,
    "bigtech": 139500,
    "ailab": 3000,
    "enterprise": 120000
  },
  "projectedRevenue": {
    "days30": 105000,
    "days60": 210000,
    "days90": 320000
  },
  "predictedConversionRate": 34.2,
  "leadQualityScore": 7.1,
  "pipelineHealthSummary": "Two to three sentences about stage distribution and bucket mix based on actual data.",
  "insights": [
    "Insight about stage concentration or weighted value distribution.",
    "Insight about SQL quality or which campaigns are driving pipeline.",
    "Insight about deal size alignment or ticket size mismatches."
  ],
  "recommendations": [
    "Specific action to improve pipeline velocity or close rate.",
    "Recommendation about SQL target or campaign focus adjustments.",
    "Which bucket or use case to prioritize for the next 30 days."
  ],
  "riskFactors": [
    "Risk related to stage concentration, deal age, or stale opportunities.",
    "Risk related to bucket mix imbalance or deal value misalignment."
  ],
  "topLeadsToFocus": [2, 8, 12],
  "topPerformingUseCase": "Multimodal - Video",
  "topPerformingBucket": "Enterprise"
}

Replace every value above with figures and text derived from the actual pipeline data provided. All numeric fields must be numbers (no quotes, no $ signs). String fields must be plain text.`

    const messages = [
      { role: 'system' as const, content: REVOPS_SYSTEM_PROMPT },
      { role: 'user'   as const, content: userPrompt },
    ]

    // Primary: gpt-oss-120b (fast, no json_object mode)
    let forecast: ForecastResult
    try {
      const primary = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages,
        temperature: 0.2,
        max_tokens: 2000,
      })
      const raw = primary.choices[0].message.content ?? ''
      forecast = extractJSON(raw) as ForecastResult
    } catch {
      // Fallback: llama-3.3-70b-versatile with native JSON mode
      const fallback = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 2000,
      })
      const raw = fallback.choices[0].message.content ?? '{}'
      forecast = extractJSON(raw) as ForecastResult
    }

    return Response.json(forecast)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
