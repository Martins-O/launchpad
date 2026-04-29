/**
 * Wallet registry - exports all available wallet adapters
 */

import type { WalletAdapter } from "./types";
import { freighterAdapter } from "./freighter";
import { albedoAdapter } from "./albedo";
import { lobstrAdapter } from "./lobstr";

export * from "./types";

/**
 * All available wallet adapters
 */
export const walletAdapters: WalletAdapter[] = [
  freighterAdapter,
  albedoAdapter,
  lobstrAdapter,
];

/**
 * Get a wallet adapter by ID
 */
export function getWalletAdapter(id: string): WalletAdapter | undefined {
  return walletAdapters.find((adapter) => adapter.id === id);
}

/**
 * Get all available (installed) wallet adapters
 */
export async function getAvailableWallets(): Promise<WalletAdapter[]> {
  const available = await Promise.all(
    walletAdapters.map(async (adapter) => ({
      adapter,
      isAvailable: await adapter.isAvailable(),
    }))
  );

  return available
    .filter(({ isAvailable }) => isAvailable)
    .map(({ adapter }) => adapter);
}
