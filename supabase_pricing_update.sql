-- Menulab Pricing Plan Name Migration
-- 실행 전 백업 권장: SELECT * FROM subscriptions;

-- plan1 → basic (기존 값 그대로, 명시적으로 업데이트)
UPDATE subscriptions SET plan = 'basic'    WHERE plan = 'plan1';

-- plan2 → standard
UPDATE subscriptions SET plan = 'standard' WHERE plan = 'plan2';

-- plan3 → pro
UPDATE subscriptions SET plan = 'pro'      WHERE plan = 'plan3';

-- 결과 확인
SELECT plan, COUNT(*) as count FROM subscriptions GROUP BY plan ORDER BY plan;
