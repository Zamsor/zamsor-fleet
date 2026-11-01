# BUILD_STATUS: fleet-history-tool (Oct 29, 2026, ~9:30 PM MDT)

## Works (verified end-to-end against public mainnet RPC)
- `npm i` and `npx tsc` both run clean (deps: bs58, tsx, typescript).
- `fleets [PROFILE] [--activity]`: returns all 33 live fleets for DaFGA… with their real labels. With `--activity`, the last tx per fleet is added (~35 s on public RPC). Output goes to `data/fleets-<profile>.json`.
- `fleet [FLEET]`: current label, owner, and last activity. For Poor Jimmy it seeds from RAW: 233,598 sigs, first tx 2024-04-25 7:14 PM MDT, which matches the CreateFleet in the pack. Output goes to `data/fleet-<id>.json`.
- On-chain corrections to the pack: the label `5tApwo…` reads **"696"**, not blank. The full label is **"Stuffed ThinCrust Cut in Squares"**, not truncated.

## Stubbed / not built
- Signature **backfill** command (page `getSignaturesForAddress` to genesis, then write to data/). This is needed for creation dates on the other 32 fleets. It takes about 7 min per active fleet on public RPC.
- Rename detection: no instruction decoding yet. Disbanded fleets are invisible.
- SQLite: JSON only for now.
- C4 / z.ink via @aephia/atlas-kit is not attempted (ZAM-06: the proven mainnet path came first). The pack data is mainnet SAGE.
- Output timestamps are UTC ISO and need to be converted to MT for display.

## Risks for Sat rehearsal
- Public RPC rate limits or `getProgramAccounts` refusals. Mitigation: set `RPC_URL` to a free keyed endpoint and keep data/*.json as a fallback.
- `fleet` history for non-Jimmy fleets depends on RAW files that aren't shipped with a clone. A cloner only gets the label and last activity until backfill exists.
- Fleet account layout offsets are hardcoded (41/170). A SAGE upgrade would break them.
- If the article claims C4/z.ink, this tool is mainnet SAGE only.

## Friday dry run checklist
1. Fresh clone into /tmp, then `npm i`, `fleets --activity`, and `fleet`.
2. Add a `backfill <fleet> [--max N]` command and test it on one dormant fleet (small).
3. Display MT times.
4. Optionally test another player's profile to prove it can be cloned.

## Friday dry run — Oct 30, 2026 ~9:10–9:30 PM MDT (fresh copy in /tmp, no RAW, public RPC)
- PASS: `npm i` + `tsc` clean; `fleets --activity` = 33 fleets with labels in ~29–34 s; `fleet` default works without RAW (label + last activity) and with RAW (233,598 sigs, first tx Apr 25, 2024 7:14 PM MDT).
- FIXED: `fleet` accepted any address (system program / profile pubkey printed as a blank fleet, exit 0). Now checks SAGE owner + Fleet discriminator, exits 1 with a clear message.
- ADDED: `backfill <fleet> [--max N]` (default 5000) → data/sigs-<fleet>.json with reachedGenesis flag; `fleet` reads it. Tested: 2 Live Crew 60k sigs in 104 s, cap hit (oldest Mar 22, 2025 — not creation); Poor Jimmy 3k capped in ~7 s.
- ADDED: Mountain Time display (TZ_DISPLAY override); JSON stays UTC ISO.
- NOT DONE: second player's profile test (no other profile pubkey on hand); rename detection; SQLite; real `git clone` (SK5K/zamsor-fleet not visible to Cursor — not created or not granted).
- Note: "dormant" crew fleets have deep history (2 Live Crew >60k sigs), so creation dates for every fleet = minutes each; demo should backfill ONE fleet live, not all 33.

## Saturday rehearsal — Oct 31, 2026 ~10:12 AM MDT
- **PASS.** Fresh /tmp from `zamsor-fleet-push.tar.gz` (same tree as private Zamsor/zamsor-fleet), no RAW, public Solana RPC, real Zamsor profile.
- `npm i` + `tsc` clean; `fleets --activity` = 33 fleets w/ MT last-activity ~57s; many active this morning.
- Poor Jimmy: `fleet` pre-backfill correctly unsseeded; `backfill --max 3000` → 3000 txs / 13.8s, cap hit; then history Oct 17–Oct 31.
- Non-fleet (profile) address rejected with clear message (exit code still 0 — fix later, not Monday blocker).
- Sunday ZAM-06 proof still safe; no scope cut. One-shot Sat rehearsal routine deleted.

## Sun Nov 1 ZAM-06 formal proof (Nov 1, 2026, 4:19–4:21 AM MST): **PASS**
- Tree: a fresh /tmp/zam06 extracted from `zamsor-fleet-push.tar.gz` (sha256 75a1b72f…c83a). `src/cli.ts`, `sage.ts`, and `rpc.ts` were diffed against private Zamsor/zamsor-fleet via Cursor GitHub (read-only) and are **identical**. `git clone` over plain https was not possible (no box git creds), so the tarball was the shipped-tree proxy. RAW_DIR was set to a nonexistent path, so there was no RAW. Public RPC `api.mainnet-beta.solana.com`, no key.
1. PASS: `npm i` + `npx tsc --noEmit` clean.
2. PASS: `fleets --activity` = **33 live fleets** with labels in 22.3 s. 17 were active within the last hour (e.g. Willy Wonka and Cool Hand Luke at 4:19 AM MST).
3. PASS: `fleet 5F2rn…` returns label "Poor Jimmy's Airbike", owner DaFGA…, last activity Nov 1, 2026 3:47 AM MST. Before backfill it correctly reports "not seeded yet".
4. PASS: profile DaFGA… and system program 1111… both get "Not a live SAGE fleet account…" with **exit 1**. The Saturday exit-0 issue no longer reproduces.
5. PASS: `backfill 5F2rn… --max 3000` = 3000 sigs in 1.8 s, oldest Oct 18, 2026 3:16 PM MDT, labeled honestly as "cap hit; not creation". `fleet` then shows history from Oct 18 to Nov 1.
6. PASS: no RAW, .env, keypair, pem, or token patterns in the tree. The tarball has 0 RAW entries, and `.gitignore` excludes node_modules and data/*.json.
- No scope cut. Known limits are unchanged: mainnet SAGE only, no rename detection, and full creation-date backfill takes minutes per active fleet.
