import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  nombre: { type: String, required: true },
  correo: { type: String, required: true, unique: true },
  empresa_id: { type: String, required: true, ref: "Empresa" },
  rol: { type: String, enum: ["administrador", "usuario"], required: true },
  fecha_registro: { type: Date, required: true },
  invitado_por: { type: String, ref: "Usuario" },
  contraseña: { type: String, required: true }, // Nueva propiedad
});

export default mongoose.models.User || mongoose.model("User", userSchema);
