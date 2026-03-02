'use client'

import { useState } from 'react'
import {
  AreaChart, Area,
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid,
} from 'recharts'
import type { ForecastResult, SalesRow } from '@/types'
import { STAGE_WEIGHTS } from '@/lib/data-model'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

interface Props {
  forecast: ForecastResult | null
  rows: SalesRow[]
}

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `$${(n / 1_000).toFixed(0)}K`
  : `$${n}`

const STAGE_COLORS: Record<string, string> = {
  discovery:           '#64748b',
  qualified:           '#60a5fa',
  technicalValidation: '#a78bfa',
  decisionProcess:     '#fbbf24',
  commit:              '#34d399',
}

const BUCKET_COLORS: Record<string, string> = {
  'Big Tech':   '#6366f1',
  'Enterprise': '#10b981',
  'AI Labs':    '#f59e0b',
  'Startup':    '#f43f5e',
  'Startups':   '#f43f5e',
  'Unknown':    '#475569',
}

const STAGE_ORDER = ['discovery', 'qualified', 'technicalValidation', 'decisionProcess', 'commit'] as const
const STAGE_LABELS: Record<string, string> = {
  discovery:           'Discovery',
  qualified:           'Qualified',
  technicalValidation: 'Tech Validation',
  decisionProcess:     'Decision',
  commit:              'Commit',
}

