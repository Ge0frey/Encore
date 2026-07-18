"use client";

/**
 * On-chain proof verification — the proof is not just fetched, it is run
 * through the TxLINE program itself. `validate_odds` is a read-only `.view()`
 * instruction: the browser simulates it against devnet and the program
 * recomputes the Merkle branch up to the root TxODDS committed on-chain.
 * No signature, no fee — but the verdict comes from the program, not us.
 */
import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { ComputeBudgetProgram, Connection, PublicKey } from "@solana/web3.js";
import idl from "@/lib/txoracle.devnet.json";
import { TXLINE } from "@/lib/txline";

/** Shape of GET /api/odds/validation (OpenAPI: OddsValidation). */
export type OddsValidationResponse = {
  odds: {
    FixtureId: number;
    MessageId: string;
    Ts: number;
    Bookmaker: string;
    BookmakerId: number;
    SuperOddsType: string;
    GameState?: string | null;
    InRunning: boolean;
    MarketParameters?: string | null;
    MarketPeriod?: string | null;
    PriceNames?: string[];
    Prices?: number[];
  };
  summary: {
    fixtureId: number;
    updateStats: {
      updateCount: number;
      minTimestamp: number;
      maxTimestamp: number;
    };
    oddsSubTreeRoot: number[] | string;
  };
  subTreeProof: ProofNodeJson[] | Record<string, never>;
  mainTreeProof: ProofNodeJson[] | Record<string, never>;
};

/** The API serialises 32-byte hashes as either byte arrays or strings. */
type HashJson = number[] | string;
type ProofNodeJson = { hash: HashJson; isRightSibling: boolean };

export type OnChainVerdict = {
  ok: boolean;
  /** daily_batch_roots PDA the program checked against */
  pda: string;
  epochDay: number;
  /** sub-tree root from the proof, hex, for display */
  root: string;
};

/** byte array, hex (with/without 0x), or base64 → number[32]. */
export function toBytes32(value: HashJson): number[] {
  let bytes: Uint8Array;
  if (Array.isArray(value)) {
    bytes = Uint8Array.from(value);
  } else {
    const hex = value.startsWith("0x") ? value.slice(2) : value;
    bytes = /^[0-9a-fA-F]{64}$/.test(hex)
      ? Uint8Array.from(hex.match(/.{2}/g)!.map((b) => parseInt(b, 16)))
      : Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  }
  if (bytes.length !== 32)
    throw new Error(`expected 32-byte hash, got ${bytes.length}`);
  return Array.from(bytes);
}

const toHex = (bytes: number[]) =>
  bytes.map((b) => b.toString(16).padStart(2, "0")).join("");

function toProofNodes(
  proof: ProofNodeJson[] | Record<string, never> | null | undefined
) {
  if (!Array.isArray(proof)) return [];
  return proof.map((n) => ({
    hash: toBytes32(n.hash),
    isRightSibling: n.isRightSibling,
  }));
}

/** Anchor provider that can only simulate — signing is a bug, so it throws. */
function readOnlyProgram(walletPubkey: string) {
  const connection = new Connection(TXLINE.rpcUrl, "confirmed");
  const provider = new anchor.AnchorProvider(
    connection,
    {
      publicKey: new PublicKey(walletPubkey),
      signTransaction: async () => {
        throw new Error("read-only provider cannot sign");
      },
      signAllTransactions: async () => {
        throw new Error("read-only provider cannot sign");
      },
    } as unknown as anchor.Wallet,
    { commitment: "confirmed" }
  );
  return new anchor.Program(idl as anchor.Idl, provider);
}

/**
 * Ask the TxLINE program whether this odds record belongs to the Merkle root
 * committed on-chain for its 5-minute batch. Returns the program's verdict;
 * throws only on transport/setup failures.
 */
export async function verifyOddsOnChain(
  walletPubkey: string,
  validation: OddsValidationResponse
): Promise<OnChainVerdict> {
  const program = readOnlyProgram(walletPubkey);
  const o = validation.odds;
  const s = validation.summary;

  const oddsSnapshot = {
    fixtureId: new BN(o.FixtureId),
    messageId: o.MessageId,
    ts: new BN(o.Ts),
    bookmaker: o.Bookmaker,
    bookmakerId: o.BookmakerId,
    superOddsType: o.SuperOddsType,
    gameState: o.GameState ?? null,
    inRunning: o.InRunning,
    marketParameters: o.MarketParameters ?? null,
    marketPeriod: o.MarketPeriod ?? null,
    priceNames: o.PriceNames ?? [],
    prices: o.Prices ?? [],
  };

  const rootBytes = toBytes32(s.oddsSubTreeRoot);
  const summary = {
    fixtureId: new BN(s.fixtureId),
    updateStats: {
      updateCount: s.updateStats.updateCount,
      minTimestamp: new BN(s.updateStats.minTimestamp),
      maxTimestamp: new BN(s.updateStats.maxTimestamp),
    },
    oddsSubTreeRoot: rootBytes,
  };

  const epochDay = Math.floor(o.Ts / 86_400_000);
  const [dailyBatchRootsPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("daily_batch_roots"),
      new BN(epochDay).toArrayLike(Buffer, "le", 2),
    ],
    program.programId
  );

  const ok: boolean = await program.methods
    .validateOdds(
      new BN(o.Ts),
      oddsSnapshot,
      summary,
      toProofNodes(validation.subTreeProof),
      toProofNodes(validation.mainTreeProof)
    )
    .accounts({ dailyOddsMerkleRoots: dailyBatchRootsPda })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
    ])
    .view();

  return {
    ok,
    pda: dailyBatchRootsPda.toBase58(),
    epochDay,
    root: toHex(rootBytes),
  };
}

