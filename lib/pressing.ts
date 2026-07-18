"use client";

/**
 * Pressings — collect a match as a Token-2022 NFT, minted by the visitor's
 * own wallet on devnet. No Metaplex: the metadata lives ON the mint account
 * via the MetadataPointer + TokenMetadata extensions (the same token program
 * TxLINE itself uses). Two fields make it a *provable* pressing:
 *   dataHash — sha256 of the canonical track record rendered in the app
 *   oddsRoot — the Merkle sub-tree root TxODDS committed on-chain for the
 *              record's batch (fetched live from /api/odds/validation)
 */
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  AuthorityType,
  ExtensionType,
  LENGTH_SIZE,
  TOKEN_2022_PROGRAM_ID,
  TYPE_SIZE,
  createAssociatedTokenAccountInstruction,
  createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  getAssociatedTokenAddressSync,
  getMintLen,
} from "@solana/spl-token";
import {
  createInitializeInstruction,
  createUpdateFieldInstruction,
  pack,
  type TokenMetadata,
} from "@solana/spl-token-metadata";
import { Connection, Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import { useMemo, useSyncExternalStore } from "react";
import { TXLINE, apiGet, type TxlineSession } from "@/lib/txline";
import { abbr, trackNumber, type Track } from "@/lib/tracks";
import { toBytes32 } from "@/lib/verifyOnChain";

// Pressings are keyed by the wallet that minted them — a different wallet
// connecting in the same browser gets its own (empty) shelf.
const keyFor = (owner: string) => `encore.pressings.v1.${owner}`;

export type Pressing = { trackId: number; mint: string; sig: string; at: number };

export function readPressings(owner: string | null): Pressing[] {
  if (typeof window === "undefined" || !owner) return [];
  try {
    const raw = JSON.parse(localStorage.getItem(keyFor(owner)) ?? "[]");
    return Array.isArray(raw) ? (raw as Pressing[]) : [];
  } catch {
    return [];
  }
}

const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener("pressings", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("pressings", cb);
  };
};

/** SSR-safe shelf of pressings minted by this wallet, newest first. */
export function usePressings(owner: string | null): Pressing[] {
  const json = useSyncExternalStore(
    subscribe,
    () => (owner ? localStorage.getItem(keyFor(owner)) ?? "[]" : "[]"),
    () => "[]"
  );
  return useMemo(() => {
    try {
      const raw = JSON.parse(json);
      return Array.isArray(raw) ? (raw as Pressing[]) : [];
    } catch {
      return [];
    }
  }, [json]);
}

function logPressing(owner: string, p: Pressing) {
  localStorage.setItem(
    keyFor(owner),
    JSON.stringify([p, ...readPressings(owner)])
  );
  window.dispatchEvent(new Event("pressings"));
}

/** The canonical record of the match as this app renders it. */
export function canonicalRecord(t: Track) {
  return {
    fixtureId: t.id,
    participants: [t.p1, t.p2],
    kickoff: t.kickoff,
    stage: t.stage,
    score: t.score,
    outcome: t.outcome,
    opening: t.opening,
    closing: t.closing,
    wave: t.wave,
  };
}

