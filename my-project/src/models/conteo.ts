import { Schema, Document, models, model } from "mongoose";

export interface ConteoDoc extends Document {
  id: number;
  perimeter: number;
  direction: "in" | "out";
  timestamp: Date;
  dispositivo: string;
  servicioId: string;
}

const ConteoSchema = new Schema<ConteoDoc>({
  id: { type: Number, required: true },
  perimeter: { type: Number, required: true },
  direction: { type: String, enum: ["in", "out"], required: true },
  timestamp: { type: Date, required: true, default: () => new Date() },
  dispositivo: { type: String, required: true },
  servicioId: { type: String, required: true },
});

// Índices para mejorar rendimiento en consultas frecuentes
ConteoSchema.index({ timestamp: -1 });
ConteoSchema.index({ direction: 1 });
ConteoSchema.index({ dispositivo: 1 });
ConteoSchema.index({ servicioId: 1, timestamp: -1 });

export const Conteo = models.Conteo || model<ConteoDoc>("Conteo", ConteoSchema);
