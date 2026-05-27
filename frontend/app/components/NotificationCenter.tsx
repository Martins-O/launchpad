"use client";

import { useState, useRef, useEffect } from "react";
import {
  Bell,
  X,
  Trash2,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from "lucide-react";
import {
  useNotifications,
  type Notification,
  type NotificationVariant,
} from "../providers/NotificationProvider";
import { useNetwork } from "../providers/NetworkProvider";

const variantStyles: Record<
  NotificationVariant,
  { icon: React.ComponentType<{ className?: string }>; iconColor: string }
> = {
  info: { icon: Info, iconColor: "text-blue-400" },
  success: { icon: CheckCircle2, iconColor: "text-emerald-400" },
  warning: { icon: AlertTriangle, iconColor: "text-yellow-400" },
  error: { icon: XCircle, iconColor: "text-red-400" },
};

function formatTimestamp(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

function NotificationItem({
  notification,
  onRemove,
  explorerUrl,
}: {
  notification: Notification;
  onRemove: (id: string) => void;
  explorerUrl: string;
}) {
  const styles = variantStyles[notification.variant];
  const Icon = styles.icon;

  return (
    <div className="group flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-white/5">
      <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${styles.iconColor}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-white truncate">
            {notification.title}
          </p>
          <span className="text-[10px] text-gray-500 whitespace-nowrap">
            {formatTimestamp(notification.timestamp)}
          </span>
        </div>
        {notification.message && (
          <p className="mt-0.5 text-xs text-gray-400 line-clamp-2">
            {notification.message}
          </p>
        )}
        {notification.txHash && (
          <a
            href={`${explorerUrl}/tx/${notification.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-stellar-400 hover:text-stellar-300 transition-colors"
          >
            <span className="font-mono">
              {notification.txHash.slice(0, 8)}...{notification.txHash.slice(-8)}
            </span>
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
      </div>
      <button
        onClick={() => onRemove(notification.id)}
        className="opacity-0 group-hover:opacity-100 rounded p-1 text-gray-500 transition-all hover:bg-white/10 hover:text-white"
        aria-label="Remove notification"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function NotificationCenter() {
  const { notifications, unreadCount, markAllRead, clear, remove } =
    useNotifications();
  const { networkConfig } = useNetwork();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const explorerUrl =
    networkConfig.network === "mainnet"
      ? "https://stellar.expert/explorer/public"
      : "https://stellar.expert/explorer/testnet";

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Mark as read when opening
  const handleToggle = () => {
    if (!isOpen && unreadCount > 0) {
      markAllRead();
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="relative flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl border border-white/10 bg-void-800 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {notifications.length > 0 && (
              <button
                onClick={clear}
                className="flex items-center gap-1 text-[10px] text-gray-500 transition-colors hover:text-red-400"
              >
                <Trash2 className="h-3 w-3" />
                Clear all
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Bell className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-xs">No notifications yet</p>
                <p className="text-[10px] mt-1 text-gray-600">
                  Transaction history will appear here
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRemove={remove}
                    explorerUrl={explorerUrl}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-white/5 px-4 py-2">
              <p className="text-[10px] text-gray-600 text-center">
                Showing last {notifications.length} of 15 max
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
