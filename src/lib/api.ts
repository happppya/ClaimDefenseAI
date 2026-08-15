export type StartPayload = {
  patient_name: string;
  denial_reason: string;
  provider: string;
};

export type Source = {
  source: string;
  full_source: string;
  page: string | number;
  preview: string;
  content: string;
};

export type Message = { role: "user" | "assistant"; content: string; draft?: string | null; sources?: Source[] };

export type StartResult = {
  session_id: string;
  provider: string;
  cpts: string[];
  claim_number: string | null;
  reply: string;
  draft: string | null;
  sources: Source[];
  messages: Message[];
};

export type FollowResult = {
  reply: string;
  draft: string | null;
  sources: Source[];
  messages: Message[];
  provider: string;
  cpts: string[];
  claim_number: string | null;
};

export type PdfExtractResult = {
  text: string;
  chars: number;
  pages: number;
  cpts: string[];
  claim_number: string | null;
  filename: string;
};

export async function apiStart(payload: StartPayload): Promise<StartResult> {
  const res = await fetch("/api/appeal/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to start appeal");
  return data as StartResult;
}

export async function apiFollowup(session_id: string, message: string): Promise<FollowResult> {
  const res = await fetch(`/api/appeal/${session_id}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id, message }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Followup failed");
  return data as FollowResult;
}

export async function apiHealth() {
  const res = await fetch("/api/health");
  return res.json() as Promise<{ status: string; has_mistral_key: boolean; has_vector_db: boolean; providers: string[] }>;
}

export async function apiDemoDenial(): Promise<string> {
  const res = await fetch("/api/demo-denial");
  const j = await res.json();
  return j.text || "";
}

export async function apiExtractPdf(file: File): Promise<PdfExtractResult> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/extract-pdf", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "PDF extraction failed");
  return data as PdfExtractResult;
}
