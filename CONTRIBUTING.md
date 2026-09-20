# Contribuir

1. Crea una rama local y conserva los cambios ajenos.
2. Instala con `pnpm install --frozen-lockfile`.
3. Ejecuta `pnpm check` antes de entregar.
4. Añade pruebas y fixtures para todo cambio de fórmula.
5. Documenta la fuente oficial y la vigencia de cualquier regla nueva.

Mantén el motor puro y la interfaz accesible. No agregues servicios de captura, correo, autenticación, almacenamiento o analítica al núcleo; si alguna futura distribución los necesita, deben vivir en un adaptador opcional claramente separado.

No incluyas credenciales, datos reales de empleados ni documentos identificables en fixtures o reportes de errores.