export default function ForecastChart({ forecast, rows }: Props) {
  const [activeStages, setActiveStages] = useState<Set<string>>(new Set(STAGE_ORDER))

  const toggleStage = (key: string) => {
    setActiveStages(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        if (next.size === 1) return prev // keep at least one active
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  if (!forecast && rows.length === 0) return null

  // 1. Revenue projection
  const currentWeighted = rows.reduce((s, r) => s + (r.weightedValue ?? 0), 0)
  const revenueData = forecast
    ? [
        { period: 'Now',  revenue: currentWeighted },
        { period: '+30d', revenue: forecast.projectedRevenue.days30 },
        { period: '+60d', revenue: forecast.projectedRevenue.days60 },
        { period: '+90d', revenue: forecast.projectedRevenue.days90 },
      ]
    : []

  const revenueConfig: ChartConfig = {
    revenue: { label: 'Revenue', color: 'hsl(var(--primary))' },
  }

  // 2. Pipeline by stage
  let stageData: { stage: string; label: string; weighted: number }[]
  if (forecast?.pipelineByStage) {
    stageData = STAGE_ORDER.map(k => ({
      stage:    k,
      label:    STAGE_LABELS[k],
      weighted: forecast.pipelineByStage[k as keyof typeof forecast.pipelineByStage] ?? 0,
    }))
  } else {
    const totals: Record<string, number> = {}
    rows.forEach(r => {
      const s = (r.status ?? '').toLowerCase().trim()
      const key = s.includes('discovery')  ? 'discovery'
        : s.includes('qualified')          ? 'qualified'
        : s.includes('tech') || s.includes('demo') || s.includes('pilot') || s.includes('poc') ? 'technicalValidation'
        : s.includes('decision')           ? 'decisionProcess'
        : s.includes('commit')             ? 'commit'
        : null
      if (key) totals[key] = (totals[key] ?? 0) + (r.weightedValue ?? 0)
    })
    stageData = STAGE_ORDER.map(k => ({
      stage: k, label: STAGE_LABELS[k], weighted: totals[k] ?? 0,
    }))
  }

  const filteredStageData = stageData.filter(s => activeStages.has(s.stage))

  const stageConfig: ChartConfig = Object.fromEntries(
    STAGE_ORDER.map(k => [k, { label: STAGE_LABELS[k], color: STAGE_COLORS[k] }])
  )

  // 3. Pipeline by bucket
  const bucketRaw:      Record<string, number> = {}
  const bucketWeighted: Record<string, number> = {}
  rows.forEach(r => {
    const b = r.customerBucket || 'Unknown'
    bucketRaw[b]      = (bucketRaw[b]      ?? 0) + (r.dealValue    ?? 0)
    bucketWeighted[b] = (bucketWeighted[b] ?? 0) + (r.weightedValue ?? 0)
  })
  const bucketKeyMap: Record<string, string[]> = {
    bigtech:    ['Big Tech'], enterprise: ['Enterprise'],
    ailab:      ['AI Labs'],  startup:    ['Startup', 'Startups'],
  }
  if (forecast?.pipelineByBucket) {
    Object.entries(bucketKeyMap).forEach(([key, aliases]) => {
      const val = forecast.pipelineByBucket[key as keyof typeof forecast.pipelineByBucket] ?? 0
      bucketWeighted[aliases[0]] = val
    })
  }
  const bucketData = Object.entries(bucketWeighted)
    .filter(([, v]) => v > 0)
    .map(([bucket, weighted]) => ({ bucket, weighted, raw: bucketRaw[bucket] ?? 0 }))
    .sort((a, b) => b.weighted - a.weighted)

  const bucketConfig: ChartConfig = {
    raw:      { label: 'Raw',      color: 'hsl(var(--muted))' },
    weighted: { label: 'Weighted', color: 'hsl(var(--primary))' },
  }

  if (revenueData.length === 0 && stageData.every(s => s.weighted === 0) && bucketData.length === 0) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
      {/* Revenue projection */}
      {revenueData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Revenue Projection</CardTitle>
            <CardDescription>Weighted pipeline trajectory over 90 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueConfig} className="h-[200px]">
              <AreaChart data={revenueData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="period" tickLine={false} axisLine={false}
                  tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => fmt(v)} tickLine={false} axisLine={false}
                  tick={{ fontSize: 10 }} width={50} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => [fmt(Number(value)), '']}
                    />
                  }
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))"
                  strokeWidth={2} fill="url(#revGrad)"
                  dot={{ r: 3, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
                  activeDot={{ r: 5 }} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Pipeline by stage */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Pipeline by Stage</CardTitle>
          <CardDescription>Weighted value per funnel stage</CardDescription>
          {/* Stage toggle filters */}
          <div className="flex flex-wrap gap-1.5 pt-2">
            {STAGE_ORDER.map(key => {
              const isActive = activeStages.has(key)
              const color    = STAGE_COLORS[key]
              return (
                <button
                  key={key}
                  onClick={() => toggleStage(key)}
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] transition-all"
                  style={{
                    backgroundColor: isActive ? `${color}22` : 'transparent',
                    border: `1px solid ${isActive ? color : 'hsl(var(--border))'}`,
                    color: isActive ? color : 'hsl(var(--muted-foreground))',
                    opacity: isActive ? 1 : 0.45,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
                    style={{ backgroundColor: isActive ? color : 'hsl(var(--muted-foreground))' }} />
                  {STAGE_LABELS[key]}
                </button>
              )
            })}
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={stageConfig} className="h-[200px]">
            <BarChart data={filteredStageData} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tickFormatter={v => fmt(v)} tickLine={false} axisLine={false}
                tick={{ fontSize: 10 }} />
              <YAxis dataKey="label" type="category" tickLine={false} axisLine={false}
                tick={{ fontSize: 10 }} width={95} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => [fmt(Number(value)), '']}
                    nameKey="stage"
                  />
                }
              />
              <Bar dataKey="weighted" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {filteredStageData.map((entry, i) => (
                  <Cell key={i} fill={STAGE_COLORS[entry.stage] ?? 'hsl(var(--primary))'} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Pipeline by bucket */}
      {bucketData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Pipeline by Bucket</CardTitle>
            <CardDescription>Raw vs weighted per segment</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={bucketConfig} className="h-[200px]">
              <BarChart data={bucketData} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="bucket" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={v => fmt(v)} tickLine={false} axisLine={false}
                  tick={{ fontSize: 10 }} width={50} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => [fmt(Number(value)), '']}
                    />
                  }
                />
                <Bar dataKey="raw" name="raw" fill="hsl(var(--muted))" radius={[3, 3, 0, 0]} maxBarSize={20} />
                <Bar dataKey="weighted" name="weighted" radius={[3, 3, 0, 0]} maxBarSize={20}>
                  {bucketData.map((entry, i) => (
                    <Cell key={i} fill={BUCKET_COLORS[entry.bucket] ?? 'hsl(var(--primary))'} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
