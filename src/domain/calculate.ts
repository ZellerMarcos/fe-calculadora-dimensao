import { curveFactors } from './normative-data'
import type { CalculationInput, CalculationResult } from './types'

const millimetersToMeters = (value: number) => value / 1000

export function calculateGutter(input: CalculationInput): CalculationResult {
  const warnings: string[] = []
  const outlets = Math.max(1, Math.round(input.outlets))
  const effectiveArea =
    (input.roofWidth + input.roofRise / 2) * (input.gutterLength / outlets)
  const baseFlow = (input.intensity * effectiveArea) / 60
  const curveFactor = curveFactors[input.curveCondition]
  const designFlow = baseFlow * curveFactor
  const depth = millimetersToMeters(input.usefulDepthMm)
  const bottomWidth = millimetersToMeters(input.bottomWidthMm)
  const topWidth = millimetersToMeters(input.topWidthMm)

  let wetArea = 0
  let wetPerimeter = 0

  if (input.profile === 'rectangular') {
    wetArea = bottomWidth * depth
    wetPerimeter = bottomWidth + 2 * depth
  }

  if (input.profile === 'semicircular') {
    const radius = bottomWidth / 2
    const waterDepth = Math.min(depth, radius)
    const theta = 2 * Math.acos((radius - waterDepth) / radius)
    wetArea = (radius ** 2 / 2) * (theta - Math.sin(theta))
    wetPerimeter = radius * theta
    if (Math.abs(waterDepth - radius) > 0.000001) {
      warnings.push('A Tabela 3 da norma considera lâmina igual à metade do diâmetro interno.')
    }
  }

  if (input.profile === 'trapezoidal') {
    const waterTopWidth = Math.max(topWidth, bottomWidth)
    const side = Math.hypot((waterTopWidth - bottomWidth) / 2, depth)
    wetArea = ((bottomWidth + waterTopWidth) / 2) * depth
    wetPerimeter = bottomWidth + 2 * side
  }

  if (input.profile === 'triangular') {
    const side = Math.hypot(topWidth / 2, depth)
    wetArea = (topWidth * depth) / 2
    wetPerimeter = 2 * side
  }

  const hydraulicRadius = wetPerimeter > 0 ? wetArea / wetPerimeter : 0
  const slope = input.slopePercent / 100
  const velocity =
    hydraulicRadius > 0 && slope > 0
      ? (1 / input.roughness) * hydraulicRadius ** (2 / 3) * Math.sqrt(slope)
      : 0
  const capacity = wetArea * velocity * 60_000
  const utilization = capacity > 0 ? (designFlow / capacity) * 100 : Infinity
  const margin = Number.isFinite(utilization) ? 100 - utilization : -Infinity

  if (input.slopePercent < 0.5) {
    warnings.push('A declividade está abaixo do mínimo de 0,5% para calhas de beiral e platibanda.')
  }
  if (input.rainfallSource === 'simplified' && effectiveArea > 100) {
    warnings.push('A adoção simplificada de 150 mm/h só se aplica, salvo casos especiais, até 100 m².')
  }
  if (input.stationId === null && input.rainfallSource === 'station') {
    warnings.push('Selecione um posto pluviométrico ou altere a origem da intensidade.')
  }

  return {
    effectiveArea,
    baseFlow,
    designFlow,
    curveFactor,
    wetArea,
    wetPerimeter,
    hydraulicRadius,
    velocity,
    capacity,
    utilization,
    margin,
    approved: capacity >= designFlow && capacity > 0,
    totalHeightMm: input.usefulDepthMm + input.freeboardMm,
    warnings,
  }
}