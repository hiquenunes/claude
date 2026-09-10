import { JarvisError } from "@jarvis/core";
import { NotAuthenticatedError } from "./jarvis-server";

export interface DisplayError {
  code: string;
  message: string;
  candidates?: { client_id: string; name: string }[];
}

export function describeError(err: unknown): DisplayError {
  if (err instanceof NotAuthenticatedError) {
    return { code: "not_authenticated", message: "Sessão expirada. Faça login novamente." };
  }
  if (err instanceof JarvisError) {
    const candidates = "candidates" in err ? (err as { candidates: DisplayError["candidates"] }).candidates : undefined;
    return { code: err.code, message: err.message, candidates };
  }
  return {
    code: "internal_error",
    message: err instanceof Error ? err.message : "Erro desconhecido.",
  };
}
