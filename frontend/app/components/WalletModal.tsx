"use client";

import { useEffect, useState } from "react";
import type { WalletAdapter } from "../lib/wallets";
import { walletAdapters } from "../lib/wallets";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWallet: (adapter: WalletAdapter) => void;
}

export function WalletModal({
  isOpen,
  onClose,
  onSelectWallet,
}: WalletModalProps) {
  const [availableWallets, setAvailableWallets] = useState<
    Array<{ adapter: WalletAdapter; available: boolean }>
  >([]);

  useEffect(() => {
    async function checkWallets() {
      const wallets = await Promise.all(
        walletAdapters.map(async (adapter) => ({
          adapter,
          available: await adapter.isAvailable(),
        }))
      );
      setAvailableWallets(wallets);
    }

    if (isOpen) {
      checkWallets();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Connect Wallet
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          {availableWallets.map(({ adapter, available }) => (
            <button
              key={adapter.id}
              onClick={() => {
                onSelectWallet(adapter);
                onClose();
              }}
              disabled={!available}
              className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                available
                  ? "border-gray-200 hover:border-blue-500 hover:bg-blue-50 dark:border-gray-700 dark:hover:border-blue-500 dark:hover:bg-blue-900/20 cursor-pointer"
                  : "border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900 cursor-not-allowed opacity-50"
              }`}
            >
              <span className="text-3xl">{adapter.icon}</span>
              <div className="flex-1 text-left">
                <div className="font-semibold text-gray-900 dark:text-white">
                  {adapter.name}
                </div>
                {!available && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Not installed
                  </div>
                )}
              </div>
              {available && (
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>

        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center">
          By connecting a wallet, you agree to the Terms of Service
        </p>
      </div>
    </div>
  );
}
