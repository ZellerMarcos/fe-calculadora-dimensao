import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronRight,
  CloudRain,
  Download,
  Droplets,
  Gauge,
  Moon,
  Ruler,
  Sun,
  Waves,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NumberField } from './components/NumberField'
import { SectionDiagram } from './components/SectionDiagram'
import { calculateGutter } from './domain/calculate'
import { materials, rainfallStations } from './domain/normative-data'
import type {
  CalculationInput,
  CalculationResult,
  CurveCondition,
  ProfileShape,
  ReturnPeriod,
} from './domain/types'
import { calculationService } from './services/calculation-service'

const initialInput: CalculationInput = {
  stationId: 80,
  returnPeriod: 5,
  intensity: 172,
  rainfallSource: 'station',
  roofWidth: 10,
  roofRise: 2.5,
  gutterLength: 12,
  outlets: 2,
  profile: 'rectangular',
  bottomWidthMm: 150,
  topWidthMm: 220,
  usefulDepthMm: 150,
  freeboardMm: 20,
  slopePercent: 0.5,
  roughness: 0.011,
  curveCondition: 'none',
}

const profileLabels: Record<ProfileShape, string> = {
  rectangular: 'Retangular',
  semicircular: 'Semicircular',
  trapezoidal: 'Trapezoidal',
  triangular: 'Triangular',
}

const steps = [
  { label: 'Chuva de projeto', icon: CloudRain },
  { label: 'Área de contribuição', icon: Ruler },
  { label: 'Calha e escoamento', icon: Droplets },
  { label: 'Resultado', icon: Gauge },
]

const format = (value: number, digits = 2) =>
  Number.isFinite(value)
    ? new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(value)
    : '—'

