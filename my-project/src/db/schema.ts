import {
  pgTable,
  uuid,
  text,
  timestamp,
  unique,
  real,
  smallint,
  boolean,
  doublePrecision,
  jsonb,
  primaryKey,
  index,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Empresa ───────────────────────────────────────────────

export const empresa = pgTable("empresa", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  pais: text("pais"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const empresaRelations = relations(empresa, ({ many }) => ({
  empresaUsuarios: many(empresaUsuario),
  servicios: many(servicio),
  ubicaciones: many(ubicacion),
  tiposProceso: many(tipoProceso),
  workflowEmpresas: many(workflowEmpresa),
  procesos: many(proceso),
  cajas: many(caja),
}));

// ─── Usuario ───────────────────────────────────────────────

export const usuario = pgTable("usuario", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  correo: text("correo").unique().notNull(),
  password: text("password").notNull(),
  isSuperAdmin: boolean("is_super_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const usuarioRelations = relations(usuario, ({ many }) => ({
  empresaUsuarios: many(empresaUsuario),
}));

// ─── Empresa ↔ Usuario (N:N) ──────────────────────────────

export const empresaUsuario = pgTable(
  "empresa_usuario",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    empresaId: uuid("empresa_id")
      .notNull()
      .references(() => empresa.id, { onDelete: "cascade" }),
    rol: text("rol").notNull(), // 'administrador' | 'usuario'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [unique().on(t.usuarioId, t.empresaId)]
);

export const empresaUsuarioRelations = relations(
  empresaUsuario,
  ({ one }) => ({
    usuario: one(usuario, {
      fields: [empresaUsuario.usuarioId],
      references: [usuario.id],
    }),
    empresa: one(empresa, {
      fields: [empresaUsuario.empresaId],
      references: [empresa.id],
    }),
  })
);

// ─── Ubicacion ─────────────────────────────────────────────

export const ubicacion = pgTable("ubicacion", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresa.id, { onDelete: "cascade" }),
  tipo: text("tipo").notNull(), // 'campo' | 'bodega' | 'planta'
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  boundaries: jsonb("boundaries"),
});

export const ubicacionRelations = relations(ubicacion, ({ one, many }) => ({
  empresa: one(empresa, {
    fields: [ubicacion.empresaId],
    references: [empresa.id],
  }),
  servicios: many(servicio),
}));

// ─── Tipo Proceso (diccionario) ─────────────────────────────

