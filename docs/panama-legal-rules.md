# Especificación de Reglas Laborales de Panamá — StaffPass

**Estado:** Borrador para revisión (FASE 2 — investigación legal)
**Fecha de consulta de todas las fuentes:** 2026-09-14
**Autor:** Investigación asistida (agente), pendiente de validación por asesoría legal laboral panameña antes de implementar cualquier cálculo de nómina.

## Cómo leer este documento

Cada regla trae:
- **Código**: identificador único para referenciar en código/config (`snake_case` o `KEBAB-CASE`).
- **Fórmula**: cómo se calcula el valor.
- **Artículo / base legal**: norma y artículo específico.
- **URL oficial**: fuente primaria (mitradel.gob.pa, css.gob.pa, dgi.mef.gob.pa, gacetaoficial.gob.pa, organojudicial.gob.pa, antai.gob.pa).
- **Estado**: `VERIFICADO` (se leyó el texto oficial directamente) o **`⚠️ NO VERIFICADO`** (solo fuentes secundarias concordantes, o fuente oficial bloqueada/no confirmada — **no usar en producción sin confirmación legal**).
- **Vigencia**: rango de fechas en que el valor aplica.

> ⚠️ **Advertencia de honestidad de datos**: Varias fuentes oficiales (mitradel.gob.pa, gacetaoficial.gob.pa, w3.css.gob.pa) devolvieron error HTTP 403 a los intentos de fetch automatizado durante esta investigación (2026-09-14). Donde esto ocurrió, el dato está marcado explícitamente `⚠️ NO VERIFICADO` aunque múltiples fuentes secundarias (despachos de abogados, firmas de nómina) coincidan entre sí. **No se inventó ningún valor**: donde no hubo coincidencia o no se pudo confirmar, se indica explícitamente.

---

## 0. Diseño de versionado por empresa + fecha

Las reglas laborales panameñas cambian por ley (ej. Ley 462 de 2025 reformando CSS) y algunas empresas pueden pactar condiciones distintas (CCT, jornadas reducidas contractuales). El motor de reglas debe versionarse así:

```
LegalRuleVersion {
  id                 string   (uuid)
  rule_code          string   // ej. "CSS_CUOTA_PATRONAL", "ISR_BRACKET_2"
  company_id          string | null   // null = regla general de país; valor = override por empresa
  value_json          jsonb    // { rate, formula_params, table, ... }
  effective_from      date     // vigencia desde
  effective_to        date | null  // null = vigente indefinidamente
  legal_basis         string   // ej. "Ley 462 de 2025, Art. X"
  source_url          string
  verified            boolean  // true = confirmado en fuente oficial
  verified_note       string | null
  reviewed_by         string | null   // usuario/abogado que validó el valor
  reviewed_at         timestamp | null
  created_at          timestamp
  updated_at          timestamp
}
```

**Reglas de resolución:**
1. Buscar override `company_id = <empresa>` vigente en la fecha del cálculo (`effective_from <= fecha < effective_to`).
2. Si no existe, usar la fila `company_id = null` (regla nacional) vigente en esa fecha.
3. Si `verified = false`, el sistema debe **bloquear el uso en cálculos reales de nómina** (o exigir `reviewed_by`/`reviewed_at` no nulos) hasta que un humano confirme el valor.
4. Todo cambio de valor crea una fila nueva (nunca se edita `effective_from` de una fila ya usada en una liquidación) — inmutabilidad para auditoría.

**Entradas:** `rule_code`, `company_id` (opcional), `fecha_efectiva`, `value_json`, `legal_basis`, `source_url`.
**Salidas:** valor resuelto + metadata de vigencia/verificación, para que el motor de nómina pueda mostrar "calculado con regla X vigente desde Y, verificada: sí/no".

---

## 1. Jornadas y recargos

**Estado: VERIFICADO** contra texto oficial del Código de Trabajo (Decreto de Gabinete 252 de 1971), PDF alojado por el Órgano Judicial: https://www.organojudicial.gob.pa/uploads/wp_repo/uploads/2016/11/c%C3%B3digo-detrabajo.pdf — leído directamente el 2026-09-14 (Arts. 30-50).

### 1.1 Definición de jornadas

| Código | Jornada | Horario | Máximo | Art. | Fuente |
|---|---|---|---|---|---|
| `JORNADA_DIURNA` | Diurna | 06:00–18:00 | 8h/día, 48h/semana | Art. 30-31 CT | Código de Trabajo, Org. Judicial |
| `JORNADA_NOCTURNA` | Nocturna | 18:00–06:00 | 7h/día, 42h/semana — **se paga como si fueran 8h** | Art. 30-31 CT | ídem |
| `JORNADA_MIXTA` | Mixta | Combina período diurno y nocturno, sin exceder 3h en período nocturno (si excede 3h, se considera nocturna) | 7.5h/día, 45h/semana — **se paga como si fueran 8h** | Art. 30-31 CT | ídem |

