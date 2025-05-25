// models/loteactivity.ts
import mongoose, { Schema, Document, models, model } from "mongoose";

export interface LoteActivityDoc extends Document {
  loteId: mongoose.Types.ObjectId;
  startTime: Date;
  endTime: Date | null;
}

const LoteActivitySchema = new Schema<LoteActivityDoc>({
  loteId: { type: Schema.Types.ObjectId, ref: "Lote", required: true },
  startTime: { type: Date, default: () => new Date() },
  endTime: { type: Date, default: null },
});

export const LoteActivity =
  models.LoteActivity ||
  model<LoteActivityDoc>("LoteActivity", LoteActivitySchema);
