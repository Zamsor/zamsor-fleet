// Minimal JSON-RPC client. Public RPC only; no wallet, no keys.
export const RPC_URL = process.env.RPC_URL ?? "https://api.mainnet-beta.solana.com";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function rpc<T = any>(method: string, params: unknown[]): Promise<T> {
  let last: unknown;
  for (let i = 0; i < 6; i++) {
    try {
      const res = await fetch(RPC_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      const j: any = await res.json();
      if (j.result !== undefined) return j.result as T;
      last = j.error;
    } catch (e) { last = e; }
    await sleep(2000 * (i + 1));
  }
  throw new Error(`RPC ${method} failed: ${JSON.stringify(last)}`);
}
