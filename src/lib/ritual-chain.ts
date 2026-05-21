export const RITUAL_CHAIN = {
  id: 1979,
  idHex: "0x" + (1979).toString(16),
  name: "Ritual",
  rpcUrl: "https://rpc.ritualfoundation.org/",
  explorer: "https://explorer.ritualfoundation.org",
  symbol: "RIT",
  decimals: 18,
};

export type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

export function getProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  const eth = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
  return eth ?? null;
}

export async function ensureRitualNetwork() {
  const eth = getProvider();
  if (!eth) throw new Error("No Web3 wallet found. Install MetaMask.");
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: RITUAL_CHAIN.idHex }],
    });
  } catch (err) {
    const e = err as { code?: number };
    if (e?.code === 4902) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: RITUAL_CHAIN.idHex,
            chainName: RITUAL_CHAIN.name,
            nativeCurrency: { name: RITUAL_CHAIN.symbol, symbol: RITUAL_CHAIN.symbol, decimals: 18 },
            rpcUrls: [RITUAL_CHAIN.rpcUrl],
            blockExplorerUrls: [RITUAL_CHAIN.explorer],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

export async function connectWallet(): Promise<string> {
  const eth = getProvider();
  if (!eth) throw new Error("No Web3 wallet detected. Please install MetaMask.");
  const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts?.length) throw new Error("No account returned");
  await ensureRitualNetwork();
  return accounts[0];
}

// Send 0.001 RIT to self
export async function sendSelfTx(address: string): Promise<string> {
  const eth = getProvider();
  if (!eth) throw new Error("No wallet");
  await ensureRitualNetwork();
  // 0.001 * 1e18 = 1e15 = 0x38d7ea4c68000
  const value = "0x" + (10n ** 15n).toString(16);
  const txHash = (await eth.request({
    method: "eth_sendTransaction",
    params: [{ from: address, to: address, value }],
  })) as string;
  return txHash;
}

export function shortAddress(addr: string) {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}
