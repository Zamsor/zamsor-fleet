import bs58 from "bs58";
import { rpc } from "./rpc.js";

// SAGE (Starbased, Solana mainnet). Same program the article pack was pulled from.
export const SAGE_PROGRAM = process.env.SAGE_PROGRAM ?? "SAGE2HAwep459SNq61LHvjxPk4pLPEJLoMETef7f7EE";
// Anchor discriminator sha256("account:Fleet")[0..8], base58
export const FLEET_DISC = "KNKT54ytpWW";
// Fleet layout: disc(8) version(1) gameId(32)@9 ownerProfile(32)@41 fleetShips@73
// subProfile@105 subProfileInvalidator@137 faction(1)@169 fleetLabel[32]@170
const OWNER_OFFSET = 41;
const LABEL_OFFSET = 170;

export interface FleetRow { fleet: string; label: string; ownerProfile: string; }

export function decodeFleet(pubkey: string, b64: string): FleetRow {
  const b = Buffer.from(b64, "base64");
  const label = b.subarray(LABEL_OFFSET, LABEL_OFFSET + 32).toString("utf8").replace(/\0+$/, "").replace(/\0/g, "");
  return { fleet: pubkey, label, ownerProfile: bs58.encode(b.subarray(OWNER_OFFSET, OWNER_OFFSET + 32)) };
}

export async function fleetsForProfile(profile: string): Promise<FleetRow[]> {
  const res: any[] = await rpc("getProgramAccounts", [SAGE_PROGRAM, {
    encoding: "base64",
    dataSlice: { offset: 0, length: 202 },
    filters: [{ memcmp: { offset: 0, bytes: FLEET_DISC } }, { memcmp: { offset: OWNER_OFFSET, bytes: profile } }],
  }]);
  return res.map((a) => decodeFleet(a.pubkey, a.account.data[0])).sort((a, b) => a.label.localeCompare(b.label));
}

export async function fleetLabel(fleet: string): Promise<FleetRow | null> {
  const r: any = await rpc("getAccountInfo", [fleet, { encoding: "base64", dataSlice: { offset: 0, length: 202 } }]);
  if (!r?.value || r.value.owner !== SAGE_PROGRAM) return null;
  const b = Buffer.from(r.value.data[0], "base64");
  if (bs58.encode(b.subarray(0, 8)) !== FLEET_DISC) return null; // not a SAGE Fleet account
  return decodeFleet(fleet, r.value.data[0]);
}

export async function lastActivity(addr: string): Promise<{ signature: string; blockTime: number | null } | null> {
  const r: any[] = await rpc("getSignaturesForAddress", [addr, { limit: 1 }]);
  return r[0] ? { signature: r[0].signature, blockTime: r[0].blockTime } : null;
}

// Page signatures newest -> oldest. Stops at genesis (short page) or maxSigs.
export async function backfillSignatures(addr: string, maxSigs: number, onPage?: (n: number) => void) {
  const out: { signature: string; blockTime: number | null; err: unknown }[] = [];
  let before: string | undefined;
  let reachedGenesis = false;
  while (out.length < maxSigs) {
    const limit = Math.min(1000, maxSigs - out.length);
    const page: any[] = await rpc("getSignaturesForAddress", [addr, before ? { limit, before } : { limit }]);
    for (const x of page) out.push({ signature: x.signature, blockTime: x.blockTime, err: x.err });
    onPage?.(out.length);
    if (page.length < limit) { reachedGenesis = true; break; }
    before = page[page.length - 1].signature;
  }
  return { sigs: out, reachedGenesis };
}
