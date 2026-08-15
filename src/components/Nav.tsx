import { Link, useLocation } from "react-router-dom";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "./ui/Button";

export function Nav() {
  const loc = useLocation();
  const isApp = loc.pathname.startsWith("/app");
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0B0B0F]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-3.5 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white shadow-[0_4px_14px_rgba(59,130,246,0.4)]">
            <ShieldCheck className="h-4.5 w-4.5" />
          </div>
          <span className="font-display text-[17px] font-bold tracking-tight text-white">ClaimDefense<span className="font-normal text-zinc-400">AI</span></span>
          <span className="hidden rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold tracking-widest text-zinc-300 sm:inline">BETA</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-zinc-400 sm:flex">
          <a href="/#how-it-works" className="hover:text-white transition">How it works</a>
          <a href="/#features" className="hover:text-white transition">Coverage</a>
          <a href="/#demo" className="hover:text-white transition">Demo letter</a>
        </nav>
        <div className="flex items-center gap-2">
          {!isApp && (
            <Link to="/app">
              <Button size="sm" className="gap-1.5">
                Open app <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
          {isApp && (
            <Link to="/" className="text-sm text-zinc-400 hover:text-white">← Back to site</Link>
          )}
        </div>
      </div>
    </header>
  );
}
