'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import CoinChargeModal from '../components/CoinChargeModal'
import PhoneVerificationModal from '../components/PhoneVerificationModal'

const PLANS = [
  {
    key: 'basic', name: '베이직', icon: '🚀',
    subtitle: '처음 시작하는 사장님께 추천',
    monthlyPrice: 29900, yearlyMonthly: 19900, yearlyTotal: 238800, discount: 33,
    gems: 100, photos: 10, highlight: false,
    yearlyFeatures: [
      '매월 100젬 지급 (사진 10장)',
      '메뉴 리터치 이용 가능',
      '배경 선택',
      '결과물 마이페이지 저장',
      '이메일 고객지원',
    ],
    monthlyFeatures: [
      '매월 100젬 지급 (사진 10장)',
      '메뉴 리터치 이용 가능',
      '배경 선택',
      '결과물 마이페이지 저장',
      '이메일 고객지원',
    ],
  },
  {
    key: 'standard', name: '스탠다드', icon: '👑',
    subtitle: '메뉴를 자주 바꾸는 사장님께 추천',
    monthlyPrice: 49900, yearlyMonthly: 34900, yearlyTotal: 418800, discount: 30,
    gems: 200, photos: 20, highlight: true,
    yearlyFeatures: [
      '매월 200젬 지급 (사진 20장)',
      '베이직 전체 포함',
      '메뉴 리메이크 이용 가능',
      '우선 처리 (빠른 납품)',
      '카카오톡 1:1 지원',
      '미사용 젬 다음 달 이월',
    ],
    monthlyFeatures: [
      '매월 200젬 지급 (사진 20장)',
      '베이직 전체 포함',
      '메뉴 리메이크 이용 가능',
      '우선 처리 (빠른 납품)',
      '카카오톡 1:1 지원',
      '미사용 젬 다음 달 이월',
    ],
  },
  {
    key: 'pro', name: '프로', icon: '💎',
    subtitle: '신메뉴가 많거나 프랜차이즈 본사 추천',
    monthlyPrice: 89900, yearlyMonthly: 59900, yearlyTotal: 718800, discount: 33,
    gems: 400, photos: 40, highlight: false,
    yearlyFeatures: [
      '매월 400젬 지급 (사진 40장)',
      '스탠다드 전체 포함',
      '메뉴 모음컷 이용 가능',
      '수작업 보정 포함',
      '브리핑 서비스 (세부 요청)',
      '전담 매니저 배정',
    ],
    monthlyFeatures: [
      '매월 400젬 지급 (사진 40장)',
      '스탠다드 전체 포함',
      '메뉴 모음컷 이용 가능',
      '수작업 보정 포함',
      '브리핑 서비스 (세부 요청)',
      '전담 매니저 배정',
    ],
  },
]

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })
  useEffect(() => {
    const calc = () => {
      const now = new Date()
      const midnight = new Date()
      midnight.setHours(24, 0, 0, 0)
      const diff = Math.max(0, midnight.getTime() - now.getTime())
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft({ hours: h, minutes: m, seconds: s })
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [])
  return timeLeft
}

export default function PricingPage() {
  const [isLoggedIn, setIsLoggedIn]         = useState(false)
  const [userName, setUserName]             = useState('')
  const [userEmail, setUserEmail]           = useState<string | null>(null)
  const [userToken, setUserToken]           = useState<string | null>(null)
  const [gemBalance, setGemBalance]         = useState(0)
  const [showChargeModal, setShowChargeModal] = useState(false)
  const [loginModal, setLoginModal]         = useState(false)
  const [showPhoneVerify, setShowPhoneVerify] = useState(false)
  const [hasPhone, setHasPhone]             = useState(true)
  const [scrolled, setScrolled]             = useState(false)
  const [billingCycle, setBillingCycle]     = useState<'monthly' | 'yearly'>('yearly')
  const [activeSubscription, setActiveSubscription] = useState<{ plan_key: string; billing_cycle: string; next_billing_at: string } | null>(null)
  const [subscribing, setSubscribing]       = useState(false)
  const countdown = useCountdown()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    let loggedIn = false
    let token = '', email = '', name = ''

    const cookieMatch = document.cookie.split(';').find(c => c.trim().startsWith('ml_kakao_session='))
    if (cookieMatch) {
      try {
        const val = JSON.parse(decodeURIComponent(cookieMatch.split('=').slice(1).join('=')))
        if (val?.token && val?.email) {
          localStorage.setItem('menulab_session', JSON.stringify({ token: val.token, email: val.email, name: val.name || '' }))
          token = val.token; email = val.email; name = val.name || ''
          setIsLoggedIn(true); setUserName(name); setUserEmail(email); setUserToken(token)
          loggedIn = true
          document.cookie = 'ml_kakao_session=; max-age=0; path=/'
        }
      } catch {
        document.cookie = 'ml_kakao_session=; max-age=0; path=/'
      }
    }
    if (!loggedIn) {
      try {
        const raw = localStorage.getItem('menulab_session')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed.token && parsed.email) {
            token = parsed.token; email = parsed.email; name = parsed.name || ''
            setIsLoggedIn(true); setUserName(name); setUserEmail(email); setUserToken(token)
            loggedIn = true
          }
        }
      } catch {}
    }
    if (loggedIn && token) {
      fetch('/api/auth/phone-status', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { setHasPhone(!!d.hasPhone); if (!d.hasPhone) setShowPhoneVerify(true) })
        .catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!userToken) return
    fetch('/api/credits/balance', { headers: { Authorization: `Bearer ${userToken}` } })
      .then(r => r.json())
      .then(d => { if (typeof d.balance === 'number') setGemBalance(d.balance) })
      .catch(() => {})
    fetch('/api/subscription/status', { headers: { Authorization: `Bearer ${userToken}` } })
      .then(r => r.json())
      .then(d => { if (d.subscription) setActiveSubscription(d.subscription) })
      .catch(() => {})
  }, [userToken])

  const handleChargeClick = () => {
    if (isLoggedIn) {
      if (!hasPhone) { setShowPhoneVerify(true); return }
      setShowChargeModal(true)
    } else {
      setLoginModal(true)
    }
  }

  const handleSubscribeClick = async (planKey: string) => {
    if (!isLoggedIn) { setLoginModal(true); return }
    if (!hasPhone) { setShowPhoneVerify(true); return }
    if (!userToken) return
    if (subscribing) return

    if (activeSubscription) {
      alert(`이미 ${activeSubscription.plan_key} 플랜을 구독 중이에요.\n마이페이지에서 해지 후 재구독할 수 있어요.`)
      return
    }

    setSubscribing(true)
    try {
      const popup = window.open('about:blank', '_blank', 'width=480,height=700')
      const res = await fetch('/api/payapp/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ planKey, billingCycle }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        popup?.close()
        alert(data.error || '구독 연동 중 오류가 발생했어요')
        return
      }
      if (popup) popup.location.href = data.url
      else window.open(data.url, '_blank', 'width=480,height=700')
    } catch {
      alert('네트워크 오류가 발생했어요')
    } finally {
      setSubscribing(false)
    }
  }

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh', fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif" }}>
      {showPhoneVerify && userToken && (
        <PhoneVerificationModal
          token={userToken}
          onVerified={() => { setHasPhone(true); setShowPhoneVerify(false) }}
          onSkip={() => setShowPhoneVerify(false)}
        />
      )}
      {showChargeModal && userEmail && (
        <CoinChargeModal
          shortfall={0}
          userEmail={userEmail}
          onClose={() => setShowChargeModal(false)}
          onSuccess={() => {
            setShowChargeModal(false)
            if (userToken) {
              fetch('/api/credits/balance', { headers: { Authorization: `Bearer ${userToken}` } })
                .then(r => r.json()).then(d => { if (typeof d.balance === 'number') setGemBalance(d.balance) }).catch(() => {})
            }
          }}
        />
      )}
      {loginModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setLoginModal(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', padding: '16px' }}
        >
          <div style={{ background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '340px', boxShadow: '0 24px 80px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 22px 6px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setLoginModal(false)} style={{ background: 'none', border: 'none', fontSize: '26px', cursor: 'pointer', color: '#bbb', lineHeight: 1, padding: '4px' }}>×</button>
            </div>
            <div style={{ padding: '4px 28px 32px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>✨</div>
              <h3 style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-0.3px', marginBottom: '6px' }}>로그인 후 시작할 수 있어요</h3>
              <p style={{ fontSize: '13px', color: '#888', marginBottom: '24px', lineHeight: 1.6 }}>카카오 계정으로 간편하게 시작하고<br />내 AI 사진을 바로 확인해보세요</p>
              <button
                onClick={() => { window.location.href = `/api/auth/kakao?returnTo=${encodeURIComponent('/pricing')}` }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', padding: '15px', background: '#FEE500', color: '#000', borderRadius: '12px', fontSize: '15px', fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 2px 12px rgba(254,229,0,0.5)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 3C6.477 3 2 6.582 2 11.012c0 2.782 1.696 5.232 4.27 6.729l-1.088 3.98a.3.3 0 0 0 .46.325l4.603-3.05c.573.08 1.162.122 1.755.122 5.523 0 10-3.582 10-8.012S17.523 3 12 3Z" fill="#000" />
                </svg>
                카카오로 시작하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        background: scrolled ? 'rgba(255,255,255,0.88)' : '#fff',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        transition: 'background 0.3s ease',
      }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 clamp(20px,5vw,80px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img src="https://i.ibb.co/YF3csF80/image.png" alt="메뉴랩" style={{ height: '54px', width: 'auto' }} fetchPriority="high" />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {isLoggedIn ? (
              <>
                <button
                  onClick={() => setShowChargeModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '100px', padding: '6px 14px', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: 'var(--black)' }}
                >
                  💎 {gemBalance.toLocaleString()}젬
                </button>
                <Link href="/mypage" style={{ fontSize: '14px', color: 'var(--orange)', textDecoration: 'none', fontWeight: 700 }}>마이페이지</Link>
              </>
            ) : (
              <>
                <Link href="/pricing" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--orange)', textDecoration: 'none' }}>요금제</Link>
                <button
                  onClick={() => { window.location.href = `/api/auth/kakao?returnTo=${encodeURIComponent('/')}` }}
                  style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: '100px', padding: '10px 22px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(196,81,13,0.3)' }}
                >
                  무료로 시작
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Page content */}
      <div style={{ paddingTop: '60px' }}>
        <section id="pricing" className="sec-pricing" style={{ padding: '100px 5vw', background: 'var(--cream)', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)', letterSpacing: '2px', marginBottom: '12px' }}>PRICING</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, letterSpacing: '-1px', color: 'var(--black)', lineHeight: 1.2, marginBottom: '12px' }}>스튜디오 촬영 비용의 5%</h2>
            <p style={{ color: '#888', fontSize: '15px', marginBottom: '28px' }}>배달앱 메뉴 사진을 직접 만드세요</p>

            {/* Countdown Timer */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '10px',
                background: 'var(--black)', color: '#fff',
                padding: '10px 20px', borderRadius: '100px',
                fontSize: '14px', fontWeight: 700,
              }}>
                <span>🎁 신규 가입 특가 종료까지:</span>
                <span style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.5px' }}>
                  {String(countdown.hours).padStart(2, '0')}시{' '}
                  {String(countdown.minutes).padStart(2, '0')}분{' '}
                  {String(countdown.seconds).padStart(2, '0')}초
                </span>
              </div>
            </div>

            {/* Billing Toggle */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '48px' }}>
              <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.06)', borderRadius: '100px', padding: '4px', gap: '2px' }}>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  style={{ padding: '10px 24px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '15px', background: billingCycle === 'yearly' ? 'var(--black)' : 'transparent', color: billingCycle === 'yearly' ? '#fff' : '#888', boxShadow: billingCycle === 'yearly' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  연간
                  <span style={{ background: billingCycle === 'yearly' ? 'var(--orange)' : 'rgba(196,81,13,0.12)', color: billingCycle === 'yearly' ? '#fff' : 'var(--orange)', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '100px', whiteSpace: 'nowrap' }}>33% 🔥</span>
                </button>
                <button
                  onClick={() => setBillingCycle('monthly')}
                  style={{ padding: '10px 28px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '15px', background: billingCycle === 'monthly' ? '#fff' : 'transparent', color: billingCycle === 'monthly' ? 'var(--black)' : '#888', boxShadow: billingCycle === 'monthly' ? '0 2px 8px rgba(0,0,0,0.12)' : 'none', transition: 'all 0.2s' }}
                >월간</button>
              </div>
            </div>

            {/* Plan Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', alignItems: 'stretch' }}>
              {PLANS.map(plan => {
                const isYearly   = billingCycle === 'yearly'
                const price      = isYearly ? plan.yearlyMonthly : plan.monthlyPrice
                const features   = isYearly ? plan.yearlyFeatures : plan.monthlyFeatures
                const isStandard = plan.key === 'standard'
                return (
                  <div key={plan.key} style={{ position: 'relative' }}>
                    <div style={{
                      height: '100%', borderRadius: '20px', background: '#fff',
                      boxShadow: isStandard ? '0 8px 48px rgba(0,0,0,0.18)' : '0 2px 16px rgba(0,0,0,0.07)',
                      border: isStandard ? '2px solid var(--black)' : '1px solid rgba(0,0,0,0.07)',
                      display: 'flex', flexDirection: 'column', padding: '28px 24px', boxSizing: 'border-box',
                      position: 'relative', overflow: 'hidden',
                    }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px', minHeight: '26px' }}>
                        {isStandard && (
                          <span style={{ background: 'var(--black)', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '100px' }}>⭐ MOST POPULAR</span>
                        )}
                        {isYearly && (
                          <span style={{ background: 'rgba(196,81,13,0.1)', color: 'var(--orange)', fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '100px' }}>🔥 Save {plan.discount}%</span>
                        )}
                      </div>
                      <div style={{ marginBottom: '6px' }}>
                        <span style={{ fontSize: '28px' }}>{plan.icon}</span>
                      </div>
                      <h3 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--black)', marginBottom: '4px', letterSpacing: '-0.5px' }}>{plan.name}</h3>
                      <p style={{ fontSize: '13px', color: '#888', marginBottom: '20px', lineHeight: 1.4 }}>{plan.subtitle}</p>
                      <div style={{ marginBottom: '6px' }}>
                        {isYearly && (
                          <span style={{ fontSize: '13px', color: '#ccc', textDecoration: 'line-through', display: 'block', marginBottom: '2px' }}>₩{plan.monthlyPrice.toLocaleString()}/월</span>
                        )}
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                          <span style={{ fontSize: '36px', fontWeight: 900, color: 'var(--black)', letterSpacing: '-1.5px', lineHeight: 1 }}>₩{price.toLocaleString()}</span>
                          <span style={{ fontSize: '13px', color: '#888', fontWeight: 500, paddingBottom: '5px' }}>/월</span>
                        </div>
                      </div>
                      {isYearly ? (
                        <p style={{ fontSize: '12px', color: '#22c55e', fontWeight: 700, marginBottom: '4px' }}>
                          Actually: ₩{plan.yearlyTotal.toLocaleString()}
                        </p>
                      ) : (
                        <p style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>매월 청구</p>
                      )}
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.05)', borderRadius: '100px', padding: '5px 12px', marginBottom: '20px', alignSelf: 'flex-start' }}>
                        <span style={{ fontSize: '14px' }}>💎</span>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--black)' }}>{plan.gems}젬/월</span>
                      </div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '9px', flex: 1 }}>
                        {features.map((f, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#444', lineHeight: 1.5 }}>
                            <span style={{ color: '#22c55e', fontWeight: 900, flexShrink: 0, marginTop: '1px' }}>✓</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => handleSubscribeClick(plan.key)}
                        disabled={subscribing}
                        style={{
                          display: 'block', width: '100%', textAlign: 'center',
                          padding: '15px', borderRadius: '12px', border: 'none',
                          cursor: subscribing ? 'not-allowed' : 'pointer',
                          background: activeSubscription?.plan_key === plan.key
                            ? '#22c55e'
                            : isStandard ? 'var(--orange)' : 'var(--black)',
                          color: '#fff', fontWeight: 800, fontSize: '15px',
                          boxShadow: isStandard ? '0 4px 20px rgba(196,81,13,0.4)' : 'none',
                          opacity: subscribing ? 0.7 : 1,
                          transition: 'opacity 0.15s',
                        }}
                      >
                        {activeSubscription?.plan_key === plan.key
                          ? '구독 중 ✓'
                          : subscribing ? '처리 중...' : '구독 시작하기'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <p style={{ textAlign: 'center', color: '#aaa', fontSize: '13px', marginTop: '20px' }}>
              구독 없이 필요할 때만 충전 · 젬은 유효기간 없이 사용 가능
            </p>

            {/* Add-on Packages */}
            <div style={{ marginTop: '64px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--orange)', letterSpacing: '2px', marginBottom: '8px' }}>ADD-ON</p>
              <h3 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 900, color: 'var(--black)', letterSpacing: '-0.5px', marginBottom: '6px' }}>젬이 더 필요하신가요?</h3>
              <p style={{ color: '#888', fontSize: '14px', marginBottom: '32px' }}>구독 없이 한 번만 충전하세요</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', maxWidth: '560px' }}>
                {[
                  {
                    id: 'small' as const,
                    name: '스몰 패키지',
                    subtitle: '가끔 필요할 때',
                    price: '24,900',
                    gems: 50,
                    features: ['1회 결제', '50젬 즉시 지급 (사진 5장)', '구독 불필요', '유효기간 90일'],
                  },
                  {
                    id: 'large' as const,
                    name: '라지 패키지',
                    subtitle: '넉넉하게 쓰고 싶을 때',
                    price: '44,900',
                    gems: 100,
                    features: ['1회 결제', '100젬 즉시 지급 (사진 10장)', '구독 불필요', '유효기간 90일'],
                  },
                ].map(pkg => (
                  <div key={pkg.id} style={{
                    borderRadius: '20px', background: '#fff',
                    border: '1px solid rgba(0,0,0,0.07)',
                    boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
                    padding: '24px 22px', display: 'flex', flexDirection: 'column',
                  }}>
                    <span style={{ display: 'inline-block', background: 'rgba(0,0,0,0.06)', color: '#666', fontSize: '10px', fontWeight: 800, padding: '3px 10px', borderRadius: '100px', marginBottom: '14px', alignSelf: 'flex-start', letterSpacing: '0.5px' }}>No Subscription</span>
                    <h4 style={{ fontSize: '17px', fontWeight: 900, color: 'var(--black)', marginBottom: '3px', letterSpacing: '-0.3px' }}>{pkg.name}</h4>
                    <p style={{ fontSize: '12px', color: '#888', marginBottom: '14px' }}>{pkg.subtitle}</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '28px', fontWeight: 900, color: 'var(--black)', letterSpacing: '-1px', lineHeight: 1 }}>₩{pkg.price}</span>
                      <span style={{ fontSize: '12px', color: '#888' }}>one-time</span>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.05)', borderRadius: '100px', padding: '4px 10px', marginBottom: '16px', alignSelf: 'flex-start' }}>
                      <span style={{ fontSize: '13px' }}>💎</span>
                      <span style={{ fontSize: '12px', fontWeight: 800 }}>{pkg.gems}젬</span>
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      {pkg.features.map((f, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#555' }}>
                          <span style={{ color: '#22c55e', fontWeight: 900, flexShrink: 0 }}>✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={handleChargeClick}
                      style={{ display: 'block', width: '100%', padding: '13px', borderRadius: '12px', background: 'var(--black)', color: '#fff', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer' }}
                    >
                      한 번만 충전하기
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer style={{ background: 'var(--black)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '40px 5vw' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <img src="https://i.ibb.co/YF3csF80/image.png" alt="메뉴랩" style={{ height: '44px', width: '160px', objectFit: 'contain', objectPosition: 'left', filter: 'invert(1)' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px' }}>
            {['상호명: 메뉴랩', '대표자: 최재이', '사업자등록번호: 331-39-01242', '주소: 화성시 동탄구 동탄대로 676, 힐스테이트동탄역멀티플라이어 오피스 406호', '전화: 010-5892-4221', '이메일: solip7131@gmail.com'].map(item => (
              <span key={item} style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>{item}</span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Link href="/terms"   style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', textDecoration: 'none' }}>이용약관</Link>
            <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', textDecoration: 'none' }}>개인정보처리방침</Link>
            <Link href="/refund"  style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', textDecoration: 'none' }}>환불정책</Link>
            <Link href="/customer" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', textDecoration: 'none' }}>고객센터</Link>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>© 2026 메뉴랩. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
