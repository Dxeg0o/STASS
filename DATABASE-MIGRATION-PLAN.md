# STASS (QualiBlick) — Plan de Migracion de Base de Datos

## De MongoDB a PostgreSQL + TimescaleDB

---

## 1. Por que migrar?

### Problemas actuales con MongoDB

**Almacenamiento insostenible**: La tabla `Conteo` genera 1M de documentos por dia por empresa. A 268 bytes/doc, eso son ~98 GB/ano por empresa. Con 5 empresas, ~490 GB/ano solo en conteos.

**Modelos muertos**: 4 de 10 modelos (Etiqueta, Subetiqueta, Analisis, Prediccion) tienen APIs creadas pero cero uso en el frontend. Son codigo muerto.

**Usando MongoDB como base relacional**: Todos los modelos tienen foreign keys (empresaId, servicioId, loteId). No hay documentos anidados complejos ni esquemas flexibles. Se esta usando MongoDB para datos que son fundamentalmente relacionales.

**Sin integridad referencial**: MongoDB no tiene foreign key constraints reales. Se puede borrar una Empresa y dejar Users huerfanos. La integridad se mantiene solo "por convencion" en el codigo.

**Conteo <-> Lote vinculado por rangos de tiempo**: Los conteos no tienen loteId directo. Se vinculan a lotes buscando LoteActivity con rangos de tiempo que contengan el timestamp del conteo. Esto es fragil (clock drift, overlaps) y costoso (se recalcula en cada query).

**No escala para futuros casos de uso**: El schema actual no soporta plantacion (necesita coordenadas), ni analisis de calidad (necesita atributos flexibles), ni multiples empresas por usuario.

### Que se gana con PostgreSQL + TimescaleDB

| Aspecto | MongoDB actual | PostgreSQL + TimescaleDB |
|---|---|---|
| Almacenamiento 1M conteos/dia | ~270 MB/dia | **~15 MB/dia** (compresion 95%) |
| Almacenamiento 1 ano | ~98 GB | **~1.5 GB** |
| Integridad referencial | No existe | **Foreign keys reales** |
| Query distribucion calibre | 90 lineas de aggregation pipeline | **5 lineas de SQL** |
| Pre-agregacion para dashboards | Job manual por programar | **Continuous aggregate automatico** |
| JOINs entre tablas | Application-level (multiples queries) | **Nativo, una sola query** |
| Bases de datos | 2 (si agregas TimescaleDB) | **1 sola** |
| ORM | Mongoose | **Drizzle** |
| Hosting | MongoDB Atlas | **Timescale Cloud, Supabase, o VPS** |

---

## 2. Que se elimina

| Modelo/Campo | Razon |
|---|---|
| **Etiqueta** (modelo + API) | Zero uso en frontend. API en `/api/tags` nunca se llama |
| **Subetiqueta** (modelo + API) | Zero uso en frontend |
| **Analisis** (modelo + API) | Zero uso en frontend. Schema demasiado rigido para calidad real |
| **Prediccion** (modelo + API) | Zero uso en frontend. `atributos: {tamano, color}` hardcodeado |
| **Conteo.id** (campo numerico) | Se incluye en queries pero nunca se muestra ni referencia |
| **User.empresaId** | Movido a tabla `empresa_usuario` (relacion N:N) |
| **User.invitadoPor** | Eliminado por innecesario |
| **User.rol** | Movido a `empresa_usuario` (rol por empresa) |

---

## 3. Schema nuevo

### Tablas relacionales (PostgreSQL standard)

