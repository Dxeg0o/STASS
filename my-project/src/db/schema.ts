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
}));

// ─── Usuario ───────────────────────────────────────────────

export const usuario = pgTable("usuario", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  correo: text("correo").unique().notNull(),
  password: text("password").notNull(),
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

// ─── Ubicación ─────────────────────────────────────────────

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

// ─── Servicio ──────────────────────────────────────────────

export const servicio = pgTable("servicio", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresa.id, { onDelete: "cascade" }),
  ubicacionId: uuid("ubicacion_id").references(() => ubicacion.id),
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
  lotes: many(lote),
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
  nombre: text("nombre").notNull(),
  servicioId: uuid("servicio_id")
    .notNull()
    .references(() => servicio.id, { onDelete: "cascade" }),
  variedadId: uuid("variedad_id").references(() => variedad.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const loteRelations = relations(lote, ({ one, many }) => ({
  servicio: one(servicio, {
    fields: [lote.servicioId],
    references: [servicio.id],
  }),
  variedad: one(variedad, {
    fields: [lote.variedadId],
    references: [variedad.id],
  }),
  loteSessions: many(loteSession),
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

export const loteSessionRelations = relations(loteSession, ({ one }) => ({
  lote: one(lote, {
    fields: [loteSession.loteId],
    references: [lote.id],
  }),
}));

// ─── Conteo (tabla de alto volumen) ────────────────────────

// ─── Lote Stats (resumen pre-calculado por lote/dispositivo/calibre) ────────

export const loteStats = pgTable(
  "lote_stats",
  {
    loteId: uuid("lote_id")
      .notNull()
      .references(() => lote.id, { onDelete: "cascade" }),
    dispositivoId: uuid("dispositivo_id")
      .notNull()
      .references(() => dispositivo.id),
    calibre: real("calibre").notNull(),
    countIn: integer("count_in").notNull().default(0),
    countOut: integer("count_out").notNull().default(0),
    firstTs: timestamp("first_ts", { withTimezone: true }),
    lastTs: timestamp("last_ts", { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.loteId, t.dispositivoId, t.calibre] })]
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
    perimeter: real("perimeter").notNull(),
    direction: smallint("direction").notNull(), // 0 = in, 1 = out
  },
  (t) => [
    index("idx_conteo_lote").on(t.loteId, t.ts),
    index("idx_conteo_servicio").on(t.servicioId, t.ts),
    index("idx_conteo_dispositivo").on(t.dispositivoId, t.ts),
  ]
);
