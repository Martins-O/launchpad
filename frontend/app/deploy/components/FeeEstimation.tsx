"use client";

import { DollarSign, Zap, AlertCircle } from "lucide-react";

interface FeeEstimationProps {
  estimatedFee: string | null;
  isLoading: boolean;
  error: string | null;
}

export function FeeEstimation({ estimatedFee, isLoading, error }: FeeEstimationProps) {
  if (isLoading) {
    return (
      <div className="glass-card p-4 border-stellar-400/20">
        <div className="flex items-center gap-3">
          <div className="animate-spin h-5 w-5 border-2 border-stellar-400 border-t-transparent rounded-full" />
          <div>
            <p className="text-sm font-medium text-white">Estimating network fees...</p>
            <p className="text-xs text-gray-400">Simulating transaction on the network</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-4 border-red-400/20 bg-red-400/5">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-300">Fee estimation failed</p>
            <p className="text-xs text-red-200">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!estimatedFee) {
    return null;
  }

  return (
    <div className="glass-card p-4 border-green-400/20 bg-green-400/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-400/10">
            <Zap className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Estimated Network Fee</p>
            <p className="text-xs text-gray-400">Includes base fee and resource costs</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-green-400" />
            <span className="text-xl font-bold text-green-400">{estimatedFee}</span>
            <span className="text-sm text-gray-400">XLM</span>
          </div>
        </div>
      </div>
    </div>
  );
}
