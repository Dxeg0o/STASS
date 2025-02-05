import mongoose from "mongoose";

const subetiquetaSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  etiquetaId: { type: String, required: true, ref: "Etiqueta" },
  valor: { type: String, required: true },
  fechaCreacion: { type: Date, required: true },
});

export default mongoose.models.Subetiqueta ||
  mongoose.model("Subetiqueta", subetiquetaSchema);