export const tipoProceso = pgTable("tipo_proceso", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(), // "Plantacion", "Cosecha", "Lavado"
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresa.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const tipoProcesoRelations = relations(tipoProceso, ({ one, many }) => ({
  empresa: one(empresa, {
    fields: [tipoProceso.empresaId],
    references: [empresa.id],
  }),
  workflowPasos: many(workflowPaso),
  procesos: many(proceso),
}));

// ─── Workflow Empresa (definicion de workflow) ──────────────

export const workflowEmpresa = pgTable("workflow_empresa", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(), // "Engorde Bulbos", "Proceso Comercial"
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresa.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const workflowEmpresaRelations = relations(
  workflowEmpresa,
  ({ one, many }) => ({
    empresa: one(empresa, {
      fields: [workflowEmpresa.empresaId],
      references: [empresa.id],
    }),
    pasos: many(workflowPaso),
  })
);

// ─── Workflow Paso (pasos ordenados del workflow) ───────────

export const workflowPaso = pgTable(
  "workflow_paso",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workflowEmpresaId: uuid("workflow_empresa_id")
      .notNull()
      .references(() => workflowEmpresa.id, { onDelete: "cascade" }),
    tipoProcesoId: uuid("tipo_proceso_id")
      .notNull()
      .references(() => tipoProceso.id),
    orden: integer("orden").notNull(),
  },
  (t) => [unique().on(t.workflowEmpresaId, t.orden)]
);

export const workflowPasoRelations = relations(workflowPaso, ({ one }) => ({
  workflowEmpresa: one(workflowEmpresa, {
    fields: [workflowPaso.workflowEmpresaId],
    references: [workflowEmpresa.id],
  }),
  tipoProceso: one(tipoProceso, {
    fields: [workflowPaso.tipoProcesoId],
    references: [tipoProceso.id],
  }),
}));

// ─── Proceso (instancia de un proceso) ─────────────────────

export const proceso = pgTable("proceso", {
  id: uuid("id").primaryKey().defaultRandom(),
  tipoProcesoId: uuid("tipo_proceso_id")
    .notNull()
    .references(() => tipoProceso.id),
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresa.id, { onDelete: "cascade" }),
  productoId: uuid("producto_id").references(() => producto.id),
  temporada: text("temporada"), // "2025"
  estado: text("estado").notNull().default("planificado"), // planificado|en_curso|completado|cancelado
  fechaInicio: timestamp("fecha_inicio", { withTimezone: true }),
  fechaFin: timestamp("fecha_fin", { withTimezone: true }),
  notas: text("notas"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const procesoRelations = relations(proceso, ({ one, many }) => ({
  tipoProceso: one(tipoProceso, {
    fields: [proceso.tipoProcesoId],
    references: [tipoProceso.id],
  }),
  empresa: one(empresa, {
    fields: [proceso.empresaId],
    references: [empresa.id],
  }),
  producto: one(producto, {
    fields: [proceso.productoId],
    references: [producto.id],
  }),
  servicios: many(servicio),
}));

// ─── Servicio ──────────────────────────────────────────────

export const servicio = pgTable("servicio", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresa.id, { onDelete: "cascade" }),
  ubicacionId: uuid("ubicacion_id").references(() => ubicacion.id),
  procesoId: uuid("proceso_id").references(() => proceso.id),
  usaCajas: boolean("usa_cajas").notNull().default(false),
  tipo: text("tipo").notNull(), // 'linea_conteo' | 'maquina_plantacion' | 'estacion_calidad'
  fechaInicio: timestamp("fecha_inicio", { withTimezone: true })
    .notNull()
    .defaultNow(),
  fechaFin: timestamp("fecha_fin", { withTimezone: true }),
});

export const servicioRelations = relations(servicio, ({ one, many }) => ({
  empresa: one(empresa, {
    fields: [servicio.empresaId],
    references: [empresa.id],
  }),
  ubicacion: one(ubicacion, {
    fields: [servicio.ubicacionId],
    references: [ubicacion.id],
  }),
  proceso: one(proceso, {
    fields: [servicio.procesoId],
    references: [proceso.id],
  }),
  loteServicios: many(loteServicio),
  dispositivoServicios: many(dispositivoServicio),
}));

// ─── Producto ──────────────────────────────────────────────

export const producto = pgTable("producto", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").unique().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const productoRelations = relations(producto, ({ many }) => ({
  variedades: many(variedad),
  procesos: many(proceso),
}));

// ─── Variedad ──────────────────────────────────────────────

