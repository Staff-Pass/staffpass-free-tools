# Reglas, fuentes y limitaciones

## Estado legal

El catálogo en `src/tools-pa/rules/catalog.ts` proviene del motor StaffPass existente y conserva deliberadamente `verified: false` en cada regla. `documentStatus: VERIFICADO` significa que la fuente fue localizada y transcrita en la investigación original; **no** significa revisión o aprobación por abogado, MITRADEL, CSS o DGI.

El modo herramienta no bloquea reglas pendientes: devuelve `estimate: true`, supuestos, base legal, vigencia, nota y URL de fuente cuando existe. Un integrador debe mostrar esa información y no eliminar la advertencia.

## Decisiones preservadas

- Dinero: `decimal.js`, dos decimales, redondeo `ROUND_HALF_UP`.
- Cantidades: cuatro decimales.
- Quincena estándar: mitad del salario mensual.
- Período no estándar: salario mensual dividido entre 30 por días inclusivos.
- Tarifa horaria: salario mensual por 12, dividido entre 52 y entre horas semanales.
- ISR de herramienta: proyección simplificada con décimo y períodos restantes; no es una liquidación fiscal formal.
- Liquidación: no incluye preaviso ni beneficios contractuales/colectivos.
- Feriado trabajado: cuando el catálogo no tiene tasa confirmada, el motor lo expone como supuesto pendiente en lugar de inventar el monto.

## Fuera de alcance

- salario mínimo por actividad/región;
- acumulación exacta de topes de horas extra por día y semana;
- contratos definidos, por obra, adendas o casos especiales;
- despido justificado y otras causas no listadas;
- registro de contrato ante MITRADEL;
- presentación ante CSS/DGI, SIPE o Planilla 03;
- confirmación bancaria o prueba de pago;
- historial anual real de nómina cuando no lo proporciona el usuario.

## Actualización segura

Toda modificación de reglas debe incluir:

1. texto oficial y URL de fuente;
2. fecha `effectiveFrom` y, cuando aplique, `effectiveTo`;
3. decisión explícita sobre `documentStatus` y `verified`;
4. fixture dorado nuevo o actualizado;
5. prueba del cambio de vigencia;
6. nota de migración si el resultado cambia para entradas anteriores.

No marques `verified: true` sin una aprobación jurídica documentada fuera de este repositorio.
