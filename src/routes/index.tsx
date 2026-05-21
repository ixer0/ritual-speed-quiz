import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Wallet, Sparkles, Loader2, CheckCircle2, ExternalLink, Twitter } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { connectWallet, sendSelfTx, shortAddress, RITUAL_CHAIN } from "@/lib/ritual-chain";
import { saveScoreOnChain } from "@/lib/ritual-contract";
import { QUESTION_POOL, pickRandom, type Question } from "@/lib/questions";
import { Quiz } from "@/components/Quiz";
import { Leaderboard } from "@/components/Leaderboard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Ritual Quiz — Web3 trivia on the Ritual network" },
      { name: "description", content: "Connect your wallet, sign in, answer 10 timed questions, and climb the Ritual leaderboard." },
    ],
  }),
});

type Phase = "connect" | "entry" | "welcome" | "quiz" | "submitted";

function Index() {
  const [phase, setPhase] = useState<Phase>("connect");
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [score, setScore] = useState(0);
  const [completionMs, setCompletionMs] = useState(0);
  const [discord, setDiscord] = useState("");
  const [signing, setSigning] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [scoreTxHash, setScoreTxHash] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number>(0);

  const onConnect = async () => {
    setConnecting(true);
    try {
      const addr = await connectWallet();
      setAddress(addr);
      setPhase("entry");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setConnecting(false);
    }
  };

  const onSignAndEnter = async () => {
    if (!address) return;
    let name = discord.trim();
    if (name.length < 2 || name.length > 32) {
      toast.error("Enter a Discord username (2–32 chars).");
      return;
    }
    setSigning(true);
    try {
      // If this wallet has played before, reuse its original username.
      const { data: existing } = await supabase
        .from("leaderboard")
        .select("display_name")
        .eq("wallet_address", address.toLowerCase())
        .not("display_name", "is", null)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (existing?.display_name) {
        name = existing.display_name;
        setDiscord(name);
        toast.info(`Welcome back, ${name}.`);
      }

      toast.info("Confirm the transaction in your wallet…");
      const hash = await sendSelfTx(address);
      setTxHash(hash);
      toast.success("Entry confirmed.");
      setPhase("welcome");
    } catch (e) {
      toast.error((e as Error).message || "Transaction failed");
    } finally {
      setSigning(false);
    }
  };

  const onPlayAgain = () => {
    setQuestions(pickRandom(QUESTION_POOL, 10));
    setScore(0);
    setCompletionMs(0);
    setStartedAt(Date.now());
    setPhase("quiz");
  };

  const onStart = () => {
    setQuestions(pickRandom(QUESTION_POOL, 10));
    setScore(0);
    setStartedAt(Date.now());
    setPhase("quiz");
  };

  const onComplete = async (s: number) => {
    const ms = Date.now() - startedAt;
    setScore(s);
    setCompletionMs(ms);
    setPhase("submitted");
    if (!address || !txHash) return;

    // Save score on-chain to Ritual testnet.
    let onChainHash: string | null = null;
    try {
      toast.info("Confirm the transaction to save your score on-chain…");
      onChainHash = await saveScoreOnChain(address, discord.trim(), s, ms);
      setScoreTxHash(onChainHash);
      toast.success("Score saved on Ritual.");
    } catch (e) {
      toast.error("On-chain save failed: " + (e as Error).message);
    }

    const { error } = await supabase.from("leaderboard").insert({
      wallet_address: address.toLowerCase(),
      display_name: discord.trim(),
      score: s,
      tx_hash: onChainHash ?? txHash,
      completion_ms: ms,
    });
    if (error) toast.error("Failed to record score: " + error.message);
    else toast.success("Added to the leaderboard.");
  };

  return (
    <div className="relative min-h-screen grid-bg">
      <Toaster theme="dark" position="top-center" />

      <header className="flex items-center justify-between px-6 md:px-10 py-5 border-b border-border/60 backdrop-blur-sm bg-background/40 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary/15 border border-primary/40 grid place-items-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="font-mono text-sm tracking-widest uppercase">Ritual / Quiz</span>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="hidden sm:inline text-muted-foreground">
            chain <span className="text-foreground">{RITUAL_CHAIN.id}</span>
          </span>
          {address ? (
            <span className="px-3 py-1.5 rounded-md border border-border bg-card font-mono text-xs">
              {shortAddress(address)}
            </span>
          ) : (
            <span className="text-muted-foreground">not connected</span>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 md:px-10 py-12 md:py-20">
        {phase === "connect" && (
          <section className="text-center max-w-2xl mx-auto">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground mb-6">
              testnet · {RITUAL_CHAIN.symbol}
            </p>
            <h1 className="text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05]">
              Prove your <span className="text-gradient">web3</span> mind.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Ten questions. Twenty seconds each. One on-chain signature seals your entry on the Ritual leaderboard.
            </p>
            <div className="mt-10">
              <Button size="lg" onClick={onConnect} disabled={connecting} className="glow-primary px-8 h-12 text-base">
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                Connect wallet
              </Button>
            </div>
            <div className="mt-16">
              <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">Top players</h3>
              <div className="rounded-xl border border-border bg-card/40 backdrop-blur px-4">
                <Leaderboard />
              </div>
            </div>
          </section>
        )}

        {phase === "entry" && address && (
          <section className="max-w-md mx-auto">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary mb-4 text-center">connected</p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-center">Enter the ritual</h1>
            <p className="mt-3 text-muted-foreground text-center">
              Provide your Discord username and sign a small{" "}
              <span className="font-mono text-foreground">0.001 {RITUAL_CHAIN.symbol}</span> self-transfer to begin.
            </p>

            <div className="mt-8 space-y-3">
              <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Discord username
              </label>
              <Input
                value={discord}
                onChange={(e) => setDiscord(e.target.value)}
                maxLength={32}
                placeholder="yourname"
                className="bg-card/60"
              />
            </div>

            <Button
              size="lg"
              onClick={onSignAndEnter}
              disabled={signing}
              className="mt-6 w-full glow-primary h-12 text-base"
            >
              {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              Sign & enter
            </Button>
          </section>
        )}

        {phase === "welcome" && (
          <section className="text-center max-w-2xl mx-auto">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary mb-6">entry confirmed</p>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
              Welcome, <span className="font-mono text-gradient">{discord.trim()}</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              10 random questions. 20 seconds each. Your finish time breaks ties.
            </p>
            <div className="mt-10 flex justify-center gap-3">
              <Button size="lg" onClick={onStart} className="glow-primary px-8 h-12 text-base">
                Start quiz
              </Button>
            </div>
          </section>
        )}

        {phase === "quiz" && (
          <section className="pt-4">
            <Quiz questions={questions} onComplete={onComplete} />
          </section>
        )}

        {phase === "submitted" && (
          <section className="max-w-2xl mx-auto">
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4">your score</p>
              <div className="text-7xl md:text-8xl font-semibold tracking-tighter text-gradient leading-none">
                {score}
                <span className="text-muted-foreground/40 text-4xl">/10</span>
              </div>
              <p className="mt-4 text-muted-foreground">
                Finished in <span className="font-mono text-foreground">{(completionMs / 1000).toFixed(1)}s</span>
              </p>
              <div className="mt-3 flex flex-col items-center gap-1 text-sm font-mono">
                {scoreTxHash && (
                  <a
                    href={`${RITUAL_CHAIN.explorer}/tx/${scoreTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    score on-chain: {shortAddress(scoreTxHash)} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {txHash && (
                  <a
                    href={`${RITUAL_CHAIN.explorer}/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-muted-foreground hover:underline"
                  >
                    entry: {shortAddress(txHash)} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
            <div className="mt-10 flex justify-center gap-3">
              <Button size="lg" onClick={onPlayAgain} className="glow-primary px-8 h-12 text-base">
                Play again
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  const text = `I scored ${score}/10 on the Ritual Quiz in ${(completionMs / 1000).toFixed(1)}s! Can you beat me?`;
                  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
                className="px-8 h-12 text-base"
              >
                <Twitter className="h-4 w-4 mr-2" />
                Share on X
              </Button>
            </div>
            <div className="mt-12">
              <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4 text-center">
                Leaderboard
              </h3>
              <div className="rounded-xl border border-border bg-card/40 backdrop-blur px-4">
                <Leaderboard highlightWallet={address ?? undefined} />
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="px-6 md:px-10 py-8 text-center text-xs font-mono uppercase tracking-widest text-muted-foreground">
        Ritual testnet · RPC {RITUAL_CHAIN.rpcUrl}
      </footer>
    </div>
  );
}
