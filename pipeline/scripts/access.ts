/**
 * ENCORE — TxLINE access bootstrap.
 * Guest JWT -> on-chain subscribe (free tier) -> /api/token/activate -> smoke-test data.
 *
 * Usage:
 *   NETWORK=devnet  npx ts-node scripts/access.ts
 *   NETWORK=mainnet SERVICE_LEVEL=12 npx ts-node scripts/access.ts
 *
 * Wallet: _keys/<network>-wallet.json (created by solana-keygen beforehand).
 * Output: data/credentials.<network>.json { jwt, apiToken, txSig, wallet }
 */
import * as anchor from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import axios from "axios";
import nacl from "tweetnacl";
import * as fs from "fs";
import * as path from "path";

const NETWORK = (process.env.NETWORK || "devnet") as "devnet" | "mainnet";
const SERVICE_LEVEL = parseInt(process.env.SERVICE_LEVEL || "1", 10);
const DURATION_WEEKS = 4;
const SELECTED_LEAGUES: number[] = [];

const CONFIG = {
  mainnet: {
    rpcUrl: process.env.RPC_URL || "https://api.mainnet-beta.solana.com",
    apiOrigin: "https://txline.txodds.com",
    programId: "9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA",
    txlTokenMint: "Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL",
    idl: "../idl/txoracle.mainnet.json",
  },
  devnet: {
    rpcUrl: process.env.RPC_URL || "https://api.devnet.solana.com",
    apiOrigin: "https://txline-dev.txodds.com",
    programId: "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J",
    txlTokenMint: "4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG",
    idl: "../idl/txoracle.devnet.json",
  },
}[NETWORK];

const WORLD_CUP_COMPETITION_ID = 72;

async function main() {
  const walletPath = path.join(__dirname, "..", "_keys", `${NETWORK}-wallet.json`);
  const secret = Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf8")));
  const user = Keypair.fromSecretKey(secret);
  console.log(`[${NETWORK}] wallet: ${user.publicKey.toBase58()}`);

  const connection = new Connection(CONFIG.rpcUrl, "confirmed");
  const balance = await connection.getBalance(user.publicKey);
  console.log(`balance: ${balance / 1e9} SOL`);
  if (balance < 5_000_000) throw new Error("Wallet needs at least 0.005 SOL for rent + fees");

  const wallet = new anchor.Wallet(user);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);
  const idl = JSON.parse(fs.readFileSync(path.join(__dirname, CONFIG.idl), "utf8"));
  const program = new anchor.Program(idl, provider);
  if (program.programId.toBase58() !== CONFIG.programId) {
    throw new Error(`IDL program ${program.programId.toBase58()} != expected ${CONFIG.programId}`);
  }

  // 1. Guest JWT
  const jwt = (await axios.post(`${CONFIG.apiOrigin}/auth/guest/start`)).data.token;
  console.log("guest JWT acquired");

  const tokenMint = new PublicKey(CONFIG.txlTokenMint);
  const userTokenAccount = getAssociatedTokenAddressSync(tokenMint, user.publicKey, false, TOKEN_2022_PROGRAM_ID);

  // 2. Ensure Token-2022 ATA exists (free tier still requires the account)
  if (!(await connection.getAccountInfo(userTokenAccount))) {
    console.log("creating TxL Token-2022 ATA...");
    const tx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        user.publicKey, userTokenAccount, user.publicKey, tokenMint,
        TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
    await sendAndConfirmTransaction(connection, tx, [user], { commitment: "confirmed" });
    await new Promise((r) => setTimeout(r, 3000));
  }

  // 3. Subscribe on-chain (free tier: 0 TxL, gas only)
  const [pricingMatrixPda] = PublicKey.findProgramAddressSync([Buffer.from("pricing_matrix")], program.programId);
  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync([Buffer.from("token_treasury_v2")], program.programId);
  const tokenTreasuryVault = getAssociatedTokenAddressSync(tokenMint, tokenTreasuryPda, true, TOKEN_2022_PROGRAM_ID);

  console.log(`subscribing: service level ${SERVICE_LEVEL}, ${DURATION_WEEKS} weeks...`);
  const tx = await (program.methods as any)
    .subscribe(SERVICE_LEVEL, DURATION_WEEKS)
    .accounts({
      user: user.publicKey,
      pricingMatrix: pricingMatrixPda,
      tokenMint,
      userTokenAccount,
      tokenTreasuryVault,
      tokenTreasuryPda,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  const blockhash = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash.blockhash;
  tx.feePayer = user.publicKey;
  tx.sign(user);
  const txSig = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction(
    { signature: txSig, blockhash: blockhash.blockhash, lastValidBlockHeight: blockhash.lastValidBlockHeight },
    "confirmed"
  );
  console.log(`subscribe confirmed: ${txSig}`);

  // 4. Activate API token
  const message = new TextEncoder().encode(`${txSig}:${SELECTED_LEAGUES.join(",")}:${jwt}`);
  const walletSignature = Buffer.from(nacl.sign.detached(message, user.secretKey)).toString("base64");
  const activation = await axios.post(
    `${CONFIG.apiOrigin}/api/token/activate`,
    { txSig, walletSignature, leagues: SELECTED_LEAGUES },
    { headers: { Authorization: `Bearer ${jwt}` } }
  );
  const apiToken = activation.data.token || activation.data;
  console.log("API token activated");

  const outPath = path.join(__dirname, "..", "data", `credentials.${NETWORK}.json`);
  fs.writeFileSync(outPath, JSON.stringify({
    network: NETWORK, wallet: user.publicKey.toBase58(), txSig, jwt, apiToken,
    apiOrigin: CONFIG.apiOrigin, activatedAt: new Date().toISOString(),
  }, null, 2));
  console.log(`credentials saved -> ${outPath}`);

  // 5. Smoke test: World Cup fixtures + one odds snapshot
  const headers = { Authorization: `Bearer ${jwt}`, "X-Api-Token": apiToken };
  const fixtures = (await axios.get(
    `${CONFIG.apiOrigin}/api/fixtures/snapshot?competitionId=${WORLD_CUP_COMPETITION_ID}&startEpochDay=20624`,
    { headers }
  )).data;
  console.log(`fixtures returned: ${fixtures.length}`);
  if (fixtures.length > 0) {
    console.log("sample:", JSON.stringify(fixtures[0]));
    const fid = fixtures[0].FixtureId;
    const odds = (await axios.get(`${CONFIG.apiOrigin}/api/odds/snapshot/${fid}?asOf=${fixtures[0].StartTime + 45 * 60 * 1000}`, { headers })).data;
    console.log(`odds snapshot for fixture ${fid} (45min in): ${odds.length} market lines`);
    if (odds.length) console.log("sample odds:", JSON.stringify(odds[0]));
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    if (axios.isAxiosError(err)) console.error("HTTP error:", err.response?.status, JSON.stringify(err.response?.data).slice(0, 500));
    else console.error(err);
    process.exit(1);
  }
);