```sql
-- Empresa
CREATE TABLE empresa (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      TEXT NOT NULL,
    pais        TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Usuario (sin empresaId ni rol — eso va en empresa_usuario)
CREATE TABLE usuario (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      TEXT NOT NULL,
    correo      TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Relacion N:N entre usuario y empresa (con rol por empresa)
CREATE TABLE empresa_usuario (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id  UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    empresa_id  UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
    rol         TEXT NOT NULL CHECK (rol IN ('administrador', 'usuario')),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(usuario_id, empresa_id)
);

-- Ubicacion (nuevo — para plantacion futura)
CREATE TABLE ubicacion (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      TEXT NOT NULL,
    empresa_id  UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
    tipo        TEXT NOT NULL CHECK (tipo IN ('campo', 'bodega', 'planta')),
    lat         DOUBLE PRECISION,
    lng         DOUBLE PRECISION,
    boundaries  JSONB
);

-- Servicio (actualizado — con tipo y ubicacion)
CREATE TABLE servicio (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre       TEXT NOT NULL,
    empresa_id   UUID NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
    ubicacion_id UUID REFERENCES ubicacion(id),
    tipo         TEXT NOT NULL CHECK (tipo IN (
                   'linea_conteo', 'maquina_plantacion', 'estacion_calidad'
                 )),
    fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_fin    TIMESTAMPTZ          -- NULL = servicio activo
);

-- Producto (catalogo global — 'Lirio', 'Rosa', 'Tulipan' son universales)
CREATE TABLE producto (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      TEXT NOT NULL UNIQUE,                       -- e.g., 'Lirio', 'Rosa', 'Tulipán'
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Variedad (catalogo global — 'Siberia' es 'Siberia' en toda la industria)
CREATE TABLE variedad (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre       TEXT NOT NULL,                             -- e.g., 'Siberia', 'Sorbonne', 'Casa Blanca'
    tipo         TEXT,                                      -- subtipo libre por producto (e.g., 'oriental', 'asiatic' para lirios)
    producto_id  UUID NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(nombre, producto_id)
);

-- Lote
CREATE TABLE lote (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      TEXT NOT NULL,
    servicio_id UUID NOT NULL REFERENCES servicio(id) ON DELETE CASCADE,
    variedad_id UUID REFERENCES variedad(id),               -- NULL = variedad no especificada
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Dispositivo (independiente, sin dueño)
CREATE TABLE dispositivo (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre  TEXT NOT NULL UNIQUE,
    tipo    TEXT NOT NULL DEFAULT 'nvidia_agx',
    activo  BOOLEAN DEFAULT true
);

-- Asignación dispositivo ↔ servicio (composite PK, sin UUID innecesario)
CREATE TABLE dispositivo_servicio (
    dispositivo_id  UUID NOT NULL REFERENCES dispositivo(id),
    servicio_id     UUID NOT NULL REFERENCES servicio(id),
    maquina         TEXT,           -- "Máquina 1", "Línea A", "Puesto 3"
    asignado_at     TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (dispositivo_id, servicio_id)
);

-- Lote Session (ahora por dispositivo, con FK compuesta a dispositivo_servicio)
CREATE TABLE lote_session (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lote_id         UUID NOT NULL REFERENCES lote(id) ON DELETE CASCADE,
    dispositivo_id  UUID NOT NULL,
    servicio_id     UUID NOT NULL,
    start_time      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time        TIMESTAMPTZ,

    -- FK compuesta: el device DEBE estar asignado a ese servicio
    FOREIGN KEY (dispositivo_id, servicio_id)
        REFERENCES dispositivo_servicio(dispositivo_id, servicio_id)
);

-- Evitar que un device tenga 2 sesiones abiertas simultáneamente
CREATE UNIQUE INDEX idx_one_open_session_per_device
ON lote_session (dispositivo_id)
WHERE end_time IS NULL;
```

### Hypertable de conteo (TimescaleDB) — una tabla por caso de uso

```sql
-- Conteo: solo campos necesarios, cero NULLs, peso minimo por fila
CREATE TABLE conteo (
    ts              TIMESTAMPTZ  NOT NULL,
    servicio_id     UUID         NOT NULL,
    lote_id         UUID         NOT NULL,
    dispositivo_id  UUID         NOT NULL,
    perimeter       REAL         NOT NULL,
    direction       SMALLINT     NOT NULL  -- 0=in, 1=out
);

-- Convertir a hypertable (particionado automatico por dia)
SELECT create_hypertable('conteo', 'ts', chunk_time_interval => INTERVAL '1 day');

-- Indices
CREATE INDEX idx_conteo_lote ON conteo (lote_id, ts DESC);
CREATE INDEX idx_conteo_servicio ON conteo (servicio_id, ts DESC);
CREATE INDEX idx_conteo_dispositivo ON conteo (dispositivo_id, ts DESC);

-- Compresion automatica (datos >7 dias se comprimen ~95%)
ALTER TABLE conteo SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'servicio_id, lote_id, dispositivo_id',
    timescaledb.compress_orderby = 'ts DESC'
);
SELECT add_compression_policy('conteo', INTERVAL '7 days');
```

**Futuras hypertables** (crear cuando se necesiten, no antes):