export async function dataHashHex(t: Track): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(canonicalRecord(t)));
  const digest = await crypto.subtle.digest("SHA-256", bytes.buffer as ArrayBuffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type OddsRow = { MessageId: string; Ts: number; SuperOddsType: string };

/**
 * The Merkle sub-tree root TxODDS committed for this match's odds batch —
 * the on-chain anchor the pressing points at. Null if the proof endpoint
 * has nothing for this record.
 */
export async function fetchOddsRoot(
  session: TxlineSession,
  track: Track
): Promise<string | null> {
  try {
    let row: OddsRow | undefined;
    for (const min of [115, 100, 85, 60, 45, 20, 0]) {
      const rows = await apiGet<OddsRow[]>(
        session,
        `/odds/snapshot/${track.id}?asOf=${track.kickoff + min * 60 * 1000}`
      );
      row =
        rows.find((r) => r.SuperOddsType === "1X2_PARTICIPANT_RESULT") ??
        rows[0];
      if (row) break;
    }
    if (!row) return null;
    const validation = await apiGet<{
      summary: { oddsSubTreeRoot: number[] | string };
    }>(
      session,
      `/odds/validation?messageId=${encodeURIComponent(row.MessageId)}&ts=${row.Ts}`
    );
    return toBytes32(validation.summary.oddsSubTreeRoot)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}

export type PressStep = "hash" | "root" | "sign" | "confirm" | "done";

/**
 * Mint the pressing: one wallet-signed transaction that creates the mint,
 * writes the metadata (incl. dataHash + oddsRoot), mints the single copy to
 * the collector, then destroys the mint authority. Edition of one, forever.
 */
export async function pressRecord(
  wallet: WalletContextState,
  session: TxlineSession,
  track: Track,
  onStep: (s: PressStep) => void
): Promise<Pressing> {
  if (!wallet.publicKey || !wallet.signTransaction)
    throw new Error("wallet must support transaction signing");
  const payer = wallet.publicKey;
  const connection = new Connection(TXLINE.rpcUrl, "confirmed");

  onStep("hash");
  const dataHash = await dataHashHex(track);
  onStep("root");
  const oddsRoot = await fetchOddsRoot(session, track);

  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  const metadata: TokenMetadata = {
    mint,
    name: `ENCORE ${String(trackNumber(track)).padStart(3, "0")} ${abbr(track.p1)}v${abbr(track.p2)}`,
    symbol: "PRESS",
    uri: `${location.origin}/track/${track.id}/pressing.json`,
    additionalMetadata: [
      ["fixtureId", String(track.id)],
      ["stage", track.stage],
      ["dataHash", dataHash],
      ...(oddsRoot ? ([["oddsRoot", oddsRoot]] as [string, string][]) : []),
    ],
  };

  const mintLen = getMintLen([ExtensionType.MetadataPointer]);
  const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;
  const lamports = await connection.getMinimumBalanceForRentExemption(
    mintLen + metadataLen
  );

  const ata = getAssociatedTokenAddressSync(
    mint,
    payer,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeMetadataPointerInstruction(
      mint,
      payer,
      mint,
      TOKEN_2022_PROGRAM_ID
    ),
    createInitializeMintInstruction(mint, 0, payer, null, TOKEN_2022_PROGRAM_ID),
    createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      mint,
      metadata: mint,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      mintAuthority: payer,
      updateAuthority: payer,
    }),
    ...metadata.additionalMetadata.map(([field, value]) =>
      createUpdateFieldInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        metadata: mint,
        updateAuthority: payer,
        field,
        value,
      })
    ),
    createAssociatedTokenAccountInstruction(
      payer,
      ata,
      payer,
      mint,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    ),
    createMintToInstruction(mint, ata, payer, 1, [], TOKEN_2022_PROGRAM_ID),
    createSetAuthorityInstruction(
      mint,
      payer,
      AuthorityType.MintTokens,
      null,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );

  onStep("sign");
  const blockhash = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash.blockhash;
  tx.feePayer = payer;
  tx.partialSign(mintKeypair);
  const signed = await wallet.signTransaction(tx);

  onStep("confirm");
  const sig = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(
    {
      signature: sig,
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
    },
    "confirmed"
  );

  const pressing: Pressing = {
    trackId: track.id,
    mint: mint.toBase58(),
    sig,
    at: Date.now(),
  };
  logPressing(payer.toBase58(), pressing);
  onStep("done");
  return pressing;
}

export const explorerUrl = (addressOrSig: string, isTx = false) =>
  `https://explorer.solana.com/${isTx ? "tx" : "address"}/${addressOrSig}?cluster=devnet`;
