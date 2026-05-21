import { ensureRitualNetwork, getProvider } from "./ritual-chain";

export const QUIZ_CONTRACT_ADDRESS = "0xEaF0D8978230C03AA07Df06918059E267847961B";

// keccak256("saveScore(string,uint8,uint32)") first 4 bytes
const SAVE_SCORE_SELECTOR = "0xd6d4df7b";

function pad32(hex: string) {
  return hex.replace(/^0x/, "").padStart(64, "0");
}

function encodeUint(n: number | bigint) {
  return pad32(BigInt(n).toString(16));
}

function encodeString(s: string) {
  const bytes = new TextEncoder().encode(s);
  const len = encodeUint(bytes.length);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  // pad to multiple of 32 bytes
  const padded = hex.padEnd(Math.ceil(hex.length / 64) * 64, "0");
  return len + padded;
}

/**
 * Calls RitualQuizScores.saveScore(discord, score, completionMs).
 * Returns the tx hash.
 */
export async function saveScoreOnChain(
  from: string,
  discord: string,
  score: number,
  completionMs: number,
): Promise<string> {
  const eth = getProvider();
  if (!eth) throw new Error("No wallet");
  await ensureRitualNetwork();

  // ABI encode: head = offset to string (0x60=96), score, completionMs; then string tail
  const head = encodeUint(96) + encodeUint(score) + encodeUint(Math.min(completionMs, 0xffffffff));
  const tail = encodeString(discord);
  const data = SAVE_SCORE_SELECTOR + head + tail;

  const txHash = (await eth.request({
    method: "eth_sendTransaction",
    params: [{ from, to: QUIZ_CONTRACT_ADDRESS, data }],
  })) as string;
  return txHash;
}
