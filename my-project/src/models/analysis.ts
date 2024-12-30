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
  producto: { type: String, required: true }, // Array de IDs de productos analizados, podría ser solo un producto
});

export default mongoose.models.Analisis ||
  mongoose.model("Analisis", analisisSchema);
