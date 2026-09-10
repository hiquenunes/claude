import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { REQUIRED_SCOPES } from "@jarvis/core";
import { loadCredentials, saveCredentials, credentialsPath } from "./token-store.js";

export const LOCAL_REDIRECT_PORT = 53682;
export const LOCAL_REDIRECT_URI = `http://127.0.0.1:${LOCAL_REDIRECT_PORT}/oauth/callback`;

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variável de ambiente ${name} não definida. Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET (veja docs/SETUP.md).`
    );
  }
  return value;
}

export function newOAuthClient(): OAuth2Client {
  const clientId = requireEnv("GOOGLE_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");
  return new google.auth.OAuth2(clientId, clientSecret, LOCAL_REDIRECT_URI);
}

export function buildAuthUrl(client: OAuth2Client): string {
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force a refresh_token even on re-authorization
    scope: REQUIRED_SCOPES,
  });
}

/**
 * Returns an OAuth2Client ready for API calls, using the refresh token saved
 * by `jarvis-authorize`. Throws a clear, actionable error if setup hasn't
 * run yet — never falls back to any unauthenticated or shared credential.
 */
export function getAuthorizedClient(): OAuth2Client {
  const creds = loadCredentials();
  if (!creds) {
    throw new Error(
      `Jarvis ainda não está autorizado a acessar seu Google Drive. Rode "npx jarvis-authorize" uma vez e siga as instruções (veja docs/SETUP.md). Nenhum dado foi lido ou gravado.`
    );
  }
  const client = newOAuthClient();
  client.setCredentials({ refresh_token: creds.refresh_token });

  // Google occasionally rotates the refresh token; persist it if that happens.
  client.on("tokens", (tokens) => {
    if (tokens.refresh_token) {
      saveCredentials({ refresh_token: tokens.refresh_token, saved_at: new Date().toISOString() });
    }
  });

  return client;
}

export function describeCredentialsLocation(): string {
  return credentialsPath();
}
