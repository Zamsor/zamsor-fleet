# Zamzer Fleet (cloneable Star Atlas fleet-history tracker)

For Star Atlas builders. Lists the SAGE fleets for any player profile, shows each fleet's current name and last on-chain activity, and takes a snapshot of one fleet. It reads the public Solana RPC only. **No wallet connection and no private keys.**

## Clone and run
```bash
git clone https://github.com/Zamsor/zamsor-fleet.git && cd zamsor-fleet && npm i && npx tsx src/cli.ts fleets
```

```bash
npm i
npx tsx src/cli.ts fleets                      # default profile (Zamsor)
npx tsx src/cli.ts fleets <YOUR_PROFILE> --activity
npx tsx src/cli.ts fleet <FLEET_PUBKEY>        # single-fleet snapshot
npx tsx src/cli.ts backfill <FLEET_PUBKEY> --max 50000   # page tx history back toward creation
```
Times print in Mountain Time (set `TZ_DISPLAY` to change); JSON keeps UTC.
Results are written to `./data/*.json`.

## Track your own fleets
- **PROFILE**: your Star Atlas player-profile pubkey. Pass it as the first argument, or set `PROFILE=...`. This is the profile, not your wallet.
- **FLEET**: any fleet pubkey from the `fleets` output. Pass it as an argument, or set `FLEET=...`.
- The defaults are Zamsor's (`DaFGA…`, plus Poor Jimmy's Airbike `5F2rn…`). Swap them for yours.

## Environment
| var | default | purpose |
|---|---|---|
| `RPC_URL` | `https://api.mainnet-beta.solana.com` | Any Solana RPC. Public endpoints are rate-limited, so a free Helius/Triton key makes `--activity` faster |
| `SAGE_PROGRAM` | `SAGE2HAwep459SNq61LHvjxPk4pLPEJLoMETef7f7EE` | SAGE (Starbased, Solana mainnet) |
| `RAW_DIR` | `../RAW` | Optional pre-pulled signature files (`sigs/<fleet>.json`) used to seed history |

## How it works
- `getProgramAccounts` on SAGE, filtered by the Fleet discriminator and `ownerProfile` (offset 41). The label is read from 32 bytes at offset 170.
- Last activity comes from `getSignaturesForAddress(fleet, limit 1)`.
- `backfill` pages `getSignaturesForAddress` newest to oldest until it hits the fleet's first transaction or `--max` (about 1.7 s per 1,000 sigs on public RPC). It says plainly whether the oldest tx is the fleet's creation or just where the cap stopped.
- `fleet` uses a completed backfill first, then a RAW pack if present, then a capped backfill.
- Addresses that aren't live SAGE fleet accounts (a wallet, a profile, a disbanded fleet) are rejected with a clear error.

## Scope note
This is a tool, not a story. It shows you the on-chain record. Any storytelling call to action lives in the article, not in this tool.
