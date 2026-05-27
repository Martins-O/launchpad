"use client";

import React, { useState, useEffect } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PreflightCheckDisplay } from "@/components/ui/PreflightCheck";
import { StepMetadata } from "./steps/StepMetadata";
import { StepSupply } from "./steps/StepSupply";
import { StepAdmin } from "./steps/StepAdmin";
import { StepReview } from "./steps/StepReview";
import { FeeEstimation } from "./components/FeeEstimation";
import { useTransactionSimulator } from "@/hooks/useTransactionSimulator";
import { useWallet } from "@/app/hooks/useWallet";
import { savePendingMetadata } from "./utils/metadata";
import { trackDeployment } from "@/lib/deployments";
import { ArrowLeft, ArrowRight, Rocket } from "lucide-react";
import { useNetwork } from "@/app/providers/NetworkProvider";
import { useDeployToken, type DeployTokenError } from "../hooks/useDeployToken";

const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    if (typeof value === "number" && Number.isNaN(value)) return undefined;
    return Number(value);
  }, schema.optional());

const deploySchema = z
  .object({
    name: z.string().min(1, "Token name is required").max(32, "Name too long"),
    symbol: z.string().min(1, "Symbol is required").max(12, "Symbol too long"),
    decimals: z.number().min(0).max(14),
    initialSupply: z.number().min(1, "Initial supply must be at least 1"),
    maxSupply: optionalNumber(z.number().min(1, "Max supply must be at least 1")),
    adminAddress: z
      .string()
      .regex(/^[GC][A-Z2-7]{55}$/, "Invalid Stellar address or contract ID"),
    adminMode: z.enum(["wallet", "custom"]),
    complianceNodeAddress: z
      .string()
      .regex(/^C[A-Z2-7]{55}$/, "Invalid compliance node contract ID")
      .optional()
      .or(z.literal("")),
    // Authorization flags
    authorizationRequired: z.boolean(),
    authorizationRevocable: z.boolean(),
    // Optional metadata fields
    description: z.string().optional(),
    logoUrl: z.string().optional(),
    website: z.string().optional(),
    twitter: z.string().optional(),
    discord: z.string().optional(),
  })
  .refine((data) => !data.maxSupply || data.initialSupply <= data.maxSupply, {
    message: "Initial supply cannot exceed maximum supply",
    path: ["initialSupply"],
  });

export type DeployFormData = z.infer<typeof deploySchema>;

const STEPS = ["Metadata", "Supply", "Admin", "Review"];

