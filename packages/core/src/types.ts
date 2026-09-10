// Domain types per the Jarvis data schema.
// Dates are ISO 8601 strings. Timezone for display is configurable (default America/Sao_Paulo);
// storage keeps ISO instants/dates as given by the source, never silently coerced to UTC-as-business-time.

export type Timezone = string; // IANA tz name, e.g. "America/Sao_Paulo"

export interface ClientRecord {
  client_id: string;
  name: string;
  aliases: string[];
  segment?: string;
  status: "ativo" | "pausado" | "encerrado";
  sites: string[];
  social_profiles: string[];
  timezone: Timezone;
  currency: string; // ISO 4217, e.g. "BRL"
  current_objective?: string;
  main_kpis: string[];
  folder_id?: string; // Drive folder id for this client
  memory_sheet_id?: string; // Drive spreadsheet id holding this client's memory rows
  sources_sheet_id?: string;
  external_accounts: Record<string, string>; // e.g. { reportei_project_id: "...", granola_folder: "..." }
  created_at: string;
  updated_at: string;
}

export type MemoryScope = "global" | "client";

export type MemoryType =
  | "preferencia"
  | "fato"
  | "objetivo"
  | "restricao"
  | "decisao"
  | "hipotese"
  | "correcao";

export type MemoryStatus = "vigente" | "pendente_confirmacao" | "substituido" | "arquivado";

export interface MemoryRecord {
  memory_id: string;
  scope: MemoryScope;
  client_id?: string; // required when scope === "client"
  type: MemoryType;
  content: string;
  status: MemoryStatus;
  source?: string; // free-text or source_id reference
  record_date: string; // when this record was written
  valid_from?: string; // when the fact/decision took effect
  updated_at: string;
  supersedes?: string; // memory_id of the record this one replaces
  superseded_by?: string; // memory_id of the record that replaced this one
}

export interface SourceRecord {
  source_id: string;
  client_id: string;
  provider: string; // "granola" | "reportei" | "manual" | "site" | ...
  external_id?: string;
  url?: string;
  event_date?: string;
  import_date: string;
  period_start?: string;
  period_end?: string;
  version_or_hash?: string;
  evidence_location?: string; // e.g. link to Drive file/section
}

export type DeliverableType =
  | "reuniao"
  | "relatorio"
  | "mensagem_whatsapp"
  | "pesquisa"
  | "outro";

export type GenerationState = "gerado" | "parcial" | "falhou";
export type PersistenceState = "salvo" | "pendente" | "falhou";

export interface DeliverableRecord {
  artifact_id: string;
  client_id: string;
  type: DeliverableType;
  source_ids: string[];
  period_start?: string;
  period_end?: string;
  content?: string; // inline content (e.g. WhatsApp message text)
  link?: string; // Drive link when persisted as a file
  generation_state: GenerationState;
  persistence_state: PersistenceState;
  created_at: string;
}

export type TaskStatus = "aberta" | "em_andamento" | "concluida" | "cancelada";

export interface TaskRecord {
  task_id: string;
  client_id: string;
  description: string;
  origin: string; // e.g. "reuniao:2026-09-08" or "manual"
  owner?: string; // only when explicitly mentioned
  due_date?: string; // only when explicitly mentioned
  status: TaskStatus;
  updated_at: string;
}

export type OperationState = "pendente" | "concluida" | "falhou";

export interface OperationRecord {
  operation_id: string;
  idempotency_key: string;
  type: string; // e.g. "save_memory_change" | "upsert_task" | "save_deliverable" | "setup"
  client_id?: string;
  state: OperationState;
  affected_records: string[]; // ids touched
  created_at: string;
  updated_at: string;
  error?: string; // sanitized, no secrets
}
