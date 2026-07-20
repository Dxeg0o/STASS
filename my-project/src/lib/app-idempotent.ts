// La app es offline-first: encola escrituras localmente con un id generado
// en el cliente y reintenta si no recibió confirmación (ver
// qualiblick-app/lib/services/offline_repository.dart). Eso significa que el
// mismo POST puede llegar dos veces con el mismo id — no es un error, es el
// caso normal de "se cortó la red justo después de que el servidor guardó
// pero antes de que la respuesta llegara". Los endpoints de creación deben
// tratar un choque de primary key como éxito idempotente, no como 500.

export function isUniqueViolation(e: unknown): boolean {
  const cause = (e as { cause?: { code?: string } } | undefined)?.cause;
  return cause?.code === "23505";
}
