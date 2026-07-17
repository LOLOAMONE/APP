import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** Enveloppe un handler de route API : traduit les erreurs d'auth/validation connues en réponses HTTP propres. */
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof Error && err.message === "UNAUTHENTICATED") {
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
      }
      if (err instanceof Error && err.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
      }
      if (err instanceof Error && err.message === "NO_ACTIVE_RESTAURANT") {
        return NextResponse.json({ error: "Aucun restaurant actif sélectionné" }, { status: 409 });
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: "Données invalides", details: err.flatten() },
          { status: 400 }
        );
      }
      console.error(err);
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
  };
}
