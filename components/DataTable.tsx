'use client'

import { useState } from 'react'
import type { SalesRow, ColumnMap } from '@/types'
import LoadingSpinner from './LoadingSpinner'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableHeader, TableBody,
  TableHead, TableRow, TableCell,
} from '@/components/ui/table'

interface Props {
  headers: string[]
  rows: SalesRow[]
  columnMap: ColumnMap
  source: 'sheet' | 'csv'
  spreadsheetId?: string
  gsaB64?: string
  topLeads?: number[]
  onRowUpdate?: (rowIndex: number, newRaw: string[]) => void
}

// Status → badge class overrides
const STATUS_CLASS: Record<string, string> = {
  'discovery':            'border-slate-600 text-slate-300 bg-slate-800/40',
  'qualified':            'border-blue-700 text-blue-300 bg-blue-950/40',
  'technical validation': 'border-violet-700 text-violet-300 bg-violet-950/40',
  'demo':                 'border-violet-700 text-violet-300 bg-violet-950/40',
  'pilot':                'border-violet-700 text-violet-300 bg-violet-950/40',
  'poc':                  'border-violet-700 text-violet-300 bg-violet-950/40',
  'decision process':     'border-amber-700 text-amber-300 bg-amber-950/40',
  'commit':               'border-emerald-700 text-emerald-300 bg-emerald-950/40',
  'won':                  'border-emerald-700 text-emerald-300 bg-emerald-950/40',
  'closed won':           'border-emerald-700 text-emerald-300 bg-emerald-950/40',
  'lost':                 'border-destructive text-red-400 bg-red-950/30',
  'closed lost':          'border-destructive text-red-400 bg-red-950/30',
}

export default function DataTable({
  headers, rows, columnMap, source, spreadsheetId, gsaB64,
  topLeads = [], onRowUpdate,
}: Props) {
  const [editingCell, setEditingCell]   = useState<{ rowIdx: number; colIdx: number } | null>(null)
  const [pendingEdits, setPendingEdits] = useState<Record<number, string[]>>({})
  const [savingRows, setSavingRows]     = useState<Set<number>>(new Set())
  const [saveErrors, setSaveErrors]     = useState<Record<number, string>>({})

  const getCellValue = (rowIdx: number, colIdx: number) =>
    (pendingEdits[rowIdx] ?? rows[rowIdx]._raw)[colIdx] ?? ''

  const handleCellChange = (rowIdx: number, colIdx: number, value: string) => {
    setPendingEdits(prev => {
      const cur = prev[rowIdx] ?? [...rows[rowIdx]._raw]
      const upd = [...cur]; upd[colIdx] = value
      return { ...prev, [rowIdx]: upd }
    })
  }

  const handleSaveRow = async (rowIdx: number) => {
    const values = pendingEdits[rowIdx]; if (!values) return
    if (source === 'csv') {
      onRowUpdate?.(rowIdx, values)
      setPendingEdits(prev => { const n = { ...prev }; delete n[rowIdx]; return n })
      return
    }
    setSavingRows(prev => new Set(prev).add(rowIdx))
    setSaveErrors(prev => { const n = { ...prev }; delete n[rowIdx]; return n })
    try {
      const res = await fetch('/api/sheets/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(gsaB64 && { 'x-gsa-b64': gsaB64 }) },
        body: JSON.stringify({ spreadsheetId, rowIndex: rowIdx, values }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      onRowUpdate?.(rowIdx, values)
      setPendingEdits(prev => { const n = { ...prev }; delete n[rowIdx]; return n })
    } catch (e: unknown) {
      setSaveErrors(prev => ({ ...prev, [rowIdx]: e instanceof Error ? e.message : 'Save failed' }))
    } finally {
      setSavingRows(prev => { const n = new Set(prev); n.delete(rowIdx); return n })
    }
  }

  const handleCancelRow = (rowIdx: number) => {
    setPendingEdits(prev => { const n = { ...prev }; delete n[rowIdx]; return n })
    setEditingCell(null)
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">No data loaded yet</CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="px-4 py-3 flex-row items-center justify-between space-y-0">
        <h2 className="font-semibold text-foreground">
          Sales Data{' '}
          <span className="font-normal text-sm text-muted-foreground">({rows.length} rows)</span>
        </h2>
        {source === 'csv' && (
          <Badge variant="outline" className="text-xs">CSV — edits local only</Badge>
        )}
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 px-3">#</TableHead>
              {headers.map((h, i) => (
                <TableHead key={i} className="px-3 whitespace-nowrap">{h}</TableHead>
              ))}
              <TableHead className="px-3">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIdx) => {
              const isDirty   = !!pendingEdits[rowIdx]
              const isSaving  = savingRows.has(rowIdx)
              const isTopLead = topLeads.includes(rowIdx)

              return (
                <TableRow
                  key={rowIdx}
                  className={isTopLead ? 'bg-primary/5' : isDirty ? 'bg-amber-950/10' : ''}
                >
                  <TableCell className="px-3 py-2 text-xs text-muted-foreground">
                    {isTopLead && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-1.5 align-middle" />
                    )}
                    {rowIdx + 1}
                  </TableCell>

                  {headers.map((_, colIdx) => {
                    const value     = getCellValue(rowIdx, colIdx)
                    const isEditing = editingCell?.rowIdx === rowIdx && editingCell?.colIdx === colIdx
                    const isStatus  = columnMap.status   === colIdx
                    const isDealVal = columnMap.dealValue === colIdx
                    const statusCls = isStatus && value
                      ? STATUS_CLASS[value.toLowerCase()] ?? 'border-border text-foreground'
                      : ''

                    return (
                      <TableCell key={colIdx} className="px-3 py-1.5 max-w-[200px]">
                        {isEditing ? (
                          <Input
                            autoFocus
                            value={value}
                            onChange={e => handleCellChange(rowIdx, colIdx, e.target.value)}
                            onBlur={() => setEditingCell(null)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') setEditingCell(null)
                              if (e.key === 'Escape') { handleCancelRow(rowIdx); setEditingCell(null) }
                            }}
                            className="h-7 text-sm py-1"
                          />
                        ) : isStatus && value ? (
                          <Badge variant="outline" className={`text-[0.65rem] cursor-pointer ${statusCls}`}
                            onClick={() => setEditingCell({ rowIdx, colIdx })}>
                            {value}
                          </Badge>
                        ) : (
                          <span
                            onClick={() => setEditingCell({ rowIdx, colIdx })}
                            className={`block cursor-pointer truncate rounded px-1 py-0.5 hover:bg-muted/50 transition-colors
                              ${isDealVal && value ? 'text-emerald-400 font-mono' : 'text-foreground'}`}
                          >
                            {value || <span className="text-muted-foreground italic">—</span>}
                          </span>
                        )}
                      </TableCell>
                    )
                  })}

                  <TableCell className="px-3 py-1.5 whitespace-nowrap">
                    {isDirty && (
                      <div className="flex gap-1 items-center">
                        <Button size="sm" className="h-7 text-xs px-2.5"
                          disabled={isSaving} onClick={() => handleSaveRow(rowIdx)}>
                          {isSaving ? <LoadingSpinner size="sm" /> : 'Save'}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-muted-foreground"
                          onClick={() => handleCancelRow(rowIdx)}>
                          Cancel
                        </Button>
                      </div>
                    )}
                    {saveErrors[rowIdx] && (
                      <p className="text-xs text-destructive mt-1">{saveErrors[rowIdx]}</p>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
