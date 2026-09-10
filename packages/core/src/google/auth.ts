import { google } from "googleapis";

export interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number; // epoch ms
}

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
}

/**
 * Builds an OAuth2 client carrying the given tokens. Callers (web app,
 * MCP server) own how tokens are persisted and refreshed on their side;
 * this factory just wires them into a googleapis-ready client for one
 * request/session.
 */
export function buildOAuthClient(config: GoogleOAuthConfig, tokens: GoogleTokens) {
  const client = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
  client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiryDate,
  });
  return client;
}

export const REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/documents",
  "openid",
  "email",
  "profile",
];
