"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type NotificationVariant = "info" | "success" | "warning" | "error";

export interface Notification {
  id: string;
  title: string;
  message?: string;
  variant: NotificationVariant;
  timestamp: number;
  txHash?: string;
}

export interface NotificationInput {
  title: string;
  message?: string;
  variant?: NotificationVariant;
  txHash?: string;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  add: (notification: NotificationInput) => string;
  markAllRead: () => void;
  clear: () => void;
  remove: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined,
);

const MAX_NOTIFICATIONS = 15;
const STORAGE_KEY = "soropad_notifications";

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as {
          notifications: Notification[];
          unreadCount: number;
        };
        setNotifications(parsed.notifications ?? []);
        setUnreadCount(parsed.unreadCount ?? 0);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ notifications, unreadCount }),
      );
    } catch {
      // Ignore storage errors
    }
  }, [notifications, unreadCount, mounted]);

  const add = useCallback((input: NotificationInput): string => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const notification: Notification = {
      id,
      title: input.title,
      message: input.message,
      variant: input.variant ?? "info",
      timestamp: Date.now(),
      txHash: input.txHash,
    };

    setNotifications((prev) => {
      const next = [notification, ...prev];
      return next.length > MAX_NOTIFICATIONS
        ? next.slice(0, MAX_NOTIFICATIONS)
        : next;
    });
    setUnreadCount((prev) => prev + 1);

    return id;
  }, []);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const clear = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const remove = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Bridge: allow non-React modules to push notifications
  useEffect(() => {
    if (typeof window === "undefined") return;
    interface NotificationBridge {
      add: (n: NotificationInput) => string;
    }
    const w = window as unknown as { __soropadNotifications?: NotificationBridge };
    w.__soropadNotifications = { add };
    return () => {
      if (w.__soropadNotifications) {
        delete w.__soropadNotifications;
      }
    };
  }, [add]);

  const value = useMemo<NotificationContextValue>(
    () => ({ notifications, unreadCount, add, markAllRead, clear, remove }),
    [notifications, unreadCount, add, markAllRead, clear, remove],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      "useNotifications must be used within a <NotificationProvider>",
    );
  }
  return ctx;
}
