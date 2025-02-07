import mongoose from "mongoose";

const analisisSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    empresaId: { type: String, required: true, ref: "Empresa" },
    fechaCreacion: { type: Date, required: true },
    estado: {
      type: String,
      enum: ["completado", "en_progreso", "pendiente"],
      required: true,
    },
    producto: { type: String, required: true }, // Array de IDs de productos analizados, podría ser solo un producto
  },
  { collection: "Analisis" }
);

export default mongoose.models.Analisis ||
  mongoose.model("Analisis", analisisSchema);
