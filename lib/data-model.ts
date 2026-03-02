import type { ColumnMap, SalesRow } from '@/types'

// RevOps stage weights
export const STAGE_WEIGHTS: Record<string, number> = {
  'discovery': 0.10,
  'qualified': 0.15,
  'technical validation': 0.30,
  'demo': 0.30,
  'pilot': 0.30,
  'poc': 0.30,
  'proof of concept': 0.30,
  'decision process': 0.70,
  'commit': 0.90,
  'closed won': 1.0,
  'won': 1.0,
}

export function getStageWeight(stage?: string): number {
  if (!stage) return 0
  return STAGE_WEIGHTS[stage.toLowerCase().trim()] ?? 0
}

export function normalizeRows(
  headers: string[],
  rows: string[][],
  columnMap: ColumnMap
): SalesRow[] {
  return rows.map((row, i) => {
    const get = (field: string): string | undefined =>
      columnMap[field] != null ? row[columnMap[field]!] ?? '' : undefined

    const rawValue = get('dealValue') ?? ''
    const parsedValue = parseFloat(rawValue.replace(/[$,\s]/g, ''))
    const dealValue = isNaN(parsedValue) ? undefined : parsedValue

    const stage = get('status') || undefined
    const stageWeight = getStageWeight(stage)

    // Use explicit weighted value column if present, else compute from stage
    const rawWeighted = get('weightedValue')
    const parsedWeighted = rawWeighted ? parseFloat(rawWeighted.replace(/[$,\s]/g, '')) : NaN
    const weightedValue = !isNaN(parsedWeighted)
      ? parsedWeighted
      : dealValue != null
      ? dealValue * stageWeight
      : undefined

    const sqlRaw = get('isSQL')?.toLowerCase().trim()
    const isSQL = sqlRaw === 'yes' || sqlRaw === 'true' || sqlRaw === '1' || sqlRaw === 'y'

    return {
      _rawIndex: i,
      _raw: row,
      leadName: get('leadName') || undefined,
      dealValue,
      weightedValue,
      status: stage,
      customerBucket: get('customerBucket') || undefined,
      useCase: get('useCase') || undefined,
      campaignType: get('campaignType') || undefined,
      campaignName: get('campaignName') || undefined,
      dealType: get('dealType') || undefined,
      isSQL: sqlRaw != null ? isSQL : undefined,
      qualifiedPersonas: parseInt(get('qualifiedPersonas') ?? '') || undefined,
      interestLevel: get('interestLevel') || undefined,
      leadsContacted: parseInt(get('leadsContacted') ?? '') || undefined,
      date: get('date') || undefined,
      closeDate: get('closeDate') || undefined,
      owner: get('owner') || undefined,
      notes: get('notes') || undefined,
    }
  })
}

export function computeMetrics(rows: SalesRow[]) {
  const totalDeals = rows.length
  const rawPipeline = rows.reduce((s, r) => s + (r.dealValue ?? 0), 0)
  const weightedPipeline = rows.reduce((s, r) => s + (r.weightedValue ?? 0), 0)

  const sqlCount = rows.filter(r => r.isSQL === true).length
  const sqlRate = totalDeals > 0 ? (sqlCount / totalDeals) * 100 : 0

  const commitDeals = rows.filter(r =>
    ['commit', 'decision process', 'closed won', 'won'].includes(r.status?.toLowerCase() ?? '')
  )
  const commitValue = commitDeals.reduce((s, r) => s + (r.weightedValue ?? 0), 0)

  const avgDealSize = totalDeals > 0 ? rawPipeline / totalDeals : 0

  // Bucket breakdown (weighted)
  const bucketMap: Record<string, number> = {}
  rows.forEach(r => {
    const b = r.customerBucket || 'Unknown'
    bucketMap[b] = (bucketMap[b] ?? 0) + (r.weightedValue ?? 0)
  })

  return {
    totalDeals,
    rawPipeline,
    weightedPipeline,
    sqlCount,
    sqlRate,
    commitValue,
    avgDealSize,
    bucketMap,
  }
}
