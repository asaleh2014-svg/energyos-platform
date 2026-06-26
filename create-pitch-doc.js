const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  LevelFormat, Header, Footer, PageNumber, PageBreak,
} = require('docx')
const fs = require('fs')

// ── Helpers ────────────────────────────────────────────────────────────────
const BRAND   = '1F4E7A'   // dark navy
const ACCENT  = '2E75B6'   // mid blue
const LIGHT   = 'D6E8F5'   // pale blue (header fill)
const WHITE   = 'FFFFFF'
const BORDER  = { style: BorderStyle.SINGLE, size: 1, color: 'C8D8E8' }
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER }

const cell = (text, { bold = false, bg = WHITE, color = '1F2937', width = 4680, isHeader = false } = {}) =>
  new TableCell({
    borders: BORDERS,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: bg, type: ShadingType.CLEAR },
    margins: { top: 100, bottom: 100, left: 160, right: 160 },
    verticalAlign: 'center',
    children: [new Paragraph({
      children: [new TextRun({ text, bold: bold || isHeader, size: isHeader ? 22 : 20, color, font: 'Arial' })],
    })],
  })

const bullet = (text, ref = 'bullets') =>
  new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 22, font: 'Arial', color: '374151' })],
  })

const h1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, bold: true, size: 36, font: 'Arial', color: BRAND })],
  })

const h2 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, size: 28, font: 'Arial', color: ACCENT })],
  })

const h3 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 220, after: 100 },
    children: [new TextRun({ text, bold: true, size: 24, font: 'Arial', color: '1F4E7A' })],
  })

const body = (text, { bold = false, italic = false, spacing = { before: 60, after: 100 } } = {}) =>
  new Paragraph({
    spacing,
    children: [new TextRun({ text, bold, italic, size: 22, font: 'Arial', color: '374151' })],
  })

const divider = () =>
  new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D1E4F5', space: 1 } },
    children: [],
  })

const space = (n = 1) =>
  new Paragraph({ spacing: { before: 40 * n, after: 40 * n }, children: [] })

// ── Feature table ──────────────────────────────────────────────────────────
const featureRows = [
  ['Feature', 'What it means for the customer'],
  ['Invoice Management', 'Upload a PDF invoice — the AI reads it automatically and extracts all the data. No manual entry.'],
  ['AI Auditor', 'Checks every invoice for overcharges, compares the price charged to the agreed contract rate, and flags anything suspicious.'],
  ['Portfolio Map', 'A live map showing all buildings and sites — which are active, which have issues, all in one view.'],
  ['Consumption Charts', 'Visual graphs showing energy use per building, per month, per meter — with the ability to switch between kWh, MWh, and m³.'],
  ['Multi-site Management', 'Whether a client has 2 buildings or 200, they manage them all in one place — organised by country, city, and site.'],
  ['Multi-user Access', 'The company Admin controls who sees what. Finance staff see invoices, operations staff see meter data, management sees the full picture.'],
  ['Budget Tracking', 'Set energy budgets per site and track spend in real time — no surprises at month end.'],
  ['CO₂ & Emissions', 'Tracks carbon footprint automatically from consumption data — useful for ESG reporting and sustainability targets.'],
]

const featureTable = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [2600, 6760],
  rows: featureRows.map((row, i) =>
    new TableRow({
      tableHeader: i === 0,
      children: [
        cell(row[0], { bold: true, bg: i === 0 ? LIGHT : (i % 2 === 0 ? 'F0F7FF' : WHITE), width: 2600, isHeader: i === 0 }),
        cell(row[1], { bg: i === 0 ? LIGHT : (i % 2 === 0 ? 'F0F7FF' : WHITE), width: 6760, isHeader: i === 0 }),
      ],
    })
  ),
})

// ── Results table ──────────────────────────────────────────────────────────
const results = [
  'Immediate visibility across all energy spend',
  'Faster invoice processing — from days to minutes',
  'Fewer overcharges making it through undetected',
  'Cleaner ESG and sustainability reporting',
  'One source of truth for finance, operations, and management',
]

