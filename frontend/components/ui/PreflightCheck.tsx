import React from "react";
import { AlertCircle, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

/**
 * Component for displaying pre-flight check errors
 */
export function PreflightError({
  errors,
  onDismiss,
}: {
  errors: string[];
  onDismiss?: () => void;
}) {
  if (errors.length === 0) return null;

  return (
    <div
      className="rounded-xl border border-red-500/30 bg-red-500/10 p-4"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-red-400" />
        <div className="flex-1">
          <h3 className="font-semibold text-red-300 mb-2">Cannot proceed with transaction</h3>
          <ul className="space-y-1">
            {errors.map((error, idx) => (
              <li key={idx} className="text-sm text-red-200">
                • {error}
              </li>
            ))}
          </ul>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-400 hover:text-red-300 transition-colors"
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Component for displaying pre-flight check warnings
 */
export function PreflightWarning({
  warnings,
  onDismiss,
}: {
  warnings: string[];
  onDismiss?: () => void;
}) {
  if (warnings.length === 0) return null;

  return (
    <div
      className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0 text-yellow-400" />
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-300 mb-2">Warnings</h3>
          <ul className="space-y-1">
            {warnings.map((warning, idx) => (
              <li key={idx} className="text-sm text-yellow-200">
                • {warning}
              </li>
            ))}
          </ul>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-yellow-400 hover:text-yellow-300 transition-colors"
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Component for displaying pre-flight check success
 */
export function PreflightSuccess({
  message = "Transaction is ready to sign",
  onDismiss,
}: {
  message?: string;
  onDismiss?: () => void;
}) {
  return (
    <div
      className="rounded-xl border border-green-500/30 bg-green-500/10 p-4"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center gap-3">
        <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-400" />
        <div className="flex-1">
          <p className="text-sm text-green-200">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-green-400 hover:text-green-300 transition-colors"
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Component for displaying pre-flight check loading state
 */
export function PreflightLoading({
  message = "Checking transaction...",
}: {
  message?: string;
}) {
  return (
    <div
      className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin flex-shrink-0 text-blue-400" />
        <p className="text-sm text-blue-200">{message}</p>
      </div>
    </div>
  );
}

/**
 * Unified component that shows loading, errors, warnings, or success
 */
export function PreflightCheckDisplay({
  isLoading,
  errors,
  warnings,
  successMessage,
  onDismiss,
}: {
  isLoading?: boolean;
  errors?: string[];
  warnings?: string[];
  successMessage?: string;
  onDismiss?: () => void;
}) {
  if (isLoading) {
    return <PreflightLoading />;
  }

  if (errors && errors.length > 0) {
    return <PreflightError errors={errors} onDismiss={onDismiss} />;
  }

  if (warnings && warnings.length > 0) {
    return <PreflightWarning warnings={warnings} onDismiss={onDismiss} />;
  }

  if (successMessage) {
    return <PreflightSuccess message={successMessage} onDismiss={onDismiss} />;
  }

  return null;
}
