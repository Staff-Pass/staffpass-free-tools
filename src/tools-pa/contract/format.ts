/**
 * Formatting helpers for clause text — Spanish long-form dates and
 * thousands-separated money. Deliberately free of `Intl`: its locale data
 * (month names, grouping separators) is not guaranteed to match between
 * Node (server-rendered PDF/DOCX) and every browser (the website preview),
 * so the website preview and the server-rendered PDF/DOCX must always show
 * the exact same text — hence a fixed month-name table and manual digit
 * grouping instead.
 */
import { money, toDecimal } from '../money';

const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** 'YYYY-MM-DD' → 'D de <mes> de YYYY'. Returns the input unchanged if it is not a clean ISO date. */
export function formatDateEs(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  const [, yearStr, monthStr, dayStr] = match;
  const month = MONTHS_ES[Number(monthStr) - 1];
  if (!month) return isoDate;
  return `${Number(dayStr)} de ${month} de ${yearStr}`;
}

/** Inserts thousands separators into a plain decimal string, e.g. '1500.00' → '1,500.00'. */
export function formatThousands(amount: string): string {
  const negative = amount.startsWith('-');
  const unsigned = negative ? amount.slice(1) : amount;
  const [integerPart, fractionPart] = unsigned.split('.');
  const withCommas = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${withCommas}${fractionPart !== undefined ? `.${fractionPart}` : ''}`;
}

/** Formats a validated non-negative decimal salary amount as 'B/. 1,500.00'. Throws if `amount` is not a valid decimal — callers should only pass already-validated input. */
export function formatSalaryAmountPab(amount: string): string {
  return `B/. ${formatThousands(money(toDecimal(amount, 'salaryAmount')))}`;
}
