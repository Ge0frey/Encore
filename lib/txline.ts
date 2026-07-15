"use client";

/**
 * Client-side TxLINE access — everything happens in the visitor's browser:
 *   1. guest JWT from /auth/guest/start
 *   2. on-chain `subscribe` (free World Cup tier) signed by the connected wallet
 *   3. wallet-signed activation -> API token
 *   4. data calls & SSE straight to the TxLINE API (CORS is open)
 * Nothing is baked into the app; sessions are cached per-wallet in localStorage.
 */
import * as anchor from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import idl from "@/lib/txoracle.devnet.json";

export const TXLINE = {
  apiOrigin: "https://txline-dev.txodds.com",
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com",
  programId: "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J",
  txlTokenMint: "4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG",
  serviceLevel: 1, // free World Cup & Int Friendlies tier on devnet
  weeks: 4,
  network: "devnet" as const,
};

export type TxlineSession = {
  wallet: string;
  jwt: string;
  apiToken: string;
  txSig: string;
  activatedAt: number;
};

const storageKey = (pubkey: string) => `encore.txline.${pubkey}`;

export function loadSession(pubkey: string): TxlineSession | null {
  try {
    const raw = localStorage.getItem(storageKey(pubkey));
    if (!raw) return null;
    const s = JSON.parse(raw) as TxlineSession;
    // JWT lives 30 days; re-provision sessions older than 25.
    if (Date.now() - s.activatedAt > 25 * 24 * 3600 * 1000) return null;
    return s;
  } catch {
    return null;
  }
}

export function clearSession(pubkey: string) {
  localStorage.removeItem(storageKey(pubkey));
}

async function guestJwt(): Promise<string> {
  const res = await fetch(`${TXLINE.apiOrigin}/auth/guest/start`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`guest auth failed: ${res.status}`);
  return (await res.json()).token;
}

export type ProvisionStep = "jwt" | "subscribe" | "sign" | "activate" | "done";

/**
 * Full provisioning flow for a connected wallet (one tx, one message signature).
 * Needs a little devnet SOL on the wallet for rent + fees.
 */
