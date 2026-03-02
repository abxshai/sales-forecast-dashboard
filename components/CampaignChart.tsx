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
  '#a78bfa', '#34d399', '#fb923c', '#e879f9', '#38bdf8',
]

export default function CampaignChart({ rows }: Props) {
  const { data, activeCampaigns, totalCampaigns } = useMemo(() => {
    const groups: Record<string, { raw: number; weighted: number; active: number }> = {}
    const today = new Date()

    rows.forEach(r => {
      const name = r.campaignName || r.campaignType || 'Unknown'
      if (!groups[name]) groups[name] = { raw: 0, weighted: 0, active: 0 }
      const g = groups[name]
      g.raw      += r.dealValue      ?? 0
      g.weighted += r.weightedValue  ?? 0

      const status = (r.status ?? '').toLowerCase()
      const isLost = status.includes('lost')
      if (!isLost) {
        if (r.date) {
          const d = new Date(r.date)
          if (!isNaN(d.getTime()) && d <= today) g.active++
        } else {
          g.active++
        }
      }
    })

    const data = Object.entries(groups)
      .map(([name, g]) => ({ name, ...g }))
      .filter(d => d.raw > 0 || d.weighted > 0)
      .sort((a, b) => b.weighted - a.weighted)

    const activeCampaigns = Object.values(groups).filter(g => g.active > 0).length
    const totalCampaigns  = Object.keys(groups).length
    return { data, activeCampaigns, totalCampaigns }
  }, [rows])

  if (data.length === 0) return null

  const config: ChartConfig = {
    raw:      { label: 'Raw Pipeline',      color: 'hsl(var(--muted))' },
    weighted: { label: 'Weighted Pipeline', color: 'hsl(var(--primary))' },
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Revenue by Campaign</CardTitle>
            <CardDescription>Raw vs weighted pipeline per campaign</CardDescription>
          </div>
          <div className="text-right shrink-0 ml-4">
            <p className="text-xl font-bold text-primary leading-none">{activeCampaigns}</p>
            <p className="text-xs text-muted-foreground mt-0.5">active / {totalCampaigns} total</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[220px]">
          <BarChart data={data} margin={{ top: 0, right: 8, bottom: 28, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false}
              tick={{ fontSize: 9 }} angle={-30} textAnchor="end" interval={0} />
            <YAxis tickFormatter={v => fmt(v)} tickLine={false} axisLine={false}
              tick={{ fontSize: 10 }} width={50} />
            <ChartTooltip
              content={<ChartTooltipContent formatter={(v) => [fmt(Number(v)), '']} />}
            />
            <Bar dataKey="raw"      name="raw"      fill="hsl(var(--muted))" radius={[3, 3, 0, 0]} maxBarSize={16} />
            <Bar dataKey="weighted" name="weighted"  radius={[3, 3, 0, 0]} maxBarSize={16}>
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
