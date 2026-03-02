'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

export interface ApiKeys {
  groqApiKey: string
  googleSaB64: string
}

interface Props { onChange: (keys: ApiKeys) => void }

const LS_GROQ = 'sf_groq_key'
const LS_GSA  = 'sf_gsa_b64'

export default function ApiKeySettings({ onChange }: Props) {
  const [open, setOpen]         = useState(false)
  const [groqKey, setGroqKey]   = useState('')
  const [gsaJson, setGsaJson]   = useState('')
  const [gsaB64, setGsaB64]     = useState('')
  const [showGroq, setShowGroq] = useState(false)
  const [gsaError, setGsaError] = useState('')
  const [saved, setSaved]       = useState(false)

  useEffect(() => {
    const storedGroq = localStorage.getItem(LS_GROQ) ?? ''
    const storedB64  = localStorage.getItem(LS_GSA)  ?? ''
    setGroqKey(storedGroq); setGsaB64(storedB64)
    onChange({ groqApiKey: storedGroq, googleSaB64: storedB64 })
    if (!storedGroq && !storedB64) setOpen(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = () => {
    setGsaError('')
    let b64 = gsaB64
    if (gsaJson.trim()) {
      try {
        JSON.parse(gsaJson)
        b64 = btoa(unescape(encodeURIComponent(gsaJson)))
        setGsaB64(b64); setGsaJson('')
      } catch {
        setGsaError('Invalid JSON — paste the full service account JSON file contents'); return
      }
    }
    localStorage.setItem(LS_GROQ, groqKey); localStorage.setItem(LS_GSA, b64)
    onChange({ groqApiKey: groqKey, googleSaB64: b64 })
    setSaved(true); setTimeout(() => setSaved(false), 2000); setOpen(false)
  }

  const handleClear = () => {
    localStorage.removeItem(LS_GROQ); localStorage.removeItem(LS_GSA)
    setGroqKey(''); setGsaB64(''); setGsaJson('')
    onChange({ groqApiKey: '', googleSaB64: '' }); setOpen(true)
  }

  const hasKeys = !!(groqKey || gsaB64)

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-card text-sm text-foreground hover:bg-secondary transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="text-muted-foreground">⚙</span>
          API Keys
          {hasKeys
            ? <Badge variant="outline" className="border-emerald-700 text-emerald-400 bg-emerald-950/40">configured</Badge>
            : <Badge variant="outline" className="border-amber-700 text-amber-400 bg-amber-950/40">required</Badge>
          }
        </span>
        <span className="text-xs text-muted-foreground">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <Card className="mt-2">
          <CardContent className="pt-5 space-y-5">
            {/* Groq */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5 font-medium">
                Groq API Key
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Get yours free at{' '}
                <span className="font-mono text-primary">console.groq.com</span>
              </p>
              <div className="flex gap-2">
                <Input
                  type={showGroq ? 'text' : 'password'}
                  value={groqKey}
                  onChange={e => setGroqKey(e.target.value)}
                  placeholder="gsk_..."
                  className="font-mono"
                />
                <Button variant="outline" size="sm" onClick={() => setShowGroq(s => !s)}>
                  {showGroq ? 'hide' : 'show'}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Google SA */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5 font-medium">
                Google Service Account
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Paste your <span className="text-foreground">service-account.json</span> below
                (only needed for Google Sheet editing). Share your sheet with the service account email as Editor.
              </p>
              {gsaB64 && !gsaJson ? (
                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-800/50 rounded-lg px-3 py-2">
                  <span>Service account configured</span>
                  <Button variant="ghost" size="sm" className="ml-auto h-auto py-0 text-muted-foreground hover:text-foreground"
                    onClick={() => { setGsaB64(''); setGsaJson('') }}>
                    replace
                  </Button>
                </div>
              ) : (
                <textarea
                  value={gsaJson}
                  onChange={e => { setGsaJson(e.target.value); setGsaError('') }}
                  placeholder={'{\n  "type": "service_account",\n  "project_id": "...",\n  "private_key": "-----BEGIN PRIVATE KEY-----\\n..."\n}'}
                  rows={5}
                  className="w-full rounded-md border border-input bg-secondary px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                />
              )}
              {gsaError && <p className="mt-1.5 text-xs text-destructive">{gsaError}</p>}
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button onClick={handleSave}>{saved ? 'Saved!' : 'Save Keys'}</Button>
              {hasKeys && (
                <Button variant="ghost" onClick={handleClear} className="text-muted-foreground hover:text-destructive">
                  Clear all
                </Button>
              )}
              <p className="text-xs text-muted-foreground ml-auto">Stored in browser localStorage only</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
