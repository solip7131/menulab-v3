-- Supabase 대시보드 > SQL Editor에서 실행하세요

-- credit_transactions type에 'subscribe' 추가
ALTER TABLE credit_transactions
  DROP CONSTRAINT IF EXISTS credit_transactions_type_check;

ALTER TABLE credit_transactions
  ADD CONSTRAINT credit_transactions_type_check
  CHECK (type IN ('charge', 'use', 'subscribe'));

-- 구독 이력 테이블
CREATE TABLE IF NOT EXISTS subscriptions (
  id            UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email    TEXT         NOT NULL,
  plan          TEXT         NOT NULL CHECK (plan IN ('plan1', 'plan2', 'plan3')),
  billing_cycle TEXT         NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  status        TEXT         NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  gems_granted  INTEGER      NOT NULL,
  amount_paid   INTEGER      NOT NULL,
  started_at    TIMESTAMPTZ  DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_email   ON subscriptions (user_email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status  ON subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_created ON subscriptions (created_at DESC);

-- RLS 비활성화 (서버 사이드 service_role_key 접근)
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
