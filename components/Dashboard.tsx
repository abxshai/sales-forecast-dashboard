'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { SalesRow, ColumnMap, ForecastResult } from '@/types'
import { detectColumns } from '@/lib/column-detector'
import { normalizeRows } from '@/lib/data-model'
import ApiKeySettings, { type ApiKeys } from './ApiKeySettings'
import DataSourcePanel from './DataSourcePanel'
import MetricsCards from './MetricsCards'
import DataTable from './DataTable'
import ForecastPanel from './ForecastPanel'
import { Badge } from '@/components/ui/badge'

const ForecastChart  = dynamic(() => import('./ForecastChart'),  { ssr: false })
const CampaignChart  = dynamic(() => import('./CampaignChart'),  { ssr: false })
const UseCaseChart   = dynamic(() => import('./UseCaseChart'),   { ssr: false })

export default function Dashboard() {
  const [apiKeys, setApiKeys]               = useState<ApiKeys>({ groqApiKey: '', googleSaB64: '' })
  const [headers, setHeaders]               = useState<string[]>([])
  const [rawRows, setRawRows]               = useState<string[][]>([])
  const [normalizedRows, setNormalizedRows] = useState<SalesRow[]>([])
  const [columnMap, setColumnMap]           = useState<ColumnMap>({})
  const [source, setSource]                 = useState<'sheet' | 'csv' | null>(null)
  const [spreadsheetId, setSpreadsheetId]   = useState<string | undefined>()
  const [forecast, setForecast]             = useState<ForecastResult | null>(null)
  const [forecastLoading, setForecastLoading] = useState(false)
  const [forecastError, setForecastError]   = useState('')

  const handleDataLoaded = useCallback(
    (newHeaders: string[], newRows: string[][], newSource: 'sheet' | 'csv', newSpreadsheetId?: string) => {
      const map = detectColumns(newHeaders)
      const normalized = normalizeRows(newHeaders, newRows, map)
      setHeaders(newHeaders); setRawRows(newRows); setNormalizedRows(normalized)
      setColumnMap(map); setSource(newSource); setSpreadsheetId(newSpreadsheetId)
      setForecast(null); setForecastError('')
    }, []
  )

  const handleRowUpdate = useCallback(
    (rowIndex: number, newRaw: string[]) => {
      setRawRows(prev => { const u = [...prev]; u[rowIndex] = newRaw; return u })
      setNormalizedRows(prev => {
        const u = [...prev]
        const get = (field: string) => columnMap[field] != null ? newRaw[columnMap[field]!] ?? '' : undefined
        const rawValue = get('dealValue') ?? ''
        const parsedValue = parseFloat(rawValue.replace(/[$,\s]/g, ''))
        u[rowIndex] = {
          ...u[rowIndex], _raw: newRaw,
          leadName: get('leadName') || undefined,
          dealValue: isNaN(parsedValue) ? undefined : parsedValue,
          status: get('status') || undefined,
          interestLevel: get('interestLevel') || undefined,
          date: get('date') || undefined,
          notes: get('notes') || undefined,
        }
        return u
      })
    }, [columnMap]
  )

  const handleGenerateForecast = async () => {
    if (normalizedRows.length === 0) return
    setForecastLoading(true); setForecastError('')
    try {
      const res = await fetch('/api/forecast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKeys.groqApiKey && { 'x-groq-api-key': apiKeys.groqApiKey }),
        },
        body: JSON.stringify({ rows: normalizedRows, columnMap }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setForecast(data)
    } catch (e: unknown) {
      setForecastError(e instanceof Error ? e.message : 'Forecast failed')
    } finally { setForecastLoading(false) }
  }

  const topLeads = forecast?.topLeadsToFocus ?? []

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
            SF
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight text-foreground">Sales Forecast Dashboard</h1>
            <p className="text-xs text-muted-foreground">AI-powered pipeline analysis · Groq gpt-oss-120b</p>
          </div>
        </div>
        {source && (
          <Badge variant="outline">
            {source === 'sheet' ? 'Google Sheet' : 'CSV'} · {normalizedRows.length} rows
          </Badge>
        )}
      </header>

      <ApiKeySettings onChange={setApiKeys} />
      <DataSourcePanel onDataLoaded={handleDataLoaded} gsaB64={apiKeys.googleSaB64} />

      {normalizedRows.length > 0 && <MetricsCards rows={normalizedRows} />}

      {normalizedRows.length > 0 && (
        <>
          <ForecastChart forecast={forecast} rows={normalizedRows} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <CampaignChart rows={normalizedRows} />
            <UseCaseChart  rows={normalizedRows} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
            <div className="lg:col-span-2">
              <DataTable
                headers={headers} rows={normalizedRows} columnMap={columnMap}
                source={source!} spreadsheetId={spreadsheetId} gsaB64={apiKeys.googleSaB64}
                topLeads={topLeads} onRowUpdate={handleRowUpdate}
              />
            </div>
            <div className="lg:col-span-1 flex flex-col gap-3">
              <ForecastPanel
                forecast={forecast} isLoading={forecastLoading}
                hasData={normalizedRows.length > 0} onGenerate={handleGenerateForecast}
              />
              {forecastError && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2">
                  {forecastError}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {normalizedRows.length === 0 && (
        <div className="text-center py-24">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl bg-card">
            📊
          </div>
          <p className="text-base font-medium text-foreground">Load your sales data to get started</p>
          <p className="text-sm mt-1 text-muted-foreground">
            Paste a Google Sheet URL or upload a CSV file above
          </p>
        </div>
      )}
    </div>
  )
}
