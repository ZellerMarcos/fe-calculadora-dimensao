import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronRight,
  CloudRain,
  Download,
  Droplets,
  FileJson2,
  FileText,
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
import type {
  CalculationInput,
  CalculationResult,
  CurveCondition,
  ProfileShape,
  RainfallStation,
  ReturnPeriod,
} from './domain/types'
import { calculationService } from './services/calculation-service'

const initialInput: CalculationInput = {
  stationId: 5,
  returnPeriod: 5,
  intensity: 122,
  rainfallSource: 'station',
  manualJustification: '',
  roofWidth: 10,
  roofRise: 2.5,
  roofSurface: 'inclined',
  gutterLength: 12,
  outletType: 'extremidade',
  extensionSideA: 6,
  extensionSideB: 6,
  profile: 'rectangular',
  bottomWidthMm: 150,
  topWidthMm: 220,
  usefulDepthMm: 150,
  freeboardMm: 20,
  constructiveStepMm: 10,
  slopePercent: 0.5,
  roughness: 0.011,
  curveCondition: 'none',
  gutterType: 'beiral_platibanda',
  project: { nome: '', cliente: '', responsavel: '', data: '' },
}

const profileLabels: Record<ProfileShape, string> = {
  rectangular: 'Retangular',
  semicircular: 'Semicircular',
  trapezoidal: 'Trapezoidal',
}

