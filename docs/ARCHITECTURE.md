# Arquitectura autónoma

El proyecto tiene dos adaptadores sobre un núcleo puro:

```text
                         +------------------+
                         | src/tools-pa     |
                         | reglas y cálculo |
                         +---------+--------+
                                   |
                    +--------------+--------------+
                    |                             |
             +------v------+               +------v------+
             | paquete ESM |               | web estática |
             | dist/       |               | dist-web/    |
             +-------------+               +-------------+
```

`src/tools-pa` solo depende de `decimal.js`. La UI depende del núcleo y de `pdf-lib` para el comprobante. No hay adaptador de infraestructura porque el objetivo de esta distribución es funcionar sin backend.

Los datos de formularios viven en memoria y se descartan al recargar. Los únicos efectos laterales son descargas iniciadas por el usuario. No se usa almacenamiento local, cookies, red, telemetría ni parámetros de URL con datos personales.