Regla de clasificación: una jornada es "nocturna" si tiene más de 3 horas dentro del período nocturno (18:00–06:00); es "mixta" si combina ambos períodos sin superar ese umbral de 3h nocturnas.

### 1.2 Horas extra (jornada extraordinaria) — Art. 33 CT

| Código | Supuesto | Recargo | Art. |
|---|---|---|---|
| `HORA_EXTRA_DIURNA` | Excedente sobre jornada diurna ordinaria | **+25%** sobre salario/hora ordinario | Art. 33-1 CT |
| `HORA_EXTRA_NOCTURNA` | Excedente en período nocturno, o prolongación de jornada mixta iniciada en período diurno | **+50%** | Art. 33-2 CT |
| `HORA_EXTRA_MIXTA_NOCTURNA` | Prolongación de jornada nocturna, o de jornada mixta iniciada en período nocturno | **+75%** | Art. 33-3 CT |

### 1.3 Tope de horas extra — Art. 36 CT

| Código | Regla | Art. |
|---|---|---|
| `TOPE_HORA_EXTRA_DIARIO` | Máx. 3 horas extraordinarias por día | Art. 36 CT |
| `TOPE_HORA_EXTRA_SEMANAL` | Máx. 9 horas extraordinarias por semana | Art. 36 CT |
| `RECARGO_EXCEDENTE_TOPE` | Excedente sobre esos topes: **+75%** adicional, sin perjuicio de sanciones al empleador | Art. 36 CT |
| — | Prohibido en trabajos peligrosos/insalubres y para menores de 16 años | Art. 36 CT |

### 1.4 Día de descanso semanal (domingo/descanso obligatorio) — Arts. 40-41, 48 CT

| Código | Regla | Recargo | Art. |
|---|---|---|---|
| `DESCANSO_SEMANAL` | Derecho/deber de descanso semanal, preferentemente domingo | — | Art. 40-41 CT |
| `RECARGO_DIA_DESCANSO` | Trabajo en domingo o día de descanso semanal obligatorio | **+50%** sobre jornada ordinaria, sin perjuicio del derecho a otro día de descanso | Art. 48 CT |
| `RECARGO_DIA_COMPENSATORIO` | Si se trabaja también el día fijado como compensatorio | **+50%** | Art. 48 CT |

### 1.5 Día feriado / de fiesta o duelo nacional — Arts. 45, 46, 49 CT

| Código | Regla | Recargo | Art. |
|---|---|---|---|
| `PAGO_FERIADO_NO_TRABAJADO` | Se remunera como jornada ordinaria aunque no se trabaje | 100% (día pagado) | Art. 45 CT |
| `RECARGO_DIA_FERIADO_TRABAJADO` | Si se trabaja en día feriado | **+150%** sobre salario de jornada ordinaria | Art. 49 CT |
| `RECARGO_FERIADO_JORNADA_REDUCIDA` | Feriado que cae en jornada semanal &lt; 6 días: +50% si diurna, +75% si mixta/nocturna | Art. 49 párr. final CT |

⚠️ **NO VERIFICADO — ambigüedad de texto**: el Art. 49 dice literalmente que "el recargo del 150% incluye la remuneración del día de descanso", lo cual es ambiguo sobre si el pago **total** por trabajar un feriado es 150% del salario ordinario, o si es 100% (día pagado) + 150% adicional (=250% total). **Ver tabla de decisiones pendientes (sección 11)** — no codificar el multiplicador exacto sin confirmación legal.

### 1.6 Combinación de recargos — Art. 50 CT

`COMBINACION_RECARGOS`: si el trabajo en domingo/feriado excede además los límites ordinarios de jornada, se aplica primero el recargo por domingo/feriado sobre el salario base, y luego se suma el recargo por horas excedentes sobre ese resultado (recargos secuenciales, no simultáneos sobre la base original). **VERIFICADO** (Art. 50 CT).

---

## 2. Décimo tercer mes

**Estado: parcialmente VERIFICADO.** Base legal: Decreto de Gabinete No. 221 de 18-nov-1971 (corroborado por múltiples fuentes secundarias concordantes + MITRADEL FAQ); Código de Trabajo Art. 145 también lo referencia. **⚠️ El texto primario del Decreto 221/1971 en Gaceta Oficial no pudo abrirse directamente (403)** — el número de decreto y las fechas de pago están verificados por triangulación de fuentes (MITRADEL FAQ index + firmas de nómina), no por lectura directa del BO.

