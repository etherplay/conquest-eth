-- Token Claims Table
-- Tracks ERC20 token distributions to verified SelfClaw humans
-- Uniqueness is scoped to (human_id, chain_id, token_address) and (wallet_address, chain_id, token_address)

CREATE TABLE IF NOT EXISTS token_claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    human_id TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    public_key TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    amount TEXT NOT NULL,
    token_address TEXT NOT NULL,
    chain_id TEXT NOT NULL,
    claimed_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Composite unique indexes for per-chain-token uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_token_claims_human_chain_token 
    ON token_claims(human_id, chain_id, token_address);

CREATE UNIQUE INDEX IF NOT EXISTS idx_token_claims_wallet_chain_token 
    ON token_claims(wallet_address, chain_id, token_address);

-- Index for looking up by chain and token
CREATE INDEX IF NOT EXISTS idx_token_claims_chain_token 
    ON token_claims(chain_id, token_address);
