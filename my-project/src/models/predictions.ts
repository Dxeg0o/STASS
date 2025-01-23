import mongoose from "mongoose";

const prediccionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  analisis_id: { type: String, required: true, ref: "Analisis" },
  atributos: {
    tamaño: { type: String, required: true },
    color: { type: String, required: true },
  },
  fecha: { type: Date, required: true },
  resultado: { type: String, enum: ["apto", "no apto"], required: true },
  etiquetas: [
    {
      etiqueta_id: { type: String, required: true, ref: "Etiqueta" },
      valor: { type: String, required: true },
    },
  ],
});

export default mongoose.models.Prediccion ||
  mongoose.model("Prediccion", prediccionSchema);