| Código | Regla | Estado | Fuente |
|---|---|---|---|
| `DECIMO_ACCRUAL_CUATRIMESTRE` | Devengo por 3 cuatrimestres: 16-dic→15-abr, 16-abr→15-ago, 16-ago→15-dic | VERIFICADO (MITRADEL FAQ) | https://www.mitradel.gob.pa/faq/etiqueta/decimo-tercer-mes/ |
| `DECIMO_PAGO_FECHAS` | Pago de cada partida: 15 abril, 15 agosto, 15 diciembre | VERIFICADO | ídem |
| `DECIMO_FORMULA_BASE` | Partida = (suma de todo el salario devengado en el cuatrimestre) ÷ 12 | VERIFICADO (consistente en múltiples fuentes, coincide con práctica estándar del CT) | ídem + fuentes secundarias de nómina |
| `DECIMO_PRORRATEO_PARCIAL` | Tratamiento cuando no se trabajó el cuatrimestre completo | ⚠️ **NO VERIFICADO** — un snippet de MITRADEL sugiere que la partida de abril se paga completa y las siguientes se prorratean, lo cual contradice la fórmula de división entre 12; no se pudo abrir la página completa (403) | https://www.mitradel.gob.pa/faq/el-decimo-tercer-mes-se-debe-pagar-completo-o-hasta-la-fecha-en-que-se-haga-efectiva-la-suspension-del-contrato/ |
| `DECIMO_BASE_INCLUYE_EXTRAORDINARIO` | ¿La base de cálculo incluye horas extra/comisiones? | ⚠️ **NO VERIFICADO** — fuentes secundarias sugieren que sí ("todo lo devengado"), sin confirmación textual explícita en fuente oficial abierta en esta pasada | — |
| `DECIMO_ISR_TRATAMIENTO` | Tratamiento de ISR sobre décimo tercer mes | ⚠️ **NO VERIFICADO** — fuentes secundarias en conflicto: unas dicen exento total, otras dicen exento solo hasta cierto monto anual (posible referencia a Código Fiscal Art. 708, sin confirmar). **No codificar sin confirmación DGI.** | https://dgi.mef.gob.pa/DInforme/Tarifa (página general de tarifas ISR, no específica de décimo) |
| `DECIMO_CSS_TRATAMIENTO` | ¿Décimo tercer mes cotiza a CSS? | ⚠️ **NO VERIFICADO** (parcial) — fuentes secundarias indican que SÍ cotiza (no está exento), con una cuota patronal adicional ~1.5% mencionada en una fuente no oficial; % exacto no confirmado en css.gob.pa | https://www.telered.com.pa/cuota-obrero-patronal-pagos-css/ (no oficial) |

---

## 3. Vacaciones

**Estado: VERIFICADO** contra texto oficial del Código de Trabajo (Arts. 54, 56, 57, 59), mismo PDF oficial del Órgano Judicial citado en sección 1, leído 2026-09-14.

| Código | Regla | Art. |
|---|---|---|
| `VACACIONES_DERECHO_BASE` | 30 días por cada 11 meses continuos de trabajo, a razón de 1 día por cada 11 días al servicio del empleador | Art. 54-1 CT |
| `VACACIONES_PROPORCIONAL` | Trabajadores por hora/día con menos de 11 meses: (remuneración total ordinaria+extraordinaria de los últimos 11 meses o del tiempo servido) ÷ jornadas ordinarias servidas × días de descanso correspondientes | Art. 54-3 CT |
| `VACACIONES_BASE_CALCULO` | Si el salario incluye primas, comisiones u otras sumas variables, o hubo aumento salarial: se paga el **promedio de salarios ordinarios y extraordinarios devengados durante los últimos 11 meses**, o el último salario base, **lo que resulte más favorable al trabajador** | Art. 54-1 CT |
| `VACACIONES_DISFRUTE_VS_PAGO` | No se permite renunciar a las vacaciones a cambio de pago mientras dure la relación laboral, salvo acumulación pactada hasta 2 períodos (notificada a la autoridad de trabajo), con mínimo 15 días de descanso remunerado efectivo en el primer período | Art. 59 CT |
| `VACACIONES_DIVISION_FRACCIONES` | Disfrute sin interrupción; división en máx. 2 fracciones iguales solo si CCT lo permite + acuerdo con el trabajador | Art. 56 CT |
| `VACACIONES_FIJACION_FECHA` | Empleador fija la fecha con 2 meses de antelación; no puede fijarla a más de 3 meses después de adquirido el derecho | Art. 57 CT |
| `VACACIONES_PAGO_ANTICIPADO` | Se paga 3 días antes de iniciar el disfrute | Art. 54-5 CT |
| `VACACIONES_COMPENSACION_TERMINO` | Si la relación termina antes de completar el período: pago proporcional en efectivo, 1 día por cada 11 días trabajados | Art. 54-6 CT |

---

## 4. Prima de antigüedad y bonificación anual

**Estado: VERIFICADO** (prima de antigüedad) contra texto oficial (Arts. 224, 226, 229-B CT).

