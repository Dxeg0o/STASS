import mongoose from "mongoose";

const prediccionSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    analisisId: { type: String, required: true, ref: "Analisis" },
    atributos: {
      tamaño: { type: String, required: true },
      color: { type: String, required: true },
    },
    fecha: { type: Date, required: true },
    resultado: { type: String, enum: ["apto", "no apto"], required: true },
    subetiquetas: [
      {
        subetiquetaId: { type: String, required: true, ref: "Subetiqueta" },
      },
    ],
  },
  { collection: "Predicciones" }
);

export default mongoose.models.Prediccion ||
  mongoose.model("Prediccion", prediccionSchema);
