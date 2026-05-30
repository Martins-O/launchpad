"use client";

import React, { useState, useCallback } from "react";
import { AllowanceManager } from "@/components/AllowanceManager";
import { AllowanceList } from "@/components/AllowanceList";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useWallet } from "@/app/hooks/useWallet";
import { useNetwork } from "@/app/providers/NetworkProvider";
import {
  fetchApprovedSpendersFromEvents,
  fetchTokenDecimals,
  fetchAllowanceWithExpiration,
  formatTokenAmount,
} from "@/lib/stellar";
import { AlertCircle, RefreshCw } from "lucide-react";

/**
 * AllowancesPage - Full-page allowance management interface
 *
 * Provides:
 * - Allowance manager (grant, revoke, transfer)
 * - List of current allowances
 * - Token contract filter
 */
export default function AllowancesPage() {
  const [selectedContractId, setSelectedContractId] = useState<string>("");
  const [activeSection, setActiveSection] = useState<"manage" | "view">(
    "manage",
  );

  const [allowances, setAllowances] = useState<Array<{
    id: string;
    tokenContractId: string;
    spenderAddress: string;
    amount: string;
    expirationLedger: number;
    isExpired: boolean;
  }>>([]);
  const [isLoadingAllowances, setIsLoadingAllowances] = useState(false);
  const [allowancesError, setAllowancesError] = useState<string | null>(null);

  const { publicKey } = useWallet();
  const { networkConfig } = useNetwork();

  const loadAllowances = useCallback(async () => {
    if (!selectedContractId || !publicKey) {
      setAllowancesError("Both contract ID and wallet connection required");
      return;
    }

    setIsLoadingAllowances(true);
    setAllowancesError(null);

    try {
      const decimals = await fetchTokenDecimals(selectedContractId, networkConfig);
      const spenders = await fetchApprovedSpendersFromEvents({
        contractId: selectedContractId,
        ownerAddress: publicKey,
        config: networkConfig,
        maxPages: 5,
      });

      const results = await Promise.all(
        spenders.map(async (spenderAddress) => {
          const { amount, expirationLedger } = await fetchAllowanceWithExpiration(
            selectedContractId,
            publicKey,
            spenderAddress,
            networkConfig,
          );

          return {
            id: spenderAddress,
            tokenContractId: selectedContractId,
            spenderAddress,
            amount: amount > BigInt(0)
              ? formatTokenAmount(amount.toString(), decimals)
              : "0",
            expirationLedger: expirationLedger > 0 ? expirationLedger : 0,
            isExpired: amount <= BigInt(0),
          };
        }),
      );

      setAllowances(results.filter((a) => a.amount !== "0"));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load allowances";
      setAllowancesError(message);
    } finally {
      setIsLoadingAllowances(false);
    }
  }, [selectedContractId, publicKey, networkConfig]);

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-950 via-gray-900 to-black">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Allowance Manager
          </h1>
          <p className="text-gray-400">
            Manage SEP-41 token allowances. Grant, revoke, and utilize token
            approvals.
          </p>
        </div>

        {/* Contract Filter */}
        <div className="mb-8 glass-card p-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Filter by Token Contract (Optional)
          </label>
          <Input
            value={selectedContractId}
            onChange={(e) => setSelectedContractId(e.target.value)}
            placeholder="Enter token contract ID (C...) to filter"
            className="font-mono text-sm"
          />
          {selectedContractId && (
            <p className="text-xs text-gray-400 mt-2">
              Showing allowances for: {selectedContractId}
            </p>
          )}
        </div>

        {/* Section Tabs */}
        <div className="mb-8 flex gap-2 border-b border-white/10">
          <button
            onClick={() => setActiveSection("manage")}
            className={`px-4 py-3 font-medium text-sm transition-colors ${
              activeSection === "manage"
                ? "text-stellar-400 border-b-2 border-stellar-400"
                : "text-gray-400 hover:text-gray-300 border-b-2 border-transparent"
            }`}
          >
            Manage Allowances
          </button>
          <button
            onClick={() => setActiveSection("view")}
            className={`px-4 py-3 font-medium text-sm transition-colors ${
              activeSection === "view"
                ? "text-stellar-400 border-b-2 border-stellar-400"
                : "text-gray-400 hover:text-gray-300 border-b-2 border-transparent"
            }`}
          >
            View Allowances
          </button>
        </div>

        {/* Content */}
        {activeSection === "manage" && (
          <div className="mb-12">
            <AllowanceManager contractId={selectedContractId} />
          </div>
        )}

        {activeSection === "view" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">
                Active Allowances
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                View and manage all allowances granted to other addresses.
              </p>
            </div>

            {selectedContractId && (
              <div className="flex gap-2">
                <Button
                  onClick={loadAllowances}
                  disabled={isLoadingAllowances}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingAllowances ? "animate-spin" : ""}`} />
                  Load Allowances
                </Button>
              </div>
            )}

            {allowancesError && (
              <div className="p-4 bg-red-600/10 border border-red-600/50 rounded-lg flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                <p className="text-sm text-red-300">{allowancesError}</p>
              </div>
            )}

            {selectedContractId ? (
              <AllowanceList
                contractId={selectedContractId}
                allowances={allowances}
                isLoading={isLoadingAllowances}
              />
            ) : (
              <div className="glass-card p-8 text-center">
                <AlertCircle className="h-8 w-8 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400 mb-2">No contract selected</p>
                <p className="text-xs text-gray-500">
                  Enter a token contract ID above to view allowances.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Help Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-stellar-400/20 flex items-center justify-center text-stellar-400 font-bold">
                1
              </div>
              <h3 className="font-semibold text-white">Grant Allowance</h3>
            </div>
            <p className="text-sm text-gray-400">
              Authorize a spender address to transfer tokens on your behalf up
              to a specified amount.
            </p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-stellar-400/20 flex items-center justify-center text-stellar-400 font-bold">
                2
              </div>
              <h3 className="font-semibold text-white">Revoke Allowance</h3>
            </div>
            <p className="text-sm text-gray-400">
              Remove a spender&apos;s ability to transfer your tokens.
              Revocation is instantaneous.
            </p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-stellar-400/20 flex items-center justify-center text-stellar-400 font-bold">
                3
              </div>
              <h3 className="font-semibold text-white">Transfer From</h3>
            </div>
            <p className="text-sm text-gray-400">
              Transfer tokens on behalf of another address if they have granted
              you an allowance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
