import { Schema, Document, models, model } from "mongoose";

export interface ServicioDoc extends Document {
  nombre: string;
  empresaId: string;
}

const ServicioSchema = new Schema<ServicioDoc>({
  nombre: { type: String, required: true },
  empresaId: { type: String, required: true },
});

export const Servicio = models.Servicio || model<ServicioDoc>("Servicio", ServicioSchema);
