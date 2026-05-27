# 📋 SoroPad Issue Tracker — Wave 4

_Verified against the current codebase. Every issue below was confirmed by reading the relevant source files._

Complexity levels:

- 🟢 **Trivial** (100 pts) — Small, well-defined
- 🟡 **Medium** (150 pts) — Standard features or involved bug fixes
- 🔴 **High** (200 pts) — Complex features, integrations, or architectural changes

---

## Part 1: Critical Bugs (Broken in Production)

### 1. Token Deployment Is Fully Mocked — No Real Transaction

🔴 **High** · `frontend` `deploy` `rpc`

**File:** `app/deploy/DeployForm.tsx` — `onSubmit()` (line 116–184)

**Issue:** Clicking "Deploy Token" runs a 2-second `setTimeout`, generates a random fake contract ID (`C${Math.random()...}`), and calls `alert("Token deployment simulated! Check console for data.")`. Nothing is actually broadcast to the network.

**Fix:** Build a real Soroban contract deployment transaction (upload WASM + instantiate), run it through `simulateTransaction`, prompt Freighter to sign, then submit via `submitTransaction`. On success, use the real returned `contractId` to call `trackDeployment()` and redirect to `/dashboard/<contractId>`.

---

### 2. Language Switcher Has No Effect — UI Is Always English

🟡 **Medium** · `frontend` `i18n`

**Files:** `app/components/LanguageSwitcher.tsx`, `app/providers/LocaleProvider.tsx`, `app/providers/I18nProvider.tsx`

**Issue:** The `LocaleProvider` loads the correct JSON messages file and passes it to `NextIntlClientProvider`. However, `useTranslations()` from `next-intl` is **never called in any component** — all UI strings are hardcoded English literals. Switching language changes the locale state but has zero visible effect on any text in the app.

**Fix:** Wrap all user-visible string literals in `useTranslations()` calls throughout the app. Start with the highest-traffic pages: `app/page.tsx`, `app/deploy/`, and `app/dashboard/`. The translation keys and JSON files already exist in `messages/`.

---

### 3. AdminPanel Hardcoded to Futurenet — Breaks on Testnet and Mainnet

🔴 **High** · `frontend` `admin` `rpc`

**File:** `app/dashboard/[contractId]/components/AdminPanel.tsx` (lines 45–46, 165, 175, 184, 214, 261, 272, 389)

**Issue:** Two module-level constants bypass `NetworkProvider` entirely:

```ts
const RPC_URL = "https://rpc-futurenet.stellar.org";
const NETWORK_PASSPHRASE = Networks.FUTURENET;
```

Every admin action (mint, burn, transfer admin, create vesting schedule, batch mint) connects to Futurenet and signs with the Futurenet passphrase. The explorer link also points to `stellar.expert/explorer/futurenet/`. All admin operations will fail silently or produce wrong results on testnet and mainnet.

**Fix:** Remove the two constants. Replace all `new rpc.Server(RPC_URL)` calls with `new rpc.Server(networkConfig.rpcUrl)` and all `networkPassphrase: NETWORK_PASSPHRASE` with `networkPassphrase: networkConfig.passphrase`. Update the explorer link to use `networkConfig.network`.

---

### 4. AdminPanel Transactions Never Submitted After Signing

🔴 **High** · `frontend` `admin` `rpc`

**File:** `app/dashboard/[contractId]/components/AdminPanel.tsx` — `handleAction()` (lines 274–279) and `handleBatchMint()` (lines 186–191)

**Issue:** Both handlers call `signTransaction()` to get a signed XDR but then discard it and mock success with a `setTimeout(2000)` and a randomly generated fake transaction hash. No transaction is ever submitted to the network.

**Fix:** After signing, call `submitTransaction(signedXdr)` and use the real returned hash. Update `lastTxHash` with the actual hash. Add error handling for submission failures separate from signing failures.

---

### 5. Custom RPC/Horizon Settings Have No Effect on Actual Calls

🟡 **Medium** · `frontend` `settings` `rpc`

**Files:** `app/providers/SettingsProvider.tsx`, `app/providers/NetworkProvider.tsx`, `hooks/useSoroban.ts`

**Issue:** `SettingsProvider` correctly saves custom RPC and Horizon URLs to localStorage. However, `NetworkProvider.networkConfig` is derived directly from the static `NETWORKS` constant in `types/network.ts` and never reads from `SettingsProvider`. All components consume `networkConfig` via `useSoroban()`, so every RPC and Horizon call ignores the user's custom URLs. The Settings modal saves data that is never used.

**Fix:** Either (a) make `NetworkProvider` read `SettingsProvider`'s values and expose them via `networkConfig`, or (b) merge the two providers. The `rpcUrl` and `horizonUrl` from `SettingsProvider` must flow into the `NetworkConfig` object consumed by `lib/stellar.ts`.