/** One provable key-value stat (key 1 = P1 goals, 2 = P2 goals; ×1000 period). */
export type StatToProve = { key: number; value: number; period: number };

/** Shape of GET /api/scores/stat-validation (OpenAPI: ScoresStatValidation). */
export type ScoresStatValidationResponse = {
  ts?: number;
  statToProve: StatToProve;
  eventStatRoot: HashJson;
  summary: {
    fixtureId: number;
    updateStats: {
      updateCount: number;
      minTimestamp: number;
      maxTimestamp: number;
    };
    eventStatsSubTreeRoot: HashJson;
  };
  statProof: ProofNodeJson[] | Record<string, never>;
  subTreeProof: ProofNodeJson[] | Record<string, never>;
  mainTreeProof: ProofNodeJson[] | Record<string, never>;
  statToProve2?: StatToProve | null;
  statProof2?: ProofNodeJson[] | Record<string, never> | null;
};

export type StatVerdict = OnChainVerdict & { stat: StatToProve };

/**
 * Ask the TxLINE program whether a claimed stat value matches the score data
 * committed on-chain: `validate_stat` recomputes stat → event → fixture →
 * daily root and rules on the predicate. Read-only `.view()`, like the odds
 * check. A false/PredicateFailed outcome means "the claim is wrong", not a
 * transport fault.
 */
export async function verifyStatOnChain(
  walletPubkey: string,
  validation: ScoresStatValidationResponse,
  opts: {
    which?: 1 | 2;
    predicate: {
      threshold: number;
      comparison: "equalTo" | "greaterThan" | "lessThan";
    };
  }
): Promise<StatVerdict> {
  const program = readOnlyProgram(walletPubkey);
  const s = validation.summary;

  const statToProve =
    opts.which === 2 ? validation.statToProve2 : validation.statToProve;
  const statProof =
    opts.which === 2 ? validation.statProof2 : validation.statProof;
  if (!statToProve) throw new Error("validation response has no second stat");

  const rootBytes = toBytes32(s.eventStatsSubTreeRoot);
  // API field is eventStatsSubTreeRoot; the program struct calls it
  // events_sub_tree_root → Anchor camelCase eventsSubTreeRoot.
  const fixtureSummary = {
    fixtureId: new BN(s.fixtureId),
    updateStats: {
      updateCount: s.updateStats.updateCount,
      minTimestamp: new BN(s.updateStats.minTimestamp),
      maxTimestamp: new BN(s.updateStats.maxTimestamp),
    },
    eventsSubTreeRoot: rootBytes,
  };

  const statTerm = {
    statToProve,
    eventStatRoot: toBytes32(validation.eventStatRoot),
    statProof: toProofNodes(statProof),
  };

  const predicate = {
    threshold: opts.predicate.threshold,
    comparison: { [opts.predicate.comparison]: {} },
  };

  const run = async (ts: number): Promise<StatVerdict> => {
    const epochDay = Math.floor(ts / 86_400_000);
    const [pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("daily_scores_roots"),
        new BN(epochDay).toArrayLike(Buffer, "le", 2),
      ],
      program.programId
    );
    let ok: boolean;
    try {
      ok = await program.methods
        .validateStat(
          new BN(ts),
          fixtureSummary,
          toProofNodes(validation.subTreeProof),
          toProofNodes(validation.mainTreeProof),
          predicate,
          statTerm,
          null,
          null
        )
        .accounts({ dailyScoresMerkleRoots: pda })
        .preInstructions([
          ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
        ])
        .view();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("PredicateFailed")) throw e;
      ok = false;
    }
    return {
      ok,
      pda: pda.toBase58(),
      epochDay,
      root: toHex(rootBytes),
      stat: statToProve,
    };
  };

  const primary = s.updateStats.minTimestamp;
  try {
    return await run(primary);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const alt = validation.ts;
    if (
      alt &&
      alt !== primary &&
      /TimeSlotMismatch|TimestampMismatch/.test(msg)
    )
      return run(alt);
    throw e;
  }
}

/** Human-sized message for a failed simulation (anchor errors are noisy). */
export function verifyErrorMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const known = [
    ["InvalidSubTreeProof", "sub-tree proof rejected — snapshot ∉ summary"],
    ["InvalidMainTreeProof", "main proof rejected — summary ∉ on-chain root"],
    ["RootNotAvailable", "no Merkle root posted on-chain for this time slot"],
    ["TimeSlotMismatch", "snapshot and on-chain root disagree on time slot"],
    ["TimestampMismatch", "timestamp does not match the snapshot payload"],
    ["PredicateFailed", "the program ran the proof — the claimed value is wrong"],
    ["InvalidStatProof", "stat proof rejected — stat ∉ event"],
    ["InvalidFixtureSubTreeProof", "fixture proof rejected — event ∉ fixture summary"],
  ] as const;
  for (const [code, msg] of known) if (raw.includes(code)) return msg;
  return raw.length > 200 ? `${raw.slice(0, 200)}…` : raw;
}
