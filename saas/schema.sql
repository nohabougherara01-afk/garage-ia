-- Migration additive pour le nouveau SaaS, ne supprime pas settings (démo existante).
CREATE TABLE IF NOT EXISTS garages (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 email TEXT NOT NULL,
 plan TEXT NOT NULL CHECK(plan IN ('assistant','premium')),
 subscription_status TEXT NOT NULL DEFAULT 'inactive',
 stripe_customer_id TEXT UNIQUE,
 stripe_subscription_id TEXT UNIQUE,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS garage_access (
 token_hash TEXT PRIMARY KEY,
 garage_id TEXT NOT NULL REFERENCES garages(id) ON DELETE CASCADE,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS garage_schedules (
 garage_id TEXT PRIMARY KEY REFERENCES garages(id) ON DELETE CASCADE,
 days_json TEXT NOT NULL DEFAULT '[0,1,2,3,4]',
 start_time TEXT NOT NULL DEFAULT '08:00',
 end_time TEXT NOT NULL DEFAULT '18:00',
 slot_minutes INTEGER NOT NULL DEFAULT 60
);
CREATE TABLE IF NOT EXISTS garage_blocks (
 garage_id TEXT NOT NULL REFERENCES garages(id) ON DELETE CASCADE,
 date TEXT NOT NULL,
 time TEXT NOT NULL,
 PRIMARY KEY(garage_id,date,time)
);
CREATE TABLE IF NOT EXISTS stripe_events (
 id TEXT PRIMARY KEY,
 processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS garages_email_idx ON garages(email);
