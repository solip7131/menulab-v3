-- Supabase 대시보드 > SQL Editor에서 실행하세요

-- 콩(크레딧) 잔액 테이블
CREATE TABLE IF NOT EXISTS user_credits (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email  TEXT         UNIQUE NOT NULL,
  balance     INTEGER      DEFAULT 0 NOT NULL CHECK (balance >= 0),
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- 거래 내역 테이블
CREATE TABLE IF NOT EXISTS credit_transactions (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email  TEXT         NOT NULL,
  type        TEXT         NOT NULL CHECK (type IN ('charge', 'use')),
  amount      INTEGER      NOT NULL,
  won         INTEGER,
  description TEXT,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_user_credits_email     ON user_credits (user_email);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_email ON credit_transactions (user_email);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON credit_transactions (created_at DESC);

-- AI 생성 이미지 저장 테이블
-- image_url: photos 버킷 ai_results/ 경로의 public URL
CREATE TABLE IF NOT EXISTS generated_images (
  id              UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email      TEXT,
  image_url       TEXT         NOT NULL,  -- storage: photos/ai_results/{filename}
  category        TEXT,
  platform        TEXT,
  background_name TEXT,
  created_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_images_email   ON generated_images (user_email);
CREATE INDEX IF NOT EXISTS idx_generated_images_created ON generated_images (created_at DESC);

-- RLS 비활성화 (서버 사이드에서 service_role_key로만 접근)
ALTER TABLE user_credits         DISABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions  DISABLE ROW LEVEL SECURITY;
ALTER TABLE generated_images     DISABLE ROW LEVEL SECURITY;