// ── Document ───────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
      },
    ],
  },
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { bold: true, font: 'Arial' }, paragraph: { outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { bold: true, font: 'Arial' }, paragraph: { outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { bold: true, font: 'Arial' }, paragraph: { outlineLevel: 2 } },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 1 } },
            children: [
              new TextRun({ text: 'EnergyOS', bold: true, size: 22, font: 'Arial', color: BRAND }),
              new TextRun({ text: '   —   Sales Briefing & Pitch Document', size: 20, font: 'Arial', color: '9CA3AF' }),
            ],
          }),
        ],
      }),
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'D1E4F5', space: 1 } },
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: 'Page ', size: 18, font: 'Arial', color: '9CA3AF' }),
              new TextRun({ children: [PageNumber.CURRENT], size: 18, font: 'Arial', color: '9CA3AF' }),
              new TextRun({ text: ' | Confidential — EnergyOS', size: 18, font: 'Arial', color: '9CA3AF' }),
            ],
          }),
        ],
      }),
    },
    children: [

      // ── Cover block ──────────────────────────────────────────────────────
      space(4),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: 'EnergyOS', bold: true, size: 72, font: 'Arial', color: BRAND })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 160 },
        children: [new TextRun({ text: 'Never Overpay for Energy Again', size: 36, font: 'Arial', color: ACCENT, italics: true })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 400 },
        children: [new TextRun({ text: 'Sales Briefing & Customer Pitch — June 2026', size: 22, font: 'Arial', color: '6B7280' })],
      }),
      divider(),
      space(4),

      // ── SECTION 1: Simple Explanation ────────────────────────────────────
      new Paragraph({ children: [new PageBreak()] }),

      h1('Part 1: What is EnergyOS?'),
      body('A simple explanation for the sales team', { italic: true }),
      divider(),

      h2('The Problem We Solve'),
      body(
        'Most companies that use a lot of energy — factories, office buildings, retail chains, hotels — receive dozens of invoices every month from electricity, gas, and water suppliers. Managing these manually is slow, error-prone, and gives no real visibility into what is happening.',
      ),
      body('Overcharges go unnoticed. Budgets get blown. Nobody knows which building is wasting the most energy until it is too late.'),

      space(),
      h2('What EnergyOS Is'),
      body(
        'EnergyOS is a cloud-based platform that sits between a company and their energy suppliers. It collects all their energy data — invoices, meter readings, consumption figures — and turns it into a clear, live dashboard that management can actually use.',
      ),
      body(
        'Think of it like a bank app, but for energy. Instead of seeing your bank balance, you see your energy spend. Instead of transaction history, you see consumption per building, per meter, per month.',
      ),

      space(),
      h2('What It Does — In Plain Language'),
      space(),
      featureTable,
      space(2),

      h2('Who It Is For'),
      body('Any company that pays energy bills across multiple locations. The bigger the portfolio, the more value EnergyOS delivers. Prime targets:'),
      space(),
      bullet('Real estate companies and property managers'),
      bullet('Retail chains (multiple stores)'),
      bullet('Hotels and hospitality groups'),
      bullet('Industrial facilities and factories'),
      bullet('Government and municipality portfolios'),
      bullet('Co-working and commercial building operators'),

      // ── SECTION 2: Pitch ─────────────────────────────────────────────────
      new Paragraph({ children: [new PageBreak()] }),

      h1('Part 2: The Sales Pitch'),
      body('Use this when introducing EnergyOS to a prospect', { italic: true }),
      divider(),

      space(),
      new Paragraph({
        spacing: { before: 200, after: 200 },
        children: [
          new TextRun({ text: '“Most of our clients were losing between 3% and 8% of their annual energy budget to billing errors, contract breaches, and inefficiencies they simply could not see. EnergyOS gives them the visibility to stop that — and the AI to catch it automatically.”', bold: true, italics: true, size: 24, font: 'Arial', color: ACCENT }),
        ],
      }),
      divider(),

      space(),
      body(
        'Managing energy across multiple buildings is like trying to run a business without a finance system. You are drowning in PDFs, spreadsheets, and supplier portals — each one different, none of them talking to each other.',
      ),
      body('EnergyOS changes that. We give your team one platform that does three things:'),

      space(),
      h3('1.  Reads Your Invoices Automatically'),
      body(
        'Upload a PDF and our AI extracts every figure — consumption, unit rates, VAT, due dates — in seconds. It then compares what you were charged against what your contract says you should pay. If there is a discrepancy, you will know immediately.',
      ),

      h3('2.  Shows Your Entire Portfolio on One Screen'),
      body(
        'Every building, every meter, every supplier — visible on a live dashboard. Drill down from country level to a single meter point. See consumption trends, spot anomalies, and export reports in one click.',
      ),

      h3('3.  Catches What Your Team Misses'),
      body(
        'Our AI Auditor runs 24/7. It flags unusual consumption spikes, invoices that do not match contracted tariffs, and payment deadlines at risk. It is like having an energy analyst on staff — without the headcount cost.',
      ),

      h3('4.  Grows With Your Business'),
      body(
        'Whether you manage 5 sites today or 500 tomorrow, EnergyOS scales with you. Each client company gets their own secure workspace. Each team member gets the access level they need — no more, no less.',
      ),

      space(),
      h2('The Result for Your Customer'),
      space(),

      ...results.map(r => bullet(r)),

      space(2),
      divider(),
      space(),

      new Paragraph({
        spacing: { before: 160, after: 160 },
        children: [
          new TextRun({ text: '“We are not selling software — we are selling control. Control over your energy costs, your suppliers, and your data. Most clients recover the platform cost within the first quarter just from caught billing errors alone.”', bold: true, italics: true, size: 24, font: 'Arial', color: BRAND }),
        ],
      }),

      divider(),
      space(),

      h2('Pricing & Deployment'),
      body(
        'EnergyOS is a SaaS platform — clients pay a monthly subscription based on their portfolio size. No hardware, no installation, no IT involvement needed. They are up and running the same day.',
      ),

      space(),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2200, 2200, 5000 - 40],
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              cell('Plan', { bold: true, bg: LIGHT, width: 2200, isHeader: true }),
              cell('Price', { bold: true, bg: LIGHT, width: 2200, isHeader: true }),
              cell('Best for', { bold: true, bg: LIGHT, width: 4960, isHeader: true }),
            ],
          }),
          new TableRow({ children: [
            cell('Starter',      { width: 2200 }),
            cell('AED 299 / mo', { width: 2200 }),
            cell('Up to 5 connections, 1 user seat, basic analytics', { bg: 'F0F7FF', width: 4960 }),
          ]}),
          new TableRow({ children: [
            cell('Professional', { bold: true, width: 2200 }),
            cell('AED 899 / mo', { bold: true, width: 2200 }),
            cell('Up to 25 connections, AI auditor, invoice verification, 5 seats', { bg: 'F0F7FF', width: 4960 }),
          ]}),
          new TableRow({ children: [
            cell('Enterprise',   { width: 2200 }),
            cell('Custom',       { width: 2200 }),
            cell('Unlimited connections, white-label option, SLA + SSO, dedicated support', { bg: 'F0F7FF', width: 4960 }),
          ]}),
        ],
      }),

      space(3),
    ],
  }],
})

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('EnergyOS-Sales-Pitch.docx', buffer)
  console.log('Done: EnergyOS-Sales-Pitch.docx')
})
