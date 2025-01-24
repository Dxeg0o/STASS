import mongoose from "mongoose";

const etiquetaSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  empresaId: { type: String, required: true, ref: "Empresa" },
  titulo: { type: String, required: true },
  valores: { type: [String], required: true },
  fechaCreacion: { type: Date, required: true },
});

export default mongoose.models.Etiqueta ||
  mongoose.model("Etiqueta", etiquetaSchema);
