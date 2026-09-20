![StaffPass Free Tools — Recursos prácticos. Decisiones más claras.](docs/brand/cover.png)

[![CI](https://github.com/Staff-Pass/staffpass-free-tools/actions/workflows/ci.yml/badge.svg)](https://github.com/Staff-Pass/staffpass-free-tools/actions/workflows/ci.yml) · [StaffPass](https://staffpass.app/) · [Apache-2.0](LICENSE)

# StaffPass Free Tools — Panamá

Repositorio autónomo y reutilizable para cuatro herramientas laborales gratuitas:

- calculadora de quincena;
- comprobante de pago en PDF;
- borrador de contrato por tiempo indefinido;
- calculadora de liquidación para renuncia, despido injustificado y mutuo acuerdo.

La aplicación web procesa todo localmente en el navegador. No contiene API, base de datos, autenticación, captación de leads, correo, analítica ni secretos de StaffPass. El paquete TypeScript expone el motor puro para integrarlo en otros proyectos.

> **Advertencia:** los resultados son estimaciones. Todas las reglas del catálogo conservan `verified: false` hasta una revisión legal independiente. Este proyecto no sustituye asesoría profesional, liquidaciones fiscales ni trámites ante MITRADEL, CSS o DGI.

## Requisitos

- Node.js 24 o 25 (la versión de desarrollo está en `.node-version`).
- pnpm 12.5.1 mediante Corepack.

## Instalar y validar

```bash
git clone https://github.com/Staff-Pass/staffpass-free-tools.git
cd staffpass-free-tools
corepack enable
pnpm install --frozen-lockfile
pnpm check
```

`pnpm check` valida la frontera arquitectónica, busca patrones comunes de secretos, ejecuta TypeScript, pruebas y ambos builds. Para abrir la aplicación:

```bash
pnpm dev
```

El build publicable queda en `dist-web/`; es un sitio estático y puede servirse desde cualquier hosting sin funciones de servidor. El paquete reutilizable queda en `dist/`.

## Uso como biblioteca

```ts
import { calculatePaycheck } from '@staffpass/free-tools-pa';

const result = calculatePaycheck({
  monthlySalary: '1000.00',
  periodStart: '2026-09-01',
  periodEnd: '2026-09-15',
  mode: 'SIMPLE',
});

console.log(result.value.net);
console.log(result.estimate); // true mientras existan reglas no verificadas
```

También puedes ejecutar `node examples/paycheck.mjs` después de `pnpm build`.

## Arquitectura

```text
src/tools-pa/     motor puro, catálogo, contratos, fixtures y pruebas
app/              interfaz estática; importa únicamente el motor y pdf-lib
scripts/          build y verificaciones locales
test/             pruebas del límite autónomo y de la superficie web
docs/             alcance, mantenimiento y revisión pública
dist/             paquete ESM generado (ignorado por Git)
dist-web/         sitio estático generado (ignorado por Git)
```

El motor no puede importar NestJS, Prisma, Firebase, `public-tools` ni módulos `node:*`. `pnpm check:architecture` aplica ese límite. La web no hace `fetch`, `sendBeacon`, WebSocket ni carga recursos remotos.

## Alcance de cada herramienta

- **Quincena:** estándar 1–15 o 16–fin de mes; períodos personalizados; horas extra diurnas básicas, ingresos adicionales y deducciones voluntarias en modo detallado.
- **Comprobante:** PDF generado en memoria dentro del navegador. Declara expresamente que no confirma un pago.
- **Contrato:** plantilla `PA-INDEF` v1; descarga HTML autocontenido, marcada como borrador y sujeta a revisión/registro separado.
- **Liquidación:** solo contrato indefinido y las tres causas soportadas. Otros casos se rechazan y remiten a la calculadora oficial de MITRADEL.

Consulta [docs/RULES_AND_LIMITATIONS.md](docs/RULES_AND_LIMITATIONS.md) antes de cambiar fórmulas.

## Descargar y reutilizar

Descarga el código desde **Code → Download ZIP** o clona este repositorio. No necesitas una cuenta de StaffPass, API ni credenciales para ejecutar las herramientas.

Para integrar el motor en otro proyecto, ejecuta `pnpm build` y `npm pack` aquí, e instala el `.tgz` generado en tu proyecto con `npm install /ruta/al/archivo.tgz`. Entonces podrás usar el import del ejemplo anterior. El paquete no está publicado en npm; no ejecutes `npm install @staffpass/free-tools-pa` desde el registro.

## Licencia y marca

Código distribuido bajo [Apache-2.0](LICENSE). Puedes reutilizarlo y adaptarlo conservando los avisos exigidos. La licencia no concede derechos sobre la marca StaffPass: consulta [la guía de marca](docs/BRANDING.md) y [NOTICE](NOTICE).

La revisión jurídica independiente sigue pendiente y las reglas mantienen `verified: false`. La publicación del código no certifica cálculos, documentos ni cumplimiento legal.

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md)
- [Reglas y limitaciones](docs/RULES_AND_LIMITATIONS.md)
- [Procedencia](docs/UPSTREAM.md)
- [Marca](docs/BRANDING.md)

## Contribuir

Lee [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md) y [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). No cambies un valor legal sin fuente, fecha de vigencia, fixture y revisión explícita del estado `verified`.
