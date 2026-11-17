# LensLedger

A responsive, local-first finance dashboard for independent photographers. Transactions, budgets, savings goals, invoices, and theme preference are stored together in the browser under `lensledger-data`.

## Run locally

```sh
npm install
npm run dev
```

Create and preview a production build:

```sh
npm run build
npm run preview
```

## Deploy to Netlify

Connect this repository to Netlify. The included `netlify.toml` configures `npm run build` and publishes the `dist` directory.

## Backups and privacy

Use **Settings → Export JSON** to download a backup, or **Restore a backup** to replace the data in the current browser. Resetting restores the sample workspace. Clearing browser storage also removes the local ledger, so export a backup before changing devices or browsers.
