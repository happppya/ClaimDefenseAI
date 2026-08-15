import { motion } from "framer-motion";
import { ShieldCheck, FileText, Search, MessagesSquare, Download, Clock3, Scale, Sparkles, ArrowRight, Check, Quote, AlertTriangle, Building2, HeartPulse } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";

export function Landing() {
  return (
    <div className="bg-[#0B0B0F] text-white">
      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* gradients */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/2 h-[700px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.18),transparent_60%)]" />
          <div className="absolute top-48 -right-24 h-[500px] w-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.10),transparent_65%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(11,11,15,1))]" />
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        </div>

        <div className="relative mx-auto max-w-[1200px] px-4 py-10 sm:px-6 sm:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex justify-center">
              <Badge>Live policy-grounded RAG • Medicare + Medicaid • No hallucinations</Badge>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.6 }} className="font-display mt-6 text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-[56px]">
              Overturn denied claims{" "}
              <span className="bg-gradient-to-r from-[#60A5FA] to-[#34D399] bg-clip-text text-transparent">in minutes,</span>
              <br /> not months.
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14, duration: 0.6 }} className="mx-auto mt-5 max-w-2xl text-pretty text-[17px] leading-relaxed text-zinc-300">
              ClaimDefenseAI drafts <span className="font-semibold text-white">payer-cited appeal letters</span> that insurers can&apos;t ignore — grounding every paragraph in the exact policy, CPT code, and page number from the payer&apos;s own manuals.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.6 }} className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/app">
                <Button size="lg" className="w-full sm:w-auto">Start an appeal <ArrowRight className="h-4.5 w-4.5" /></Button>
              </Link>
              <a href="#demo">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">See example letter</Button>
              </a>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-400">
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Cites source + page</span>
              <span className="h-3 w-px bg-white/10" />
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Human-review required</span>
              <span className="h-3 w-px bg-white/10" />
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Works on paste or upload</span>
            </motion.div>
          </div>

          {/* Hero card mock */}
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.65 }} className="relative mx-auto mt-12 max-w-[980px]">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#14141B] shadow-soft">
              <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2 text-xs font-medium tracking-widest text-zinc-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.7)]" /> APPEAL WORKSPACE — MEDICARE • CPT 45378 • READY
                </div>
                <span className="hidden text-xs text-zinc-500 sm:inline">Drafting assistant • Zero-hallucination mode</span>
              </div>
              <div className="grid gap-0 sm:grid-cols-[1.15fr_0.85fr]">
                <div className="border-b border-white/10 p-5 sm:border-b-0 sm:border-r sm:p-6">
                  <div className="flex items-center gap-2 text-xs font-semibold tracking-widest text-zinc-500"><FileText className="h-3.5 w-3.5" /> DENIAL INTAKE</div>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl bg-white/[0.04] p-3 text-sm leading-relaxed text-zinc-300">
                      “Diagnostic colonoscopy CPT 45378 denied — not medically necessary. No evidence of bleeding or failed conservative care per GI Endoscopy policy…”
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-zinc-200">Patient: John Doe</span>
                      <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">Medicare • Auto-detected</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1 text-xs text-zinc-500"><Search className="h-3.5 w-3.5" /> Retrieving 4 policy excerpts…</div>
                  </div>
                </div>
                <div className="bg-[#0F1116] p-5 sm:p-6">
                  <div className="flex items-center gap-2 text-xs font-semibold tracking-widest text-emerald-300"><Sparkles className="h-3.5 w-3.5" /> DRAFT (CITED)</div>
                  <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
                    <p className="text-sm leading-relaxed text-zinc-200">
                      Re: Appeal — CLM-458221 (CPT 45378)<br />
                      Per <span className="font-semibold text-white">Medicare NCD 100.2 — Gastrointestinal Endoscopy, p.4</span> the procedure is covered when documentation establishes acute GI bleeding not responsive to conservative management...
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink"><Download className="h-3.5 w-3.5" /> Download .txt</div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500"><Clock3 className="h-3.5 w-3.5" /> Generated in ~18s • 4 sources linked</div>
                </div>
              </div>
            </div>
            {/* float stats */}
            <div className="pointer-events-none absolute -bottom-6 left-4 right-4 hidden justify-center gap-3 sm:flex">
              <div className="rounded-2xl border border-white/10 bg-[#1A1A22] px-5 py-3 shadow-card">
                <div className="text-xs tracking-widest text-zinc-500">POLICIES INDEXED</div>
                <div className="text-lg font-bold">700+ Medicare/Medicaid LCD & NCD pages</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#1A1A22] px-5 py-3 shadow-card">
                <div className="text-xs tracking-widest text-zinc-500">AVG DRAFT TIME</div>
                <div className="text-lg font-bold">~20 seconds</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* LOGOS / PROBLEM */}
      <section className="mx-auto max-w-[1200px] px-4 pb-6 pt-14 sm:px-6 sm:pt-14">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-zinc-400">
            <span className="font-medium tracking-widest text-zinc-500">BUILT FOR THE CLAIMS THAT ACTUALLY MATTER</span>
            <span className="flex flex-wrap items-center gap-4 font-medium text-zinc-300">
              <span className="inline-flex items-center gap-1.5"><Building2 className="h-4 w-4" /> UHC • Cigna • Aetna • BCBS • Medicare</span>
              <span className="hidden h-4 w-px bg-white/10 sm:inline" />
              <span className="inline-flex items-center gap-1.5"><HeartPulse className="h-4 w-4" /> GI • Cardiology • Ortho • Imaging</span>
            </span>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold tracking-widest text-zinc-300">HOW IT WORKS</div>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">From denial to defensible appeal — 3 steps</h2>
          <p className="mt-3 text-zinc-400">Paste the letter you got. We do the research, reasoning, and writing — with receipts.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { n: "01", icon: FileText, title: "Paste the denial", desc: "Drop the full letter text (EOB/835 line optional). We auto-detect payer + CPT/Pill. Manual override if needed.", color: "from-violet-500 to-blue-500" },
            { n: "02", icon: Search, title: "We retrieve policy", desc: "RAG searches 700+ payer manuals (LCD/NCD) — filtered by your payer — returns 4 best excerpts + page numbers.", color: "from-blue-500 to-cyan-400" },
            { n: "03", icon: MessagesSquare, title: "Agentic draft + refine", desc: "Mistral-small (temp 0.0) asks one clarifying question if needed, then drafts a <FINAL_LETTER> with exact citations. Chat to revise.", color: "from-emerald-400 to-teal-400" },
          ].map((s) => (
            <div key={s.n} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#14141B] p-6">
              <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${s.color} opacity-60`} />
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} text-white`}>
                  <s.icon className="h-4.5 w-4.5" />
                </div>
                <span className="text-xs font-bold tracking-widest text-zinc-500">{s.n}</span>
              </div>
              <h3 className="mt-4 font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* secondary row */}
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Scale, title: "Zero hallucinations", desc: "Temperature 0.0 + refusal if context insufficient. No invented CPT codes. Ever." },
            { icon: ShieldCheck, title: "Cited down to page", desc: "Every paragraph can be traced to Source + Page preview. Auditors love it." },
            { icon: Download, title: "One-click packet", desc: "Download final letter as .txt ready to paste into payer portal/fax cover." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <f.icon className="h-5 w-5 text-zinc-300" />
              <div className="mt-3 font-medium">{f.title}</div>
              <div className="mt-1 text-sm text-zinc-500">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
        <div className="overflow-hidden rounded-[20px] border border-white/10 bg-[#121218]">
          <div className="grid gap-0 lg:grid-cols-2">
            <div className="p-6 sm:p-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-widest text-zinc-200">COVERAGE MAP</div>
              <h3 className="font-display mt-4 text-2xl font-bold leading-tight sm:text-3xl">Policy-grounded, by payer — not a generic chatbot</h3>
              <p className="mt-3 text-zinc-400">A RAG index split by payer folder (aetna/cigna/unitedhealthcare/bluecross/medicare) with Chroma persistent storage. Filtered retrieval = fewer irrelevant cites.</p>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  "700+ LCD/NCD PDFs indexed from CMS Medicare + Medicaid manuals",
                  "Chunk 1000 / overlap 200 • Mistral embeddings • Provider tag on every chunk",
                  "4 best excerpts surfaced per appeal with Source + Page",
                  "Includes 138MB pre-built chroma.sqlite3 — no cold-start scrape needed",
                ].map((t) => (
                  <li key={t} className="flex gap-2.5 leading-relaxed text-zinc-300"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" /> {t}</li>
                ))}
              </ul>
              <div className="mt-6 flex gap-3">
                <Link to="/app"><Button>Try with your denial <ArrowRight className="h-4 w-4" /></Button></Link>
              </div>
            </div>
            <div className="relative bg-[#0E0E14] p-6 sm:p-8">
              <div className="rounded-2xl border border-white/10 bg-[#17171E] p-4">
                <div className="text-xs font-semibold tracking-widest text-zinc-500">VECTOR STORE STATUS</div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                  {[
                    { k: "MEDICARE", v: "320+" },
                    { k: "MEDICAID", v: "360+" },
                    { k: "TOTAL CHUNKS", v: "~12k" },
                  ].map((s) => (
                    <div key={s.k} className="rounded-xl bg-white/[0.04] py-3">
                      <div className="text-lg font-bold">{s.v}</div>
                      <div className="text-[11px] tracking-widest text-zinc-500">{s.k}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300">● Chroma persistent dir: chroma_db_storage/ — ready</div>
                <div className="mt-3 text-xs leading-relaxed text-zinc-500">Folder-qualified metadata <span className="font-mono text-zinc-300">provider: "medicare"</span> ensures Medicare denials don&apos;t cite Aetna.</div>
              </div>
              <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                <div className="flex gap-2 text-sm font-semibold text-amber-200"><AlertTriangle className="h-4 w-4 shrink-0" /> Human review required</div>
                <p className="mt-1 text-xs leading-relaxed text-amber-100/80">This tool drafts a citation-backed appeal letter. A licensed billing advocate must review before submission. We mark unknowns as [PHONE NUMBER] / [EMAIL].</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DEMO LETTER */}
      <section id="demo" className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight">What a winning letter looks like</h2>
          <p className="mt-2 text-zinc-400">Real denial from our test suite (Medicare, CPT 45378). Every claim in the letter traces to a cited page.</p>
        </div>
        <div className="mx-auto mt-8 grid max-w-[1000px] gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-white/10 bg-[#14141B] p-6">
            <div className="text-xs font-semibold tracking-widest text-zinc-500">DENIAL (TRUNCATED)</div>
            <div className="mt-3 rounded-xl bg-white/[0.04] p-4 text-sm leading-relaxed text-zinc-300">
              RE: Claim CLM-458221 — CPT 45378 Diagnostic Colonoscopy denied — not medically necessary. No evidence of acute GI bleeding or failed conservative management per GI Endoscopy policy...
              <div className="mt-3 text-xs text-zinc-500">Amount billed $3,850 • Patient responsibility $3,850 • 180-day appeal window</div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500"><Quote className="h-3.5 w-3.5" /> Full text in notes/denied.md — Try demo fills this for you.</div>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-6">
            <div className="text-xs font-semibold tracking-widest text-emerald-300">APPEAL — SELECTED EXCERPT</div>
            <div className="letter-prose mt-3 text-sm text-zinc-200">
              <p className="font-semibold text-white">Re: Request for Reconsideration — CLM-458221</p>
              <p>
                Pursuant to <span className="font-semibold">Medicare NCD 100.2, Gastrointestinal Endoscopy (p. 4)</span> and LCD guidance for diagnostic colonoscopy, CPT 45378 is medically necessary where chart notes document lower GI bleeding unresponsive to conservative measures and high-risk features...
              </p>
              <p>Clinical notes dated 04/10/2026 document hematochezia with failure of iron supplementation and negative stool guaiac work-up, satisfying the necessity criteria on page 4, paragraph 3.</p>
              <p className="text-xs text-zinc-500">Cited: www.cms.gov_medicare-coverage-database_view_ncd…p.4 • www.cms.gov…LCD colonoscopy p.11</p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING / CTA */}
      <section className="mx-auto max-w-[1200px] px-4 pb-12 sm:px-6">
        <div className="overflow-hidden rounded-[20px] border border-white/10 bg-gradient-to-br from-[#1A1D2E] via-[#141B2B] to-[#0F1A22] p-6 sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="font-display text-2xl font-bold sm:text-3xl">Ready to flip a denial?</h3>
              <p className="mt-2 max-w-xl text-zinc-300">Paste your letter, pick a payer (or let us auto-detect), and get a page-cited appeal you can send today. Bring your own Mistral key.</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-white/10 px-3 py-1 text-zinc-200">MISTRAL_API_KEY required</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-zinc-200">Self-hosted Chroma — you own the data</span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link to="/app">
                <Button size="lg" className="w-full sm:w-auto">Open ClaimDefense app</Button>
              </Link>
              <a href="https://github.com/happppya/ClaimDefenseAI" target="_blank" rel="noreferrer">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">View on GitHub</Button>
              </a>
            </div>
          </div>
        </div>

        <footer className="mt-8 border-t border-white/10 pt-6 text-center text-xs leading-relaxed text-zinc-500">
          ClaimDefenseAI is a drafting aid, not legal or medical advice. All letters require human review before submission. Policy excerpts © their respective payers.<br />
          Built at Atlanta Divergent Teams Hackathon 2026 • FastAPI + Vite + Mistral + Chroma
        </footer>
      </section>
    </div>
  );
}
