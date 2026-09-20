import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  RULES_VERSION,
  TOOLS_PA_VERSION,
  buildContractClauses,
  calculateLiquidation,
  calculatePaycheck,
  renderContractHtml,
  validateContract,
  type PaIndefContractDraft,
  type ToolResult,
} from '../src/tools-pa';

const byId = <T extends HTMLElement>(id: string): T => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id}`);
  return node as T;
};

const value = (data: FormData, key: string): string => String(data.get(key) ?? '').trim();
const money = (amount: string | number): string => `B/.${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function text(tag: string, content: string, className?: string): HTMLElement {
  const node = document.createElement(tag);
  node.textContent = content;
  if (className) node.className = className;
  return node;
}

function showError(host: HTMLElement, error: unknown): void {
  host.replaceChildren(text('strong', 'No se pudo completar la operación.'), text('p', error instanceof Error ? error.message : 'Revisa los datos ingresados.'));
  host.classList.add('error');
  host.focus();
}

function renderToolResult<T>(host: HTMLElement, title: string, total: string, result: ToolResult<T>): void {
  host.classList.remove('error');
  const nodes: Node[] = [];
  if (result.estimate) nodes.push(text('span', 'Estimación', 'badge'));
  nodes.push(text('h3', title), text('p', money(total), 'result-total'));
  const lines = document.createElement('div');
  lines.className = 'result-lines';
  for (const line of result.lines) {
    lines.append(text('span', line.concept), text('span', money(line.amount)));
  }
  nodes.push(lines);
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = 'Supuestos, reglas y fuentes';
  details.append(summary);
  const assumptions = document.createElement('ul');
  for (const assumption of result.assumptions) assumptions.append(text('li', assumption));
  details.append(assumptions);
  for (const rule of result.rules) {
    const item = text('p', `${rule.legalBasis} · ${rule.documentStatus === 'VERIFICADO' ? 'fuente verificada en el catálogo' : 'fuente no verificada'} · ${rule.effectiveFrom}${rule.effectiveTo ? ` a ${rule.effectiveTo}` : ' en adelante'}`);
    if (rule.sourceUrl) {
      const link = document.createElement('a');
      link.href = rule.sourceUrl;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = ' Fuente oficial';
      item.append(link);
    }
    details.append(item);
  }
  nodes.push(details);
  host.replaceChildren(...nodes);
  host.setAttribute('tabindex', '-1');
  host.focus({ preventScroll: true });
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function setDefaultDates(): void {
  const now = new Date();
  const yyyyMm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const first = `${yyyyMm}-01`;
  const fifteenth = `${yyyyMm}-15`;
  for (const [selector, date] of [
    ['#paycheck-form [name="periodStart"]', first],
    ['#paycheck-form [name="periodEnd"]', fifteenth],
    ['#contract-form [name="position.startDate"]', first],
    ['#contract-form [name="signature.date"]', first],
  ] as const) {
    const input = document.querySelector<HTMLInputElement>(selector);
    if (input) input.value = date;
  }
}

byId('engine-version').textContent = TOOLS_PA_VERSION;
byId('rules-version').textContent = RULES_VERSION;
setDefaultDates();

byId<HTMLFormElement>('paycheck-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const host = byId('paycheck-result');
  try {
    const data = new FormData(event.currentTarget as HTMLFormElement);
    const detailed = value(data, 'mode') === 'DETAILED';
    const overtimeHours = value(data, 'overtimeHours');
    const additionalIncome = value(data, 'additionalIncome');
    const voluntaryDeductions = value(data, 'voluntaryDeductions');
    const result = calculatePaycheck({
      monthlySalary: value(data, 'monthlySalary'),
      periodStart: value(data, 'periodStart'),
      periodEnd: value(data, 'periodEnd'),
      mode: detailed ? 'DETAILED' : 'SIMPLE',
      ...(detailed && Number(overtimeHours) > 0 ? { overtime: [{ dayType: 'ORDINARY', workPeriod: 'DAY', hours: overtimeHours }] } : {}),
      ...(detailed && Number(additionalIncome) > 0 ? { additionalIncome: [{ concept: 'Ingreso adicional', amount: additionalIncome }] } : {}),
      ...(detailed && Number(voluntaryDeductions) > 0 ? { voluntaryDeductions: [{ concept: 'Deducción voluntaria', amount: voluntaryDeductions }] } : {}),
    });
    renderToolResult(host, 'Neto estimado de la quincena', result.value.net, result);
  } catch (error) {
    showError(host, error);
  }
});

type PayslipLine = { concept: string; amount: number };
function parseLines(raw: string): PayslipLine[] {
  return raw.split('\n').filter((line) => line.trim()).map((line, index) => {
    const [concept, amount, ...rest] = line.split('|').map((part) => part.trim());
    if (!concept || !amount || rest.length || !Number.isFinite(Number(amount)) || Number(amount) < 0) {
      throw new Error(`Línea ${index + 1}: usa el formato "concepto | monto" con un monto positivo.`);
    }
    return { concept, amount: Number(amount) };
  });
}

async function createPayslip(data: FormData): Promise<{ bytes: Uint8Array; net: number }> {
  const earnings = parseLines(value(data, 'earnings'));
  const deductions = parseLines(value(data, 'deductions'));
  const net = earnings.reduce((sum, line) => sum + line.amount, 0) - deductions.reduce((sum, line) => sum + line.amount, 0);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 736;
  const draw = (label: string, size = 11, useBold = false): void => {
    page.drawText(label, { x: 56, y, size, font: useBold ? bold : regular, color: rgb(.08, .15, .14), maxWidth: 500 });
    y -= size + 10;
  };
  draw(value(data, 'company'), 18, true);
  draw('Comprobante de pago', 13, true);
  y -= 8;
  draw(`Empleado: ${value(data, 'employee')}`);
  draw(`Período: ${value(data, 'period')}`);
  if (value(data, 'reference')) draw(`Referencia: ${value(data, 'reference')}`);
  y -= 10;
  draw('Ingresos', 12, true);
  for (const line of earnings) draw(`${line.concept}: ${money(line.amount)}`);
  y -= 8;
  draw('Deducciones', 12, true);
  for (const line of deductions) draw(`${line.concept}: -${money(line.amount)}`);
  y -= 10;
  draw(`Neto: ${money(net)}`, 14, true);
  y -= 16;
  draw('Comprobante preparado; no confirma que el pago se realizó.', 9);
  return { bytes: await pdf.save(), net };
}

byId<HTMLFormElement>('payslip-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const host = byId('payslip-result');
  try {
    const { bytes, net } = await createPayslip(new FormData(event.currentTarget as HTMLFormElement));
    download(new Blob([bytes as BlobPart], { type: 'application/pdf' }), 'comprobante-de-pago.pdf');
    host.classList.remove('error');
    host.replaceChildren(text('h3', 'PDF creado localmente'), text('p', `Neto reflejado: ${money(net)}. El documento no confirma que el pago se realizó.`));
  } catch (error) {
    showError(host, error);
  }
});

