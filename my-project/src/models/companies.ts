import mongoose from "mongoose";

const empresaSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  nombre: { type: String, required: true },
  pais: { type: String, required: true },
  fecha_registro: { type: Date, required: true },
});

export default mongoose.models.Empresa ||
  mongoose.model("Empresa", empresaSchema);
