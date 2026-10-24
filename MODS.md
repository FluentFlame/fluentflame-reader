# Fluent Reader Mods

Fork local basado en `FluentFlame/fluentflame-reader` (`2.2.0-dev.3`).

Rama: `mods/local-ui`.

## Cambios aplicados

### 1. Fechas futuras
- `src/scripts/models/item.ts`: si un feed publica un ítem con fecha futura, se usa la fecha de descarga (`fetchedDate`) en lugar de dejarlo clavado arriba para siempre.
- `src/components/utils/time.tsx`: una fecha futura nunca se muestra como “now”; se muestra su fecha real.

Esto corrige el caso de “Visual Studio Code 1.144 (Insiders)”: el feed trae `2026-10-28`, y la app lo mostraba como “now” y siempre primero.

### 2. Deduplicación por enlace
- `src/scripts/db.ts`: nueva versión de Dexie (10) con índice `[source+link]`.
- `src/scripts/models/source.ts`: los ítems se deduplican por `source + link` cuando existe enlace; si no, se mantiene el criterio anterior (fecha + fuente + título).

Esto evita que feeds sin `pubDate` (o con fecha futura) inserten copias en cada refresco.

### 3. Concurrencia de refresco
- `src/scripts/models/item.ts`: máximo **24 feeds simultáneos** al refrescar, en lugar de lanzar todos a la vez.

Evita saturar la red y que un feed lento bloquee el refresco completo.

### 4. Diseño de tarjetas
- `resources/styles/mods.css` (nuevo) e importado al final de `resources/index.css`.
- Incluye el rediseño de tarjetas: 264×280, radio 14px, portada 16:9, degradado, hover, snippet visible, estados leídos y tarjetas sin portada.

## Pendiente / siguientes mods
- Llevar al código (no solo al inyector) las miniaturas de YouTube y el reproductor iframe.
- Migración opcional para limpiar duplicados antiguos ya existentes.
- Revisar el resto de feeds sin fecha para no depender de aislamientos manuales.

## Build
```bash
npm ci
npm run build
```

La instalación original en `C:\Program Files\Fluentflame Reader` no se toca.
