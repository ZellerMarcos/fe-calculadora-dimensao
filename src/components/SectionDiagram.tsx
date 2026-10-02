import type { CalculationInput, CalculationResult } from '../domain/types'

interface SectionDiagramProps {
  input: CalculationInput
  result: CalculationResult
}

export function SectionDiagram({ input, result }: SectionDiagramProps) {
  const waterTop = 76
  const displayedDepth = result.dimensioning?.laminaMm ?? input.usefulDepthMm
  const bottom = 220
  const left = 100
  const right = 380
  const freeboardTop = 48
  const shape = (() => {
    if (input.profile === 'semicircular') {
      return {
        shell: `M ${left} ${waterTop} A 140 140 0 0 0 ${right} ${waterTop}`,
        water: `M ${left} ${waterTop} A 140 140 0 0 0 ${right} ${waterTop} Z`,
        freeboard: `M ${left} ${waterTop} L ${left} ${freeboardTop} M ${right} ${waterTop} L ${right} ${freeboardTop}`,
      }
    }
    if (input.profile === 'trapezoidal') {
      return {
        shell: `M 76 ${freeboardTop} L ${left} ${bottom} L ${right} ${bottom} L 404 ${freeboardTop}`,
        water: `M ${left} ${bottom} L 88 ${waterTop} L 392 ${waterTop} L ${right} ${bottom} Z`,
        freeboard: `M 76 ${freeboardTop} L 88 ${waterTop} M 404 ${freeboardTop} L 392 ${waterTop}`,
      }
    }
    return {
      shell: `M ${left} ${freeboardTop} L ${left} ${bottom} L ${right} ${bottom} L ${right} ${freeboardTop}`,
      water: `M ${left} ${waterTop} L ${left} ${bottom} L ${right} ${bottom} L ${right} ${waterTop} Z`,
      freeboard: `M ${left} ${freeboardTop} L ${right} ${freeboardTop} L ${right} ${waterTop} L ${left} ${waterTop} Z`,
    }
  })()

  return (
    <div className="diagram-wrap" aria-label="Diagrama da seção hidráulica">
      <svg viewBox="0 0 480 280" role="img">
        <defs>
          <pattern id="freeboard-pattern" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="9" stroke="currentColor" strokeWidth="2" />
          </pattern>
          <linearGradient id="water-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#46b4b0" stopOpacity="0.72" />
            <stop offset="1" stopColor="#167f81" stopOpacity="0.92" />
          </linearGradient>
        </defs>
        <path d={shape.freeboard} className="freeboard" />
        <path d={shape.water} fill="url(#water-fill)" className="water" />
        <path d={shape.shell} className="gutter-shell" />
        <line x1="84" y1={waterTop} x2="396" y2={waterTop} className="waterline" />
        <text x="240" y="134" textAnchor="middle" className="diagram-title">Lâmina útil</text>
        <text x="240" y="155" textAnchor="middle" className="diagram-value">{displayedDepth} mm</text>
        <text x="240" y="28" textAnchor="middle" className="diagram-note">bordo livre {input.freeboardMm} mm</text>
        <text x="240" y="258" textAnchor="middle" className="diagram-note">
          S = {result.wetArea.toFixed(4)} m² · Rh = {result.hydraulicRadius.toFixed(4)} m
        </text>
      </svg>
    </div>
  )
}