import mongoose from "mongoose";

const prediccionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  analisis_id: { type: String, required: true, ref: "Analisis" },
  producto: { type: String, required: true },
  atributos: {
    tamaño: { type: String, required: true },
    color: { type: String, required: true },
    peso: { type: Number, required: true },
    defecto_detectado: { type: Boolean, required: true },
  },
  fecha: { type: Date, required: true },
  resultado: { type: String, enum: ["apto", "defectuoso"], required: true },
  etiquetas: [
    {
      etiqueta_id: { type: String, required: true, ref: "Etiqueta" },
      valor: { type: String, required: true },
    },
  ],
});

// Verifica si el modelo ya está registrado o crea uno nuevo
const Prediccion =
  mongoose.models.Prediccion || mongoose.model("Prediccion", prediccionSchema);

export default Prediccion;