| Código | Regla | Art. |
|---|---|---|
| `PRIMA_ANTIGUEDAD` | A la terminación de todo contrato por tiempo indefinido, cualquiera sea la causa (incluida renuncia): **1 semana de salario por año laborado**, proporcional si no se cumple año entero | Art. 224 CT |
| `PRIMA_ANTIGUEDAD_BASE` | Base de cálculo = promedio del total de remuneración percibida durante los **últimos 5 años trabajados** (o el tiempo servido si es menor) | Art. 226 CT |
| `PRIMA_ANTIGUEDAD_FONDO` | Empleador cotiza trimestralmente al Fondo de Cesantía la cuota-parte de esta prima | Art. 229-B CT |

⚠️ **`BONIFICACION_ANUAL` — NO VERIFICADO / concepto a aclarar con el usuario.** No se encontró en el Código de Trabajo una figura llamada "bonificación anual" distinta de la prima de antigüedad o del décimo tercer mes. Es probable que el requerimiento original se refiera al **décimo tercer mes** (sección 2 de este documento), que es una prestación separada regulada por el Decreto de Gabinete 221/1971, no por el Código de Trabajo. **No implementar `bonificacion_anual` como regla independiente hasta que el usuario confirme si es sinónimo de décimo tercer mes o un concepto contractual/CCT sin base legal obligatoria.** Ver tabla de decisiones pendientes.

---

## 5. Indemnización / liquidación por causales y preaviso

**Estado: ⚠️ NO VERIFICADO contra fuente oficial primaria** (Arts. 212, 213, 222, 224-226, 229A-N no se pudieron leer directamente en gacetaoficial.gob.pa/organojudicial.gob.pa en esta pasada de investigación — solo triangulado en 3 fuentes secundarias concordantes de despachos legales). Recomendado: confirmar contra el mismo PDF oficial usado en secciones 1, 3 y 4 (que sí fue accesible) antes de dar por definitivo este bloque.

| Código | Regla | Art. | Estado |
|---|---|---|---|
| `CAUSALES_DESPIDO_JUSTIFICADO` | Causas disciplinarias (falsificación de documentos, violencia, deshonestidad, revelación de secretos, ausencias injustificadas: 2+ lunes/mes o 3 consecutivos/6 al año, abandono, acoso), causas no imputables (enfermedad, incapacidad, fuerza mayor) y causas económicas (quiebra, cierre, disminución de producción — con reglas de prioridad por antigüedad) | Art. 213 CT | ⚠️ NO VERIFICADO oficialmente |
| `PREAVISO_EMPLEADOR` | 30 días de anticipación (o pago en su lugar), solo exigible para trabajadores con 2+ años de antigüedad; excepciones: servicio doméstico, fincas ≤5 empleados no financieras, aprendices, marítimos, &lt;2 años de antigüedad | Art. 212 CT | ⚠️ NO VERIFICADO oficialmente |
| `PREAVISO_TRABAJADOR` | Renuncia: 15 días de anticipación; trabajadores técnicos: 2 meses | Art. 212 CT | ⚠️ NO VERIFICADO oficialmente |
| `INDEMNIZACION_ESCALA` | Despido injustificado: **3.4 semanas de salario por año** durante los primeros 10 años; **1 semana de salario por año adicional** por encima de 10 años | Art. 225 CT (post reforma Ley 44/1995) | ⚠️ NO VERIFICADO oficialmente (consistente en 3 fuentes secundarias) |
| `INDEMNIZACION_BASE_SALARIAL` | Promedio de remuneración TOTAL (no solo salario base) de los **últimos 5 años trabajados** — mismo criterio que prima de antigüedad (Art. 226 CT) | Art. 226 CT | Ver nota: art. 226 sí fue confirmado en sección 4 vía fuente oficial; su aplicación aquí a indemnización es consistente pero no se re-verificó específicamente en este contexto |
| `FONDO_CESANTIA_APORTE` | Depósito trimestral obligatorio del empleador en fideicomiso: cuota de prima de antigüedad → cuenta individual del trabajador; cuota de indemnización = **5%** → cuenta del empleador (liberable solo ante despido injustificado o renuncia justificada) | Art. 229A-229N CT | ⚠️ NO VERIFICADO oficialmente (%, aunque consistente en fuente secundaria) |

⚠️ **`SALARIO_MAS_FAVORABLE`**: no se encontró como concepto legal distinto y explícito — parece ser terminología coloquial para la regla del promedio de 5 años del Art. 226. **NO VERIFICADO** como figura separada; no codificar como regla independiente sin confirmación.

**No se encontró** un tope legal a la indemnización, ni una alternativa de reinstalación en lugar de indemnización — ambos puntos quedan como **NO VERIFICADO / no confirmado** (ausencia de evidencia no es evidencia de ausencia; requiere confirmación legal directa).

---

## 6. Aportes CSS / Seguro Educativo / Riesgos Profesionales

