-- ============================================================
-- v2 마이그레이션: Supabase SQL Editor에서 실행
-- ============================================================

-- 1. orders 테이블에 source 컬럼 추가
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT NULL;

-- 2. orders 테이블에 v2_meta JSONB 컬럼 추가
--    저장 구조 예시:
--    {
--      "plan_type": "trial" | "basic" | "premium",
--      "mood": "black" | "white",
--      "vessel_choice": "original" | "recommended",
--      "recommended_vessel_id": "plate:white",
--      "recommended_vessel_label": "접시 · 흰색",
--      "briefing": {
--        "vibes": ["따뜻한", "고급스러운"],
--        "vessel_pref": "recommend" | "reference",
--        "reference_photo_urls": [],
--        "free_request": "자유 요청 텍스트"
--      },
--      "amount": 7900,
--      "kakao_channel_sent": false
--    }
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS v2_meta JSONB DEFAULT NULL;

-- 3. 인덱스: source 필터링용
CREATE INDEX IF NOT EXISTS idx_orders_source ON orders (source);

-- 4. 인덱스: source + created_at 복합 (어드민 목록 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_orders_source_created ON orders (source, created_at DESC);

-- 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN ('source', 'v2_meta')
ORDER BY column_name;
