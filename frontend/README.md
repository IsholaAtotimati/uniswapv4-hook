Frontend README

This is a minimal static frontend to interact with contracts in this repo.

How it works
- Open `frontend/index.html` in a browser served from a local HTTP server (MetaMask blocks file:// requests).
- Connect your wallet (MetaMask) using the "Connect Wallet" button.
- Paste a contract's ABI JSON into the ABI textarea and the contract address into the address field.
- Click a method button to call or send transactions.

Serve locally

Using a one-liner (Node):

```bash
npx http-server frontend -c-1
```

Or Python 3:

```bash
cd frontend
python3 -m http.server 8000
```

Notes
- You can use the "Load from artifacts" button and paste a relative artifact path (for example:
  `artifacts/contracts/hooks/IdleLiquidityHookEnterprise.sol/IdleLiquidityHookEnterprise.json`) to auto-load the compiled ABI.
- For write transactions ensure your wallet has funds on the target network.
- This is intentionally minimal; extend it with UI for specific methods (`registerPosition`, `claimYield`, etc.) if you want a tailored UX.
