"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Shield, UserPlus, AlertCircle } from "lucide-react";

interface InvitationData {
  empresaId: string;
  empresaNombre: string;
  rol: string;
  expiresAt: string | null;
}

export default function RegistroInvitacionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registering, setRegistering] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No se proporcionó un token de invitación.");
      setLoading(false);
      return;
    }
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const res = await axios.get(`/api/invitations/${token}`);
      setInvitation(res.data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || "Invitación inválida.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setFormError("");

    if (!nombre.trim() || !correo.trim() || !password) {
      setFormError("Todos los campos son obligatorios.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 6) {
      setFormError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setRegistering(true);
    try {
      await axios.post("/api/auth/signup", {
        nombre,
        correo,
        contraseña: password,
        invitationToken: token,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setFormError(axiosErr.response?.data?.error || "Error al registrar.");
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-full max-w-md space-y-4">
          <div className="h-8 w-48 bg-slate-800 animate-pulse rounded mx-auto" />
          <div className="h-96 bg-slate-800 animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-900/60 border-white/10">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Invitación Inválida</h2>
            <p className="text-slate-400 mb-6">{error}</p>
            <Button
              onClick={() => router.push("/login")}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
            >
              Ir al Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-900/60 border-white/10">
          <CardContent className="py-12 text-center">
            <UserPlus className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Registro Exitoso</h2>
            <p className="text-slate-400 mb-6">
              Tu cuenta ha sido creada y asignada a <strong className="text-white">{invitation?.empresaNombre}</strong> como <strong className="text-white">{invitation?.rol}</strong>.
            </p>
            <Button
              onClick={() => router.push("/login")}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
            >
              Iniciar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900/60 border-white/10">
        <CardHeader className="text-center">
          <CardTitle className="text-white text-xl flex items-center justify-center gap-2">
            <UserPlus className="w-6 h-6 text-amber-400" />
            Registro por Invitación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invitation info */}
          <div className="bg-slate-800/60 rounded-lg p-4 border border-white/10 space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-400">Empresa:</span>
              <span className="text-white font-medium">{invitation?.empresaNombre}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-400">Rol:</span>
              <Badge className={invitation?.rol === "administrador" ? "bg-amber-500/20 text-amber-400 text-xs" : "bg-slate-700/50 text-slate-300 text-xs"}>
                {invitation?.rol}
              </Badge>
            </div>
            {invitation?.expiresAt && (
              <p className="text-xs text-slate-500">
                Vence: {new Date(invitation.expiresAt).toLocaleString("es-CL")}
              </p>
            )}
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Nombre Completo</label>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre completo"
                className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-600"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Correo Electrónico</label>
              <Input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="tu@correo.com"
                className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-600"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Contraseña</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-600"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Confirmar Contraseña</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite tu contraseña"
                className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-600"
              />
            </div>
          </div>

          {formError && (
            <p className="text-red-400 text-sm bg-red-950/30 border border-red-500/20 rounded-lg p-3">
              {formError}
            </p>
          )}

          <Button
            onClick={handleRegister}
            disabled={registering}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
          >
            {registering ? "Registrando..." : "Crear Cuenta"}
          </Button>

          <p className="text-center text-sm text-slate-500">
            ¿Ya tienes cuenta?{" "}
            <button onClick={() => router.push("/login")} className="text-amber-400 hover:text-amber-300">
              Iniciar Sesión
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