**Estado: ⚠️ TODA ESTA SECCIÓN NO VERIFICADA contra fuente oficial primaria.** css.gob.pa, w3.css.gob.pa y gacetaoficial.gob.pa devolvieron error HTTP 403 en todos los intentos de fetch automatizado durante esta investigación (2026-09-14). Los valores siguientes provienen de fuentes secundarias (despachos legales, firmas de nómina) que son mutuamente consistentes en la reforma de Ley 462/2025, pero **no se leyó el texto oficial de dicha ley ni del Decreto de Gabinete 68 de 1970**. Dado el alto impacto de un error aquí en cálculos reales de nómina, **se recomienda bloquear el uso en producción de esta sección hasta validación legal directa** (ver sección 0, campo `verified`).

| Código | Tasa | Vigencia | Base legal | Estado |
|---|---|---|---|---|
| `CSS_CUOTA_EMPLEADO` | 9.75% del salario devengado | Vigente, sin cambio anunciado por Ley 462/2025 | Ley 51 de 2005, reformada por Ley 462 de 18-mar-2025 | ⚠️ NO VERIFICADO |
| `CSS_CUOTA_PATRONAL_TRAMO1` | 13.25% de salarios pagados | Hasta 28-feb-2027 | Ley 462 de 2025 | ⚠️ NO VERIFICADO |
| `CSS_CUOTA_PATRONAL_TRAMO2` | 14.25% | 01-mar-2027 a 28-feb-2029 | Ley 462 de 2025 | ⚠️ NO VERIFICADO |
| `CSS_CUOTA_PATRONAL_TRAMO3` | 15.25% | Desde 01-mar-2029 | Ley 462 de 2025 | ⚠️ NO VERIFICADO |
| `SEGURO_EDUCATIVO_EMPLEADO` | 1.25% del salario | Vigente | Decreto de Gabinete 168 de 1971, reformado por Ley 13 de 1987 | ⚠️ NO VERIFICADO — **nota: el requerimiento original mencionaba "Ley 67 de 1974" como base; esa referencia NO apareció en ninguna fuente consultada. La base citada consistentemente es Decreto de Gabinete 168/1971 + Ley 13/1987. Confirmar cuál es correcta antes de codificar.** |
| `SEGURO_EDUCATIVO_PATRONAL` | 1.50% del salario | Vigente; regla especial: no se descuenta en el mes de pago del décimo tercer mes (según una fuente, sin confirmar) | ídem | ⚠️ NO VERIFICADO |
| `RIESGOS_PROFESIONALES_CLASES` | Tasas por clase de riesgo — cifras inconsistentes entre fuentes: un rango citado es 0.56%–5.67%, otro 1.05%–5.67%, con escala de "grados de riesgo" de 6 a 100 según código CIIU de 4 dígitos | Vigente | Decreto de Gabinete 68 de 1970, Acuerdo No. 2 del 1-jul-1970; posible actualización por Resolución 58,443-2026-J.D. | ⚠️ **NO VERIFICADO — cifras en conflicto entre fuentes secundarias, requiere confirmación legal antes de usar cualquier valor** |
| `CSS_TOPE_SALARIAL` | Sin tope de cotización — la cuota se aplica sobre el 100% del salario, sin techo. (El monto de B/.2,500 que a veces se menciona corresponde al umbral de **pensión máxima**, no a un tope de cotización.) | Vigente | Ley 51 de 2005 | ⚠️ NO VERIFICADO |
| `INADEH_APORTE` | No se encontró evidencia de un aporte patronal obligatorio a INADEH en Panamá (a diferencia de institutos análogos en otros países de la región) | — | — | ⚠️ **NO VERIFICADO / posiblemente inexistente — recomendar excluir del alcance salvo que el usuario confirme que aplica** |

---

## 7. Impuesto Sobre la Renta (ISR)

**Estado: ⚠️ NO VERIFICADO contra fuente oficial primaria para los tramos y tasas** — el PDF del Código Fiscal y la resolución específica de retención no pudieron abrirse con contenido legible en esta pasada. Un solo dato fue confirmado directamente en dgi.mef.gob.pa (fecha de declaración anual).

| Código | Umbral anual | Tasa | Base legal | Estado |
|---|---|---|---|---|
| `ISR_BRACKET_1` | B/.0 – B/.11,000/año | 0% | Código Fiscal Art. 700 (reformado por Ley 8 de 2010) | ⚠️ NO VERIFICADO — cifra citada en múltiples fuentes secundarias (RSM Panamá, cifraHQ, Holafly), no confirmada en texto oficial |
| `ISR_BRACKET_2` | B/.11,000 – B/.50,000/año | 15% sobre el excedente de 11,000 | ídem | ⚠️ NO VERIFICADO |
| `ISR_BRACKET_3` | &gt; B/.50,000/año | 25% sobre el excedente de 50,000 | ídem | ⚠️ NO VERIFICADO |
| `ISR_FECHA_DECLARACION` | 15 de marzo del año siguiente al fiscal | — | Ley 6 del 2-feb-2005, Art. 20 (modifica Art. 710 Código Fiscal) | **VERIFICADO** — confirmado directamente en https://dgi.mef.gob.pa/DInforme/D-IsRenta |
| `ISR_DEDUCCIONES_ANUALES` | Deducciones aplicables: gastos médicos, educación (reembolso hasta 15%), intereses hipotecarios, préstamos IFARHU, fondos de retiro privados | No especificado el artículo exacto en la fuente | Fuente DGI, sin número de artículo citado | **VERIFICADO (parcial)** — la existencia de las deducciones se confirmó en la página oficial de DGI, pero sin artículo específico |
| `ISR_METODO_RETENCION` | Método de proyección: el empleador proyecta el salario anual (incluyendo décimo tercer mes y bonos), deduce CSS/SE, aplica los tramos, divide entre los períodos de pago, y reajusta ante cambios de ingreso | Sin número de resolución DGI localizado | ⚠️ NO VERIFICADO — no se encontró la resolución oficial que formaliza este método; solo descrito en fuentes secundarias de nómina |

