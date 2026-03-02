export interface RawDataPayload {
  headers: string[]
  rows: string[][]
  spreadsheetId?: string
  source: 'sheet' | 'csv'
}

export interface ColumnMap {
  leadName?: number
  dealValue?: number
  weightedValue?: number
  status?: number
  customerBucket?: number
  useCase?: number
  campaignType?: number
  campaignName?: number
  dealType?: number
  isSQL?: number
  qualifiedPersonas?: number
  interestLevel?: number
  leadsContacted?: number
  date?: number
  closeDate?: number
  owner?: number
  notes?: number
  [key: string]: number | undefined
}

export interface SalesRow {
  _rawIndex: number
  leadName?: string
  dealValue?: number
  weightedValue?: number      // computed from stage weight × deal value
  status?: string             // pipeline stage
  customerBucket?: string     // Startup | Big Tech | AI Lab | Enterprise
  useCase?: string
  campaignType?: string       // Sales | Marketing
  campaignName?: string
  dealType?: string           // Pilot | Production
  isSQL?: boolean
  qualifiedPersonas?: number
  interestLevel?: string
  leadsContacted?: number
  date?: string
  closeDate?: string
  owner?: string
  notes?: string
  _raw: string[]
}

export interface ForecastResult {
  // Pipeline totals
  weightedPipelineTotal: number
  rawPipelineTotal: number
  quarterlyForecast: number

  // SQLs
  sqlCount: number
  targetSQLsPerCampaign: number
  sqlConversionRate: number

  // Pipeline breakdown
  pipelineByStage: {
    discovery: number
    qualified: number
    technicalValidation: number
    decisionProcess: number
    commit: number
  }
  pipelineByBucket: {
    startup: number
    bigtech: number
    ailab: number
    enterprise: number
  }

  // Revenue projection
  projectedRevenue: { days30: number; days60: number; days90: number }

  // Scores & health
  predictedConversionRate: number
  leadQualityScore: number
  pipelineHealthSummary: string

  // Insights
  insights: string[]
  recommendations: string[]
  riskFactors: string[]
  topLeadsToFocus: number[]
  topPerformingUseCase: string
  topPerformingBucket: string
}
