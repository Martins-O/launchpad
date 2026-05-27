import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  NotificationProvider,
  useNotifications,
  type NotificationVariant,
} from "../NotificationProvider";

const STORAGE_KEY = "soropad_notifications";

function Trigger({ variant = "info" }: { variant?: NotificationVariant }) {
  const { add, notifications, unreadCount, markAllRead, clear } =
    useNotifications();
  return (
    <div>
      <button
        onClick={() =>
          add({
            title: "Test Notification",
            message: "Test message",
            variant,
            txHash: "abc123def456",
          })
        }
      >
        Add notification
      </button>
      <button onClick={markAllRead}>Mark all read</button>
      <button onClick={clear}>Clear all</button>
      <span data-testid="count">{notifications.length}</span>
      <span data-testid="unread">{unreadCount}</span>
    </div>
  );
}

describe("NotificationProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    delete (window as unknown as { __soropadNotifications?: unknown })
      .__soropadNotifications;
  });

  it("adds notifications and tracks unread count", async () => {
    const user = userEvent.setup();
    render(
      <NotificationProvider>
        <Trigger />
      </NotificationProvider>,
    );

    expect(screen.getByTestId("count")).toHaveTextContent("0");
    expect(screen.getByTestId("unread")).toHaveTextContent("0");

    await user.click(screen.getByRole("button", { name: /add notification/i }));

    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(screen.getByTestId("unread")).toHaveTextContent("1");
  });

  it("marks all notifications as read", async () => {
    const user = userEvent.setup();
    render(
      <NotificationProvider>
        <Trigger />
      </NotificationProvider>,
    );

    await user.click(screen.getByRole("button", { name: /add notification/i }));
    await user.click(screen.getByRole("button", { name: /add notification/i }));

    expect(screen.getByTestId("unread")).toHaveTextContent("2");

    await user.click(screen.getByRole("button", { name: /mark all read/i }));

    expect(screen.getByTestId("unread")).toHaveTextContent("0");
    expect(screen.getByTestId("count")).toHaveTextContent("2");
  });

  it("clears all notifications", async () => {
    const user = userEvent.setup();
    render(
      <NotificationProvider>
        <Trigger />
      </NotificationProvider>,
    );

    await user.click(screen.getByRole("button", { name: /add notification/i }));
    await user.click(screen.getByRole("button", { name: /add notification/i }));

    expect(screen.getByTestId("count")).toHaveTextContent("2");

    await user.click(screen.getByRole("button", { name: /clear all/i }));

    expect(screen.getByTestId("count")).toHaveTextContent("0");
    expect(screen.getByTestId("unread")).toHaveTextContent("0");
  });

  it("limits notifications to 15 max", async () => {
    const user = userEvent.setup();
    render(
      <NotificationProvider>
        <Trigger />
      </NotificationProvider>,
    );

    for (let i = 0; i < 20; i++) {
      await user.click(
        screen.getByRole("button", { name: /add notification/i }),
      );
    }

    expect(screen.getByTestId("count")).toHaveTextContent("15");
  });

  it("persists notifications to localStorage", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <NotificationProvider>
        <Trigger />
      </NotificationProvider>,
    );

    await user.click(screen.getByRole("button", { name: /add notification/i }));

    // Wait for localStorage to be updated
    await new Promise((r) => setTimeout(r, 50));

    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored!);
    expect(parsed.notifications).toHaveLength(1);
    expect(parsed.notifications[0].title).toBe("Test Notification");
    expect(parsed.notifications[0].txHash).toBe("abc123def456");

    unmount();
  });

  it("installs a window bridge for non-React modules", () => {
    render(
      <NotificationProvider>
        <span>child</span>
      </NotificationProvider>,
    );

    const bridge = (
      window as unknown as {
        __soropadNotifications?: {
          add: (n: { title: string }) => string;
        };
      }
    ).__soropadNotifications;

    expect(bridge).toBeDefined();

    act(() => {
      bridge!.add({ title: "From bridge" });
    });

    // Bridge adds to internal state, which persists to localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();
  });
});
