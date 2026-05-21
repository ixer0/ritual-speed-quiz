import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Loader2 } from "lucide-react";
import { shortAddress } from "@/lib/ritual-chain";

interface Row {
  id: string;
  wallet_address: string;
  display_name: string | null;
  score: number;
  created_at: string;
  tx_hash: string;
  completion_ms: number;
}

export function Leaderboard({ highlightWallet }: { highlightWallet?: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("leaderboard")
        .select("*")
        .order("score", { ascending: false })
        .order("completion_ms", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(20);
      if (active) setRows((data as Row[]) ?? []);
    };
    load();

    const channel = supabase
      .channel("leaderboard-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leaderboard" }, () => load())
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  if (rows === null) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No entries yet. Be the first.</p>;
  }

  return (
    <ol className="divide-y divide-border">
      {rows.map((r, i) => {
        const isMe = highlightWallet && r.wallet_address.toLowerCase() === highlightWallet.toLowerCase();
        return (
          <li
            key={r.id}
            className={`flex items-center gap-4 py-3 ${isMe ? "bg-primary/5 -mx-4 px-4 rounded-md" : ""}`}
          >
            <span className="w-8 font-mono text-sm text-muted-foreground tabular-nums">
              {i === 0 ? <Trophy className="h-4 w-4 text-primary" /> : `${i + 1}`}
            </span>
            <span className="flex-1 truncate font-mono text-sm">
              {r.display_name || shortAddress(r.wallet_address)}
              {isMe && <span className="ml-2 text-xs text-primary">you</span>}
            </span>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {(r.completion_ms / 1000).toFixed(1)}s
            </span>
            <span className="font-mono text-sm font-semibold text-foreground w-10 text-right">{r.score}/10</span>
          </li>
        );
      })}
    </ol>
  );
}
