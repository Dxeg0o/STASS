import mongoose, { Document, Model } from "mongoose";

export interface LoteDocument extends Document {
  nombre: string;
  fechaCreacion: Date;
  servicioId: string;
}

const LoteSchema = new mongoose.Schema<LoteDocument>({
  nombre: {
    type: String,
    required: true,
  },
  fechaCreacion: {
    type: Date,
    required: true,
    default: (): Date => new Date(),
  },
  // servicioId es un string que referencia a Servicio._id
  servicioId: {
    type: String,
    ref: "Servicio",
    required: true,
  },
});

// Modelo llamado "Lote", tipado con LoteDocument
export const Lote: Model<LoteDocument> =
  mongoose.models.Lote || mongoose.model<LoteDocument>("Lote", LoteSchema);
