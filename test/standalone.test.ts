import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { buildContractClauses, calculateLiquidation, calculatePaycheck, renderContractHtml } from '../src/tools-pa';

describe('standalone distribution', () => {
  it('calculates a standard paycheck with the preserved engine', () => {
    const result = calculatePaycheck({ monthlySalary: '1000', periodStart: '2026-09-01', periodEnd: '2026-09-15', mode: 'SIMPLE' });
    expect(result.value.baseSalary).toBe('500.00');
    expect(Number(result.value.net)).toBeGreaterThan(0);
    expect(result.estimate).toBe(true);
  });

  it('fails closed for an unsupported liquidation scenario', () => {
    const result = calculateLiquidation({ contractType: 'DEFINIDO', cause: 'renuncia', startDate: '2025-01-01', endDate: '2026-01-01', lastMonthlySalary: '1000' });
    expect(result).toMatchObject({ status: 'unsupported' });
  });

  it('renders a visible legal warning in every contract', () => {
    const html = renderContractHtml(buildContractClauses({}));
    expect(html).toContain('Borrador para revisión');
    expect(html).toContain('no constituye asesoría legal');
    expect(html).toContain('MITRADEL');
  });

  it('keeps the browser app free of network and persistence APIs', async () => {
    const source = await readFile('app/main.ts', 'utf8');
    for (const forbidden of ['fetch(', 'sendBeacon', 'XMLHttpRequest', 'WebSocket', 'localStorage', 'sessionStorage']) {
      expect(source).not.toContain(forbidden);
    }
  });

  it('exposes all four tools and the warnings in the static shell', async () => {
    const html = await readFile('app/index.html', 'utf8');
    for (const id of ['quincena', 'comprobante', 'contrato', 'liquidacion']) expect(html).toContain(`id="${id}"`);
    expect(html).toContain('los datos permanecen en este dispositivo');
    expect(html).toContain('reglas del catálogo aún requieren revisión legal');
  });
});