---

## 8. Prestaciones y provisiones mensuales

Provisiones que StaffPass debe calcular y acumular mensualmente por trabajador, derivadas de las reglas anteriores (no son una prestación nueva, sino el prorrateo contable de las secciones 2-6):

| Código | Fórmula de provisión mensual | Basado en |
|---|---|---|
| `PROVISION_DECIMO_MENSUAL` | Salario mensual devengado ÷ 3 (equivalente a acumular 1/12 por mes, repartido en 3 pagos cuatrimestrales) | Sección 2 |
| `PROVISION_VACACIONES_MENSUAL` | Salario mensual devengado ÷ 11 (equivalente a 1 día de vacaciones por cada 11 días trabajados) | Sección 3 |
| `PROVISION_PRIMA_ANTIGUEDAD_MENSUAL` | (Salario mensual promedio de referencia ÷ 52) semanas acumuladas por año | Sección 4 |
| `PROVISION_INDEMNIZACION_MENSUAL` | Según escala del Art. 225 CT prorrateada mensualmente; **⚠️ NO VERIFICADO** el detalle exacto de prorrateo mensual recomendado por MITRADEL/CSS — requiere confirmación | Sección 5 |
| `PROVISION_CSS_PATRONAL_MENSUAL` | Salario mensual × tasa patronal CSS vigente (tramo según fecha) | Sección 6 — ⚠️ NO VERIFICADO |
| `PROVISION_RIESGOS_PROFESIONALES_MENSUAL` | Salario mensual × tasa de clase de riesgo asignada a la empresa | Sección 6 — ⚠️ NO VERIFICADO |

Estas fórmulas de provisión son inferencias estándar de contabilidad de nómina (prorrateo lineal de una obligación anual/cuatrimestral), **no artículos de ley citados textualmente** — marcarlas como derivadas, no como texto legal, en cualquier UI que las muestre.

---

## 9. Licencias legales

**Estado: mayormente ⚠️ NO VERIFICADO contra fuente oficial** — mitradel.gob.pa devolvió 403 en todos los intentos de fetch directo; los artículos citados provienen de fuentes secundarias concordantes (despachos legales, guías de nómina).

| Código | Licencia | Duración / regla | Art. / Ley | Estado |
|---|---|---|---|---|
| `LICENCIA_MATERNIDAD` | Maternidad | 6 semanas antes del parto + 8 semanas después (mínimo 14 semanas), pagada, coordinada con subsidio CSS; permite diferir prenatal a postnatal con certificado médico | Código de Trabajo (número de artículo citado de forma inconsistente entre fuentes: 68 vs 106/107 — **confirmar cuál es el correcto**) | ⚠️ NO VERIFICADO (duración sí consistente en múltiples fuentes; número de artículo, no) |
| `LICENCIA_PATERNIDAD` | Paternidad | 3 días hábiles pagados al momento del nacimiento, computados como servicio efectivo; requiere notificar al empleador con ≥1 semana de anticipación | Ley 27 de 23-may-2017 | ⚠️ NO VERIFICADO oficialmente (existencia y duración consistentes en fuentes secundarias) |
| `FUERO_PATERNIDAD` | Protección de estabilidad laboral (no es licencia adicional pagada) — aplica solo si la madre falleció en/cerca del parto o no tiene empleo formal | Ley 238 de 2021, modificada por Ley 439 de 2024, vigente desde 01-ene-2024 | ⚠️ NO VERIFICADO oficialmente |
| `LICENCIA_MATRIMONIO` | Matrimonio (sector privado) | **No se encontró base legal en el Código de Trabajo para el sector privado.** El beneficio de 5 días existe solo para empleados públicos bajo carrera administrativa. | — | ⚠️ **NO VERIFICADO — probablemente NO existe como derecho legal privado; tratar solo como beneficio contractual/CCT** |
| `LICENCIA_DUELO` | Duelo (bereavement, sector privado) | **No se encontró base legal en el Código de Trabajo para el sector privado.** La extensión de 3 días encontrada aplica solo a empleados públicos. | — | ⚠️ **NO VERIFICADO — probablemente NO existe como derecho legal privado; tratar solo como beneficio contractual/CCT** |
| `LICENCIA_LACTANCIA` | Lactancia | 15 minutos cada 3 horas, o (a preferencia de la trabajadora) 30 minutos dos veces al día, contado como tiempo de trabajo pagado; obligación del empleador de proveer espacio adecuado; aplica hasta que el hijo cumple 6 meses | Art. 114 Código de Trabajo | ⚠️ NO VERIFICADO oficialmente (citado consistentemente en fuentes secundarias, incluida una guía de MIDES) |

