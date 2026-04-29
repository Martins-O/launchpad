"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNetwork } from "./NetworkProvider";
import type { WalletAdapter } from "../lib/wallets";
import { getWalletAdapter } from "../lib/wallets";
import { WalletModal } from "../components/WalletModal";

/* ── Public context shape ─────────────────────────────────────────── */
export interface WalletContextValue {
  /** Whether the wallet is currently connected and authorised */
  connected: boolean;
  /** The Stellar public key (G…) when connected, otherwise `null` */
  publicKey: string | null;
  /** Whether a connect / disconnect operation is in-flight */
  loading: boolean;
  /** The currently connected wallet adapter ID */
  walletId: string | null;
  /** The currently connected wallet name */
  walletName: string | null;
  /** Request wallet access and retrieve the public key (opens wallet selection modal) */
  connect: () => Promise<void>;
  /** Revoke local connection state */
  disconnect: () => void;
  /**
   * Sign a Soroban / Stellar transaction XDR with the connected wallet.
   * Returns the signed XDR string.
   */
  signTransaction: (
    xdr: string,
    opts?: { networkPassphrase?: string; address?: string },
  ) => Promise<string>;
}

export const WalletContext = createContext<WalletContextValue | undefined>(
  undefined,
);

/* ── Local storage keys ───────────────────────────────────────────── */
const STORAGE_KEY_WALLET_ID = "soropad_wallet_id";
const STORAGE_KEY_PUBLIC_KEY = "soropad_public_key";

/* ── Provider ─────────────────────────────────────────────────────── */
export function WalletProvider({ children }: { children: ReactNode }) {
  const { networkConfig } = useNetwork();
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const connected = publicKey !== null;
  const walletName = walletId
    ? getWalletAdapter(walletId)?.name || null
    : null;

  /* ── Auto-reconnect on mount ──────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;

    async function reconnect() {
      if (typeof window === "undefined") return;

      try {
        const storedAddress = localStorage.getItem("soropad:wallet:address");
        const storedTimestamp = localStorage.getItem("soropad:wallet:timestamp");
        
        const { isConnected: installed } = await freighterIsConnected();
        if (!installed) return;

        const { isAllowed: allowed } = await freighterIsAllowed();
        if (!allowed) {
          if (storedAddress) {
            localStorage.removeItem("soropad:wallet:address");
            localStorage.removeItem("soropad:wallet:timestamp");
          }
          return;
        }

        const { address } = await freighterGetAddress();
        if (!cancelled && address) {
          setPublicKey(address);
          
          if (storedAddress !== address || !storedTimestamp) {
            localStorage.setItem("soropad:wallet:address", address);
            localStorage.setItem("soropad:wallet:timestamp", Date.now().toString());
          }
        }
      } catch {
        localStorage.removeItem("soropad:wallet:address");
        localStorage.removeItem("soropad:wallet:timestamp");
      }
    }

    reconnect();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── handleWalletSelect() ─────────────────────────────────────── */
  const handleWalletSelect = useCallback(async (adapter: WalletAdapter) => {
    setLoading(true);
    try {
      const { isConnected: installed } = await freighterIsConnected();
      if (!installed) {
        window.open("https://www.freighter.app/", "_blank");
        return;
      }

      await freighterSetAllowed();

      const { address, error } = await freighterGetAddress();
      if (error) {
        console.error("[WalletProvider] getAddress error:", error);
        return;
      }

      if (address) {
        setPublicKey(address);
        localStorage.setItem("soropad:wallet:address", address);
        localStorage.setItem("soropad:wallet:timestamp", Date.now().toString());
      }
    } catch (err) {
      console.error("[WalletProvider] connect failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── connect() ────────────────────────────────────────────────── */
  const connect = useCallback(async () => {
    setShowModal(true);
  }, []);

  /* ── disconnect() ─────────────────────────────────────────────── */
  const disconnect = useCallback(() => {
    setPublicKey(null);
    localStorage.removeItem("soropad:wallet:address");
    localStorage.removeItem("soropad:wallet:timestamp");
  }, []);

  /* ── signTransaction() ────────────────────────────────────────── */
  const signTransaction = useCallback(
    async (
      xdr: string,
      opts?: { networkPassphrase?: string; address?: string },
    ): Promise<string> => {
      if (!walletId) {
        throw new Error("No wallet connected");
      }

      const adapter = getWalletAdapter(walletId);
      if (!adapter) {
        throw new Error("Wallet adapter not found");
      }

      const finalOpts = {
        networkPassphrase: networkConfig.passphrase,
        ...opts,
      };

      return await adapter.signTransaction(xdr, finalOpts);
    },
    [walletId, networkConfig.passphrase],
  );

  /* ── Memoised value ───────────────────────────────────────────── */
  const value = useMemo<WalletContextValue>(
    () => ({
      connected,
      publicKey,
      loading,
      walletId,
      walletName,
      connect,
      disconnect,
      signTransaction,
    }),
    [connected, publicKey, loading, walletId, walletName, connect, disconnect, signTransaction],
  );

  return (
    <WalletContext.Provider value={value}>
      {children}
      <WalletModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSelectWallet={handleWalletSelect}
      />
    </WalletContext.Provider>
  );
}