---

### 6. Transaction History Broken by Default — Requires Unconfigured Mercury Token

🟡 **Medium** · `frontend` `indexer`

**Files:** `lib/indexer.ts`, `lib/stellar.ts` (`fetchTransactionHistory`, `fetchApprovedSpendersFromEvents`, `fetchAccountOperations`)

**Issue:** All event-based history functions call `fetchIndexedEvents()`, which throws `"Mercury indexer not configured. Set NEXT_PUBLIC_MERCURY_AUTH_TOKEN."` when the env var is absent. The `.env` file does not include this variable. For any deployment without a Mercury subscription, the Transaction History tab, Activity Feed, and Allowances panel will always show errors.

**Fix:** Implement a fallback using Soroban RPC's native `getEvents` endpoint (with its retention window limitations) when Mercury is not configured. Display a graceful notice when using the fallback that history may be limited to recent ledgers.

---

### 7. `UserPanel` Burn Error Uses `alert()` Instead of Toast

🟢 **Trivial** · `frontend` `ux`

**File:** `app/dashboard/[contractId]/components/UserPanel.tsx` (line 132)

**Issue:** When a burn transaction fails, the component calls `alert(`Burn failed: ${error.message}`)`. The app already has a full toast system via `ToastProvider`/`useToast()`.

**Fix:** Replace the `alert()` call with `toast.show({ title: "Burn failed", message: error.message, variant: "error" })`.

---

### 8. `StepReview` Friendbot Error Uses `alert()` Instead of Toast

🟢 **Trivial** · `frontend` `ux`

**File:** `app/deploy/steps/StepReview.tsx` (line 148)

**Issue:** When Friendbot funding fails, `alert("Friendbot funding failed. See console for details.")` is called. Same pattern as above.

**Fix:** Replace with `toast.show(...)` using the existing toast system.

---

### 9. Debug Logs and Alerts Leaked Into Production Code

🟢 **Trivial** · `frontend` `quality`

**Files (non-exhaustive):**

- `app/components/Navbar.tsx:16` — `console.log(navLinks)` fires on every module load
- `app/dashboard/[contractId]/TokenDashboard.tsx:42` — `console.log(tokenInfo)`
- `app/dashboard/[contractId]/components/TransferPanel.tsx:86` — `console.log(fetchTokenInfo)`
- `app/dashboard/[contractId]/components/AdminPanel.tsx:269` — `console.log(`Signing ${action}...`)`
- `app/deploy/DeployForm.tsx:133` — `console.log("Deploying with data:", data)`
- `app/deploy/DeployForm.tsx:171` — `alert("Token deployment simulated!")`

**Fix:** Remove all `console.log` calls and `alert()` calls from non-test production code.

---

### 10. Duplicate `navLinks` Declaration in Navbar — Module-Level Variable Never Used

🟢 **Trivial** · `frontend` `quality`

**File:** `app/components/Navbar.tsx` (lines 11–16, 23–27)

**Issue:** A module-level `const navLinks` (with "My Account") is declared and immediately `console.log`'d. Inside `Navbar()`, a second `const navLinks` (with "Allowances" instead of "My Account") shadows it. The outer variable is dead code. Additionally, "My Account" at `/my-account` no longer appears in the desktop navigation at all.

**Fix:** Remove the module-level `navLinks` declaration and its `console.log`. Restore the "My Account" link in the function-scoped nav array, or make a deliberate decision about which links to show.

---

## Part 2: Incomplete Features

### 11. Deploy Cooldown Is Computed But Never Displayed

🟢 **Trivial** · `frontend` `ux`

**File:** `app/deploy/DeployForm.tsx` — `useEffect` (lines 187–210)

**Issue:** The cooldown timer correctly computes remaining seconds but only calls `console.log(...)`. The UI has no countdown, disabled state, or user-facing message when a wallet is rate-limited.

**Fix:** Expose the `remainingMs` value as state and render it in the UI — disable the Deploy button and show a "Cooldown: Xs remaining" label when `remainingMs > 0`.

---

### 12. Accessibility System Is Entirely Disabled

🟡 **Medium** · `frontend` `accessibility`

**File:** `lib/accessibility.ts`

**Issue:** The entire body of `initAxe()` is commented out. The comment acknowledges that the axe-core integration was disabled because of a compatibility issue with React ES module namespaces in Next.js. The function does nothing. No automated accessibility checking runs in development.

Additionally, no component uses ARIA live regions for async state changes (transaction submitting → success/error). Screen readers receive no announcements for these transitions.

**Fix:** (a) Fix the axe-core integration using `const ReactDOM = ReactDOM as typeof import('react-dom')` pattern, or use `@axe-core/playwright` in E2E tests instead. (b) Add `aria-live="polite"` regions to transaction result areas in the dashboard and deploy flow.

