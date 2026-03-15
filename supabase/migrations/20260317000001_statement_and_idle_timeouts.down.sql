-- Rollback: reset statement and idle timeouts to default
ALTER DATABASE postgres RESET statement_timeout;
ALTER DATABASE postgres RESET idle_in_transaction_session_timeout;
