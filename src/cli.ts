import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fleetsForProfile, fleetLabel, lastActivity, backfillSignatures } from "./sage.js";
import { RPC_URL } from "./rpc.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");
const RAW = process.env.RAW_DIR ?? join(ROOT, "..", "RAW");
// Defaults = Zamsor. Swap via CLI arg or env to track YOUR fleets.
const DEFAULT_PROFILE = process.env.PROFILE ?? "DaFGAcMaQ7gNygyjbTJujzUE5uwKrtXtgRyMCLtV1wvR";
const DEFAULT_FLEET = process.env.FLEET ?? "5F2rn86Pp85Wx5GraLMSZPAq4Y5WA51FhMrSNUu9Kbu4";

const iso = (t: number | null | undefined) => (t ? new Date(t * 1000).toISOString().replace(".000", "") : "n/a");
// Display in Mountain Time (override with TZ_DISPLAY). JSON keeps UTC ISO.
const TZ = process.env.TZ_DISPLAY ?? "America/Denver";
const mt = (t: number | null | undefined) => (t ? new Date(t * 1000).toLocaleString("en-US", { timeZone: TZ, year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }) : "n/a");
const save = (name: string, obj: unknown) => { mkdirSync(DATA, { recursive: true }); const p = join(DATA, name); writeFileSync(p, JSON.stringify(obj, null, 2)); console.log(`\nsaved -> ${p}`); };

async function cmdFleets(profile: string, withActivity: boolean) {
  console.log(`RPC: ${RPC_URL}\nProfile: ${profile}\n`);
  const fleets = await fleetsForProfile(profile);
  const rows: any[] = [];
  for (const f of fleets) {
    const act = withActivity ? await lastActivity(f.fleet) : null;
    rows.push({ ...f, lastSignature: act?.signature ?? null, lastActivity: act ? iso(act.blockTime) : null });
    console.log(`${(f.label || "(blank)").padEnd(32)} ${f.fleet}${act ? "  last: " + mt(act.blockTime) : ""}`);
  }
  console.log(`\n${fleets.length} live fleets`);
  save(`fleets-${profile.slice(0, 8)}.json`, { profile, fetchedAt: new Date().toISOString(), rpc: RPC_URL, fleets: rows });
}

async function cmdFleet(fleet: string) {
  const f = await fleetLabel(fleet);
  if (!f) throw new Error(`Not a live SAGE fleet account: ${fleet} (disbanded, wrong address, or a wallet/profile instead of a fleet)`);
  const act = await lastActivity(fleet);
  // Seed history from RAW pack if present (avoid re-paging 233k sigs)
  let seeded: any = null;
  const local = join(DATA, `sigs-${fleet}.json`);
  const rawFile = join(RAW, "sigs", fleet === "5F2rn86Pp85Wx5GraLMSZPAq4Y5WA51FhMrSNUu9Kbu4" ? "PoorJimmy_5F2rn.json" : `${fleet}.json`);
  // Prefer a local backfill that reached genesis; otherwise a RAW pack if present; else a capped local pull.
  const localFull = existsSync(local) && JSON.parse(readFileSync(local, "utf8")).reachedGenesis === true;
  const sigFile = localFull ? local : existsSync(rawFile) ? rawFile : local;
  if (existsSync(sigFile)) {
    const parsed: any = JSON.parse(readFileSync(sigFile, "utf8"));
    const sigs: any[] = Array.isArray(parsed) ? parsed : parsed.sigs;
    const genesis: boolean | undefined = Array.isArray(parsed) ? undefined : parsed.reachedGenesis;
    const times = sigs.map((s) => s.blockTime).filter(Boolean);
    const lo = times.reduce((a, b) => Math.min(a, b)), hi = times.reduce((a, b) => Math.max(a, b));
    const full = genesis ?? sigs.length % 1000 !== 0;
    seeded = { source: sigFile, sigCount: sigs.length, oldest: iso(lo), newest: iso(hi), oldestMT: mt(lo), newestMT: mt(hi),
      note: full ? "full page-back; oldest = earliest tx" : "capped pull; oldest is NOT creation. Run backfill with a bigger --max" };
  }
  const out = { ...f, currentLabel: f.label, lastActivity: act ? iso(act.blockTime) : null, lastSignature: act?.signature ?? null, seededHistory: seeded, fetchedAt: new Date().toISOString() };
  console.log(`Fleet:          ${fleet}\nCurrent label:  ${f.label}\nOwner profile:  ${f.ownerProfile}\nLast activity:  ${mt(act?.blockTime)}`);
  if (seeded) console.log(`History:        ${seeded.sigCount} sigs, ${seeded.oldestMT} -> ${seeded.newestMT} (${seeded.note})`);
  else console.log(`History:        not seeded yet. Run: npx tsx src/cli.ts backfill ${fleet} --max 5000`);
  save(`fleet-${fleet.slice(0, 8)}.json`, out);
}

async function cmdBackfill(fleet: string, maxSigs: number) {
  const f = await fleetLabel(fleet);
  if (!f) throw new Error(`Not a live SAGE fleet account: ${fleet}`);
  console.log(`Backfilling ${f.label || fleet} (max ${maxSigs} sigs) via ${RPC_URL}`);
  const t0 = Date.now();
  const { sigs, reachedGenesis } = await backfillSignatures(fleet, maxSigs, (n) => process.stdout.write(`\r  ${n} sigs`));
  const times = sigs.map((s) => s.blockTime).filter(Boolean) as number[];
  console.log(`\n${sigs.length} sigs in ${((Date.now() - t0) / 1000).toFixed(1)}s; oldest ${mt(times.length ? times.reduce((a, b) => Math.min(a, b)) : null)}${reachedGenesis ? " (earliest tx = fleet creation)" : " (cap hit; not creation)"}`);
  save(`sigs-${fleet}.json`, { fleet, label: f.label, reachedGenesis, fetchedAt: new Date().toISOString(), sigs });
}

const [cmd, arg, ...rest] = process.argv.slice(2);
const main = async () => {
  if (cmd === "fleets") return cmdFleets(arg && !arg.startsWith("--") ? arg : DEFAULT_PROFILE, rest.includes("--activity") || arg === "--activity");
  if (cmd === "fleet") return cmdFleet(arg ?? DEFAULT_FLEET);
  if (cmd === "backfill") { const all = [arg, ...rest]; const i = all.indexOf("--max"); const max = i >= 0 ? Number(all[i + 1]) : 5000;
    const target = arg && !arg.startsWith("--") ? arg : DEFAULT_FLEET; return cmdBackfill(target, Number.isFinite(max) && max > 0 ? max : 5000); }
  console.log("usage: npx tsx src/cli.ts fleets [PROFILE] [--activity]\n       npx tsx src/cli.ts fleet [FLEET_PUBKEY]\n       npx tsx src/cli.ts backfill [FLEET_PUBKEY] [--max N]");
};
main().catch((e) => { console.error(e.message); process.exit(1); });