---

### 13. `fetchTopHolders` Returns Empty for Native Soroban Tokens

🟡 **Medium** · `frontend` `rpc`

**File:** `lib/stellar.ts` — `fetchTopHolders()` (lines 404–488)

**Issue:** The function queries Horizon's classic asset accounts API (`horizon.accounts().forAsset(asset)`), which only returns holders of classic Stellar assets or wrapped tokens. Pure Soroban-native tokens are invisible to Horizon. Any token deployed via SoroPad itself will show an empty holders table.

**Fix:** For Soroban-native tokens (contract IDs starting with `C`), fall back to querying contract ledger entries via Soroban RPC `getLedgerEntries` to enumerate balance keys, or document this as a known limitation and show an informative empty state instead of a silent empty table.

---

### 14. `fetchSupplyBreakdown` Burned Supply Silently Defaults to Zero

🟢 **Trivial** · `frontend` `dashboard`

**File:** `lib/stellar.ts` — `fetchSupplyBreakdown()` (lines 964–976)

**Issue:** Burned supply is fetched via `total_burned()` on the token contract. This function does not exist yet (it's Issue #5 in `PENDING_ISSUES.md`). The catch block silently returns `burnedSupply = 0`, so the supply chart permanently shows 0 burned tokens even when burns have occurred, giving users incorrect data.

**Fix:** Show a visual indicator in the chart (e.g., a dashed segment or tooltip) when `total_burned` is unavailable, rather than silently misrepresenting the data as zero.

---

### 15. `SettingsProvider` Saves Custom URLs With Wrong localStorage Key Format

🟢 **Trivial** · `frontend` `settings`

**Files:** `app/providers/SettingsProvider.tsx`, `lib/stellar.ts`

**Issue:** `SettingsProvider` stores keys as `soropad_horizon_url:testnet` and `soropad_rpc_url:testnet`. But `lib/stellar.ts`'s orphaned `getHorizonUrl()` function (which is never called) reads from the flat key `soropad_horizon_url`. Both schemas exist but are disconnected. The dead function should be removed to avoid future confusion.

**Fix:** Delete the unused `getHorizonUrl()` function from `lib/stellar.ts` (line ~12). If a plain-key fallback is ever needed, document the expected key format clearly.

---

## Part 3: Enhancements

### 17. Deploy Form: Show Estimated Network Fee Before Signing

🟡 **Medium** · `frontend` `ux` `rpc`

**File:** `app/deploy/DeployForm.tsx`, `app/deploy/steps/StepReview.tsx`

**Issue:** Users click "Deploy Token" with no idea whether the transaction fee will be 0.01 XLM or 5 XLM. The preflight simulation result already contains cost/footprint data but it's not displayed anywhere.

**Fix:** After a successful "Check" simulation, parse `simulationDetails.cost` from the `PreflightCheckResult` and display the estimated fee in `StepReview` next to the Deploy button (e.g., "Estimated fee: ~0.05 XLM").

---

### 18. Token Dashboard: SEP-41 Validation Gate for Unknown Contracts

🟡 **Medium** · `frontend` `ux` `security`

**File:** `app/dashboard/[contractId]/TokenDashboard.tsx`

**Issue:** The dashboard blindly calls `fetchTokenInfo()` on any contract ID. If the contract doesn't implement `name()` or `symbol()`, the RPC simulation fails and users see a raw error message with no context.

**Fix:** Detect simulation errors for missing standard methods specifically. Show a graceful "This contract does not appear to be a SEP-41 token" screen with a link back to the search page, rather than a generic error.

---

### 19. Admin Panel: Pre-flight Simulation Before All Admin Transactions

🟡 **Medium** · `frontend` `admin` `rpc`

**File:** `app/dashboard/[contractId]/components/AdminPanel.tsx`

**Issue:** The `handleAction` function builds and signs a transaction without first running a simulation. If the transaction will fail (e.g., mint exceeds max supply, burn exceeds balance), the user still gets a Freighter signature prompt for a transaction that cannot succeed.

**Fix:** Add a simulation step for each action type before prompting the user to sign. Use the existing `useTransactionSimulator` hook (already built for this exact purpose) and display errors via `PreflightCheckDisplay`.

---

### 20. Notification Center: Persist Toast History in the Navbar

🟡 **Medium** · `frontend` `ux`

**Issue:** Toast notifications auto-dismiss after a few seconds. If a Soroban transaction fails while the user is looking away, the error disappears permanently. There's no way to review past transaction results.

**Fix:** Add a bell icon to the Navbar. Store the last 15 toast entries in localStorage or a React ref. Open a dropdown showing the history on click. Mark entries as read when dismissed from the notification panel.

---

### 21. Allowances Page: Revoke Allowance Should Show Current Amount

🟡 **Medium** · `frontend` `allowances`

**Files:** `app/dashboard/allowances/`, `components/AllowanceManager.tsx`

**Issue:** The allowances list shows spender addresses but doesn't display the current approved amount alongside each entry, requiring users to guess whether an allowance is significant before revoking it.

**Fix:** For each spender, call `fetchTokenAllowance(contractId, publicKey, spender, config)` (already implemented in `lib/stellar.ts`) and display the formatted amount and expiration ledger in the allowance card.

---

### 22. Multi-Wallet Support: Abstract Away Freighter Dependency

🔴 **High** · `frontend` `wallet`

**File:** `app/providers/WalletProvider.tsx`

**Issue:** `WalletProvider` imports directly from `@stellar/freighter-api`. Users on mobile or preferring Albedo, xBull, or LOBSTR cannot use the app.

**Fix:** Introduce a wallet adapter interface. Implement the Freighter adapter as the default. Add at least one alternative (Albedo via `@albedo-link/intent`) and a wallet selection modal to the connect flow.

---

### 23. Personal Dashboard: Vesting Contract Is a Manual Input — Should Be Auto-Discovered

🟡 **Medium** · `frontend` `ux`

**File:** `app/my-account/PersonalDashboard.tsx`

**Issue:** To view vesting schedules, users must manually type in the vesting contract ID. Most users won't know this address. It should be discoverable from the tracked deployments list.

**Fix:** For each tracked deployment that recorded a `vestingContractId`, attempt to auto-load the schedule. Surface a "Check Vesting" button that pre-fills the vesting contract ID from the deployment record.

---

### 24. Mobile Navbar: Menu Stays Open After Navigation

🟢 **Trivial** · `frontend` `ux`

**File:** `app/components/Navbar.tsx`

**Issue:** The mobile drawer sets `mobileMenuOpen = false` when a link is clicked (`onClick={() => setMobileMenuOpen(false)}`), but if the user navigates using the browser back button or swipe gesture, the drawer state can become stale without the overlay closing.

**Fix:** Listen to the Next.js `pathname` from `usePathname()` and close the drawer whenever the route changes, regardless of how navigation was triggered.

---

### 25. Deploy Form: Wallet Must Be Connected Before Starting (Not Just at Review)

🟡 **Medium** · `frontend` `ux`

**File:** `app/deploy/DeployForm.tsx`, `app/deploy/steps/StepReview.tsx`

**Issue:** A user can fill out all four steps of the deploy form without a connected wallet. The "Connect Wallet" prompt only appears on Step 4 (Review). This wastes the user's time if they have no wallet available.

**Fix:** Show a compact wallet connection banner at the top of the form on Step 1. Keep it non-blocking (users can still fill the form) but make it visible early so they can connect in parallel.

---

### 26. Vesting Form: Real-Time Curve Preview Is Not Wired to Actual Ledger Times

🟢 **Trivial** · `frontend` `vesting`

**File:** `app/dashboard/[contractId]/components/AdminPanel.tsx` — vesting section

**Issue:** The vesting curve preview chart (`VestingCurveChart`) uses `cliffDays` and `durationDays` as input, but the ledger-based calculation assumes 1 day ≈ 17,280 ledgers — a rough approximation. The chart doesn't account for actual ledger close times, which vary.

**Fix:** At a minimum, display a note that ledger times are estimates (~5s/ledger). Ideally, fetch the current ledger time and use real close-time data to label the X-axis with actual dates.

---

### 27. `RecentLaunches` Silently Fails Without Mercury — Should Show Fallback

🟢 **Trivial** · `frontend` `home`

**File:** `app/components/RecentLaunches.tsx`, `app/api/tokens/recent/route.ts`

**Issue:** The "Recent Launches" section calls `/api/tokens/recent`, which requires a Mercury auth token. Without it, the API throws and the homepage shows "Unable to load recent launches." with no context. New visitors get a broken homepage.

**Fix:** When Mercury is unconfigured, return a properly shaped empty array from the route (with an `X-Note` header) rather than throwing. Display an informational empty state on the homepage instead of an error message.

---

### 28. Token Dashboard: Export Holders to CSV Is Behind a Button But Always Exports All

🟢 **Trivial** · `frontend` `dashboard`

**File:** `app/dashboard/[contractId]/components/HoldersTable.tsx`

**Issue:** `exportHoldersCsv()` always exports the full in-memory holders array regardless of any active pagination or filters the user may have applied. The export label says "Export" but doesn't reflect what's on screen.

**Fix:** Pass the currently visible/filtered rows to `exportHoldersCsv()` instead of the full dataset, or clearly label the button "Export All" to set accurate expectations.

---
