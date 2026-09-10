export class JarvisError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "JarvisError";
  }
}

export class NotFoundError extends JarvisError {
  constructor(message: string) {
    super(message, "not_found");
    this.name = "NotFoundError";
  }
}

export class AmbiguousClientError extends JarvisError {
  constructor(public readonly candidates: { client_id: string; name: string }[]) {
    super(
      `Mais de um cliente corresponde à busca: ${candidates.map((c) => c.name).join(", ")}`,
      "ambiguous_client"
    );
    this.name = "AmbiguousClientError";
  }
}

export class ConflictError extends JarvisError {
  constructor(message: string) {
    super(message, "conflict");
    this.name = "ConflictError";
  }
}

export class PermissionError extends JarvisError {
  constructor(message: string) {
    super(message, "permission_denied");
    this.name = "PermissionError";
  }
}

export class ValidationError extends JarvisError {
  constructor(message: string) {
    super(message, "invalid_input");
    this.name = "ValidationError";
  }
}
