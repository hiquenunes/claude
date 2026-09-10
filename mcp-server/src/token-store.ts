import { mkdirSync, readFileSync, writeFileSync, existsSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface StoredCredentials {
  refresh_token: string;
  root_folder_name?: string;
  saved_at: string;
}

const CONFIG_DIR = join(homedir(), ".jarvis");
const CREDENTIALS_PATH = join(CONFIG_DIR, "credentials.json");

export function loadCredentials(): StoredCredentials | null {
  if (!existsSync(CREDENTIALS_PATH)) return null;
  try {
    return JSON.parse(readFileSync(CREDENTIALS_PATH, "utf8")) as StoredCredentials;
  } catch {
    return null;
  }
}

export function saveCredentials(creds: StoredCredentials): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CREDENTIALS_PATH, JSON.stringify(creds, null, 2), { mode: 0o600 });
  try {
    chmodSync(CREDENTIALS_PATH, 0o600);
  } catch {
    // best-effort on platforms without POSIX permissions (e.g. some Windows setups)
  }
}

export function credentialsPath(): string {
  return CREDENTIALS_PATH;
}