```sql
-- Plantacion (cuando se implemente maquina plantadora)
CREATE TABLE plantacion (
    ts              TIMESTAMPTZ      NOT NULL,
    servicio_id     UUID             NOT NULL,
    lote_id         UUID             NOT NULL,
    dispositivo_id  UUID             NOT NULL,
    perimeter       REAL,
    lat             DOUBLE PRECISION NOT NULL,
    lng             DOUBLE PRECISION NOT NULL,
    row_num         SMALLINT,
    position        SMALLINT
);
SELECT create_hypertable('plantacion', 'ts', chunk_time_interval => INTERVAL '1 day');

-- Calidad (cuando se implemente analisis de interior)
CREATE TABLE calidad (
    ts              TIMESTAMPTZ  NOT NULL,
    servicio_id     UUID         NOT NULL,
    lote_id         UUID         NOT NULL,
    dispositivo_id  UUID         NOT NULL,
    perimeter       REAL,
    score           REAL         NOT NULL,
    data            JSONB        NOT NULL
);
SELECT create_hypertable('calidad', 'ts', chunk_time_interval => INTERVAL '1 day');
```

### Vista agregada automatica (Continuous Aggregate)

```sql
-- Resumen diario de conteos — se actualiza automaticamente
CREATE MATERIALIZED VIEW stats_conteo_dia
WITH (timescaledb.continuous) AS
SELECT time_bucket('1 day', ts) AS dia,
       servicio_id,
       lote_id,
       dispositivo_id,
       direction,
       count(*)        AS total,
       avg(perimeter)  AS perimeter_avg,
       min(perimeter)  AS perimeter_min,
       max(perimeter)  AS perimeter_max
FROM conteo
GROUP BY 1, 2, 3, 4, 5;

-- Politica de actualizacion automatica
SELECT add_continuous_aggregate_policy('stats_conteo_dia',
  start_offset    => INTERVAL '3 days',
  end_offset      => INTERVAL '1 day',
  schedule_interval => INTERVAL '1 day'
);
```

---

## 4. Como se asigna el lote_id sin WiFi

El dispositivo (NVIDIA AGX con YOLO) no tiene WiFi confiable. No puede consultar el servidor para saber que lote esta activo. Solo envia su UUID y las mediciones:

```json
{ "dispositivoId": "uuid-del-dispositivo", "mediciones": [{ "ts": "...", "perimeter": 4.5, "direction": 0 }, ...] }
```

**El servidor resuelve servicio_id y lote_id en el momento de la ingestion** consultando `lote_session` y validando la asignacion via `dispositivo_servicio`:

```typescript
// POST /api/mediciones/sync
export async function POST(req: Request) {
  const { dispositivoId, mediciones } = await req.json();

  // 1. Validar que el dispositivo esta asignado a algun servicio
  const asignacion = await db.query.dispositivoServicio.findFirst({
    where: eq(dispositivoServicio.dispositivoId, dispositivoId),
  });
  if (!asignacion) throw new Error('Dispositivo no asignado');

  // 2. Buscar sessions activas para este dispositivo
  const sessions = await db.select().from(loteSession).where(
    and(
      eq(loteSession.dispositivoId, dispositivoId),
      lte(loteSession.startTime, maxTimestamp),
      or(isNull(loteSession.endTime), gte(loteSession.endTime, minTimestamp))
    )
  ).orderBy(asc(loteSession.startTime));

  // 3. Asignar servicioId y loteId a cada medicion desde lote_session
  const enriched = mediciones.map(m => {
    const session = sessions.find(s =>
      m.ts >= s.startTime && (!s.endTime || m.ts <= s.endTime)
    );
    return {
      ...m,
      dispositivoId,
      servicioId: session?.servicioId ?? null,
      loteId: session?.loteId ?? 'unassigned'
    };
  });

  // 4. Batch insert en TimescaleDB
  await db.insert(conteo).values(enriched);
}
```

**Mediciones sin lote** (`unassigned`) se reasignan periodicamente:

```sql
UPDATE conteo c
SET lote_id = ls.lote_id
FROM lote_session ls
WHERE c.lote_id = '00000000-0000-0000-0000-000000000000'
  AND c.dispositivo_id = ls.dispositivo_id
  AND c.ts BETWEEN ls.start_time AND COALESCE(ls.end_time, NOW());
```

