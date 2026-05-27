export async function initAxe(): Promise<void> {
  if (
    typeof window !== "undefined" &&
    process.env.NODE_ENV === "development"
  ) {
    // React ES modules are read-only namespace objects in modern bundlers.
    // @axe-core/react attempts to modify React.createElement, causing a TypeError
    // and leading to continuous Fast Refresh reloads in Next.js.
    // 
    // const React = await import("react");
    // const ReactDOM = await import("react-dom");
    // const axe = await import("@axe-core/react");
    // axe.default(React, ReactDOM, 1000);
  }
}