export const variedad = pgTable(
  "variedad",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nombre: text("nombre").notNull(),
    tipo: text("tipo"),
    productoId: uuid("producto_id")
      .notNull()
      .references(() => producto.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [unique().on(t.nombre, t.productoId)]
);

export const variedadRelations = relations(variedad, ({ one, many }) => ({
  producto: one(producto, {
    fields: [variedad.productoId],
    references: [producto.id],
  }),
  lotes: many(lote),
}));

// ─── Lote ──────────────────────────────────────────────────

export const lote = pgTable("lote", {
  id: uuid("id").primaryKey().defaultRandom(),
  variedadId: uuid("variedad_id").references(() => variedad.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const loteRelations = relations(lote, ({ one, many }) => ({
  variedad: one(variedad, {
    fields: [lote.variedadId],
    references: [variedad.id],
  }),
  loteServicios: many(loteServicio),
  loteSessions: many(loteSession),
}));

// ─── Lote ↔ Servicio (N:N con historial) ──────────────────

export const loteServicio = pgTable(
  "lote_servicio",
  {
    loteId: uuid("lote_id")
      .notNull()
      .references(() => lote.id, { onDelete: "cascade" }),
    servicioId: uuid("servicio_id")
      .notNull()
      .references(() => servicio.id, { onDelete: "cascade" }),
    asignadoAt: timestamp("asignado_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.loteId, t.servicioId] })]
);

export const loteServicioRelations = relations(loteServicio, ({ one }) => ({
  lote: one(lote, {
    fields: [loteServicio.loteId],
    references: [lote.id],
  }),
  servicio: one(servicio, {
    fields: [loteServicio.servicioId],
    references: [servicio.id],
  }),
}));

// ─── Dispositivo ───────────────────────────────────────────

export const dispositivo = pgTable("dispositivo", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").unique().notNull(),
  tipo: text("tipo").notNull().default("nvidia_agx"),
  activo: boolean("activo").default(true),
});

export const dispositivoRelations = relations(dispositivo, ({ many }) => ({
  dispositivoServicios: many(dispositivoServicio),
}));

// ─── Dispositivo ↔ Servicio ────────────────────────────────

export const dispositivoServicio = pgTable(
  "dispositivo_servicio",
  {
    dispositivoId: uuid("dispositivo_id")
      .notNull()
      .references(() => dispositivo.id),
    servicioId: uuid("servicio_id")
      .notNull()
      .references(() => servicio.id),
    maquina: text("maquina"),
    asignadoAt: timestamp("asignado_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.dispositivoId, t.servicioId] })]
);

export const dispositivoServicioRelations = relations(
  dispositivoServicio,
  ({ one }) => ({
    dispositivo: one(dispositivo, {
      fields: [dispositivoServicio.dispositivoId],
      references: [dispositivo.id],
    }),
    servicio: one(servicio, {
      fields: [dispositivoServicio.servicioId],
      references: [servicio.id],
    }),
  })
);

// ─── Lote Session ──────────────────────────────────────────

export const loteSession = pgTable("lote_session", {
  id: uuid("id").primaryKey().defaultRandom(),
  loteId: uuid("lote_id")
    .notNull()
    .references(() => lote.id, { onDelete: "cascade" }),
  dispositivoId: uuid("dispositivo_id")
    .notNull()
    .references(() => dispositivo.id),
  startTime: timestamp("start_time", { withTimezone: true })
    .notNull()
    .defaultNow(),
  endTime: timestamp("end_time", { withTimezone: true }),
});

export const loteSessionRelations = relations(
  loteSession,
  ({ one, many }) => ({
    lote: one(lote, {
      fields: [loteSession.loteId],
      references: [lote.id],
    }),
    cajaLoteSessions: many(cajaLoteSession),
  })
);

// ─── Caja ──────────────────────────────────────────────────

export const caja = pgTable("caja", {
  id: uuid("id").primaryKey().defaultRandom(),
  codigo: text("codigo").unique().notNull(), // QR
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresa.id, { onDelete: "cascade" }),
  tipo: text("tipo").notNull().default("reutilizable"),
  capacidad: integer("capacidad"),
  activa: boolean("activa").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const cajaRelations = relations(caja, ({ one, many }) => ({
  empresa: one(empresa, {
    fields: [caja.empresaId],
    references: [empresa.id],
  }),
  cajaLoteSessions: many(cajaLoteSession),
}));

// ─── Caja ↔ Lote Session ──────────────────────────────────

export const cajaLoteSession = pgTable("caja_lote_session", {
  id: uuid("id").primaryKey().defaultRandom(),
  cajaId: uuid("caja_id")
    .notNull()
    .references(() => caja.id),
  loteSessionId: uuid("lote_session_id")
    .notNull()
    .references(() => loteSession.id, { onDelete: "cascade" }),
  asignadoAt: timestamp("asignado_at", { withTimezone: true }).defaultNow(),
  retiradoAt: timestamp("retirado_at", { withTimezone: true }),
});

export const cajaLoteSessionRelations = relations(
  cajaLoteSession,
  ({ one, many }) => ({
    caja: one(caja, {
      fields: [cajaLoteSession.cajaId],
      references: [caja.id],
    }),
    loteSession: one(loteSession, {
      fields: [cajaLoteSession.loteSessionId],
      references: [loteSession.id],
    }),
    cajaStats: many(cajaStats),
  })
);

// ─── Caja Stats (resumen pre-calculado por caja/dispositivo/calibre) ────

export const cajaStats = pgTable(
  "caja_stats",
  {
    cajaLoteSessionId: uuid("caja_lote_session_id")
      .notNull()
      .references(() => cajaLoteSession.id, { onDelete: "cascade" }),
    dispositivoId: uuid("dispositivo_id")
      .notNull()
      .references(() => dispositivo.id),
    calibre: real("calibre").notNull(),
    countIn: integer("count_in").notNull().default(0),
    countOut: integer("count_out").notNull().default(0),
    firstTs: timestamp("first_ts", { withTimezone: true }),
    lastTs: timestamp("last_ts", { withTimezone: true }),
  },
  (t) => [
    primaryKey({
      columns: [t.cajaLoteSessionId, t.dispositivoId, t.calibre],
    }),
  ]
);

export const cajaStatsRelations = relations(cajaStats, ({ one }) => ({
  cajaLoteSession: one(cajaLoteSession, {
    fields: [cajaStats.cajaLoteSessionId],
    references: [cajaLoteSession.id],
  }),
  dispositivo: one(dispositivo, {
    fields: [cajaStats.dispositivoId],
    references: [dispositivo.id],
  }),
}));

// ─── Lote Stats (resumen pre-calculado por lote/servicio/dispositivo/calibre) ──

export const loteStats = pgTable(
  "lote_stats",
  {
    loteId: uuid("lote_id")
      .notNull()
      .references(() => lote.id, { onDelete: "cascade" }),
    servicioId: uuid("servicio_id")
      .notNull()
      .references(() => servicio.id),
    dispositivoId: uuid("dispositivo_id")
      .notNull()
      .references(() => dispositivo.id),
    calibre: real("calibre").notNull(),
    countIn: integer("count_in").notNull().default(0),
    countOut: integer("count_out").notNull().default(0),
    firstTs: timestamp("first_ts", { withTimezone: true }),
    lastTs: timestamp("last_ts", { withTimezone: true }),
  },
  (t) => [
    primaryKey({
      columns: [t.loteId, t.servicioId, t.dispositivoId, t.calibre],
    }),
  ]
);

// ─── Conteo (tabla de alto volumen) ────────────────────────

export const conteo = pgTable(
  "conteo",
  {
    ts: timestamp("ts", { withTimezone: true }).notNull(),
    servicioId: uuid("servicio_id")
      .notNull()
      .references(() => servicio.id),
    loteId: uuid("lote_id")
      .notNull()
      .references(() => lote.id),
    dispositivoId: uuid("dispositivo_id")
      .notNull()
      .references(() => dispositivo.id),
    cajaLoteSessionId: uuid("caja_lote_session_id").references(
      () => cajaLoteSession.id
    ),
    perimeter: real("perimeter").notNull(),
    direction: smallint("direction").notNull(), // 0 = in, 1 = out
  },
  (t) => [
    index("idx_conteo_lote").on(t.loteId, t.ts),
    index("idx_conteo_servicio").on(t.servicioId, t.ts),
    index("idx_conteo_dispositivo").on(t.dispositivoId, t.ts),
  ]
);
