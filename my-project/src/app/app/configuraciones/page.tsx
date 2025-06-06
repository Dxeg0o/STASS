"use client";

import { useContext, useState } from "react";
import { AuthenticationContext } from "@/app/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ConfiguracionesPage() {
  const { data, setAuthState } = useContext(AuthenticationContext);
  const [name, setName] = useState(data?.name || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/users/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: name }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.errorMessage || "Error al actualizar");
      }

      const updated = await res.json();
      setMessage("Nombre actualizado");
      setAuthState?.((prev) => ({
        ...prev,
        data: prev.data ? { ...prev.data, name: updated.name } : prev.data,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Configuraciones</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Nombre de usuario
          </label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-white"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Guardar"}
        </Button>
      </form>
    </div>
  );
}
