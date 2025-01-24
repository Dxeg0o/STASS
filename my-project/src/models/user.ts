import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  nombre: { type: String, required: true },
  correo: { type: String, required: true, unique: true },
  empresaId: { type: String, required: true, ref: "Empresa" },
  rol: { type: String, enum: ["administrador", "usuario"], required: true },
  fechaRegistro: { type: Date, required: true },
  invitadoPor: { type: String, ref: "Usuario" },
  contraseña: { type: String, required: true }, // Nueva propiedad
});

export default mongoose.models.User || mongoose.model("User", userSchema);
