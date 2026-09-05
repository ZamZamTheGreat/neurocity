CREATE TABLE security_rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX security_rate_limits_expiry ON security_rate_limits (expires_at);
