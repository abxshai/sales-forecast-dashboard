'use client'

import type { ForecastResult } from '@/types'
import LoadingSpinner from './LoadingSpinner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface Props {
  forecast: ForecastResult | null
  isLoading: boolean
  hasData: boolean
  onGenerate: () => void
}

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000   ? `$${(n / 1_000).toFixed(1)}K`
  : `$${n.toFixed(0)}`

function Mini({ label, value, className = 'text-emerald-400' }: {
  label: string; value: string; className?: string
}) {
  return (
    <div className="rounded-lg p-3 text-center bg-secondary">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-base font-bold ${className}`}>{value}</p>
    </div>
  )
}

export default function ForecastPanel({ forecast, isLoading, hasData, onGenerate }: Props) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="px-4 py-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold">AI Pipeline Forecast</CardTitle>
        <span className="text-xs text-muted-foreground">Groq · gpt-oss-120b</span>
      </CardHeader>

      <CardContent className="p-4 flex-1 overflow-y-auto space-y-4">
        <Button
          className="w-full"
          disabled={!hasData || isLoading}
          onClick={onGenerate}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner size="sm" />
              Analysing pipeline…
            </span>
          ) : 'Generate Forecast'}
        </Button>

        {!forecast && !isLoading && (
          <p className="text-center text-sm text-muted-foreground py-4">
            {hasData ? 'Click above to generate a RevOps forecast' : 'Load your pipeline data first'}
          </p>
        )}

        {forecast && (
          <>
            {/* Quarterly forecast hero */}
            <div className="rounded-xl p-4 text-center bg-primary/10 border border-primary/30">
              <p className="text-xs uppercase tracking-widest text-primary/80 mb-1">Quarterly Forecast</p>
              <p className="text-3xl font-bold text-foreground">{fmt(forecast.quarterlyForecast)}</p>
              <p className="text-xs text-muted-foreground mt-1">across 8 campaigns</p>
            </div>

            {/* Pipeline totals */}
            <div className="grid grid-cols-2 gap-2">
              <Mini label="Weighted Pipeline" value={fmt(forecast.weightedPipelineTotal)} className="text-primary" />
              <Mini label="Raw Pipeline"       value={fmt(forecast.rawPipelineTotal)}      className="text-foreground" />
            </div>

            {/* Revenue projections */}
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Revenue Projection</p>
              <div className="grid grid-cols-3 gap-2">
                <Mini label="30 days" value={fmt(forecast.projectedRevenue.days30)} />
                <Mini label="60 days" value={fmt(forecast.projectedRevenue.days60)} />
                <Mini label="90 days" value={fmt(forecast.projectedRevenue.days90)} />
              </div>
            </div>

            {/* SQL metrics */}
            <div className="grid grid-cols-3 gap-2">
              <Mini label="SQLs"           value={forecast.sqlCount.toString()}                              className="text-emerald-400" />
              <Mini label="Target/Campaign" value={forecast.targetSQLsPerCampaign?.toString() ?? '—'}        className="text-amber-400" />
              <Mini label="SQL→Close"      value={`${forecast.sqlConversionRate?.toFixed(1) ?? '—'}%`}      className="text-blue-400" />
            </div>

            <Separator />

            {/* Quality scores */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg p-3 bg-secondary">
                <p className="text-xs text-muted-foreground mb-1">Conv. Rate</p>
                <p className="text-xl font-bold text-blue-400">{forecast.predictedConversionRate?.toFixed(1)}%</p>
              </div>
              <div className="rounded-lg p-3 bg-secondary">
                <p className="text-xs text-muted-foreground mb-1">Pipeline Quality</p>
                <div className="flex items-end gap-1">
                  <p className="text-xl font-bold text-violet-400">{forecast.leadQualityScore?.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground mb-0.5">/10</p>
                </div>
                <div className="mt-1.5 h-1 rounded-full overflow-hidden bg-muted">
                  <div className="h-full rounded-full bg-violet-500"
                    style={{ width: `${(forecast.leadQualityScore ?? 0) * 10}%` }} />
                </div>
              </div>
            </div>

            {/* Top performers */}
            {(forecast.topPerformingBucket || forecast.topPerformingUseCase) && (
              <div className="grid grid-cols-2 gap-2">
                {forecast.topPerformingBucket && (
                  <div className="rounded-lg p-3 bg-secondary">
                    <p className="text-xs text-muted-foreground mb-1">Top Bucket</p>
                    <p className="text-sm font-semibold text-amber-400">{forecast.topPerformingBucket}</p>
                  </div>
                )}
                {forecast.topPerformingUseCase && (
                  <div className="rounded-lg p-3 bg-secondary">
                    <p className="text-xs text-muted-foreground mb-1">Top Use Case</p>
                    <p className="text-sm font-semibold text-amber-400 truncate">{forecast.topPerformingUseCase}</p>
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* Pipeline health */}
            <div className="rounded-lg p-3 bg-secondary">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Pipeline Health</p>
              <p className="text-sm text-foreground leading-relaxed">{forecast.pipelineHealthSummary}</p>
            </div>

            {/* Insights */}
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Key Insights</p>
              <ul className="space-y-2">
                {forecast.insights?.map((insight, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground">
                    <span className="shrink-0 mt-0.5 text-primary">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommendations */}
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Recommendations</p>
              <ol className="space-y-2">
                {forecast.recommendations?.map((rec, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground">
                    <span className="shrink-0 font-medium text-emerald-400">{i + 1}.</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Risk factors */}
            {forecast.riskFactors?.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Risk Factors</p>
                <ul className="space-y-2">
                  {forecast.riskFactors.map((risk, i) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground">
                      <span className="shrink-0 text-destructive">!</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