export async function provision(
  wallet: WalletContextState,
  onStep: (s: ProvisionStep) => void
): Promise<TxlineSession> {
  if (!wallet.publicKey || !wallet.signTransaction || !wallet.signMessage)
    throw new Error("Wallet must support transaction and message signing");
  const user = wallet.publicKey;

  const cached = loadSession(user.toBase58());
  if (cached) {
    onStep("done");
    return cached;
  }

  onStep("jwt");
  const jwt = await guestJwt();

  const connection = new Connection(TXLINE.rpcUrl, "confirmed");
  const programId = new PublicKey(TXLINE.programId);
  const tokenMint = new PublicKey(TXLINE.txlTokenMint);

  const provider = new anchor.AnchorProvider(
    connection,
    {
      publicKey: user,
      signTransaction: wallet.signTransaction.bind(wallet),
      signAllTransactions:
        wallet.signAllTransactions?.bind(wallet) ??
        (async (txs: Transaction[]) => {
          const out: Transaction[] = [];
          for (const t of txs) out.push(await wallet.signTransaction!(t));
          return out;
        }),
    } as anchor.Wallet,
    { commitment: "confirmed" }
  );
  const program = new anchor.Program(idl as anchor.Idl, provider);

  const userTokenAccount = getAssociatedTokenAddressSync(
    tokenMint,
    user,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pricing_matrix")],
    programId
  );
  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_treasury_v2")],
    programId
  );
  const tokenTreasuryVault = getAssociatedTokenAddressSync(
    tokenMint,
    tokenTreasuryPda,
    true,
    TOKEN_2022_PROGRAM_ID
  );

  onStep("subscribe");
  const subscribeIx = await program.methods
    .subscribe(TXLINE.serviceLevel, TXLINE.weeks)
    .accounts({
      user,
      pricingMatrix: pricingMatrixPda,
      tokenMint,
      userTokenAccount,
      tokenTreasuryVault,
      tokenTreasuryPda,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .instruction();

  const tx = new Transaction();
  // Free tier still requires the TxL Token-2022 ATA to exist.
  if (!(await connection.getAccountInfo(userTokenAccount))) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        user,
        userTokenAccount,
        user,
        tokenMint,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }
  tx.add(subscribeIx);

  const blockhash = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash.blockhash;
  tx.feePayer = user;
  const signed = await wallet.signTransaction(tx);
  const txSig = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(
    {
      signature: txSig,
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
    },
    "confirmed"
  );

  // Strict activation message binding: txSig + leagues (empty) + jwt
  onStep("sign");
  const message = new TextEncoder().encode(`${txSig}::${jwt}`);
  const sigBytes = await wallet.signMessage(message);
  const walletSignature = btoa(String.fromCharCode(...sigBytes));

  onStep("activate");
  const res = await fetch(`${TXLINE.apiOrigin}/api/token/activate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ txSig, walletSignature, leagues: [] }),
  });
  if (!res.ok)
    throw new Error(`activation failed: ${res.status} ${await res.text()}`);
  // The endpoint may answer with JSON ({token} / bare string) or plain text.
  const rawBody = await res.text();
  let apiToken: string | null = null;
  try {
    const parsed = JSON.parse(rawBody);
    apiToken =
      typeof parsed === "string"
        ? parsed
        : (parsed?.token ?? parsed?.apiToken ?? null);
  } catch {
    apiToken = rawBody.trim().replace(/^"|"$/g, "") || null;
  }
  if (!apiToken) throw new Error("activation returned no token");

  const session: TxlineSession = {
    wallet: user.toBase58(),
    jwt,
    apiToken,
    txSig,
    activatedAt: Date.now(),
  };
  localStorage.setItem(storageKey(session.wallet), JSON.stringify(session));
  onStep("done");
  return session;
}

/** GET a TxLINE data endpoint with a provisioned session, straight from the browser. */
export async function apiGet<T>(
  session: TxlineSession,
  path: string
): Promise<T> {
  const res = await fetch(`${TXLINE.apiOrigin}/api${path}`, {
    headers: {
      Authorization: `Bearer ${session.jwt}`,
      "X-Api-Token": session.apiToken,
    },
  });
  if (!res.ok) throw new Error(`TxLINE ${path}: ${res.status}`);
  return res.json();
}

/**
 * Subscribe to the live odds SSE stream for one fixture.
 * EventSource can't send headers, so we parse the stream from fetch().
 * Returns an abort function.
 */
export function streamOdds(
  session: TxlineSession,
  fixtureId: number | null,
  onEvent: (data: Record<string, unknown>) => void,
  onStatus: (s: "open" | "closed" | "error") => void
): () => void {
  const ctrl = new AbortController();
  const url =
    `${TXLINE.apiOrigin}/api/odds/stream` +
    (fixtureId ? `?fixtureId=${fixtureId}` : "");
  (async () => {
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.jwt}`,
          "X-Api-Token": session.apiToken,
          Accept: "text/event-stream",
        },
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        onStatus("error");
        return;
      }
      onStatus("open");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const frames = buf.split("\n\n");
        buf = frames.pop() ?? "";
        for (const frame of frames) {
          if (/^event:\s*heartbeat/m.test(frame)) continue;
          const dataLines = frame
            .split("\n")
            .filter((l) => l.startsWith("data:"))
            .map((l) => l.slice(5).trim());
          if (!dataLines.length) continue;
          try {
            const parsed = JSON.parse(dataLines.join("\n"));
            onEvent(parsed);
          } catch {
            /* heartbeat or partial — ignore */
          }
        }
      }
      onStatus("closed");
    } catch (e) {
      if (!ctrl.signal.aborted) onStatus("error");
    }
  })();
  return () => ctrl.abort();
}