const emptyResult: CalculationResult = {
  effectiveArea: 0,
  baseFlow: 0,
  designFlow: 0,
  curveFactor: 1,
  wetArea: 0,
  wetPerimeter: 0,
  hydraulicRadius: 0,
  velocity: 0,
  capacity: 0,
  utilization: 0,
  margin: 0,
  approved: false,
  totalHeightMm: 0,
  warnings: [],
  steps: [],
  alerts: [],
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
  const [result, setResult] = useState<CalculationResult>(emptyResult)
  const [mode, setMode] = useState<'verificar' | 'dimensionar'>('verificar')
  const [rainfallStations, setRainfallStations] = useState<RainfallStation[]>([])
  const [materials, setMaterials] = useState<Array<{ value: number; label: string }>>([])
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [activeStep, setActiveStep] = useState(1)
  const [isExporting, setIsExporting] = useState(false)
  const [isCalculating, setIsCalculating] = useState(true)
  const [hasResult, setHasResult] = useState(false)
  const [exportError, setExportError] = useState('')
  const [calculationError, setCalculationError] = useState('')
  const [dataError, setDataError] = useState('')

  useEffect(() => {
    let current = true
    Promise.all([calculationService.loadStations(), calculationService.loadMaterials()])
      .then(([stations, materialOptions]) => {
        if (current) {
          setRainfallStations(stations)
          setMaterials(materialOptions)
        }
      })
      .catch((error: unknown) => {
        if (current) setDataError(error instanceof Error ? error.message : 'Falha ao carregar dados normativos.')
      })
    return () => {
      current = false
    }
  }, [])

  useEffect(() => {
    let current = true
    setIsCalculating(true)
    calculationService.calculate(input, mode).then((nextResult) => {
      if (current) {
        setResult(nextResult)
        setHasResult(true)
        setCalculationError('')
      }
    }).catch((error: unknown) => {
      if (current) setCalculationError(error instanceof Error ? error.message : 'Não foi possível calcular no servidor.')
    }).finally(() => {
      if (current) setIsCalculating(false)
    })
    return () => {
      current = false
    }
  }, [input, mode])

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

  const exportMemorial = async (format: 'docx' | 'json') => {
    setIsExporting(true)
    setExportError('')
    try {
      await calculationService.downloadMemorial(input, format, mode)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Não foi possível gerar o memorial no servidor.')
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
          <button className="icon-button" type="button" disabled={isExporting || !hasResult} onClick={() => exportMemorial('json')} title="Baixar memorial JSON" aria-label="Baixar memorial JSON">
            <FileJson2 size={18} />
          </button>
          <button className="primary-button" type="button" disabled={isExporting || !hasResult} onClick={() => exportMemorial('docx')} title="Gerar memorial detalhado em DOCX">
            {isExporting ? <Download size={17} /> : <FileText size={17} />}<span>{isExporting ? 'Gerando…' : 'Memorial DOCX'}</span>
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
        {calculationError && <div className="export-error" role="alert"><AlertTriangle size={16} /> API de cálculo: {calculationError}</div>}
        {dataError && <div className="export-error" role="alert"><AlertTriangle size={16} /> Dados normativos: {dataError}</div>}
        <section className="context-strip">
          <div><span className="eyebrow">Cálculo preliminar</span><h1>Calha pluvial de cobertura inclinada</h1></div>
          <p>O cálculo e a emissão do memorial são processados pela API conforme a ABNT NBR 10844:1989.</p>
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

              <NumberField id="intensity" label="Intensidade pluviométrica" unit="mm/h" value={input.intensity} min={1} step={1} readOnly={input.rainfallSource !== 'manual'} onChange={(next) => update('intensity', next)} />

              {input.rainfallSource === 'station' && selectedRainfall?.intensity === null && (
                <div className="inline-alert danger"><X size={16} /> Não há valor para este período. Informe uma intensidade local.</div>
              )}
              {actualReturnPeriod && (
                <div className="inline-alert"><AlertTriangle size={16} /> O valor publicado corresponde a T = {actualReturnPeriod} anos, conforme nota da Tabela 5.</div>
              )}
              {input.rainfallSource === 'manual' && (
                <label className="field" htmlFor="manual-justification">
                  <span>Justificativa da intensidade informada</span>
                  <input id="manual-justification" type="text" maxLength={300} value={input.manualJustification} onChange={(event) => update('manualJustification', event.target.value)} />
                </label>
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
                <label className="field" htmlFor="roof-surface">
                  <span>Superfície de contribuição</span>
                  <select id="roof-surface" value={input.roofSurface} onChange={(event) => update('roofSurface', event.target.value as CalculationInput['roofSurface'])}>
                    <option value="inclined">Cobertura inclinada</option>
                    <option value="horizontal">Superfície horizontal</option>
                  </select>
                </label>
                {input.roofSurface === 'inclined' && (
                  <NumberField id="roof-rise" label="Altura da cobertura (h)" unit="m" value={input.roofRise} min={0} onChange={(next) => update('roofRise', next)} />
                )}
                <label className="field" htmlFor="outlet-type">
                  <span>Posição da saída</span>
                  <select id="outlet-type" value={input.outletType} onChange={(event) => update('outletType', event.target.value as CalculationInput['outletType'])}>
                    <option value="extremidade">Na extremidade</option>
                    <option value="central">Fora da extremidade (central)</option>
                  </select>
                </label>
                {input.outletType === 'extremidade' ? (
                  <NumberField id="gutter-length" label="Extensão até a saída" unit="m" value={input.gutterLength} min={0.1} onChange={(next) => update('gutterLength', next)} />
                ) : (
                  <>
                    <NumberField id="extension-side-a" label="Extensão do lado A" unit="m" value={input.extensionSideA} min={0.1} onChange={(next) => update('extensionSideA', next)} />
                    <NumberField id="extension-side-b" label="Extensão do lado B" unit="m" value={input.extensionSideB} min={0.1} onChange={(next) => update('extensionSideB', next)} />
                  </>
                )}
              </div>
              <div className="formula-line"><span>{result.steps[1]?.formulaTexto ?? 'Área conforme geometria informada'}</span><strong>{format(result.effectiveArea)} m²</strong></div>
            </section>

            <section className="work-section" id="step-3">
              <header className="section-header">
                <span className="section-number">03</span>
                <div><span>Verificação</span><h2>Calha e escoamento</h2></div>
                <Droplets size={22} />
              </header>

              <div className="segmented-control two" aria-label="Modo de cálculo">
                <button type="button" className={mode === 'verificar' ? 'selected' : ''} onClick={() => setMode('verificar')}>Verificar dimensões</button>
                <button type="button" className={mode === 'dimensionar' ? 'selected' : ''} onClick={() => setMode('dimensionar')}>Dimensionar mínimo</button>
              </div>

              <div className="shape-picker">
                {(Object.keys(profileLabels) as ProfileShape[]).map((shape) => (
                  <button type="button" className={input.profile === shape ? 'selected' : ''} key={shape} onClick={() => setInput((current) => ({
                    ...current,
                    profile: shape,
                    usefulDepthMm: shape === 'semicircular' ? current.bottomWidthMm / 2 : current.usefulDepthMm,
                  }))}>
                    <span className={`shape-icon ${shape}`} />{profileLabels[shape]}
                  </button>
                ))}
              </div>

              <div className="field-grid">
                <NumberField id="bottom-width" label={input.profile === 'semicircular' ? 'Diâmetro interno' : 'Largura da base'} unit="mm" value={input.bottomWidthMm} min={1} step={5} onChange={(next) => setInput((current) => ({
                  ...current,
                  bottomWidthMm: next,
                  ...(current.profile === 'semicircular' ? { usefulDepthMm: next / 2, topWidthMm: next } : {}),
                }))} />
                {input.profile === 'trapezoidal' && (
                  <NumberField id="top-width" label="Largura na lâmina" unit="mm" value={input.topWidthMm} min={1} step={5} onChange={(next) => update('topWidthMm', next)} />
                )}
                {input.profile === 'semicircular' ? (
                  <div className="formula-line"><span>Lâmina normativa = D/2</span><strong>{format(input.usefulDepthMm, 0)} mm</strong></div>
                ) : (
                  <NumberField id="useful-depth" label="Lâmina útil" unit="mm" value={input.usefulDepthMm} min={1} step={5} onChange={(next) => update('usefulDepthMm', next)} />
                )}
                <NumberField id="freeboard" label="Bordo livre" unit="mm" value={input.freeboardMm} min={0} step={5} onChange={(next) => update('freeboardMm', next)} />
                <NumberField id="slope" label="Declividade" unit="%" value={input.slopePercent} min={0.01} step={0.1} onChange={(next) => update('slopePercent', next)} />
                {mode === 'dimensionar' && (
                  <NumberField id="constructive-step" label="Passo construtivo" unit="mm" value={input.constructiveStepMm} min={1} max={500} step={1} onChange={(next) => update('constructiveStepMm', next)} />
                )}
              </div>

              <label className="field" htmlFor="gutter-type">
                <span>Tipo de calha</span>
                <select id="gutter-type" value={input.gutterType} onChange={(event) => update('gutterType', event.target.value as CalculationInput['gutterType'])}>
                  <option value="beiral_platibanda">Beiral / platibanda</option>
                  <option value="agua_furtada">Água-furtada</option>
                </select>
              </label>

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

              <details className="project-details">
                <summary>Identificação do projeto para o memorial</summary>
                <div className="field-grid">
                  <label className="field" htmlFor="project-name"><span>Projeto</span><input id="project-name" maxLength={120} value={input.project.nome} onChange={(event) => setInput((current) => ({ ...current, project: { ...current.project, nome: event.target.value } }))} /></label>
                  <label className="field" htmlFor="project-client"><span>Cliente</span><input id="project-client" maxLength={120} value={input.project.cliente} onChange={(event) => setInput((current) => ({ ...current, project: { ...current.project, cliente: event.target.value } }))} /></label>
                  <label className="field" htmlFor="project-owner"><span>Responsável técnico</span><input id="project-owner" maxLength={120} value={input.project.responsavel} onChange={(event) => setInput((current) => ({ ...current, project: { ...current.project, responsavel: event.target.value } }))} /></label>
                  <label className="field" htmlFor="project-date"><span>Data do projeto</span><input id="project-date" type="date" value={input.project.data} onChange={(event) => setInput((current) => ({ ...current, project: { ...current.project, data: event.target.value } }))} /></label>
                </div>
              </details>
            </section>
          </div>

          <aside className="result-column" id="step-4">
            <section className={`verdict ${isCalculating ? 'pending' : result.approved ? 'approved' : 'rejected'}`}>
              <div className="verdict-icon">{isCalculating ? <Gauge size={28} /> : result.approved ? <Check size={28} /> : <X size={28} />}</div>
              <div><span>Veredito hidráulico</span><h2>{isCalculating ? 'Calculando no servidor' : result.approved ? 'A seção atende' : 'A seção não atende'}</h2><p>{isCalculating ? 'Aguardando resposta da API.' : result.approved ? `Margem hidráulica de ${format(result.margin, 1)}%.` : 'A capacidade é inferior à vazão de projeto.'}</p></div>
            </section>

            <div className="metric-grid">
              <article><span>Vazão de projeto</span><strong>{format(result.designFlow)}</strong><small>L/min</small></article>
              <article><span>Capacidade</span><strong>{format(result.capacity)}</strong><small>L/min</small></article>
              <article><span>Ocupação</span><strong>{format(result.utilization, 1)}</strong><small>%</small></article>
              <article><span>Velocidade</span><strong>{format(result.velocity)}</strong><small>m/s</small></article>
            </div>

            {mode === 'dimensionar' && result.dimensioning && (
              <section className="memory-section dimension-result">
                <header><div><span>Dimensionamento pelo servidor</span><h2>Dimensão mínima calculada</h2></div><Ruler size={20} /></header>
                <p>{result.dimensioning.mensagem ?? `Lâmina mínima: ${format(result.dimensioning.laminaMm, 0)} mm`}</p>
                {result.dimensioning.diametroMm !== null && <p>Diâmetro interno: {format(result.dimensioning.diametroMm, 0)} mm</p>}
                {result.dimensioning.larguraFundoMm !== null && <p>Largura de fundo fixa: {format(result.dimensioning.larguraFundoMm, 0)} mm</p>}
                <p>Capacidade: {format(result.dimensioning.capacidadeLmin)} L/min; passo construtivo: {format(result.dimensioning.passoConstrutivoMm, 0)} mm.</p>
              </section>
            )}

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
              <header><div><span>Memória do servidor</span><h2>Rastreabilidade do cálculo</h2></div><BookOpen size={20} /></header>
              <ol>
                {result.steps.map((step) => (
                  <li key={step.ordem}>
                    <span>{String(step.ordem).padStart(2, '0')}</span>
                    <p><strong>{step.titulo}</strong>{step.referenciaNorma}<br />{step.formulaTexto}<br />{step.substituicao} = {typeof step.resultado === 'number' ? format(step.resultado, 3) : step.resultado} {step.unidade}</p>
                  </li>
                ))}
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