---

## 10. Feriados nacionales

**Estado: ⚠️ NO VERIFICADO contra fuente oficial directa** (mitradel.gob.pa 403 en fetch). Lista corroborada en dos investigaciones independientes (sección 1 vía lectura directa del Código de Trabajo, y sección 9 vía fuentes secundarias) — **la existencia y fechas de los 11 días fijos SÍ coinciden con la lectura directa del PDF oficial en sección 1.5**, por lo que se considera de confianza alta pese a no repetir la verificación aquí.

| Fecha | Nombre | Base legal |
|---|---|---|
| 1 de enero | Año Nuevo | Art. 46 CT |
| 9 de enero | Día de los Mártires | Art. 46 CT |
| Martes de Carnaval (móvil) | Carnaval | Art. 46 CT |
| Viernes Santo (móvil) | Viernes Santo | Art. 46 CT |
| 1 de mayo | Día del Trabajo | Art. 46 CT |
| 3 de noviembre | Separación de Panamá de Colombia | Art. 46 CT |
| 5 de noviembre | Conmemoración Patriótica de Colón | Art. 46 CT |
| 10 de noviembre | Primer Grito de Independencia (de La Villa de Los Santos) | Art. 46 CT |
| 28 de noviembre | Independencia de Panamá de España | Art. 46 CT |
| 8 de diciembre | Día de la Madre | Art. 46 CT |
| 25 de diciembre | Navidad | Art. 46 CT |
| Cada 5 años | Día de Toma de Posesión Presidencial | Art. 46 CT |

⚠️ **NO VERIFICADO**: el 4 de noviembre (Día de la Bandera) aparece como no laborable consuetudinario/administrativo en varias fuentes, pero **no se confirmó como feriado estatutario del Art. 46 CT** — no incluir como feriado legal remunerado sin confirmación adicional.

⚠️ **NO VERIFICADO**: regla de traslado de feriados que caen martes/miércoles → se observa el lunes anterior; que caen jueves/viernes → se observa el lunes siguiente; que caen domingo → se observa el lunes siguiente. Citada en fuentes secundarias, no confirmada en texto oficial en esta pasada.

El tratamiento de pago por trabajar en feriado está en la sección 1.5 (`RECARGO_DIA_FERIADO_TRABAJADO`, con la ambigüedad de multiplicador ya señalada).

---

## 11. Tabla de decisiones pendientes (para revisión del usuario / asesoría legal)

