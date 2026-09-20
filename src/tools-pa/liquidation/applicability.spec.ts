import {
  SUPPORTED_CAUSES,
  checkApplicability,
  type LiquidationCause,
  type LiquidationConceptKey,
} from './applicability';
import { calculateLiquidation } from './index';

const CAUSES: LiquidationCause[] = [...SUPPORTED_CAUSES];
const UNIVERSAL_CONCEPTS: LiquidationConceptKey[] = [
  'pendingSalary',
  'vacations',
  'thirteenthProportional',
  'seniorityPremium',
];

describe('liquidation applicability matrix', () => {
  it.each(UNIVERSAL_CONCEPTS)(
    '%s applies for every supported cause',
    (concept) => {
      for (const cause of CAUSES) {
        expect(checkApplicability(concept, cause).applies).toBe(true);
      }
    },
  );

  it('indemnity applies only for despido_injustificado', () => {
    expect(
      checkApplicability('indemnity', 'despido_injustificado').applies,
    ).toBe(true);
    expect(checkApplicability('indemnity', 'renuncia').applies).toBe(false);
    expect(checkApplicability('indemnity', 'mutuo_acuerdo').applies).toBe(
      false,
    );
  });

  it('names the declared cause in the non-applicable indemnity reason', () => {
    expect(checkApplicability('indemnity', 'renuncia').reason).toContain(
      'renuncia',
    );
    expect(checkApplicability('indemnity', 'mutuo_acuerdo').reason).toContain(
      'mutuo acuerdo',
    );
  });

  const baseInput = {
    contractType: 'INDEFINIDO',
    startDate: '2023-01-01',
    endDate: '2026-01-01',
    lastMonthlySalary: '1000',
    pendingVacationDays: '0',
  };

  it.each(CAUSES)(
    'calculateLiquidation for cause=%s matches checkApplicability for every concept',
    (cause) => {
      const result = calculateLiquidation({ ...baseInput, cause });
      if ('status' in result) throw new Error('expected a calculated result');
      for (const concept of [...UNIVERSAL_CONCEPTS, 'indemnity' as const]) {
        const key = concept === 'indemnity' ? 'indemnity' : concept;
        expect(result.value[key].applies).toBe(
          checkApplicability(key, cause).applies,
        );
      }
    },
  );

  it('rejects a contract type other than INDEFINIDO as unsupported', () => {
    const result = calculateLiquidation({
      ...baseInput,
      contractType: 'DEFINIDO',
      cause: 'renuncia',
    });
    expect('status' in result && result.status).toBe('unsupported');
  });

  it('rejects an unsupported cause (e.g. despido_justificado) as unsupported', () => {
    const result = calculateLiquidation({
      ...baseInput,
      cause: 'despido_justificado',
    });
    expect('status' in result && result.status).toBe('unsupported');
    if ('status' in result)
      expect(result.officialUrl).toBe(
        'https://appstrabajo.mitradel.gob.pa/prestaciones/',
      );
  });
});