export default function DeployForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isDeploying, setIsDeploying] = useState(false);
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);
  const [feeEstimationLoading, setFeeEstimationLoading] = useState(false);
  const [feeEstimationError, setFeeEstimationError] = useState<string | null>(null);
  const [preflightResult, setPreflightResult] = useState<{
    isLoading: boolean;
    success: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);

  const router = useRouter();
  const { publicKey } = useWallet();
  const { deployToken } = useDeployToken();
  const COOLDOWN_MS = 60_000;

  const simulator = useTransactionSimulator();
  const { networkConfig } = useNetwork();

  const {
    register,
    handleSubmit,
    control,
    trigger,
    formState: { errors, isValid },
    watch,
  } = useForm<DeployFormData>({
    resolver: zodResolver(deploySchema) as unknown as Resolver<DeployFormData>,
    mode: "onChange",
    defaultValues: {
      decimals: 7,
      initialSupply: 0,
      name: "",
      symbol: "",
      adminAddress: publicKey ?? "",
      adminMode: publicKey ? "wallet" : "custom",
      complianceNodeAddress: "",
      authorizationRequired: false,
      authorizationRevocable: false,
      description: "",
      logoUrl: "",
      website: "",
      twitter: "",
      discord: "",
    },
  });

  const nextStep = async () => {
    let fieldsToValidate: (keyof DeployFormData)[] = [];
    if (currentStep === 1) fieldsToValidate = ["name", "symbol", "decimals"];
    if (currentStep === 2) fieldsToValidate = ["initialSupply", "maxSupply"];
    if (currentStep === 3) fieldsToValidate = ["adminMode", "adminAddress", "complianceNodeAddress"];

    const isStepValid = await trigger(fieldsToValidate);
    if (isStepValid) {
      const nextStepNum = Math.min(currentStep + 1, STEPS.length);
      setCurrentStep(nextStepNum);
      
      if (nextStepNum === 4) {
        estimateFee();
      }
    }
  };

  const estimateFee = async () => {
    const formData = watch();
    if (!formData.adminAddress || !formData.name || !formData.symbol) return;

    setFeeEstimationLoading(true);
    setFeeEstimationError(null);
    setEstimatedFee(null);

    try {
      const result = await simulator.checkTokenDeployment(
        formData.adminAddress,
        formData.name,
        formData.symbol,
        formData.decimals,
        BigInt(Math.round((formData.initialSupply ?? 0) * 10 ** formData.decimals)),
        formData.maxSupply != null
          ? BigInt(Math.round(formData.maxSupply * 10 ** formData.decimals))
          : null,
        formData.authorizationRequired ?? false,
        formData.authorizationRevocable ?? false,
      );

      if (result.estimatedFee) {
        setEstimatedFee(result.estimatedFee);
      }

      if (!result.success) {
        setFeeEstimationError(result.errors[0] || "Fee estimation failed");
      }
    } catch (error) {
      setFeeEstimationError(
        error instanceof Error ? error.message : "Failed to estimate fee"
      );
    } finally {
      setFeeEstimationLoading(false);
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const onSubmit = async (data: DeployFormData) => {
    setIsDeploying(true);
    setPreflightResult({
      isLoading: true,
      success: false,
      errors: [],
      warnings: [],
    });

    try {
      // Deploy the token contract with the form data
      const result = await deployToken({
        name: data.name,
        symbol: data.symbol,
        decimals: data.decimals,
        initialSupply: data.initialSupply,
        maxSupply: data.maxSupply,
        adminAddress: data.adminAddress,
      });

      setPreflightResult({
        isLoading: false,
        success: true,
        errors: [],
        warnings: [],
      });

      // Save metadata client-side
      try {
        savePendingMetadata(data.symbol, {
          description: data.description,
          logoUrl: data.logoUrl,
          website: data.website,
          twitter: data.twitter,
          discord: data.discord,
        });
      } catch {
        // Ignore metadata save errors
      }

      // Set client-side deploy cooldown (per-wallet)
      try {
        const key = `soropad:lastDeploy:${publicKey ?? "anonymous"}`;
        localStorage.setItem(key, Date.now().toString());

        // Track deployment for user dashboard
        if (publicKey) {
          trackDeployment(publicKey, {
            contractId: result.contractId,
            name: data.name,
            symbol: data.symbol,
            network: networkConfig.network,
          });
        }
      } catch {
        // Ignore tracking errors
      }

      // On success, navigate to the token dashboard
      alert(
        `Token deployed successfully!\n\nContract ID: ${result.contractId}\nTransaction Hash: ${result.transactionHash}\n\nRedirecting to dashboard...`
      );
      router.push(`/dashboard/${result.contractId}`);
    } catch (err) {
      // Handle deployment errors
      const error = err as DeployTokenError;
      const errorDetails: string[] = [];

      if (error.type === "validation") {
        errorDetails.push(error.message);
      } else if (error.type === "simulation") {
        errorDetails.push(`Simulation error: ${error.message}`);
      } else if (error.type === "wallet") {
        errorDetails.push(error.message);
      } else if (error.type === "broadcast") {
        errorDetails.push(`Broadcast error: ${error.message}`);
      } else if (error.type === "timeout") {
        errorDetails.push(error.message);
      } else if (error.message) {
        errorDetails.push(error.message);
      } else {
        errorDetails.push("Token deployment failed. Please try again.");
      }

      setPreflightResult({
        isLoading: false,
        success: false,
        errors: errorDetails,
        warnings: [],
      });

      console.error("Deployment error:", err);
    } finally {
      setIsDeploying(false);
    }
  };

  // Cooldown timer: read last deploy timestamp
  useEffect(() => {
    let mounted = true;
    const key = `soropad:lastDeploy:${publicKey ?? "anonymous"}`;

    const updateRemaining = () => {
      try {
        const last = Number(localStorage.getItem(key) || 0);
        const remaining = Math.max(0, last ? last + COOLDOWN_MS - Date.now() : 0);
        // Could be used to display cooldown in UI
        if (mounted && remaining > 0) {
          console.log(`Cooldown remaining: ${Math.ceil(remaining / 1000)}s`);
        }
      } catch {
        // ignore
      }
    };

    updateRemaining();
    const id = setInterval(updateRemaining, 1000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [publicKey, COOLDOWN_MS]);

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="mb-10">
        <ProgressBar current={currentStep} total={STEPS.length} />
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="glass-card p-8 min-h-[400px] flex flex-col"
      >
        <div className="grow">
          {currentStep === 1 && (
            <StepMetadata register={register} errors={errors} />
          )}
          {currentStep === 2 && (
            <StepSupply control={control} errors={errors} />
          )}
          {currentStep === 3 && (
            <StepAdmin
              register={register}
              errors={errors}
              control={control}
            />
          )}
          {currentStep === 4 && <StepReview control={control} />}
        </div>

        {/* Fee Estimation (shown on review step) */}
        {currentStep === 4 && (
          <div className="mt-6">
            <FeeEstimation
              estimatedFee={estimatedFee}
              isLoading={feeEstimationLoading}
              error={feeEstimationError}
            />
          </div>
        )}

        {/* Pre-flight check results (shown on review step) */}
        {currentStep === 4 && preflightResult && (
          <div className="mt-6 mb-6">
            <PreflightCheckDisplay
              isLoading={preflightResult.isLoading}
              errors={preflightResult.errors}
              warnings={preflightResult.warnings}
              successMessage={
                preflightResult.success
                  ? "Transaction is ready to sign"
                  : undefined
              }
              onDismiss={() => setPreflightResult(null)}
            />
          </div>
        )}

        <div className="mt-10 flex justify-between items-center bg-void-900/50 -mx-8 -mb-8 p-6 rounded-b-2xl border-t border-white/5">
          <Button
            type="button"
            variant="secondary"
            onClick={prevStep}
            disabled={
              currentStep === 1 ||
              isDeploying ||
              (preflightResult?.isLoading ?? false)
            }
            className="px-4 py-2 flex"
          >
            <ArrowLeft className="w-4 h-4" />
            <p>Back</p>
          </Button>

          {currentStep < STEPS.length ? (
            <Button type="button" onClick={nextStep} className="px-6 py-2 flex">
              <p>Continue</p>
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  const formData = watch();
                  setPreflightResult({
                    isLoading: true,
                    success: false,
                    errors: [],
                    warnings: [],
                  });
                  try {
                    const result = await simulator.checkTokenDeployment(
                      formData.adminAddress,
                      formData.name,
                      formData.symbol,
                      formData.decimals,
                      BigInt(Math.round((formData.initialSupply ?? 0) * 10 ** formData.decimals)),
                      formData.maxSupply != null
                        ? BigInt(Math.round(formData.maxSupply * 10 ** formData.decimals))
                        : null,
                      formData.authorizationRequired ?? false,
                      formData.authorizationRevocable ?? false,
                      formData.complianceNodeAddress || null,
                      publicKey ?? undefined,
                    );
                    setPreflightResult({
                      isLoading: false,
                      success: result.success,
                      errors: result.errors,
                      warnings: result.warnings,
                    });
                  } catch (error) {
                    const errorMessage =
                      error instanceof Error ? error.message : "Unknown error";
                    setPreflightResult({
                      isLoading: false,
                      success: false,
                      errors: [errorMessage],
                      warnings: [],
                    });
                  }
                }}
                disabled={
                  !isValid ||
                  isDeploying ||
                  (preflightResult?.isLoading ?? false)
                }
                className="px-6 py-2"
              >
                Check
              </Button>
              <Button
                type="submit"
                disabled={
                  !isValid ||
                  isDeploying ||
                  !(preflightResult?.success ?? false)
                }
                isLoading={isDeploying}
                className="px-8 py-2"
              >
                <Rocket className="w-4 h-4" />
                Deploy Token
              </Button>
            </div>
          )}
        </div>
      </form>

      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          Step {currentStep}: {STEPS[currentStep - 1]}
        </p>
      </div>
    </div>
  );
}
