'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
import type { SalesRow } from '@/types'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'

interface Props { rows: SalesRow[] }

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `$${(n / 1_000).toFixed(0)}K`
  : `$${n}`

const COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#60a5fa',
  '#a78bfa', '#34d399', '#fb923c', '#e879f9',
]

export default function UseCaseChart({ rows }: Props) {
  const data = useMemo(() => {
    const groups: Record<string, { raw: number; weighted: number }> = {}

    rows.forEach(r => {
      const uc = r.useCase || 'Other'
      if (!groups[uc]) groups[uc] = { raw: 0, weighted: 0 }
      groups[uc].raw      += r.dealValue     ?? 0
      groups[uc].weighted += r.weightedValue ?? 0
    })

    return Object.entries(groups)
      .map(([name, g]) => ({ name, ...g }))
      .filter(d => d.raw > 0 || d.weighted > 0)
      .sort((a, b) => b.weighted - a.weighted)
  }, [rows])

  if (data.length === 0) return null

  const config: ChartConfig = {
    raw:      { label: 'Raw Pipeline',      color: 'hsl(var(--muted))' },
    weighted: { label: 'Weighted Pipeline', color: 'hsl(var(--primary))' },
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Revenue by Use Case</CardTitle>
        <CardDescription>Pipeline value per sales play / solution area</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[220px]">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" tickFormatter={v => fmt(v)} tickLine={false} axisLine={false}
              tick={{ fontSize: 10 }} />
            <YAxis dataKey="name" type="category" tickLine={false} axisLine={false}
              tick={{ fontSize: 10 }} width={110} />
            <ChartTooltip
              content={<ChartTooltipContent formatter={(v) => [fmt(Number(v)), '']} />}
            />
            <Bar dataKey="raw"      name="raw"     fill="hsl(var(--muted))" radius={[0, 3, 3, 0]} maxBarSize={14} />
            <Bar dataKey="weighted" name="weighted" radius={[0, 3, 3, 0]} maxBarSize={14}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