---

## 5. Ejemplos de queries (antes vs despues)

### Distribucion de calibre por lote

**Antes (MongoDB aggregation pipeline — ~90 lineas):**
```typescript
const pipeline = [
  { $match: { servicioId, timestamp: { $gte: start, $lte: end } } },
  { $facet: {
    // ... buckets por perimeter
    // ... group por lote
    // ... unwind, project, sort...
  }},
  // ... 80 lineas mas
];
const result = await Conteo.aggregate(pipeline);
```

**Despues (PostgreSQL — 6 lineas):**
```sql
SELECT lote_id,
       round(perimeter::numeric, 1) AS calibre,
       count(*)::int AS cantidad
FROM conteo
WHERE servicio_id = $1 AND lote_id = ANY($2)
GROUP BY 1, 2
ORDER BY 2;
```

### Resumen por dispositivo

**Antes:**
```typescript
// Query 1: buscar LoteActivity para el lote
// Query 2: buscar Conteos en esos rangos de tiempo
// Query 3: aggregate por dispositivo
```

**Despues:**
```sql
SELECT dispositivo_id,
       count(*) FILTER (WHERE direction = 0) AS count_in,
       count(*) FILTER (WHERE direction = 1) AS count_out,
       max(ts) AS last_activity
FROM conteo
WHERE lote_id = $1
GROUP BY dispositivo_id;
```

### Benchmark por variedad y producto

```sql
SELECT p.nombre AS producto,
       v.nombre AS variedad,
       v.tipo,
       count(*) FILTER (WHERE direction = 0) AS total_in,
       avg(perimeter)                         AS calibre_promedio,
       min(perimeter)                         AS calibre_min,
       max(perimeter)                         AS calibre_max
FROM conteo c
JOIN lote l      ON c.lote_id     = l.id
JOIN servicio s  ON l.servicio_id = s.id
JOIN variedad v  ON l.variedad_id = v.id
JOIN producto p  ON v.producto_id = p.id
WHERE s.empresa_id = $1                      -- empresa entra por lote -> servicio
  AND c.ts >= NOW() - INTERVAL '1 year'
GROUP BY p.id, p.nombre, v.id, v.nombre, v.tipo
ORDER BY p.nombre, calibre_promedio DESC;
```

### Tendencias del ultimo ano (para dashboard)

**Antes:** Imposible sin pre-agregacion manual (365M filas por empresa).

**Despues:**
```sql
SELECT dia, sum(total) AS bulbos, avg(perimeter_avg) AS calibre_promedio
FROM stats_conteo_dia
WHERE servicio_id = $1 AND dia >= NOW() - INTERVAL '1 year'
GROUP BY dia
ORDER BY dia;
```

---

## 6. Pasos de implementacion

### Fase 1: Setup de infraestructura (1-2 dias)

1. **Crear base de datos PostgreSQL con TimescaleDB**
   - Opcion A: Timescale Cloud (managed, recomendado para empezar)
   - Opcion B: Supabase (tiene TimescaleDB como extension)
   - Opcion C: VPS con PostgreSQL + `CREATE EXTENSION timescaledb`

2. **Instalar Drizzle en el proyecto**
   ```bash
   npm install drizzle-orm postgres
   npm install -D drizzle-kit
   ```

3. **Configurar connection string**
   ```env
   DATABASE_URL="postgresql://user:pass@host:5432/stass"
   ```

### Fase 2: Schema y modelos (2-3 dias)

1. **Crear schema de Drizzle** (`src/db/schema.ts`)
   - Todas las tablas relacionales como objetos TypeScript
   - La hypertable `conteo` y la vista `stats_conteo_dia` se crean via SQL directo en un migration custom (Drizzle lo soporta nativamente via `sql` tagged template)

2. **Configurar Drizzle Kit** (`drizzle.config.ts`)
   ```ts
   import { defineConfig } from 'drizzle-kit';
   export default defineConfig({
     schema: './src/db/schema.ts',
     out: './drizzle',
     dialect: 'postgresql',
     dbCredentials: { url: process.env.DATABASE_URL! },
   });
   ```

3. **Generar y aplicar migration**
   ```bash
   npx drizzle-kit generate
   npx drizzle-kit migrate
   ```

4. **Ejecutar SQL de TimescaleDB** (hypertable, compresion, aggregate)
   ```bash
   psql $DATABASE_URL -f sql/timescale-setup.sql
   ```

