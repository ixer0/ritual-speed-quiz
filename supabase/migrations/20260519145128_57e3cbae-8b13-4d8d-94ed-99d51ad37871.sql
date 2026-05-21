
CREATE TABLE public.leaderboard (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  display_name TEXT,
  score INTEGER NOT NULL,
  tx_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX leaderboard_score_idx ON public.leaderboard (score DESC, created_at ASC);

ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read leaderboard"
  ON public.leaderboard FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert leaderboard entry"
  ON public.leaderboard FOR INSERT
  WITH CHECK (
    score >= 0 AND score <= 10
    AND length(wallet_address) BETWEEN 10 AND 64
    AND length(tx_hash) BETWEEN 10 AND 80
  );
