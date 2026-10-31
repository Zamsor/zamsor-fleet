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
