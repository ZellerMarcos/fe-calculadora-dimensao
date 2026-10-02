import PDFDocument, * as PDFKitModule from 'pdfkit'
import { toBlob } from 'pdfkit/output'
import Courier from 'pdfkit/standard-fonts/Courier'
import Helvetica from 'pdfkit/standard-fonts/Helvetica'
import HelveticaBold from 'pdfkit/standard-fonts/HelveticaBold'
import type { CalculationInput, CalculationResult } from '../domain/types'

const { registerStdFonts } = PDFKitModule as unknown as {
  registerStdFonts: (...fontData: unknown[]) => void
}

registerStdFonts(Courier, Helvetica, HelveticaBold)

const format = (value: number, digits = 2) =>
  new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)

const addDefinition = (doc: PDFKit.PDFDocument, label: string, value: string) => {
  const y = doc.y
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#355047').text(label, 52, y, { width: 190 })
  doc.font('Helvetica').fillColor('#18251e').text(value, 242, y, { width: 300 })
  doc.moveDown(0.7)
}

export async function downloadCalculationPdf(
  input: CalculationInput,
  result: CalculationResult,
  stationLabel: string,
) {
  const document = new PDFDocument({
    size: 'A4',
    margins: { top: 48, right: 48, bottom: 48, left: 48 },
    info: {
      Title: 'Memória de cálculo - Dimensionamento de calha',
      Author: 'Plúvio',
      Subject: 'Verificação hidráulica conforme ABNT NBR 10844:1989',
    },
  })
  const completed = toBlob(document)

  document.rect(0, 0, 595.28, 112).fill('#12372e')
  document.font('Helvetica-Bold').fontSize(24).fillColor('#ffffff').text('PLÚVIO', 48, 38)
  document.font('Helvetica').fontSize(10).fillColor('#cfe2db').text('MEMÓRIA DE CÁLCULO HIDRÁULICO', 48, 70)
  document.font('Helvetica-Bold').fontSize(9).fillColor('#b4d765').text('ABNT NBR 10844:1989', 395, 47, { width: 150, align: 'right' })
  document.font('Helvetica').fillColor('#cfe2db').text(new Date().toLocaleDateString('pt-BR'), 395, 66, { width: 150, align: 'right' })
  document.y = 138

  document.font('Helvetica-Bold').fontSize(15).fillColor('#18251e').text('1. Dados de projeto')
  document.moveTo(48, document.y + 5).lineTo(547, document.y + 5).strokeColor('#b4c1ba').stroke()
  document.moveDown(1.2)
  addDefinition(document, 'Posto pluviométrico', stationLabel)
  addDefinition(document, 'Período de retorno', `${input.returnPeriod} anos · duração 5 min`)
  addDefinition(document, 'Intensidade', `${format(input.intensity, 0)} mm/h`)
  addDefinition(document, 'Cobertura', `a = ${format(input.roofWidth)} m · h = ${format(input.roofRise)} m · b = ${format(input.gutterLength)} m`)
  addDefinition(document, 'Saídas consideradas', `${input.outlets} · divisão uniforme da área`)
  addDefinition(document, 'Perfil da calha', input.profile)
  addDefinition(document, 'Seção útil', `base/diâmetro = ${format(input.bottomWidthMm, 0)} mm · lâmina = ${format(input.usefulDepthMm, 0)} mm`)
  addDefinition(document, 'Bordo livre', `${format(input.freeboardMm, 0)} mm`)
  addDefinition(document, 'Declividade e rugosidade', `${format(input.slopePercent, 2)}% · n = ${input.roughness}`)

  document.moveDown(1)
  document.font('Helvetica-Bold').fontSize(15).fillColor('#18251e').text('2. Memória de cálculo')
  document.moveTo(48, document.y + 5).lineTo(547, document.y + 5).strokeColor('#b4c1ba').stroke()
  document.moveDown(1.2)

  const formulas = [
    ['Área de contribuição por saída', `A = (a + h/2) x b/N = ${format(result.effectiveArea)} m²`],
    ['Vazão de base', `Q = I x A / 60 = ${format(result.baseFlow)} L/min`],
    ['Vazão de projeto corrigida', `Qd = Q x ${format(result.curveFactor)} = ${format(result.designFlow)} L/min`],
    ['Propriedades hidráulicas', `S = ${format(result.wetArea, 4)} m² · P = ${format(result.wetPerimeter, 4)} m · Rh = ${format(result.hydraulicRadius, 4)} m`],
    ['Manning-Strickler', `Qcap = 60.000 x S/n x Rh^(2/3) x i^(1/2) = ${format(result.capacity)} L/min`],
  ]
  formulas.forEach(([title, formula], index) => {
    const y = document.y
    document.roundedRect(48, y, 499, 45, 3).fill(index % 2 ? '#f5f8f6' : '#edf4f1')
    document.font('Helvetica-Bold').fontSize(9).fillColor('#087f7d').text(`${index + 1}. ${title}`, 60, y + 9)
    document.font('Courier').fontSize(8.5).fillColor('#263a31').text(formula ?? '', 60, y + 25, { width: 475 })
    document.y = y + 53
  })

  const verdictY = document.y + 5
  const verdictColor = result.approved ? '#087f7d' : '#a94034'
  document.roundedRect(48, verdictY, 499, 70, 4).fill(verdictColor)
  document.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff').text('VEREDITO HIDRÁULICO', 62, verdictY + 13)
  document.font('Helvetica-Bold').fontSize(18).text(result.approved ? 'A SEÇÃO ATENDE' : 'A SEÇÃO NÃO ATENDE', 62, verdictY + 32)
  document.font('Helvetica').fontSize(9).text(`Ocupação: ${format(result.utilization, 1)}% · Margem: ${format(result.margin, 1)}%`, 370, verdictY + 35, { width: 160, align: 'right' })
  document.y = verdictY + 90

  if (result.warnings.length > 0) {
    document.font('Helvetica-Bold').fontSize(11).fillColor('#a75e0a').text('Pontos de atenção')
    document.moveDown(0.4)
    result.warnings.forEach((warning) => {
      document.font('Helvetica').fontSize(8.5).fillColor('#5b4931').text(`• ${warning}`, { indent: 8, lineGap: 3 })
    })
  }

  document.moveDown(1.5)
  document.font('Helvetica').fontSize(7.5).fillColor('#637168').text(
    'Documento de apoio ao projeto. Os resultados devem ser conferidos e validados por profissional legalmente habilitado. Referência: ABNT NBR 10844:1989.',
    { align: 'center' },
  )
  document.end()

  const blob = await completed
  const url = URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = url
  link.download = `memoria-calha-${new Date().toISOString().slice(0, 10)}.pdf`
  window.document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}