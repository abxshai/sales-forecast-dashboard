'use client'

import { useState, useRef } from 'react'
import LoadingSpinner from './LoadingSpinner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  onDataLoaded: (
    headers: string[],
    rows: string[][],
    source: 'sheet' | 'csv',
    spreadsheetId?: string
  ) => void
  gsaB64?: string
}

export default function DataSourcePanel({ onDataLoaded, gsaB64 }: Props) {
  const [tab, setTab]         = useState<'sheet' | 'csv'>('sheet')
  const [sheetUrl, setSheetUrl] = useState('')
  const [loading, setLoading]  = useState(false)
  const [error, setError]      = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const loadSheet = async () => {
    if (!sheetUrl.trim()) return
    setError(''); setLoading(true)
    try {
      const res = await fetch(`/api/sheets/read?url=${encodeURIComponent(sheetUrl)}`, {
        headers: { ...(gsaB64 && { 'x-gsa-b64': gsaB64 }) },
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      onDataLoaded(data.headers, data.rows, 'sheet', data.spreadsheetId)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load sheet')
    } finally { setLoading(false) }
  }

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) { setError('Please upload a .csv file'); return }
    setError(''); setLoading(true); setFileName(file.name)
    try {
      const text = await file.text()
      const res = await fetch('/api/parse-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: text,
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      onDataLoaded(data.headers, data.rows, 'csv')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to parse CSV')
    } finally { setLoading(false) }
  }

  return (
    <Card className="mb-4">
      <CardContent className="pt-5">
        {/* Tabs */}
        <div className="flex gap-1 mb-4 p-1 rounded-lg bg-secondary w-fit">
          {(['sheet', 'csv'] as const).map(t => (
            <Button
              key={t}
              size="sm"
              variant={tab === t ? 'default' : 'ghost'}
              onClick={() => { setTab(t); setError('') }}
              className={tab !== t ? 'text-muted-foreground' : ''}
            >
              {t === 'sheet' ? 'Google Sheet' : 'CSV Upload'}
            </Button>
          ))}
        </div>

        {tab === 'sheet' && (
          <div className="space-y-3">
            <div className="flex gap-3">
              <Input
                type="url"
                value={sheetUrl}
                onChange={e => setSheetUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadSheet()}
                placeholder="https://docs.google.com/spreadsheets/d/..."
              />
              <Button onClick={loadSheet} disabled={loading || !sheetUrl.trim()}>
                {loading ? <LoadingSpinner size="sm" /> : 'Load'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {gsaB64
                ? 'Google Service Account configured — sheet editing enabled'
                : 'Add a Google Service Account in API Keys to enable sheet editing'}
            </p>
          </div>
        )}

        {tab === 'csv' && (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault(); setDragOver(false)
              const file = e.dataTransfer.files[0]; if (file) processFile(file)
            }}
            onClick={() => fileRef.current?.click()}
            className={`rounded-xl p-8 text-center cursor-pointer transition-colors border-2 border-dashed
              ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
          >
            <input ref={fileRef} type="file" accept=".csv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }}
            />
            {loading ? (
              <LoadingSpinner label="Parsing CSV..." />
            ) : fileName ? (
              <div>
                <p className="font-medium text-emerald-400">{fileName}</p>
                <p className="text-xs text-muted-foreground mt-1">Click or drop to replace</p>
              </div>
            ) : (
              <div>
                <p className="font-medium text-foreground">Drop your CSV here</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="mt-3 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
