/**
 * Wallet adapter types for multi-wallet support
 */

export interface WalletAdapter {
  id: string;
  name: string;
  icon: string;
  isAvailable: () => Promise<boolean>;
  connect: () => Promise<string>;
  disconnect: () => Promise<void>;
  signTransaction: (
    xdr: string,
    opts?: { networkPassphrase?: string; address?: string }
  ) => Promise<string>;
  getPublicKey: () => Promise<string | null>;
}

export enum WalletType {
  FREIGHTER = "freighter",
  ALBEDO = "albedo",
  LOBSTR = "lobstr",
}
