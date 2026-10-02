import type { CalculationInput, CalculationResult, RainfallStation, ReturnPeriod } from '../domain/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1/nbr10844'

const toRequest = (input: CalculationInput) => ({
  station_id: input.stationId,
  return_period: input.returnPeriod,
  intensity: input.intensity,
  rainfall_source: input.rainfallSource,
  manual_justification: input.manualJustification,
  roof_width: input.roofWidth,
  roof_rise: input.roofRise,
  roof_surface: input.roofSurface,
  gutter_length: input.gutterLength,
  outlet_type: input.outletType,
  extension_side_a: input.outletType === 'central' ? input.extensionSideA : null,
  extension_side_b: input.outletType === 'central' ? input.extensionSideB : null,
  profile: input.profile,
  bottom_width_mm: input.bottomWidthMm,
  top_width_mm: input.topWidthMm,
  useful_depth_mm: input.usefulDepthMm,
  freeboard_mm: input.freeboardMm,
  constructive_step_mm: input.constructiveStepMm,
  slope_percent: input.slopePercent,
  roughness: input.roughness,
  curve_condition: input.curveCondition,
  gutter_type: input.gutterType,
  project: input.project,
})

async function request(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${API_BASE_URL}${path}`, init)
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.mensagem ?? error?.detail?.mensagem ?? `Falha na API (${response.status}).`)
  }
  return response
}

const jsonPost = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

interface ApiResult {
  status: 'ATENDE' | 'NAO_ATENDE'
  resultados: {
    areaContribuicaoM2: number
    coeficienteTabela1: number
    vazaoBaseLmin: number
    vazaoProjetoLmin: number
    areaMolhadaM2: number
    perimetroMolhadoM: number
    raioHidraulicoM: number
    vazaoCapacidadeLmin: number
    velocidadeMs: number
    alturaTotalMm: number
  }
  passos: CalculationResult['steps']
  alertas: CalculationResult['alerts']
  dimensionamento?: NonNullable<CalculationResult['dimensioning']>
}

interface ApiTable5Post {
  id: number
  nome: string
  uf: string
  i1: number | null
  i5: number | null
  i25: number | null
  periodosReais?: Record<string, number>
}

interface ApiMaterial {
  id: string
  n: number
  nome: string
}

export interface CalculationService {
  calculate(input: CalculationInput): Promise<CalculationResult>
  calculate(input: CalculationInput, mode: 'verificar' | 'dimensionar'): Promise<CalculationResult>
  downloadMemorial(input: CalculationInput, format: 'docx' | 'json', mode: 'verificar' | 'dimensionar'): Promise<void>
  loadStations(): Promise<RainfallStation[]>
  loadMaterials(): Promise<Array<{ value: number; label: string }>>
}

export const calculationService: CalculationService = {
  async loadStations() {
    const response = await request('/tabela5')
    const table = await response.json() as { postos: ApiTable5Post[] }
    const rainfallValue = (post: ApiTable5Post, period: ReturnPeriod) => {
      const intensity = { 1: post.i1, 5: post.i5, 25: post.i25 }[period]
      const actualReturnPeriod = post.periodosReais?.[String(period)]
      return {
        intensity,
        ...(actualReturnPeriod === undefined ? {} : { actualReturnPeriod }),
      }
    }
    return table.postos.map((post) => ({
      id: post.id,
      name: post.nome,
      uf: post.uf,
      values: {
        1: rainfallValue(post, 1),
        5: rainfallValue(post, 5),
        25: rainfallValue(post, 25),
      },
    }))
  },

  async loadMaterials() {
    const response = await request('/materiais')
    const materials = await response.json() as ApiMaterial[]
    return materials.map((material) => ({ value: material.n, label: material.nome }))
  },

  async calculate(input, mode = 'verificar') {
    const path = mode === 'dimensionar' ? '/calhas/dimensionar' : '/calhas/verificar'
    const response = await request(path, jsonPost(toRequest(input)))
    const result = await response.json() as ApiResult
    const values = result.resultados
    const utilization = values.vazaoProjetoLmin / values.vazaoCapacidadeLmin * 100
    return {
      effectiveArea: values.areaContribuicaoM2,
      baseFlow: values.vazaoBaseLmin,
      designFlow: values.vazaoProjetoLmin,
      curveFactor: values.coeficienteTabela1,
      wetArea: values.areaMolhadaM2,
      wetPerimeter: values.perimetroMolhadoM,
      hydraulicRadius: values.raioHidraulicoM,
      velocity: values.velocidadeMs,
      capacity: values.vazaoCapacidadeLmin,
      utilization,
      margin: 100 - utilization,
      approved: result.status === 'ATENDE',
      totalHeightMm: values.alturaTotalMm,
      warnings: result.alertas.filter((alert) => alert.nivel !== 'info').map((alert) => alert.mensagem),
      steps: result.passos,
      alerts: result.alertas,
      dimensioning: result.dimensionamento,
    }
  },

  async downloadMemorial(input, format, mode) {
    const response = await request(`/memorial?formato=${format}&tipo=${mode}`, jsonPost(toRequest(input)))
    const blob = format === 'json'
      ? new Blob([JSON.stringify(await response.json(), null, 2)], { type: 'application/json' })
      : await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `memorial-nbr10844.${format}`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  },
}