# Seguridad

## Modelo de datos

La aplicación distribuida no transmite datos. Los formularios se procesan en memoria y las descargas se generan localmente. El repositorio no requiere variables de entorno ni credenciales.

## Reporte responsable

Reporta vulnerabilidades de forma privada a **support@softwaretoaster.com**, con asunto «Seguridad: StaffPass Free Tools». Incluye versión, impacto y pasos mínimos de reproducción sin datos reales. No se promete un plazo fijo de respuesta. No abras un issue público con información personal, claves o un exploit funcional.

## Validación mantenida

- `pnpm check:secrets`: patrones frecuentes de credenciales.
- `pnpm check:architecture`: dependencias prohibidas en el núcleo.
- `pnpm audit --prod`: vulnerabilidades conocidas en dependencias de producción.
- lockfile versionado y dependencias exactas.

Estas verificaciones reducen riesgo, pero no reemplazan revisión manual, SCA continua ni un proceso de respuesta a incidentes una vez publicado.