### Fase 3: Migracion de datos (1-2 dias)

1. **Exportar datos de MongoDB**
   ```bash
   mongoexport --db stass --collection empresas --out empresas.json
   mongoexport --db stass --collection users --out users.json
   mongoexport --db stass --collection servicios --out servicios.json
   mongoexport --db stass --collection lotes --out lotes.json
   mongoexport --db stass --collection loteactivities --out sessions.json
   mongoexport --db stass --collection conteos --out conteos.json
   ```

2. **Script de transformacion y carga**
   - Transformar _id de MongoDB a UUID
   - Crear registros empresa_usuario a partir de User.empresaId + User.rol
   - Cargar conteos a la hypertable con lote_id asignado
   - Mantener un mapeo de MongoDB _id -> PostgreSQL UUID para referencias

3. **Verificar conteos**
   ```sql
   -- Debe coincidir con el count en MongoDB
   SELECT count(*) FROM conteo;
   SELECT count(*) FROM empresa;
   SELECT count(*) FROM usuario;
   ```

### Fase 4: Actualizar API routes (3-5 dias)

Reemplazar cada API route que usa Mongoose por Drizzle:

| API Route | Prioridad | Complejidad |
|---|---|---|
| `/api/auth/*` | Alta | Media (agregar empresa_usuario) |
| `/api/servicios` | Alta | Baja |
| `/api/lotes` | Alta | Baja |
| `/api/lotes/activity` | Alta | Baja |
| `/api/conteos` → `/api/mediciones/sync` | Alta | Media |
| `/api/lotes/summary` | Alta | Baja (simplifica) |
| `/api/stats/distribution` | Alta | Baja (simplifica mucho) |
| `/api/tags` | Eliminar | - |
| `/api/analysis` | Eliminar | - |
| `/api/predictions` | Eliminar | - |

### Fase 5: Actualizar frontend (2-3 dias)

1. **ServicioContext**: Actualizar para usar nueva API
2. **Selector de empresa**: Agregar selector si usuario pertenece a multiples empresas
3. **Tablas y graficos**: Adaptar interfaces TypeScript a nuevos campos (ej: `timestamp` -> `ts`)
4. **Eliminar componentes muertos** que referencien Etiqueta/Analisis/Prediccion

### Fase 6: Actualizar device sync (1 dia)

1. El endpoint que recibe datos del NVIDIA AGX debe:
   - Aceptar el mismo payload (no cambiar nada en el dispositivo)
   - Asignar lote_id server-side
   - Insertar en TimescaleDB en vez de MongoDB

### Fase 7: Testing y cutover (2-3 dias)

1. **Dual-write**: Temporalmente escribir en ambas bases para validar
2. **Comparar resultados**: Verificar que graficos y tablas muestren los mismos datos
3. **Cutover**: Apuntar todo a PostgreSQL, apagar MongoDB
4. **Eliminar Mongoose y dependencias de MongoDB**

---

## 7. Estimacion total

| Fase | Tiempo estimado |
|---|---|
| Setup infraestructura | 1-2 dias |
| Schema y modelos | 2-3 dias |
| Migracion de datos | 1-2 dias |
| Actualizar API routes | 3-5 dias |
| Actualizar frontend | 2-3 dias |
| Actualizar device sync | 1 dia |
| Testing y cutover | 2-3 dias |
| **Total** | **12-19 dias** |

---

## 8. Hosting recomendado

### Para empezar (MVP / desarrollo)

**Timescale Cloud** — plan gratuito incluye 25 GB de almacenamiento comprimido. Suficiente para ~16 anos de datos de una empresa con la compresion de TimescaleDB.

### Para produccion

| Opcion | Costo aprox | Pros |
|---|---|---|
| Timescale Cloud | $50-150/mes | Managed, backups automaticos, TimescaleDB nativo |
| Supabase Pro | $25/mes + uso | PostgreSQL managed, auth integrado, API automatica |
| Railway/Render | $20-50/mes | Simple deploy, PostgreSQL managed |
| VPS (Hetzner/DO) | $10-30/mes | Mas barato, pero self-managed |

---

## 9. Diagrama

Ver archivo `db-model-proposed.excalidraw` para el diagrama visual completo del nuevo schema.

Ver archivo `db-model-actual.excalidraw` para el schema actual (referencia).