function contractDraft(data: FormData): PaIndefContractDraft {
  const trial = value(data, 'position.trialPeriodMonths');
  return {
    employer: {
      legalName: value(data, 'employer.legalName'), ruc: value(data, 'employer.ruc'), dv: value(data, 'employer.dv'),
      representativeName: value(data, 'employer.representativeName'), representativeCedula: value(data, 'employer.representativeCedula'), address: value(data, 'employer.address'),
    },
    employee: {
      fullName: value(data, 'employee.fullName'), nationality: value(data, 'employee.nationality'), age: value(data, 'employee.age'),
      sex: value(data, 'employee.sex'), civilStatus: value(data, 'employee.civilStatus'), address: value(data, 'employee.address'), cedula: value(data, 'employee.cedula'),
    },
    position: {
      service: value(data, 'position.service'), duties: value(data, 'position.duties'), workplace: value(data, 'position.workplace'),
      startDate: value(data, 'position.startDate'), workday: value(data, 'position.workday'), schedule: value(data, 'position.schedule'),
      ...(trial === '1' || trial === '2' || trial === '3' ? { trialPeriodMonths: trial } : {}),
    },
    compensation: {
      salaryAmount: value(data, 'compensation.salaryAmount'), paymentMethod: value(data, 'compensation.paymentMethod'),
      paymentPeriod: value(data, 'compensation.paymentPeriod'), paymentPlace: value(data, 'compensation.paymentPlace'),
    },
    signature: { place: value(data, 'signature.place'), date: value(data, 'signature.date') },
  };
}

byId<HTMLFormElement>('contract-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const host = byId('contract-result');
  try {
    const draft = contractDraft(new FormData(event.currentTarget as HTMLFormElement));
    const validation = validateContract(draft);
    if (validation.missing.length || validation.invalid.length) {
      const issues = [...validation.missing.map((field) => `${field}: obligatorio`), ...validation.invalid.map((entry) => `${entry.field}: ${entry.reason}`)];
      throw new Error(issues.join(' · '));
    }
    const html = renderContractHtml(buildContractClauses(draft));
    download(new Blob([html], { type: 'text/html;charset=utf-8' }), 'contrato-indefinido-borrador.html');
    host.classList.remove('error');
    host.replaceChildren(text('h3', 'Borrador creado localmente'), text('p', 'Revísalo con un profesional antes de firmarlo y gestiona su registro por separado cuando corresponda.'));
  } catch (error) {
    showError(host, error);
  }
});

byId<HTMLFormElement>('liquidation-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const host = byId('liquidation-result');
  try {
    const data = new FormData(event.currentTarget as HTMLFormElement);
    const optional = (key: string): Record<string, string> => value(data, key) ? { [key]: value(data, key) } : {};
    const result = calculateLiquidation({
      contractType: value(data, 'contractType'), cause: value(data, 'cause'), startDate: value(data, 'startDate'), endDate: value(data, 'endDate'),
      lastMonthlySalary: value(data, 'lastMonthlySalary'), ...optional('averageMonthlySalary'), ...optional('pendingVacationDays'),
      ...optional('thirteenthPaidThrough'), ...optional('pendingSalaryAmount'),
    });
    if ('status' in result) {
      host.classList.add('error');
      const link = document.createElement('a');
      link.href = result.officialUrl; link.target = '_blank'; link.rel = 'noreferrer'; link.textContent = 'Abrir calculadora oficial de MITRADEL';
      host.replaceChildren(text('h3', 'Caso fuera del alcance'), text('p', result.reason), link);
      return;
    }
    renderToolResult(host, 'Total estimado de la liquidación', result.value.total, result);
  } catch (error) {
    showError(host, error);
  }
});
