CREATE OR REPLACE FUNCTION public.leaderboard_keep_latest()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.leaderboard
  WHERE wallet_address = NEW.wallet_address
    AND id <> NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leaderboard_keep_latest_trigger ON public.leaderboard;

CREATE TRIGGER leaderboard_keep_latest_trigger
AFTER INSERT ON public.leaderboard
FOR EACH ROW
EXECUTE FUNCTION public.leaderboard_keep_latest();