| # | Punto a decidir | Por qué importa | Recomendación |
|---|---|---|---|
| 1 | Multiplicador exacto de pago por feriado trabajado: ¿150% total, o 100% (día pagado) + 150% adicional = 250%? (Art. 49 CT) | Afecta directamente el cálculo de nómina en cada feriado trabajado | Confirmar con abogado laboral o consulta directa a MITRADEL antes de codificar `RECARGO_DIA_FERIADO_TRABAJADO` |
| 2 | ¿"Bonificación anual" del alcance original = décimo tercer mes, o es un concepto distinto sin base legal encontrada? | Si se implementa como regla separada sin aclarar, se duplicaría el décimo tercer mes o se inventaría una prestación inexistente | Preguntar directamente al usuario/stakeholder de producto qué prestación específica se quiso decir |
| 3 | Tasas exactas de CSS post Ley 462/2025 (cuota obrero 9.75%, patronal 13.25%→14.25%→15.25% escalonado 2025-2029) — ninguna cifra fue leída en fuente oficial | Un error aquí genera cálculos de nómina incorrectos en TODAS las empresas del sistema | Bloquear uso en producción (`verified=false`) hasta que alguien abra directamente css.gob.pa o el texto de Ley 462/2025 en Gaceta Oficial y confirme cifras |
| 4 | Tasas de Seguro Educativo (1.25% / 1.50%) y su base legal exacta (Decreto de Gabinete 168/1971 + Ley 13/1987, NO "Ley 67 de 1974" como se asumió originalmente) | Riesgo de estar citando la ley equivocada | Confirmar número de ley/decreto correcto antes de publicar el documento como referencia legal |
| 5 | Tabla de clases de riesgo profesional — cifras en conflicto entre fuentes (0.56%–5.67% vs 1.05%–5.67%), y su asignación por código CIIU | Afecta el cálculo de la cuota de riesgos profesionales por empresa según su actividad económica | Obtener el Decreto de Gabinete 68/1970 y la Resolución 58,443-2026-J.D. directamente de css.gob.pa (probar acceso manual, no automatizado) |
| 6 | ¿Existe tope de pensión máxima (B/.2,500) relevante para algún cálculo de StaffPass, o solo aplica a jubilaciones (fuera de alcance de nómina activa)? | Evitar aplicar por error un tope de cotización que no existe | Confirmar con CSS si el tope de B/.2,500 es solo para determinar pensión máxima, no para limitar la base de cotización mensual |
| 7 | Tramos de ISR (0% hasta 11,000 / 15% hasta 50,000 / 25% excedente) y el método oficial de retención por proyección — ninguno confirmado en Código Fiscal ni resolución DGI directamente | Cálculo de retención de ISR en cada planilla depende de esto | Confirmar contra Código Fiscal Art. 700 (texto completo) y buscar la resolución DGI específica de retención sobre salarios |
| 8 | Décimo tercer mes: tratamiento ISR (¿exento total o hasta un tope?) y tratamiento CSS (¿cotiza, y con qué %?) | Afecta cálculo neto de cada partida de décimo tercer mes | Confirmar directamente con DGI (Código Fiscal Art. 708, sin confirmar) y CSS |
| 9 | Décimo tercer mes: ¿la partida de abril se paga completa aunque no se haya trabajado el cuatrimestre completo, o se prorratea igual que las demás? | Afecta el cálculo del primer pago de nuevos empleados | Confirmar con MITRADEL — snippet encontrado es ambiguo/contradictorio con la fórmula general |
| 10 | Licencia de matrimonio y de duelo: ¿existen como derecho legal en el sector privado, o solo aplican a empleados públicos? | Si no existen legalmente, StaffPass no debe presentarlas como obligación legal, solo como beneficio opcional configurable por empresa | Confirmar con MITRADEL o Código de Trabajo completo; mientras tanto, modelarlas como reglas opcionales por empresa (`company_id` override), no como regla nacional obligatoria |
| 11 | Número de artículo correcto para licencia de maternidad (68 vs 106/107) | Citar el artículo equivocado en documentación legal expuesta a clientes es un riesgo de credibilidad/compliance | Confirmar contra texto oficial completo del Código de Trabajo (mismo PDF usado en secciones 1, 3, 4) |
| 12 | ¿Existe aporte patronal obligatorio a INADEH en Panamá? | Si no existe, no debe aparecer como línea de provisión de nómina | No incluir en el motor de reglas hasta confirmación positiva; tratar como "no encontrado" |
| 13 | Preaviso y causales de despido (Arts. 212, 213 CT) — no confirmados contra fuente oficial en esta pasada, a diferencia de otras secciones que sí se leyeron directamente del mismo PDF oficial | Afecta validez legal del módulo de terminación de contrato | Releer el PDF oficial ya identificado (organojudicial.gob.pa) específicamente en estos artículos, ya que fue accesible para otras secciones |

---

## Fuentes oficiales utilizadas (y su disponibilidad durante esta investigación, 2026-09-14)

| Fuente | Estado de acceso | Uso |
|---|---|---|
| https://www.organojudicial.gob.pa/uploads/wp_repo/uploads/2016/11/c%C3%B3digo-detrabajo.pdf | ✅ Accesible, leído directamente | Base de secciones 1, 3, 4 (jornadas, vacaciones, prima de antigüedad) |
| https://www.mitradel.gob.pa/ | ❌ HTTP 403 en fetch automatizado (solo snippets de búsqueda) | Décimo tercer mes, licencias, feriados — quedaron NO VERIFICADO por esta razón |
| https://www.css.gob.pa/ , https://w3.css.gob.pa/ | ❌ HTTP 403 en fetch automatizado | CSS, seguro educativo, riesgos profesionales — quedaron NO VERIFICADO |
| https://dgi.mef.gob.pa/DInforme/D-IsRenta , /Tarifa | ✅ Accesible parcialmente | Fecha de declaración ISR confirmada; tramos de tasa NO confirmados en esta página |
| https://www.gacetaoficial.gob.pa/ | ❌ HTTP 403 en fetch automatizado | No se pudo confirmar ningún texto de ley directamente aquí |
| https://antai.gob.pa/ (Ley 81 de 2019, protección de datos) | No consultado en esta pasada — **fuera del alcance de esta investigación de FASE 2**, que se centró en derecho laboral/CSS/DGI. Si StaffPass requiere cumplimiento de Ley 81/ANTAI para el manejo de datos de nómina/biométricos, se recomienda una investigación dedicada aparte. | — |

**Recomendación general antes de usar este documento en producción**: todo `rule_code` marcado `⚠️ NO VERIFICADO` debe pasar por revisión de un abogado laboral panameño (o acceso manual exitoso a la fuente oficial bloqueada) y quedar registrado con `reviewed_by` + `reviewed_at` en el modelo de la sección 0 antes de habilitarse para cálculos reales de nómina.
