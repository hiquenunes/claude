import { v4 as uuidv4 } from "uuid";

export function newId(prefix: string): string {
  return `${prefix}_${uuidv4()}`;
}

/**
 * Deterministic idempotency key so the same logical write (same source, same
 * target record, same content-affecting inputs) collapses to one operation
 * even if the caller retries after a timeout.
 */
export function idempotencyKey(parts: (string | undefined)[]): string {
  return parts.filter((p): p is string => Boolean(p)).join("::");
}
