# TASK TO IMPLEMENT

user avatar
Status
Assignment
Pull Requests
Repo languages
2 matches
#230 lib/stellar.ts: fetchTopHolders Loses Precision for Large Balances
Repo Avatar soropad/launchpad
Problem

File: lib/stellar.ts — fetchTopHolders() (lines ~620–630)

Issue:

sharePercent:
  totalSupplyRaw > BigInt(0)
    ? Number((rawBalance * BigInt(10000)) / totalSupplyRaw) / 100
    : 0,

rawBalance is a BigInt. The multiplication result is divided before converting — good. But the final Number(...) cast still loses precision if the intermediate value exceeds 2^53. For tokens with 7 decimals and 1 billion circulating supply, rawBalance * 10000 can exceed Number.MAX_SAFE_INTEGER, producing an incorrect share percentage.

Additionally, an earlier part of the function does:

balance: (Number(rawBalance) / 10 ** decimals).toFixed(decimals),

Number(rawBalance) loses precision for any holder with more than ~9 quadrillion raw units (90M tokens at 7 decimals), causing the displayed balance to be wrong.

Fix: Keep all arithmetic in BigInt until the final display conversion. For sharePercent, format the percentage string directly from BigInt division. For balance, use a BigInt division helper that produces a properly formatted decimal string.

# README FILE

# 🚀 Soroban Token Launchpad

An open-source, full-stack platform for deploying and managing SEP-41 compliant tokens on the Stellar Soroban smart contract platform — no code required.

Built for founders, DAOs, and developers who need a clean interface to launch tokens with vesting schedules, mint/burn controls, and treasury management.

---

## ✨ Features

- One-click SEP-41 token deployment on Soroban
- Configurable supply, decimals, and max cap
- Cliff + linear vesting schedules per wallet
- Admin panel: mint, burn, transfer ownership
- Real-time dashboard: supply metrics, holder table, vesting progress
- Freighter wallet integration
- Testnet & Mainnet support

---

## 🛠 Tech Stack

| Layer | Tech |
|---|---|
| Smart Contracts | Rust + Soroban SDK |
| Frontend | Next.js 14 + TypeScript |
| Styling | Tailwind CSS |
| Wallet | Freighter API |
| RPC | Stellar Horizon + Soroban RPC |
| Testing | Soroban CLI + Jest + Playwright |

---

## 📁 Project Structure

```
soroban-token-launchpad/
├── contracts/
│   ├── token/              # SEP-41 token contract (Rust)
│   └── vesting/            # Vesting schedule contract (Rust)
├── frontend/
│   ├── app/                # Next.js app router pages
│   ├── components/         # UI components
│   ├── hooks/              # Stellar/Soroban React hooks
│   └── lib/                # Contract clients & utilities
├── scripts/                # Deploy & keygen scripts
└── docs/                   # Architecture & event schema docs
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Rust + `soroban-cli`
- Freighter browser extension

### Install

```bash
git clone https://github.com/your-org/soroban-token-launchpad
cd soroban-token-launchpad
npm install
```

### Run locally

```bash
# Build contracts
cd contracts && soroban contract build

# Start frontend
cd frontend && npm run dev
```

### Deploy to testnet

```bash
npm run deploy:testnet
```

---

## 🤝 Contributing

Contributions are welcome! Many issues are tagged `good first issue` and available through the [Stellar Wave Program on Drips](https://www.drips.network/wave).

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup and PR guidelines.

---

## 📄 License

MIT
