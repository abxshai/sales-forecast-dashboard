'use client'

import { computeMetrics } from '@/lib/data-model'
import type { SalesRow } from '@/types'
import { Card, CardContent } from '@/components/ui/card'

interface Props { rows: SalesRow[] }

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000   ? `$${(n / 1_000).toFixed(1)}K`
  : `$${n.toFixed(0)}`

function KpiCard({ label, value, sub, valueClass = 'text-foreground' }: {
  label: string; value: string; sub?: string; valueClass?: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
        <p className={`text-2xl font-bold leading-tight ${valueClass}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}

export default function MetricsCards({ rows }: Props) {
  const { totalDeals, rawPipeline, weightedPipeline, sqlCount, sqlRate, avgDealSize } =
    computeMetrics(rows)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
      <KpiCard label="Deals"          value={totalDeals.toString()} sub="in pipeline" />
      <KpiCard label="Raw Pipeline"   value={fmt(rawPipeline)}      sub="unweighted" />
      <KpiCard label="Weighted"       value={fmt(weightedPipeline)} sub="stage-adjusted" valueClass="text-primary" />
      <KpiCard label="SQLs"           value={sqlCount.toString()}   sub={`${sqlRate.toFixed(1)}% rate`} valueClass="text-emerald-400" />
      <KpiCard label="Avg Deal"       value={fmt(avgDealSize)}      sub="per deal" />
      <KpiCard label="Stage Weights"  value="10–90%"                sub="Discovery → Commit" valueClass="text-amber-400" />
    </div>
  )
}
