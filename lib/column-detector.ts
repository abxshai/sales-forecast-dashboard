import type { ColumnMap } from '@/types'

const COLUMN_PATTERNS: Record<string, RegExp[]> = {
  leadName: [
    /^(lead\s*name|contact\s*name|company|account|prospect|client|customer|name)$/i,
    /lead/i, /contact/i, /company/i,
  ],
  dealValue: [
    /^(deal\s*value|value|amount|revenue|price|mrr|arr|contract\s*value|deal\s*size|opportunity\s*value|budget|ticket\s*size)$/i,
    /value$/i, /amount/i, /revenue/i, /\$|dollar/i, /ticket/i,
  ],
  weightedValue: [
    /^(weighted\s*value|weighted|forecast\s*value|weighted\s*pipeline|adjusted\s*value)$/i,
    /weighted/i, /forecast.?val/i,
  ],
  status: [
    /^(stage|status|deal\s*stage|pipeline\s*stage|phase|state)$/i,
    /stage/i, /status/i,
  ],
  customerBucket: [
    /^(customer\s*bucket|bucket|segment|customer\s*type|customer\s*tier|tier|customer\s*segment|account\s*type)$/i,
    /bucket/i, /segment/i, /tier/i,
  ],
  useCase: [
    /^(use\s*case|usecase|product\s*line|solution|product|use\s*case\s*#|uc|sales\s*play|sales\s*plays|play)$/i,
    /use.?case/i, /solution/i, /sales.?play/i,
  ],
  campaignType: [
    /^(campaign\s*type|source\s*type|motion|sales\s*motion|channel)$/i,
    /campaign.?type/i, /motion/i, /channel/i,
  ],
  campaignName: [
    /^(campaign|campaign\s*name|campaign\s*id|program)$/i,
    /campaign/i, /program/i,
  ],
  dealType: [
    /^(deal\s*type|engagement\s*type|type|contract\s*type|phase\s*type)$/i,
    /deal.?type/i, /engagement.?type/i,
  ],
  isSQL: [
    /^(sql|is\s*sql|qualified|sales\s*qualified|sql\s*status)$/i,
    /sql/i, /qualified.?lead/i,
  ],
  qualifiedPersonas: [
    /^(qualified\s*personas|personas|contacts|persona\s*count|buyers)$/i,
    /persona/i, /buyer/i,
  ],
  interestLevel: [
    /^(interest\s*generated|interest|interest\s*level|score|engagement|priority|rating)$/i,
    /interest.?gen/i, /interest/i, /priority/i, /engagement/i,
  ],
  leadsContacted: [
    /^(leads\s*contacted|contacted|outreach|touches|calls|emails\s*sent|follow\s*ups)$/i,
    /contacted/i, /outreach/i, /touch/i,
  ],
  date: [
    /^(date|created|created\s*at|sql\s*date|entry\s*date|start\s*date)$/i,
    /created/i, /entry/i, /start.?date/i,
  ],
  closeDate: [
    /^(close\s*date|expected\s*close|close|target\s*close|expected\s*close\s*date)$/i,
    /close.?date/i, /close/i,
  ],
  owner: [
    /^(owner|rep|sales\s*rep|ae|account\s*executive|assigned\s*to)$/i,
    /owner/i, /rep/i,
  ],
  notes: [
    /^(notes|note|comments|description|details|memo|remarks|pain|pain\s*points)$/i,
    /note/i, /comment/i, /pain/i, /descri/i,
  ],
}

export function detectColumns(headers: string[]): ColumnMap {
  const map: ColumnMap = {}
  const usedIndices = new Set<number>()

  for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
    let bestScore = -1
    let bestIdx = -1

    headers.forEach((header, idx) => {
      if (usedIndices.has(idx)) return
      const h = header.trim()
      for (let p = 0; p < patterns.length; p++) {
        if (patterns[p].test(h)) {
          const score = patterns.length - p
          if (score > bestScore) {
            bestScore = score
            bestIdx = idx
          }
          break
        }
      }
    })

    if (bestIdx >= 0) {
      map[field] = bestIdx
      usedIndices.add(bestIdx)
    }
  }

  return map
}
