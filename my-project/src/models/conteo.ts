import { Schema, Document, models, model } from "mongoose";

export interface ConteoDoc extends Document {
  timestamp: Date;
  countIn: number;
  countOut: number;
  dispositivo: string;
  servicioId: string;
}

const ConteoSchema = new Schema<ConteoDoc>({
  timestamp: { type: Date, required: true, default: () => new Date() },
  countIn: { type: Number, required: true },
  countOut: { type: Number, required: true },
  dispositivo: { type: String, required: true },
  servicioId: { type: String, required: true },
});

// Índice para mejorar rendimiento en consultas por fecha
ConteoSchema.index({ timestamp: -1 });

export const Conteo = models.Conteo || model<ConteoDoc>("Conteo", ConteoSchema);
