import { useEffect, useRef, useState, useMemo } from "react";
import {
  ShieldCheck,
  Search,
  Sparkles,
  Download,
  Copy,
  Check,
  FileText,
  AlertTriangle,
  ExternalLink,
  Trash2,
  Send,
  Loader2,
  Quote,
  FileUp,
  X,
  Hash,
  History,
  PanelLeft,
  PanelRight,
  Plus,
  Upload,
} from "lucide-react";
import { apiDemoDenial, apiExtractPdf, apiFollowup, apiHealth, apiStart, type Message, type Source } from "../lib/api";
import { Button } from "../components/ui/Button";

type Phase = "intake" | "workspace";

const PROVIDERS = [
  { v: "auto-detect", label: "Auto-Detect" },
  { v: "medicare", label: "Medicare" },
  { v: "aetna", label: "Aetna" },
  { v: "cigna", label: "Cigna" },
  { v: "unitedhealthcare", label: "UnitedHealthcare" },
  { v: "bluecross", label: "Blue Cross" },
];

type HistoryEntry = { id: string; patient: string; provider: string; cpts: string[]; at: number };

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const HISTORY_KEY = "claimdefense_history_v1";

export function AppPage() {
  const [phase, setPhase] = useState<Phase>("intake");
  const [health, setHealth] = useState<{ has_mistral_key: boolean; has_vector_db: boolean } | null>(null);
  const [patientName, setPatientName] = useState("");
  const [provider, setProvider] = useState("auto-detect");
  const [denialReason, setDenialReason] = useState("");
  const [starting, setStarting] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfMeta, setPdfMeta] = useState<{ filename: string; pages: number; cpts: string[]; claim_number: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [detectedProvider, setDetectedProvider] = useState<string | null>(null);
  const [detectedCpts, setDetectedCpts] = useState<string[]>([]);
  const [claimNumber, setClaimNumber] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [followInput, setFollowInput] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const endRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    apiHealth().then(setHealth).catch(() => {});
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 12)));
    } catch {}
  }, [history]);

  useEffect(() => {
    // scroll chat to bottom - container scroll
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    } else {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, sending]);

  // auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 128) + "px";
    }
  }, [followInput]);

  const latestDraft = useMemo(() => [...messages].reverse().find((m) => m.role === "assistant" && m.draft)?.draft || null, [messages]);
  const textareaCpts = useMemo(() => {
    const m = denialReason.match(/CPT\s*[:\-]?\s*(\d{5})\b/gi);
    if (m) return m.map((x) => x.replace(/\D/g, "").slice(-5)).slice(0, 4);
    const cand = denialReason.match(/\b\d{5}\b/g);
    if (!cand) return [];
    return cand.filter((c) => !c.startsWith("19") && !c.startsWith("20")).slice(0, 4);
  }, [denialReason]);

  async function handleUseDemo() {
    try {
      const t = await apiDemoDenial();
      if (t) {
        setDenialReason(t);
        setPatientName((p) => p || "John Doe");
        setProvider("medicare");
        setPdfMeta(null);
        setError(null);
      }
    } catch {}
  }

  async function handlePdfPick(file: File) {
    setError(null);
    setPdfBusy(true);
    try {
      const r = await apiExtractPdf(file);
      setDenialReason(r.text);
      setPdfMeta({ filename: r.filename, pages: r.pages, cpts: r.cpts, claim_number: r.claim_number });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "PDF extraction failed");
    } finally {
      setPdfBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleStart() {
    setError(null);
    if (!patientName.trim() || !denialReason.trim()) {
      setError("Please fill in Patient identifier and paste or upload the denial letter.");
      return;
    }
    if (denialReason.trim().length < 30) {
      setError("Please paste more of the denial letter (at least a couple sentences) so we can retrieve the right policy.");
      return;
    }
    setStarting(true);
    try {
      const res = await apiStart({ patient_name: patientName.trim(), denial_reason: denialReason.trim(), provider });
      setSessionId(res.session_id);
      setDetectedProvider(res.provider);
      setDetectedCpts(res.cpts || []);
      setClaimNumber(res.claim_number || null);
      setMessages(res.messages);
      setSources(res.sources);
      setPhase("workspace");
      setHistory((h) => [{ id: res.session_id, patient: patientName.trim(), provider: res.provider, cpts: res.cpts || [], at: Date.now() }, ...h].slice(0, 12));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to start appeal";
      setError(msg);
    } finally {
      setStarting(false);
    }
  }

  async function handleFollow() {
    if (!sessionId || !followInput.trim() || sending) return;
    const text = followInput.trim();
    setFollowInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setSending(true);
    try {
      const res = await apiFollowup(sessionId, text);
      setMessages(res.messages);
      setSources(res.sources);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Follow-up failed";
      setError(msg);
    } finally {
      setSending(false);
    }
  }

  function handleNewAppeal() {
    setPhase("intake");
    setSessionId(null);
    setDetectedProvider(null);
    setDetectedCpts([]);
    setClaimNumber(null);
    setMessages([]);
    setSources([]);
    setFollowInput("");
    setError(null);
    setPdfMeta(null);
  }

  function clearDenial() {
    setDenialReason("");
    setPdfMeta(null);
    setError(null);
  }

  const canStart = patientName.trim().length > 0 && denialReason.trim().length >= 30 && !starting && !pdfBusy;

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col overflow-hidden bg-[#0B0B0F]">
      {/* subheader */}
      <div className="flex h-[44px] shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[#0E0E14] px-3 sm:px-4">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {phase === "workspace" && (
            <>
              <button
                onClick={() => setLeftOpen((v) => !v)}
                className="hidden h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 lg:inline-flex"
                title={leftOpen ? "Hide history" : "Show history"}
              >
                <PanelLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setMobileHistoryOpen(true)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 lg:hidden"
              >
                <History className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold tracking-widest text-zinc-300 sm:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> CLAIMDEFENSE WORKSPACE
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2 py-1 text-[11px] font-semibold tracking-widest text-zinc-400 sm:hidden">
            WORKSPACE
          </span>
          {phase === "workspace" && detectedProvider && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[11px] font-bold tracking-widest text-emerald-300">
              {detectedProvider.toUpperCase()}
            </span>
          )}
          {phase === "workspace" && detectedCpts.length > 0 && (
            <span className="hidden items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[11px] font-semibold text-zinc-200 sm:inline-flex">
              <Hash className="h-3 w-3" /> {detectedCpts.slice(0, 3).map((c) => `CPT ${c}`).join(" · ")}
            </span>
          )}
          {phase === "workspace" && claimNumber && (
            <span className="hidden rounded-full bg-white/10 px-2 py-1 text-[11px] font-semibold text-zinc-300 lg:inline">
              Claim {claimNumber}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <span
            className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline-flex ${
              health?.has_mistral_key ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"
            }`}
          >
            ● {health?.has_mistral_key ? "Mistral OK" : "Set MISTRAL_API_KEY"}
          </span>
          <span
            className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold lg:inline-flex ${
              health?.has_vector_db ? "bg-white/10 text-zinc-200" : "bg-amber-500/15 text-amber-300"
            }`}
          >
            ● {health?.has_vector_db ? "Policy DB ready" : "DB missing"}
          </span>
          {/* quick stats */}
          {phase === "workspace" && sources.length > 0 && (
            <span className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-300 sm:inline-flex">
              <Search className="h-3 w-3" /> {sources.length} sources
            </span>
          )}
          {phase === "workspace" && (
            <>
              <button
                onClick={() => setRightOpen((v) => !v)}
                className="hidden h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 lg:inline-flex"
                title={rightOpen ? "Hide document" : "Show document"}
              >
                <PanelRight className="h-4 w-4" />
              </button>
              <button
                onClick={handleNewAppeal}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-zinc-100"
              >
                <Plus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">New appeal</span>
                <span className="sm:hidden">New</span>
              </button>
            </>
          )}
        </div>
      </div>

      {phase === "intake" ? (
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 sm:py-10">
            <div className="mx-auto max-w-[720px] text-center">
              <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">New appeal</h1>
              <p className="mt-2 text-zinc-400">
                Paste the denial, upload a PDF, or try the demo. We&apos;ll retrieve the policy and draft a cited letter you can refine by chat.
              </p>
            </div>

            <div className="mx-auto mt-8 grid max-w-[980px] gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              {/* intake form */}
              <div className="rounded-2xl border border-white/10 bg-[#14141B] p-5 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold tracking-widest text-zinc-500">INTAKE</div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handlePdfPick(f);
                      }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={pdfBusy}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/10 disabled:opacity-50"
                    >
                      {pdfBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}{" "}
                      {pdfBusy ? "Extracting…" : "Upload PDF"}
                    </button>
                    <button
                      onClick={handleUseDemo}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-zinc-100"
                    >
                      <Quote className="h-3.5 w-3.5" /> Try demo
                    </button>
                  </div>
                </div>

                {pdfMeta && (
                  <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs">
                    <span className="flex flex-wrap items-center gap-1.5 font-medium text-emerald-200">
                      <Upload className="h-3.5 w-3.5" /> {pdfMeta.filename} • {pdfMeta.pages} pages{" "}
                      {pdfMeta.cpts.length ? `• CPT ${pdfMeta.cpts.join(", ")}` : ""}{" "}
                      {pdfMeta.claim_number ? `• Claim ${pdfMeta.claim_number}` : ""}
                    </span>
                    <button onClick={clearDenial} className="shrink-0 text-emerald-200 hover:text-white">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {!health?.has_mistral_key && (
                  <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-100">
                    <span className="font-semibold text-amber-200">MISTRAL_API_KEY not set</span> — the backend will return 503 until you add it
                    to <span className="font-mono">.env</span> and restart <span className="font-mono">sh scripts/start.sh</span> (or set it in
                    hosting env vars for production).
                  </div>
                )}

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <label className="col-span-1 space-y-1.5">
                    <span className="text-xs font-medium tracking-wide text-zinc-400">Patient identifier</span>
                    <input
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="e.g., John Doe"
                      className="w-full rounded-xl border border-white/10 bg-[#1B1B22] px-3.5 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-accent focus:outline-none"
                    />
                  </label>
                  <label className="col-span-1 space-y-1.5">
                    <span className="text-xs font-medium tracking-wide text-zinc-400">Insurance provider</span>
                    <select
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#1B1B22] px-3.5 py-3 text-sm text-white focus:border-accent focus:outline-none"
                    >
                      {PROVIDERS.map((p) => (
                        <option key={p.v} value={p.v}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="mt-4 block space-y-1.5">
                  <span className="flex items-center justify-between text-xs font-medium tracking-wide text-zinc-400">
                    <span>Denial letter text — paste full content or upload PDF</span>
                    {textareaCpts.length > 0 && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-zinc-300">
                        {textareaCpts.map((c) => `CPT ${c}`).join(" · ")}
                      </span>
                    )}
                  </span>
                  <textarea
                    value={denialReason}
                    onChange={(e) => setDenialReason(e.target.value)}
                    rows={9}
                    placeholder="Paste the entire denial letter here… Include reason for denial, CPT codes, dates, and clinical review reference if present. Or use Upload PDF above (scanned image PDFs are not supported — paste text instead)."
                    className="w-full resize-y rounded-xl border border-white/10 bg-[#1B1B22] px-3.5 py-3 text-sm leading-relaxed text-white placeholder:text-zinc-500 focus:border-accent focus:outline-none"
                  />
                  <span className="flex items-center justify-between text-xs text-zinc-500">
                    <span>{denialReason.length.toLocaleString()} chars • need ≥ 30</span>
                    {denialReason.length > 0 && (
                      <button onClick={clearDenial} className="inline-flex items-center gap-1 text-zinc-400 hover:text-white">
                        <X className="h-3 w-3" /> Clear
                      </button>
                    )}
                  </span>
                </label>

                {error && (
                  <div className="mt-4 flex gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-sm leading-relaxed text-amber-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
                  </div>
                )}

                <Button onClick={handleStart} disabled={!canStart} className="mt-5 w-full gap-2">
                  {starting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Drafting cited appeal…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Initialize agent
                    </>
                  )}
                </Button>
                <p className="mt-2 text-center text-xs leading-relaxed text-zinc-500">
                  Temperature 0.0 • Will ask ONE clarifying question if info is missing, otherwise drafts with &lt;FINAL_LETTER&gt;.
                </p>
                <p className="mt-1 text-center text-xs text-zinc-600">
                  PDF upload extracts text locally on the server (max 6MB, 20 pages). Scanned/image-only PDFs cannot be read — paste instead.
                </p>
              </div>

              {/* helper / what happens */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
                  <h3 className="font-semibold tracking-tight">What happens next</h3>
                  <ol className="mt-4 space-y-4">
                    {[
                      {
                        t: "Auto-detect payer + retrieve policy",
                        d: "We map the letter to aetna/cigna/UHC/BCBS/medicare (or your override) then filtered-RAG 4 best excerpts.",
                        icon: Search,
                      },
                      {
                        t: "Agentic draft (cited)",
                        d: "Mistral-small cites exact policy + page. If context is thin, it asks ONE question before drafting.",
                        icon: FileText,
                      },
                      {
                        t: "Chat to refine + download",
                        d: "Follow-ups keep the same RAG context. When satisfied, download the final letter as .txt.",
                        icon: Download,
                      },
                    ].map((s) => (
                      <li key={s.t} className="flex gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                          <s.icon className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="text-sm font-medium text-white">{s.t}</div>
                          <div className="text-sm leading-relaxed text-zinc-400">{s.d}</div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] p-4 text-sm leading-relaxed text-zinc-300">
                  <div className="font-semibold text-emerald-200">Tip: Paste the whole letter</div>
                  The more reason text you include (CPT, denial rationale, clinical references), the better the retrieval. The demo in{" "}
                  <span className="font-mono text-xs text-zinc-200">notes/denied.md</span> is a good example — “Try demo” loads it.
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm leading-relaxed text-zinc-400">
                  <div className="font-medium text-white">Upload vs paste</div>
                  Upload works for text-based PDFs exported from your payer portal/EHR. If the letter was scanned or photographed, paste the text
                  — image-only PDFs have no extractable text.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* GEMINI-STYLE WORKSPACE */
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* LEFT SIDEBAR - Gemini history style */}
          <aside
            className={`hidden shrink-0 flex-col border-r border-white/[0.06] bg-[#0F0F14] transition-all duration-200 lg:flex ${
              leftOpen ? "w-[280px]" : "w-0 overflow-hidden border-r-0"
            }`}
          >
            <div className="flex h-full flex-col overflow-hidden">
              {/* top action */}
              <div className="shrink-0 p-3">
                <button
                  onClick={handleNewAppeal}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1E1E25] px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-[#25252E] border border-white/5"
                >
                  <Plus className="h-4 w-4" /> New appeal
                </button>
              </div>

              <div className="shrink-0 px-3 pb-2">
                <div className="text-[11px] font-semibold tracking-widest text-zinc-500">RECENT</div>
              </div>

              <div className="flex-1 overflow-y-auto px-2 pb-2">
                {history.length === 0 ? (
                  <div className="rounded-xl bg-white/[0.02] px-3 py-8 text-center">
                    <History className="mx-auto h-6 w-6 text-zinc-600" />
                    <div className="mt-2 text-sm font-medium text-zinc-300">No appeals yet</div>
                    <div className="mt-1 text-xs leading-relaxed text-zinc-500">
                      Your sessions appear here after you hit Initialize agent. Stored in this browser only.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {history.map((h) => (
                      <div
                        key={h.id}
                        className="group flex flex-col gap-1 rounded-xl px-3 py-2.5 hover:bg-white/[0.06] transition"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-zinc-100">{h.patient}</span>
                          <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-zinc-300">
                            {h.provider.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                          <span className="truncate">{h.cpts.length ? h.cpts.map((c) => `CPT ${c}`).join(" · ") : "No CPT"}</span>
                          <span>•</span>
                          <span className="shrink-0">{new Date(h.at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => setHistory([])}
                      className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                    >
                      <Trash2 className="h-3 w-3" /> Clear history
                    </button>
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-white/[0.06] p-3">
                <div className="rounded-xl bg-white/[0.03] p-3">
                  <div className="text-xs font-semibold text-zinc-200">Current session</div>
                  <div className="mt-1 space-y-1 text-xs leading-relaxed text-zinc-400">
                    <div className="flex items-center justify-between">
                      <span>Provider</span> <span className="font-medium text-zinc-300">{detectedProvider ?? "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>CPT</span> <span className="font-medium text-zinc-300">{detectedCpts.join(", ") || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Sources</span> <span className="font-medium text-zinc-300">{sources.length} excerpts</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 rounded-lg bg-amber-500/10 px-2.5 py-2 text-[11px] leading-relaxed text-amber-200/80">
                  Drafting aid — licensed review required.
                </div>
              </div>
            </div>
          </aside>

          {/* Mobile history drawer */}
          {mobileHistoryOpen && (
            <div className="absolute inset-0 z-40 flex lg:hidden">
              <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setMobileHistoryOpen(false)} />
              <div className="flex w-[300px] shrink-0 flex-col bg-[#0F0F14] border-l border-white/10">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <span className="text-sm font-semibold text-white">Appeal history</span>
                  <button onClick={() => setMobileHistoryOpen(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {history.length === 0 ? (
                    <div className="px-3 py-8 text-center text-sm text-zinc-500">No appeals yet</div>
                  ) : (
                    history.map((h) => (
                      <div key={h.id} className="rounded-xl px-3 py-2.5">
                        <div className="text-sm font-medium text-white">{h.patient}</div>
                        <div className="text-xs text-zinc-500">
                          {h.provider.toUpperCase()} • {h.cpts.join(", ") || "No CPT"} • {new Date(h.at).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="border-t border-white/10 p-3">
                  <button
                    onClick={handleNewAppeal}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-semibold text-ink"
                  >
                    <Plus className="h-4 w-4" /> New appeal
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CENTER CHAT */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#0B0B0F]">
            {/* chat header */}
            <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#121218]/60 px-3 sm:px-4 backdrop-blur">
              <div className="flex items-center gap-2 text-xs font-medium tracking-widest text-zinc-500">
                <Sparkles className="h-3.5 w-3.5 text-zinc-400" /> CONVERSATION
              </div>
              <div className="hidden items-center gap-2 text-xs text-zinc-500 sm:flex">
                <span className="rounded-full bg-white/5 px-2 py-1 font-mono text-[11px] text-zinc-400">#{sessionId?.slice(0, 8)}</span>
                {latestDraft ? <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[11px] font-bold text-emerald-300">DRAFT READY</span> : <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] font-medium text-zinc-500">Awaiting draft</span>}
              </div>
              <div className="flex items-center gap-1 sm:hidden">
                {latestDraft && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">READY</span>}
              </div>
            </div>

            {/* messages scroll container - fixed height scroll */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="mx-auto w-full max-w-[760px] px-3 py-6 sm:px-6 sm:py-8">
                {/* welcome / empty */}
                {messages.length === 0 && (
                  <div className="py-12 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-zinc-400">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 font-display text-lg font-semibold text-white">How can I help with this appeal?</h3>
                    <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-zinc-500">
                      The agent will read the denial, retrieve the exact payer policy, then ask one clarifying question if needed before drafting.
                    </p>
                  </div>
                )}

                <div className="space-y-6">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      {m.role === "assistant" && (
                        <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1E1E25] text-zinc-300 sm:flex">
                          <Sparkles className="h-4 w-4" />
                        </div>
                      )}
                      <div className={`flex max-w-[88%] flex-col gap-2 sm:max-w-[78%] ${m.role === "user" ? "items-end" : "items-start"}`}>
                        <div
                          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            m.role === "user"
                              ? "bg-white text-ink rounded-br-sm"
                              : "bg-[#1A1A22] text-zinc-200 border border-white/10 rounded-bl-sm"
                          }`}
                        >
                          <div className="whitespace-pre-wrap break-words">{m.content}</div>
                        </div>
                        {m.role === "assistant" && (m as Message).draft && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => {
                                const d = (m as Message).draft!;
                                downloadText(`Appeal_${detectedProvider}_${sessionId?.slice(0, 5)}.txt`, d);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
                            >
                              <Download className="h-3.5 w-3.5" /> Download draft
                            </button>
                            <button
                              onClick={async () => {
                                const d = (m as Message).draft!;
                                await navigator.clipboard.writeText(d);
                                setCopiedId(i);
                                setTimeout(() => setCopiedId(null), 1500);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/10"
                            >
                              {copiedId === i ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}{" "}
                              {copiedId === i ? "Copied" : "Copy"}
                            </button>
                          </div>
                        )}
                        <span className="px-1 text-[11px] text-zinc-600">{m.role === "user" ? "You" : "ClaimDefense"}</span>
                      </div>
                      {m.role === "user" && (
                        <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-ink sm:flex text-xs font-bold">
                          You
                        </div>
                      )}
                    </div>
                  ))}
                  {sending && (
                    <div className="flex gap-3">
                      <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1E1E25] text-zinc-300 sm:flex">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-sm border border-white/10 bg-[#1A1A22] px-4 py-3 text-sm text-zinc-400">
                        <Loader2 className="h-4 w-4 animate-spin" /> Thinking with policy context…
                      </div>
                    </div>
                  )}
                  <div ref={endRef} className="h-1" />
                </div>

                {/* spacer so last message not under composer */}
                <div className="h-4" />
              </div>
            </div>

            {error && (
              <div className="mx-3 mb-3 flex gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-200 sm:mx-6">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
                <button onClick={() => setError(null)} className="ml-auto text-amber-300 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* composer - Gemini pill */}
            <div className="shrink-0 border-t border-white/[0.06] bg-[#0F0F14] p-3 sm:p-4">
              <div className="mx-auto w-full max-w-[760px]">
                <div className="flex items-end gap-2 rounded-[24px] border border-white/10 bg-[#1E1E25] p-2 shadow-[0_8px_24px_rgba(0,0,0,0.3)] focus-within:border-white/15 focus-within:bg-[#25252E] transition">
                  <textarea
                    ref={textareaRef}
                    value={followInput}
                    onChange={(e) => setFollowInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleFollow();
                      }
                    }}
                    rows={1}
                    placeholder="Ask to refine — e.g. 'Add that bleeding was documented 04/10 and iron supplementation failed'…"
                    className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-3 text-sm leading-relaxed text-white placeholder:text-zinc-500 focus:outline-none"
                  />
                  <button
                    onClick={handleFollow}
                    disabled={!followInput.trim() || sending}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ink hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-center gap-3 text-[11px] text-zinc-500">
                  <span className="hidden sm:inline">Enter to send • Shift+Enter for newline</span>
                  <span className="sm:hidden">Tap Send to refine</span>
                  <span className="h-3 w-px bg-white/10" />
                  <span>Context locked to {sources.length} excerpts</span>
                  {latestDraft && <span className="hidden sm:inline h-3 w-px bg-white/10" />}
                  {latestDraft && <span className="hidden sm:inline text-emerald-400">Draft ready on the right →</span>}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR - Working document like Gemini canvas */}
          <aside
            className={`hidden shrink-0 flex-col border-l border-white/[0.06] bg-[#0F0F14] transition-all duration-200 lg:flex ${
              rightOpen ? "w-[380px] xl:w-[420px]" : "w-0 overflow-hidden border-l-0"
            }`}
          >
            <div className="flex h-full flex-col overflow-hidden">
              <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#121218] px-4">
                <span className="flex items-center gap-1.5 text-xs font-semibold tracking-widest text-zinc-400">
                  <FileText className="h-3.5 w-3.5" /> WORKING DOCUMENT
                </span>
                {latestDraft && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300">READY</span>}
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {/* draft */}
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#14141B]">
                  <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-4 py-3">
                    <span className="text-xs font-semibold tracking-widest text-zinc-500">CURRENT DRAFT</span>
                    <span className="text-xs text-zinc-500">{latestDraft ? `${latestDraft.length.toLocaleString()} chars` : "—"}</span>
                  </div>
                  <div className="p-4">
                    {latestDraft ? (
                      <>
                        <div className="max-h-[52vh] overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-[#0F1116] p-4 text-sm leading-relaxed text-zinc-200 scrollbar-thin">
                          {latestDraft}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <Button onClick={() => downloadText(`Appeal_${detectedProvider}_${sessionId?.slice(0, 5)}.txt`, latestDraft)} className="gap-1.5 text-sm">
                            <Download className="h-4 w-4" /> Download .txt
                          </Button>
                          <button
                            onClick={async () => {
                              await navigator.clipboard.writeText(latestDraft!);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 1500);
                            }}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-semibold text-white hover:bg-white/10"
                          >
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            const blob = new Blob([latestDraft], { type: "text/plain;charset=utf-8" });
                            const url = URL.createObjectURL(blob);
                            window.open(url, "_blank");
                            setTimeout(() => URL.revokeObjectURL(url), 60000);
                          }}
                          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] py-2.5 text-xs font-semibold text-zinc-300 hover:bg-white/5"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Open in new tab / Print
                        </button>
                      </>
                    ) : (
                      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-sm leading-relaxed text-zinc-500">
                        No final letter yet.
                        <br />
                        Answer the agent&apos;s clarifying question and it will emit a <span className="font-mono text-zinc-300">&lt;FINAL_LETTER&gt;</span>.
                        <div className="mt-3 text-xs text-zinc-600">Tip: after the draft appears, chat “Add bleeding 04/10, iron failed” to iterate.</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* sources - independently scrollable but within right rail scroll */}
                <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-[#14141B]">
                  <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-4 py-3">
                    <span className="flex items-center gap-1.5 text-xs font-semibold tracking-widest text-zinc-500">
                      <Search className="h-3.5 w-3.5" /> RETRIEVED POLICY ({sources.length})
                    </span>
                    <span className="text-xs text-zinc-500">{detectedProvider ?? "—"}</span>
                  </div>
                  <div className="max-h-[42vh] space-y-3 overflow-y-auto p-3 sm:p-4">
                    {sources.length === 0 ? (
                      <div className="rounded-xl bg-white/[0.02] p-4 text-sm text-zinc-500">
                        No sources yet — start an appeal to retrieve policy excerpts. Each cite includes source + page.
                      </div>
                    ) : (
                      sources.map((s, idx) => (
                        <div key={idx} className="rounded-xl border border-white/10 bg-[#0F1116] p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-xs font-semibold tracking-wide text-zinc-300">
                              Source {idx + 1}: <span className="font-mono text-[11px] text-zinc-200">{s.source}</span>{" "}
                              <span className="font-normal text-zinc-500">(p. {String(s.page)})</span>
                            </div>
                          </div>
                          <div className="mt-1.5 line-clamp-[10] whitespace-pre-wrap text-xs leading-relaxed text-zinc-400">
                            {s.preview}
                          </div>
                          {/* subtle reference count footer */}
                          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-600">
                            <span className="h-1 w-1 rounded-full bg-emerald-500" /> Grounded excerpt — cited in letter when used
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-amber-500/15 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100">
                  <span className="font-semibold text-amber-200">Remember:</span> Always have a licensed advocate review before submitting. Unknown
                  fields show as [PHONE NUMBER] etc.
                </div>

                {/* RAG debug / confirmation */}
                <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <div className="text-[11px] font-semibold tracking-widest text-zinc-500">RAG STATUS</div>
                  <div className="mt-2 space-y-1 text-xs text-zinc-400">
                    <div className="flex justify-between">
                      <span>Vector DB</span>
                      <span className={health?.has_vector_db ? "text-emerald-300" : "text-amber-300"}>
                        {health?.has_vector_db ? "9654 chunks loaded" : "Not ready"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Providers indexed</span>
                      <span className="text-zinc-300">medicaid 6821 • medicare 2833</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last retrieval</span>
                      <span className="text-zinc-300">{sources.length ? `${sources.length} excerpts • ${detectedProvider}` : "—"}</span>
                    </div>
                    <div className="pt-1 text-[11px] leading-relaxed text-zinc-500">
                      Fallback retrieval enabled — if payer-filtered query is thin, we auto-retry unfiltered so references always return.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
