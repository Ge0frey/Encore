"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  useWalletModal,
} from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import {
  TXLINE,
  TxlineSession,
  ProvisionStep,
  loadSession,
  provision,
} from "@/lib/txline";
import "@solana/wallet-adapter-react-ui/styles.css";

type Ctx = {
  session: TxlineSession | null;
  step: ProvisionStep | null;
  error: string | null;
  connected: boolean;
  connect: () => void;
  reprovision: () => void;
};

const SessionCtx = createContext<Ctx>({
  session: null,
  step: null,
  error: null,
  connected: false,
  connect: () => {},
  reprovision: () => {},
});

export const useTxline = () => useContext(SessionCtx);

function SessionInner({ children }: { children: React.ReactNode }) {
  const wallet = useWallet();
  const { setVisible } = useWalletModal();
  const [session, setSession] = useState<TxlineSession | null>(null);
  const [step, setStep] = useState<ProvisionStep | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    if (!wallet.publicKey) return;
    setError(null);
    try {
      const s = await provision(wallet, setStep);
      setSession(s);
    } catch (e) {
      setStep(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [wallet]);

  // Provision on every wallet connect (cached per-wallet, re-run when stale).
  useEffect(() => {
    if (!wallet.publicKey) {
      setSession(null);
      setStep(null);
      return;
    }
    const cached = loadSession(wallet.publicKey.toBase58());
    if (cached) {
      setSession(cached);
      setStep("done");
    } else {
      void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.publicKey]);

  const value = useMemo<Ctx>(
    () => ({
      session,
      step,
      error,
      connected: !!wallet.publicKey,
      connect: () => setVisible(true),
      reprovision: () => void run(),
    }),
    [session, step, error, wallet.publicKey, setVisible, run]
  );

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export default function TxlineProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );
  return (
    <ConnectionProvider endpoint={TXLINE.rpcUrl}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <SessionInner>{children}</SessionInner>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
