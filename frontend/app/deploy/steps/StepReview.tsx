import { Control, useWatch } from "react-hook-form";
import { DeployFormData } from "../DeployForm";
import { useWallet } from "@/app/hooks/useWallet";
import { useNetwork } from "@/app/providers/NetworkProvider";
import * as StellarSdk from "@stellar/stellar-sdk";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Wallet } from "lucide-react";

interface StepProps {
    control: Control<DeployFormData>;
}

const SummaryItem = ({ label, value }: { label: string; value: string | number | undefined }) => (
    <div className="flex justify-between py-2 border-b border-white/5">
        <span className="text-gray-400 text-sm">{label}</span>
        <span className="text-white font-medium truncate ml-4 max-w-[200px]">
            {value || <span className="text-gray-600 italic">Not set</span>}
        </span>
    </div>
);

const FlagItem = ({ label, enabled }: { label: string; enabled: boolean }) => (
    <div className="flex justify-between py-2 border-b border-white/5">
        <span className="text-gray-400 text-sm">{label}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${enabled ? "bg-stellar-500/20 text-stellar-300" : "bg-void-700/60 text-gray-500"}`}>
            {enabled ? "Enabled" : "Disabled"}
        </span>
    </div>
);

export const StepReview = ({ control }: StepProps) => {
    const formData = useWatch({ control });
    const { publicKey, connect } = useWallet();
    const adminModeLabel =
        formData.adminMode === "wallet"
            ? "Connected wallet"
            : "Existing multisig / DAO contract";

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="text-left">
                <h2 className="text-xl font-bold text-white mb-2">Review & Deploy</h2>
                <p className="text-sm text-gray-400">
                    Final check before deploying your token to the network.
                </p>
            </div>
            {/* Friendbot banner: shows when on testnet and balance is low */}
            <FriendbotBanner threshold={100} />

            <div className="glass-card p-6 space-y-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stellar-500 mb-4">Configuration Summary</h3>
                <SummaryItem label="Token Name" value={formData.name} />
                <SummaryItem label="Symbol" value={formData.symbol} />
                <SummaryItem label="Decimals" value={formData.decimals} />
                <SummaryItem label="Initial Supply" value={formData.initialSupply !== undefined ? new Intl.NumberFormat('en-US').format(formData.initialSupply) : undefined} />
                <SummaryItem label="Max Supply" value={formData.maxSupply !== undefined ? new Intl.NumberFormat('en-US').format(formData.maxSupply) : "Unlimited"} />
                <SummaryItem label="Admin Type" value={adminModeLabel} />
                <SummaryItem label="Admin Address" value={formData.adminAddress} />
                <SummaryItem label="Compliance Node" value={formData.complianceNodeAddress || "None"} />
                <FlagItem label="Authorization Required" enabled={!!formData.authorizationRequired} />
                <FlagItem label="Authorization Revocable" enabled={!!formData.authorizationRevocable} />
                <SummaryItem label="Description" value={formData.description} />
                <SummaryItem label="Website" value={formData.website} />
                <SummaryItem label="Logo URL" value={formData.logoUrl} />
                <SummaryItem label="Twitter" value={formData.twitter} />
                <SummaryItem label="Discord" value={formData.discord} />
            </div>

            {(formData.authorizationRequired || formData.authorizationRevocable) && (
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                    <p className="text-xs text-blue-200 leading-relaxed">
                        <strong>Regulated token:</strong> Authorization Required is enabled.
                        You will need to call <code className="bg-blue-900/40 px-1 rounded">authorize_holder</code> for
                        each address before it can receive tokens.
                        {formData.authorizationRevocable && " Holder authorization can be revoked by the admin at any time."}
                        {formData.complianceNodeAddress && " Transfers will also be checked against the configured compliance node."}
                    </p>
                </div>
            )}
            
            <p className="text-[10px] text-gray-500 text-center px-4">
                By deploying, you will initiate a transaction on the Stellar network. 
                Resource fees will be calculated during the pre-flight check.
            </p>

            {!publicKey && (
                <div className="p-6 rounded-xl bg-stellar-500/5 border border-stellar-500/20 text-center space-y-4 animate-pulse-subtle">
                    <div className="flex justify-center">
                        <div className="p-3 rounded-full bg-stellar-500/10">
                            <Wallet className="w-6 h-6 text-stellar-400" />
                        </div>
                    </div>
                    <div>
                        <h4 className="text-white font-bold">Wallet Disconnected</h4>
                        <p className="text-sm text-gray-400">Connect your wallet to finalize deployment.</p>
                    </div>
                    <Button 
                        onClick={connect}
                        className="w-full bg-stellar-500 hover:bg-stellar-600 text-white font-bold py-3 shadow-lg shadow-stellar-500/20"
                    >
                        Connect Wallet to Deploy
                    </Button>
                </div>
            )}
        </div>
    );
};


function FriendbotBanner({ threshold = 100 }: { threshold?: number }) {
    const { publicKey } = useWallet();
    const { networkConfig } = useNetwork();
    const [balance, setBalance] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        if (!publicKey) return;
        const server = new StellarSdk.Horizon.Server(networkConfig.horizonUrl);

        (async function fetchBalance() {
            try {
                const account = await server.accounts().accountId(publicKey).call();
                const native = account.balances.find((b) => b.asset_type === "native");
                if (!cancelled) setBalance(native ? Number(native.balance) : 0);
            } catch {
                // account may not exist yet
                if (!cancelled) setBalance(0);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [publicKey, networkConfig.horizonUrl]);

    if (!publicKey) return null;
    if (networkConfig.network !== "testnet") return null;
    if (balance !== null && balance >= threshold) return null;

    const fundWithFriendbot = async () => {
        try {
            setLoading(true);
            const res = await fetch(`https://friendbot.stellar.org/?addr=${encodeURIComponent(publicKey)}`);
            if (!res.ok) throw new Error("Friendbot request failed");
            // refetch balance
            const server = new StellarSdk.Horizon.Server(networkConfig.horizonUrl);
            const account = await server.accounts().accountId(publicKey).call();
            const native = account.balances.find((b) => b.asset_type === "native");
            setBalance(native ? Number(native.balance) : 0);
        } catch (err) {
            // swallow — show simple feedback
            console.error(err);
            alert("Friendbot funding failed. See console for details.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mb-4 p-4 rounded-lg bg-yellow-900/10 border border-yellow-500/10">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="font-semibold text-sm text-yellow-200">Low testnet balance</p>
                    <p className="text-xs text-yellow-100">Your connected wallet has {balance === null ? 'an unknown amount of' : `${balance.toFixed(4)} XLM`}. Fund with Friendbot to proceed.</p>
                </div>
                <div>
                    <Button onClick={fundWithFriendbot} disabled={loading} className="px-4 py-2">{loading ? 'Funding…' : 'Fund with Friendbot'}</Button>
                </div>
            </div>
        </div>
    );
}
