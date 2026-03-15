-- Security/hardening: limit long-running and stuck transactions.
-- statement_timeout: abort queries that run longer than this (prevents runaway queries).
-- idle_in_transaction_session_timeout: close sessions that stay idle in a transaction (prevents connection exhaustion).
-- Supabase default database name is postgres; for other deployments adjust if needed.

ALTER DATABASE postgres SET statement_timeout = '30s';
ALTER DATABASE postgres SET idle_in_transaction_session_timeout = '10s';