export default function App() {
  const [input, setInput] = useState(initialInput)
  const [result, setResult] = useState<CalculationResult>(() => calculateGutter(initialInput))
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [activeStep, setActiveStep] = useState(1)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  useEffect(() => {
    let current = true
    calculationService.calculate(input).then((nextResult) => {
      if (current) setResult(nextResult)
    })
    return () => {
      current = false
    }
  }, [input])

  const selectedStation = rainfallStations.find((station) => station.id === input.stationId)
  const selectedRainfall = selectedStation?.values[input.returnPeriod]
  const actualReturnPeriod = selectedRainfall?.actualReturnPeriod

  const update = <Key extends keyof CalculationInput>(key: Key, value: CalculationInput[Key]) => {
    setInput((current) => ({ ...current, [key]: value }))
  }

  const selectPeriod = (period: ReturnPeriod) => {
    const rainfall = selectedStation?.values[period]
    setInput((current) => ({
      ...current,
      returnPeriod: period,
      intensity:
        current.rainfallSource === 'station' && rainfall?.intensity
          ? rainfall.intensity
          : current.intensity,
    }))
  }

  const selectStation = (stationId: number) => {
    const station = rainfallStations.find((item) => item.id === stationId)
    const rainfall = station?.values[input.returnPeriod]
    setInput((current) => ({
      ...current,
      stationId,
      rainfallSource: 'station',
      intensity: rainfall?.intensity ?? current.intensity,
    }))
  }

  const selectRainfallSource = (source: CalculationInput['rainfallSource']) => {
    const stationIntensity = selectedStation?.values[input.returnPeriod].intensity
    setInput((current) => ({
      ...current,
      rainfallSource: source,
      intensity:
        source === 'simplified'
          ? 150
          : source === 'station' && stationIntensity
            ? stationIntensity
            : current.intensity,
    }))
  }

  const scrollToStep = (step: number) => {
    setActiveStep(step)
    document.getElementById(`step-${step}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const exportPdf = async () => {
    setIsExporting(true)
    setExportError('')
    try {
      const { downloadCalculationPdf } = await import('./services/pdf-service')
      await downloadCalculationPdf(
        input,
        result,
        selectedStation ? `${selectedStation.name}/${selectedStation.uf}` : 'Intensidade informada',
      )
    } catch (error) {
      console.error('Falha ao gerar PDF', error)
      setExportError('Não foi possível gerar o PDF neste navegador.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="app" data-theme={theme}>
      <header className="topbar">
        <div className="brand-block">
          <span className="brand-mark"><Waves size={23} /></span>
          <div><strong>Plúvio</strong><span>Dimensionamento de calhas</span></div>
        </div>
        <div className="header-actions">
          <span className="standard-chip"><BookOpen size={14} /> ABNT NBR 10844:1989</span>
          <button
            className="icon-button"
            type="button"
            title={theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'}
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button className="primary-button" type="button" disabled={isExporting} onClick={exportPdf} title="Exportar memória em PDF">
            <Download size={17} /><span>{isExporting ? 'Gerando…' : 'Exportar PDF'}</span>
          </button>
        </div>
      </header>

      <nav className="step-nav" aria-label="Etapas do dimensionamento">
        {steps.map(({ label, icon: Icon }, index) => {
          const step = index + 1
          return (
            <button className={activeStep === step ? 'active' : ''} type="button" key={label} onClick={() => scrollToStep(step)}>
              <span>{step}</span><Icon size={16} /><strong>{label}</strong>
            </button>
          )
        })}
      </nav>

      <main className="workspace">
        {exportError && <div className="export-error" role="alert"><AlertTriangle size={16} /> {exportError}</div>}
        <section className="context-strip">
          <div><span className="eyebrow">Cálculo preliminar</span><h1>Calha pluvial de cobertura inclinada</h1></div>
          <p>Motor local preparado para migração à API. Confira os dados pluviométricos e as condições de saída antes de emitir o memorial.</p>
        </section>

        <div className="calculator-layout">
          <div className="input-column">
            <section className="work-section" id="step-1">
              <header className="section-header">
                <span className="section-number">01</span>
                <div><span>Dados de entrada</span><h2>Chuva de projeto</h2></div>
                <CloudRain size={22} />
              </header>

              <div className="segmented-control three">
                {([1, 5, 25] as ReturnPeriod[]).map((period) => (
                  <button type="button" className={input.returnPeriod === period ? 'selected' : ''} key={period} onClick={() => selectPeriod(period)}>
                    T = {period} ano{period > 1 ? 's' : ''}
                  </button>
                ))}
              </div>

              <label className="field" htmlFor="rainfall-station">
                <span>Posto pluviométrico · Tabela 5</span>
                <select id="rainfall-station" value={input.stationId ?? ''} onChange={(event) => selectStation(Number(event.target.value))}>
                  {rainfallStations.map((station) => <option key={station.id} value={station.id}>{station.name}/{station.uf}</option>)}
                </select>
              </label>

              <div className="source-options">
                {([
                  ['station', 'Posto da norma'],
                  ['simplified', 'Simplificado 150'],
                  ['manual', 'Valor informado'],
                ] as const).map(([source, label]) => (
                  <button type="button" key={source} className={input.rainfallSource === source ? 'selected' : ''} onClick={() => selectRainfallSource(source)}>
                    {input.rainfallSource === source && <Check size={14} />}{label}
                  </button>
                ))}
              </div>

              <NumberField id="intensity" label="Intensidade pluviométrica" unit="mm/h" value={input.intensity} min={1} step={1} onChange={(next) => update('intensity', next)} />

              {input.rainfallSource === 'station' && selectedRainfall?.intensity === null && (
                <div className="inline-alert danger"><X size={16} /> Não há valor para este período. Informe uma intensidade local.</div>
              )}
              {actualReturnPeriod && (
                <div className="inline-alert"><AlertTriangle size={16} /> O valor publicado corresponde a T = {actualReturnPeriod} anos, conforme nota da Tabela 5.</div>
              )}
            </section>

            <section className="work-section" id="step-2">
              <header className="section-header">
                <span className="section-number">02</span>
                <div><span>Geometria</span><h2>Área de contribuição</h2></div>
                <Ruler size={22} />
              </header>
              <div className="field-grid">
                <NumberField id="roof-width" label="Largura da água (a)" unit="m" value={input.roofWidth} min={0.1} onChange={(next) => update('roofWidth', next)} />
                <NumberField id="roof-rise" label="Altura da cobertura (h)" unit="m" value={input.roofRise} min={0} onChange={(next) => update('roofRise', next)} />
                <NumberField id="gutter-length" label="Comprimento da calha (b)" unit="m" value={input.gutterLength} min={0.1} onChange={(next) => update('gutterLength', next)} />
                <NumberField id="outlets" label="Saídas com divisão igual" unit="un" value={input.outlets} min={1} max={20} step={1} onChange={(next) => update('outlets', Math.max(1, Math.round(next)))} />
              </div>
              <div className="formula-line"><span>A = (a + h/2) · b/N</span><strong>{format(result.effectiveArea)} m² por saída</strong></div>
            </section>

            <section className="work-section" id="step-3">
              <header className="section-header">
                <span className="section-number">03</span>
                <div><span>Verificação</span><h2>Calha e escoamento</h2></div>
                <Droplets size={22} />
              </header>

              <div className="shape-picker">
                {(Object.keys(profileLabels) as ProfileShape[]).map((shape) => (
                  <button type="button" className={input.profile === shape ? 'selected' : ''} key={shape} onClick={() => update('profile', shape)}>
                    <span className={`shape-icon ${shape}`} />{profileLabels[shape]}
                  </button>
                ))}
              </div>

              <div className="field-grid">
                {input.profile !== 'triangular' && (
                  <NumberField id="bottom-width" label={input.profile === 'semicircular' ? 'Diâmetro interno' : 'Largura da base'} unit="mm" value={input.bottomWidthMm} min={1} step={5} onChange={(next) => update('bottomWidthMm', next)} />
                )}
                {(input.profile === 'trapezoidal' || input.profile === 'triangular') && (
                  <NumberField id="top-width" label="Largura na lâmina" unit="mm" value={input.topWidthMm} min={1} step={5} onChange={(next) => update('topWidthMm', next)} />
                )}
                <NumberField id="useful-depth" label="Lâmina útil" unit="mm" value={input.usefulDepthMm} min={1} step={5} onChange={(next) => update('usefulDepthMm', next)} />
                <NumberField id="freeboard" label="Bordo livre" unit="mm" value={input.freeboardMm} min={0} step={5} onChange={(next) => update('freeboardMm', next)} />
                <NumberField id="slope" label="Declividade" unit="%" value={input.slopePercent} min={0.01} step={0.1} onChange={(next) => update('slopePercent', next)} />
              </div>

              <label className="field" htmlFor="material">
                <span>Material · coeficiente de rugosidade</span>
                <select id="material" value={input.roughness} onChange={(event) => update('roughness', Number(event.target.value))}>
                  {materials.map((material) => <option key={material.value} value={material.value}>{material.label} · n = {material.value}</option>)}
                </select>
              </label>

              <label className="field" htmlFor="curve-condition">
                <span>Mudança de direção próxima à saída</span>
                <select id="curve-condition" value={input.curveCondition} onChange={(event) => update('curveCondition', event.target.value as CurveCondition)}>
                  <option value="none">Sem curva a menos de 4 m · fator 1,00</option>
                  <option value="straight-under-2m">Canto reto a menos de 2 m · fator 1,20</option>
                  <option value="straight-2-to-4m">Canto reto entre 2 e 4 m · fator 1,10</option>
                  <option value="rounded-under-2m">Canto arredondado a menos de 2 m · fator 1,10</option>
                  <option value="rounded-2-to-4m">Canto arredondado entre 2 e 4 m · fator 1,05</option>
                </select>
              </label>
            </section>
          </div>

          <aside className="result-column" id="step-4">
            <section className={`verdict ${result.approved ? 'approved' : 'rejected'}`}>
              <div className="verdict-icon">{result.approved ? <Check size={28} /> : <X size={28} />}</div>
              <div><span>Veredito hidráulico</span><h2>{result.approved ? 'A seção atende' : 'A seção não atende'}</h2><p>{result.approved ? `Margem hidráulica de ${format(result.margin, 1)}%.` : 'A capacidade é inferior à vazão de projeto.'}</p></div>
            </section>

            <div className="metric-grid">
              <article><span>Vazão de projeto</span><strong>{format(result.designFlow)}</strong><small>L/min</small></article>
              <article><span>Capacidade</span><strong>{format(result.capacity)}</strong><small>L/min</small></article>
              <article><span>Ocupação</span><strong>{format(result.utilization, 1)}</strong><small>%</small></article>
              <article><span>Velocidade</span><strong>{format(result.velocity)}</strong><small>m/s</small></article>
            </div>

            <section className="visual-section">
              <header><div><span>Seção hidráulica</span><h2>{profileLabels[input.profile]}</h2></div><span className="scale-tag">esquemático</span></header>
              <SectionDiagram input={input} result={result} />
              <div className="hydraulic-data">
                <span><small>Área molhada</small><strong>{format(result.wetArea, 4)} m²</strong></span>
                <span><small>Perímetro</small><strong>{format(result.wetPerimeter, 3)} m</strong></span>
                <span><small>Altura total</small><strong>{format(result.totalHeightMm, 0)} mm</strong></span>
              </div>
            </section>

            {result.warnings.length > 0 && (
              <section className="warnings-panel"><h3><AlertTriangle size={17} /> Pontos de atenção</h3>{result.warnings.map((warning) => <p key={warning}>{warning}</p>)}</section>
            )}

            <section className="memory-section">
              <header><div><span>Memória resumida</span><h2>Rastreabilidade do cálculo</h2></div><BookOpen size={20} /></header>
              <ol>
                <li><span>01</span><p><strong>Área de contribuição</strong>A = ({format(input.roofWidth)} + {format(input.roofRise)}/2) · {format(input.gutterLength)}/{input.outlets} = {format(result.effectiveArea)} m².</p></li>
                <li><span>02</span><p><strong>Vazão base</strong>Q = {format(input.intensity, 0)} · {format(result.effectiveArea)} / 60 = {format(result.baseFlow)} L/min.</p></li>
                <li><span>03</span><p><strong>Condição da saída</strong>Aplicado fator {format(result.curveFactor)}: Qd = {format(result.designFlow)} L/min.</p></li>
                <li><span>04</span><p><strong>Manning-Strickler</strong>Qcap = 60.000 · S/n · Rh<sup>2/3</sup> · i<sup>1/2</sup> = {format(result.capacity)} L/min.</p></li>
              </ol>
              <button className="text-button" type="button" onClick={() => scrollToStep(1)}>Revisar entradas <ChevronRight size={16} /></button>
            </section>
          </aside>
        </div>
      </main>

      <footer><span>Plúvio · ferramenta de apoio ao projeto</span><span>Resultados devem ser validados por profissional habilitado.</span></footer>
    </div>
  )
}