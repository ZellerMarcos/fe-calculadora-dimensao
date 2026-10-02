export type ReturnPeriod = 1 | 5 | 25
export type ProfileShape = 'rectangular' | 'semicircular' | 'trapezoidal' | 'triangular'
export type CurveCondition =
  | 'none'
  | 'straight-under-2m'
  | 'straight-2-to-4m'
  | 'rounded-under-2m'
  | 'rounded-2-to-4m'

export interface RainfallValue {
  intensity: number | null
  actualReturnPeriod?: number
}

export interface RainfallStation {
  id: number
  name: string
  uf: string
  values: Record<ReturnPeriod, RainfallValue>
}

export interface CalculationInput {
  stationId: number | null
  returnPeriod: ReturnPeriod
  intensity: number
  rainfallSource: 'station' | 'simplified' | 'manual'
  roofWidth: number
  roofRise: number
  gutterLength: number
  outlets: number
  profile: ProfileShape
  bottomWidthMm: number
  topWidthMm: number
  usefulDepthMm: number
  freeboardMm: number
  slopePercent: number
  roughness: number
  curveCondition: CurveCondition
}

export interface CalculationResult {
  effectiveArea: number
  baseFlow: number
  designFlow: number
  curveFactor: number
  wetArea: number
  wetPerimeter: number
  hydraulicRadius: number
  velocity: number
  capacity: number
  utilization: number
  margin: number
  approved: boolean
  totalHeightMm: number
  warnings: string[]
}