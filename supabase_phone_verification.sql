-- ============================================================
-- 휴대폰 인증 관련 테이블 / 컬럼 추가
-- ============================================================

-- 1. kakao_tokens 테이블에 phone 컬럼 추가
ALTER TABLE kakao_tokens
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. 인증번호 임시 저장 테이블
CREATE TABLE IF NOT EXISTS phone_verifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      TEXT        NOT NULL,
  code       TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON phone_verifications(phone);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_email ON phone_verifications(email);

-- 만료된 레코드 자동 삭제 (RLS 비활성화 상태에서 service_role 사용)
-- 참고: 실제 삭제는 API에서 처리하며, 이 인덱스는 조회 최적화용
