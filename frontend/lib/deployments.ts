

export interface TrackedDeployment {
  contractId: string;
  name: string;
  symbol: string;
  network: string;
  timestamp: number;
  vestingContractId?: string;
}

const STORAGE_KEY_PREFIX = "soropad:deployments:";

export function getTrackedDeployments(walletAddress: string): TrackedDeployment[] {
  if (typeof window === "undefined") return [];
  try {
    const key = `${STORAGE_KEY_PREFIX}${walletAddress}`;
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    return JSON.parse(stored) as TrackedDeployment[];
  } catch (e) {
    console.error("Failed to get tracked deployments", e);
    return [];
  }
}

export function trackDeployment(
  walletAddress: string,
  deployment: Omit<TrackedDeployment, "timestamp">
) {
  if (typeof window === "undefined") return;
  try {
    const key = `${STORAGE_KEY_PREFIX}${walletAddress}`;
    const current = getTrackedDeployments(walletAddress);
    
    // Avoid duplicates
    if (current.some(d => d.contractId === deployment.contractId)) {
      return;
    }

    const updated = [
      { ...deployment, timestamp: Date.now() },
      ...current
    ];
    
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to track deployment", e);
  }
}

export function removeTrackedDeployment(walletAddress: string, contractId: string) {
  if (typeof window === "undefined") return;
  try {
    const key = `${STORAGE_KEY_PREFIX}${walletAddress}`;
    const current = getTrackedDeployments(walletAddress);
    const updated = current.filter(d => d.contractId !== contractId);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to remove tracked deployment", e);
  }
}
