-- ============================================================
-- 구독 (정기결제) 관련 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email      TEXT        NOT NULL,
  plan_key        TEXT        NOT NULL,           -- 'basic', 'standard', 'pro'
  billing_cycle   TEXT        NOT NULL DEFAULT 'monthly', -- 'monthly', 'yearly'
  rebill_no       TEXT        UNIQUE,             -- Payapp 정기결제 등록번호
  status          TEXT        NOT NULL DEFAULT 'pending', -- pending | active | cancelled
  gems_per_cycle  INTEGER     NOT NULL,           -- 100 / 200 / 400
  price_per_cycle INTEGER     NOT NULL,           -- 실결제금액 (원)
  next_billing_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_email ON subscriptions(user_email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_rebill_no  ON subscriptions(rebill_no);
