-- Subscriptions table
CREATE TABLE subscriptions (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  fingerprint JSONB NOT NULL,
  fingerprint_id VARCHAR(64) UNIQUE NOT NULL,
  unsubscribe_token VARCHAR(128) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_notified TIMESTAMP,
  notification_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_subscriptions_email ON subscriptions(email);
CREATE INDEX idx_subscriptions_fingerprint_id ON subscriptions(fingerprint_id);

-- Notifications analytics
CREATE TABLE notifications_sent (
  id BIGSERIAL PRIMARY KEY,
  subscription_id BIGINT REFERENCES subscriptions(id) ON DELETE CASCADE,
  model_id VARCHAR(50),
  trigger_type VARCHAR(50),
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP
);

CREATE INDEX idx_notifications_subscription ON notifications_sent(subscription_id);
CREATE INDEX idx_notifications_sent_at ON notifications_sent(sent_at DESC);

-- Benchmarks (Phase 3)
CREATE TABLE benchmarks (
  id BIGSERIAL PRIMARY KEY,
  model_id VARCHAR(50),
  quant_level VARCHAR(10),
  gpu_model VARCHAR(50),
  throughput_tps FLOAT,
  latency_ms INT,
  temperature_c FLOAT,
  gpu_hash VARCHAR(64),  -- Anonymized GPU identifier
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(model_id, quant_level, gpu_hash)
);
