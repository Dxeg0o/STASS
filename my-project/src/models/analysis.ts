import mongoose from "mongoose";

const analisisSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  empresa_id: { type: String, required: true, ref: "Empresa" },
  fecha_creacion: { type: Date, required: true },
  estado: {
    type: String,
    enum: ["completado", "en_progreso", "pendiente"],
    required: true,
  },
  productos_analizados: { type: [String], required: true },
});

export default mongoose.models.Analisis ||
  mongoose.model("Analisis", analisisSchema);
