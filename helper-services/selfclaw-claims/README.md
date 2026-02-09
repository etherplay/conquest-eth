## Setup Instructions

Set environment variables in wrangler.toml:

```bash
[vars]
TOKEN_ADDRESS = "0x..."
TOKEN_AMOUNT = "1000000000000000000"
RPC_URL = "https://forno.celo.org"
CHAIN_ID = "42220"
```

Set the private key as a secret:

```bash
wrangler secret put PRIVATE_KEY
```

Run the migration:

```bash
pnpm migrate        # Production
pnpm migrate:local  # Local development
```

Run tests:

```bash
pnpm test
```
