"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
  useEffect,
} from "react";
import {
  type NetworkConfig,
  type NetworkType,
  NETWORKS,
} from "../../types/network";

interface NetworkContextValue {
  networkConfig: NetworkConfig;
  network: NetworkType;
  setNetwork: (network: NetworkType) => void;
  mounted: boolean;
}

const NetworkContext = createContext<NetworkContextValue | undefined>(
  undefined,
);

const LS_RPC_KEY_PREFIX = "soropad_rpc_url";
const LS_HORIZON_KEY_PREFIX = "soropad_horizon_url";

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setNetworkState] = useState<NetworkType>("testnet");
  const [mounted, setMounted] = useState(false);
  const [customRpcUrl, setCustomRpcUrl] = useState<string | null>(null);
  const [customHorizonUrl, setCustomHorizonUrl] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("soropad:network") as NetworkType | null;
    if (saved === "testnet" || saved === "mainnet") {
      setNetworkState(saved);
    }
    setMounted(true);
  }, []);

  // Load custom URLs from localStorage when network changes
  useEffect(() => {
    const loadCustomUrls = () => {
      try {
        const storedRpc = localStorage.getItem(`${LS_RPC_KEY_PREFIX}:${network}`);
        const storedHorizon = localStorage.getItem(`${LS_HORIZON_KEY_PREFIX}:${network}`);
        setCustomRpcUrl(storedRpc);
        setCustomHorizonUrl(storedHorizon);
      } catch {
        setCustomRpcUrl(null);
        setCustomHorizonUrl(null);
      }
    };

    loadCustomUrls();

    // Listen for storage changes from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `${LS_RPC_KEY_PREFIX}:${network}` || 
          e.key === `${LS_HORIZON_KEY_PREFIX}:${network}`) {
        loadCustomUrls();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [network]);

  const setNetwork = useCallback((n: NetworkType) => {
    setNetworkState(n);
    localStorage.setItem("soropad:network", n);
  }, []);

  const networkConfig = useMemo(() => {
    const baseConfig = NETWORKS[network];
    return {
      ...baseConfig,
      rpcUrl: customRpcUrl ?? baseConfig.rpcUrl,
      horizonUrl: customHorizonUrl ?? baseConfig.horizonUrl,
    };
  }, [network, customRpcUrl, customHorizonUrl]);

  const value = useMemo(
    () => ({
      networkConfig,
      network,
      setNetwork,
      mounted,
    }),
    [networkConfig, network, setNetwork, mounted],
  );

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
}
