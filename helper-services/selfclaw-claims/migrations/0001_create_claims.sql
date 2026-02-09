-- Token Claims Table
-- Tracks ERC20 token distributions to verified SelfClaw humans

CREATE TABLE IF NOT EXISTS token_claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    human_id TEXT NOT NULL UNIQUE,
    wallet_address TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    amount TEXT NOT NULL,
    token_address TEXT NOT NULL,
    claimed_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Index for looking up by human_id
CREATE INDEX IF NOT EXISTS idx_token_claims_human_id ON token_claims(human_id);

-- Index for looking up by wallet_address
CREATE INDEX IF NOT EXISTS idx_token_claims_wallet_address ON token_claims(wallet_address);
