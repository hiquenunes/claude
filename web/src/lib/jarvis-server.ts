import { google } from "googleapis";
import { GoogleDrivePort, GoogleSheetsPort, JarvisService, type JarvisRootStructure } from "@jarvis/core";
import { auth } from "@/auth";

// Structure ids (folder/sheet ids) don't change once created, so caching
// them per-user in process memory avoids re-walking the whole Drive tree
// on every request. Safe to lose on a cold start — setup() just re-derives
// the same ids idempotently.
const structureCache = new Map<string, JarvisRootStructure>();

export class NotAuthenticatedError extends Error {
  constructor() {
    super("Sessão não autenticada com o Google.");
  }
}

export async function getJarvisServiceForSession(): Promise<{
  jarvis: JarvisService;
  userEmail: string;
}> {
  const session = await auth();
  if (!session || (!session.accessToken && !session.refreshToken)) {
    throw new NotAuthenticatedError();
  }

  const clientId = requireEnv("AUTH_GOOGLE_ID");
  const clientSecret = requireEnv("AUTH_GOOGLE_SECRET");
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
    expiry_date: session.expiresAt ? session.expiresAt * 1000 : undefined,
  });

  const userEmail = session.user?.email ?? "unknown";
  const cached = structureCache.get(userEmail);

  const jarvis = new JarvisService({
    drive: new GoogleDrivePort(oauth2Client),
    sheets: new GoogleSheetsPort(oauth2Client),
    rootFolderName: process.env.JARVIS_ROOT_FOLDER_NAME || "Jarvis",
    knownStructure: cached,
  });

  if (!cached) {
    const structure = await jarvis.setup();
    structureCache.set(userEmail, structure);
  }

  return { jarvis, userEmail };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente ${name} não configurada. Veja docs/SETUP.md.`);
  }
  return value;
}
