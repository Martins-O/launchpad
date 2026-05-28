export async function initAxe(): Promise<void> {
  if (typeof window === "undefined" || process.env.NODE_ENV !== "development") {
    return;
  }

  const React = await import("react");
  const ReactDOM = (await import("react-dom")) as typeof import("react-dom");
  const axe = await import("@axe-core/react");

  axe.default(React, ReactDOM, 1000);
}
