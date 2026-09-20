# Procedencia de la extracción

Extracción local realizada el 20 de septiembre de 2026, sin publicar ni crear remotos.

| Material | Fuente local | Commit observado |
| --- | --- | --- |
| Motor, reglas, fixtures y pruebas | `staffpass-backend/src/tools-pa` | `f2b74817013fbe9970ed67d89ff85cc61fc608f6` |
| UX y contenido de referencia | `staffpass-website/src/tools`, `assets/tools/ui` y `assets/vendor` | `fe5f2d4a58b9e01e0c59bdda624f7a178cbe11e0` |
| Contratos de captación revisados, no incluidos | `staffpass-backend/src/public-tools` | `f2b74817013fbe9970ed67d89ff85cc61fc608f6` |

El motor fue copiado sin modificar fórmulas ni fixtures. La aplicación web es un adaptador nuevo: elimina llamadas a captación, correo, Turnstile y analítica; conserva cálculo local, advertencias, fuentes y descargas iniciadas por el usuario.

Los commits se registran para trazabilidad técnica, identifican la extracción inicial. Esta distribución autónoma se publica bajo Apache-2.0; los repositorios de origen siguen siendo privados.
