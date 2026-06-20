'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import BasicPlanModal from '../components/BasicPlanModal'
import CoinChargeModal from '../components/CoinChargeModal'

const PLANS = [
  {
    key: 'basic', name: '베이직', icon: '🚀',
    subtitle: '처음 시작하는 사장님께 추천',
    monthlyPrice: 29900, yearlyMonthly: 19900, yearlyTotal: 238800, discount: 33,
    gems: 100, photos: 10, highlight: false,
    yearlyFeatures: [
      '매월 100젬 지급 (사진 10장)',
      '메뉴샷 이용 가능',
      '배경 선택',
      '결과물 마이페이지 저장',
      '이메일 고객지원',
    ],
    monthlyFeatures: [
      '매월 100젬 지급 (사진 10장)',
      '메뉴샷 이용 가능',
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
      '메뉴샷 이용 가능',
      '우선 처리 (빠른 납품)',
      '카카오톡 1:1 지원',
      '미사용 젬 다음 달 이월',
    ],
    monthlyFeatures: [
      '매월 200젬 지급 (사진 20장)',
      '베이직 전체 포함',
      '메뉴샷 이용 가능',
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
      '모음컷 이용 가능',
      '수작업 보정 포함',
      '브리핑 서비스 (세부 요청)',
      '전담 매니저 배정',
    ],
    monthlyFeatures: [
      '매월 400젬 지급 (사진 40장)',
      '스탠다드 전체 포함',
      '모음컷 이용 가능',
      '수작업 보정 포함',
      '브리핑 서비스 (세부 요청)',
      '전담 매니저 배정',
    ],
  },
]

const CASES = [
  {
    title: '연어세트',
    desc: '배달앱 리뷰 사진 그대로 보내주셨어요',
    tag: '배달앱 사진 → 스튜디오급',
    sideBySide: true,
    before: 'https://i.ibb.co/YFDSdrdG/before.png',
    afters: [{ src: 'https://i.ibb.co/QFv2RLW0/after.png', label: 'After' }],
  },
  {
    title: '분식 단품',
    desc: '같은 원본 소스로 메뉴별 개별 컷 제작',
    tag: '원본 1장 → 단품 2컷',
    before: 'https://i.ibb.co/vxDm2vrx/Kakao-Talk-20260124-144350686-01.png',
    afters: [
      { src: 'https://i.ibb.co/1J0wh6dW/01.jpg', label: '오리지널' },
      { src: 'https://i.ibb.co/nNW2kjBC/03.jpg', label: '함박파스타' },
    ],
  },
  {
    title: '샐러드볼',
    desc: '구도 변경 + 배경 교체로 완전히 다른 느낌',
    tag: '구도 변경 + 배경 교체',
    befores: ['https://i.ibb.co/dJjyr7vC/jpg.png', 'https://i.ibb.co/27b90LZD/Kakao-Talk-20260109-173308783-15-jpg.png'],
    before: 'https://i.ibb.co/dJjyr7vC/jpg.png',
    afters: [{ src: 'https://i.ibb.co/mrCMBYhD/18.png', label: 'After 1' }, { src: 'https://i.ibb.co/Mxpzc8TP/21.png', label: 'After 2' }],
  },
  {
    title: '김치말이냉국수',
    desc: '심플한 원본 → 고급스러운 무드 연출',
    tag: '배경 · 조명 · 분위기 변경',
    sideBySide: true,
    before: 'https://i.ibb.co/qK9VJv9/image.png',
    afters: [{ src: 'https://i.ibb.co/xK5Pjg2h/12.png', label: 'After' }],
  },
]

const PLATFORMS = [
  { name: '배달의민족', src: '/logos/baemin.png',      size: '1280×960' },
  { name: '쿠팡이츠',   src: '/logos/coupangeats.svg', size: '1080×660' },
  { name: '요기요',     src: '/logos/yogiyo.png',      size: '1080×640' },
  { name: '땡겨요',     src: '/logos/ddanggyeo.svg',   size: '1080×660' },
  { name: '먹깨비',     src: '/logos/mukggaebi.webp',  size: '800×533'  },
]

const FAQ = [
  { q: '메뉴사진을 잘 찍는 방법이 있나요?', a: '핵심은 세 가지예요. ① 밝은 곳에서 흔들리지 않게 ② 음식이 화면 가득 차게 가까이서 찍기 ③ 스마트폰을 가로로 돌려서 촬영 — AI 결과물이 가로(3:2) 비율로 생성되기 때문에 가로 사진일수록 훨씬 자연스럽게 나와요. 완벽하지 않아도 메뉴랩에서 맛있어 보이게 메뉴샷으로 만들어드려요.' },
  { q: '스마트폰으로 찍어도 괜찮나요?', a: '물론이죠! 요즘 스마트폰 카메라 성능이 좋아서 충분해요. 단, 스마트폰을 가로로 돌려서 촬영해주세요 — AI 결과물은 가로(3:2) 비율로 생성되기 때문에 가로 사진을 업로드하시면 최상의 결과를 얻을 수 있어요. 어두운 곳에서 플래시 켜고 촬영한 사진은 활용이 어렵습니다. 배달앱·플레이스 리뷰 사진을 업로드하셔도 됩니다!' },
  { q: '"사진 사기" 리뷰가 생기지 않을까요?', a: '없는 재료를 만들어내지 않고, 실제 제공량을 그대로 반영하며, 과장된 광택이나 인위적 표현은 사용하지 않아요. "올려도 안전한" 수준의 자연스러운 보정만 합니다.' },
  { q: '작업 기간은 얼마나 걸리나요?', a: '입금 확인 후 3일 이내 제작 완료 후 카카오톡 채널을 통해 결과물 링크를 전달해드립니다.' },
  { q: '기본과 프리미엄의 차이는 무엇인가요?', a: '기본(7,900원)은 AI를 활용한 자동 생성이며, 그릇만 선택하면 됩니다. 프리미엄(14,900원)은 수작업으로 진행되며, 원하는 느낌·분위기를 브리핑 폼으로 세세하게 전달하실 수 있습니다. 수정도 기본 2회 포함돼요.' },
  { q: '결제는 어떻게 하나요?', a: '현재는 계좌이체(무통장 입금)로만 운영됩니다. 주문 접수 완료 후 화면에 표시되는 계좌로 입금하시면 입금 확인 후 작업이 시작됩니다. 결과물은 카카오톡 채널로 전달해드려요.' },
  { q: '마음에 안 들면 어떻게 하나요?', a: '프리미엄 플랜은 수정 2회가 기본 포함됩니다. 베이직은 결과물 확인 후 재제작이 필요하시면 카카오톡으로 문의해주세요.' },
]

const BEFORE_SRC = '/noodle-before.jpg'
const AFTER_SRC  = '/noodle-after.jpg'
const BG_SRC     = '/hero-bg.jpg'

// 자동 슬라이더 상수: 50% → 10%(before) → 90%(after) → 50%, 총 4.5초 루프
const SLIDER_KEYFRAMES = [50, 10, 90, 50]
const SLIDER_DURATIONS = [1500, 1500, 1500]
const SLIDER_CYCLE_MS  = 4500

function sliderEase(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

function calcAutoPos(progress: number): number {
  const t = progress % SLIDER_CYCLE_MS
  let segStart = 0
  for (let i = 0; i < SLIDER_DURATIONS.length; i++) {
    const segEnd = segStart + SLIDER_DURATIONS[i]
    if (t <= segEnd) {
      const p = sliderEase((t - segStart) / SLIDER_DURATIONS[i])
      return SLIDER_KEYFRAMES[i] + (SLIDER_KEYFRAMES[i + 1] - SLIDER_KEYFRAMES[i]) * p
    }
    segStart = segEnd
  }
  return 50
}

function ImageCompareSlider() {
  const [pos, setPos]  = useState(50)
  const containerRef   = useRef<HTMLDivElement>(null)
  const dragging       = useRef(false)
  const animRef        = useRef<number | null>(null)
  const pauseTimer     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressRef    = useRef(0)
  const lastTsRef      = useRef<number | null>(null)

  const tick = useCallback((ts: number) => {
    if (lastTsRef.current !== null) {
      progressRef.current = (progressRef.current + ts - lastTsRef.current) % SLIDER_CYCLE_MS
    }
    lastTsRef.current = ts
    setPos(calcAutoPos(progressRef.current))
    animRef.current = requestAnimationFrame(tick)
  }, [])

  const startAnim = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    lastTsRef.current = null
    animRef.current = requestAnimationFrame(tick)
  }, [tick])

  const stopAnim = useCallback(() => {
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null }
    lastTsRef.current = null
  }, [])

  useEffect(() => {
    const t = setTimeout(startAnim, 1000)
    return () => {
      clearTimeout(t)
      stopAnim()
      if (pauseTimer.current) clearTimeout(pauseTimer.current)
    }
  }, [startAnim, stopAnim])

  const updatePos = useCallback((clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const { left, width } = el.getBoundingClientRect()
    setPos(Math.min(100, Math.max(0, ((clientX - left) / width) * 100)))
  }, [])

  const onDragStart = () => {
    dragging.current = true
    stopAnim()
    if (pauseTimer.current) clearTimeout(pauseTimer.current)
  }

  const onDragEnd = () => {
    dragging.current = false
    if (pauseTimer.current) clearTimeout(pauseTimer.current)
    pauseTimer.current = setTimeout(startAnim, 3000)
  }

  return (
    <div
      ref={containerRef}
      className="hero-compare"
      onMouseDown={onDragStart}
      onMouseMove={e => { if (dragging.current) updatePos(e.clientX) }}
      onMouseUp={onDragEnd}
      onMouseLeave={() => { if (dragging.current) onDragEnd() }}
      onTouchStart={onDragStart}
      onTouchMove={e => { updatePos(e.touches[0].clientX) }}
      onTouchEnd={onDragEnd}
      style={{ position: 'relative', width: '100%', borderRadius: '20px', overflow: 'hidden', cursor: 'ew-resize', userSelect: 'none', touchAction: 'none' }}
    >
      <img src={AFTER_SRC}  alt="after"  fetchPriority="high" loading="eager" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${100 - pos}% 0 0)`, pointerEvents: 'none' }}>
        <img src={BEFORE_SRC} alt="before" fetchPriority="high" loading="eager" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pos}%`, transform: 'translateX(-50%)', width: '2px', background: '#fff', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '36px', height: '36px', borderRadius: '50%', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 900, color: '#333', letterSpacing: '-1px' }}>◀▶</div>
      </div>
      <div style={{ position: 'absolute', bottom: '14px', left: '14px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '100px', pointerEvents: 'none' }}>BEFORE</div>
      <div style={{ position: 'absolute', bottom: '14px', right: '14px', background: 'var(--orange)', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '100px', pointerEvents: 'none' }}>AFTER</div>
    </div>
  )
}

function SparkleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="white" style={{ flexShrink: 0 }}>
      <path d="M10 2l1.5 5.5L17 9l-5.5 1.5L10 16l-1.5-5.5L3 9l5.5-1.5L10 2z"/>
      <path d="M18 2l.8 2.2L21 5l-2.2.8L18 8l-.8-2.2L15 5l2.2-.8L18 2z"/>
      <path d="M20 13l.6 1.8L22.4 15.5l-1.8.6L20 18l-.6-1.9L17.6 15.5l1.8-.6L20 13z"/>
    </svg>
  )
}

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

export default function V2HomePage() {
  const [openFaq, setOpenFaq]         = useState<number | null>(null)
  const [scrolled, setScrolled]       = useState(false)
  const [isLoggedIn, setIsLoggedIn]   = useState(false)
  const [userName, setUserName]       = useState('')
  const [userEmail, setUserEmail]     = useState<string | null>(null)
  const [userToken, setUserToken]     = useState<string | null>(null)
  const [gemBalance, setGemBalance]   = useState(0)
  const [showChargeModal, setShowChargeModal] = useState(false)
  const [basicModal, setBasicModal]   = useState(false)
  const [loginModal, setLoginModal]   = useState(false)
  const [loginReturnTo, setLoginReturnTo] = useState('/mypage')
  const [bannerVisible, setBannerVisible] = useState(true)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly')
  const countdown = useCountdown()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    let loggedIn = false
    let token = '', email = '', name = ''

    // Process kakao session cookie (set after oauth redirect)
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

    // Open BasicPlanModal if pending after login redirect
    try {
      const pending = localStorage.getItem('menulab_pending_action')
      if (pending === 'openBasicModal' && loggedIn) {
        localStorage.removeItem('menulab_pending_action')
        setBasicModal(true)
      }
    } catch {}
  }, [])

  // Fetch gem balance when token is available
  useEffect(() => {
    if (!userToken) return
    fetch('/api/credits/balance', { headers: { Authorization: `Bearer ${userToken}` } })
      .then(r => r.json())
      .then(d => { if (typeof d.balance === 'number') setGemBalance(d.balance) })
      .catch(() => {})
  }, [userToken])

  const handleOpenBasic = () => {
    if (isLoggedIn) {
      setBasicModal(true)
    } else {
      setLoginReturnTo('/mypage')
      setLoginModal(true)
    }
  }

  const handleChargeClick = () => {
    if (isLoggedIn) {
      setShowChargeModal(true)
    } else {
      setLoginReturnTo('/v2')
      setLoginModal(true)
    }
  }

  const BANNER_H = bannerVisible ? 40 : 0

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh' }}>
      {basicModal && <BasicPlanModal onClose={() => setBasicModal(false)} />}
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

      {/* 신규 가입 이벤트 배너 */}
      {bannerVisible && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 201,
          background: '#1d4ed8', color: '#fff',
          height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', fontWeight: 600, gap: '6px', padding: '0 48px',
        }}>
          <span style={{ opacity: 0.75, fontSize: '11px', fontWeight: 700, letterSpacing: '1px' }}>신규 가입 이벤트</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>지금 가입하면 <strong style={{ fontWeight: 900 }}>20젬</strong>을 드려요 💎</span>
          <button
            onClick={() => setBannerVisible(false)}
            style={{ position: 'absolute', right: '14px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '20px', cursor: 'pointer', lineHeight: 1, padding: '4px' }}
          >×</button>
        </div>
      )}

      {/* 카카오 로그인 모달 */}
      {loginModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setLoginModal(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
            padding: '16px',
          }}
        >
          <div style={{
            background: '#fff', borderRadius: '24px',
            width: '100%', maxWidth: '340px',
            boxShadow: '0 24px 80px rgba(0,0,0,0.35)', overflow: 'hidden',
          }}>
            <div style={{ padding: '20px 22px 6px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setLoginModal(false)} style={{ background: 'none', border: 'none', fontSize: '26px', cursor: 'pointer', color: '#bbb', lineHeight: 1, padding: '4px' }}>×</button>
            </div>
            <div style={{ padding: '4px 28px 32px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>✨</div>
              <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--black)', letterSpacing: '-0.3px', marginBottom: '6px' }}>
                로그인 후 시작할 수 있어요
              </h3>
              <p style={{ fontSize: '13px', color: '#888', marginBottom: '24px', lineHeight: 1.6 }}>
                카카오 계정으로 간편하게 시작하고<br />내 AI 사진을 바로 확인해보세요
              </p>
              <button
                onClick={() => {
                  window.location.href = `/api/auth/kakao?returnTo=${encodeURIComponent(loginReturnTo)}`
                }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  width: '100%', padding: '15px', background: '#FEE500', color: '#000',
                  borderRadius: '12px', fontSize: '15px', fontWeight: 800,
                  border: 'none', cursor: 'pointer', boxShadow: '0 2px 12px rgba(254,229,0,0.5)',
                }}
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

      {/* NAV */}
      <nav style={{
        position: 'fixed', top: BANNER_H, left: 0, right: 0, zIndex: 200,
        background: scrolled ? 'rgba(255,255,255,0.72)' : '#fff',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        padding: '0 5vw', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '60px', transition: 'background 0.3s ease',
      }}>
        <Link href="/v2" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="https://i.ibb.co/YF3csF80/image.png" alt="메뉴랩" style={{ height: '54px', width: 'auto' }} fetchPriority="high" />
        </Link>
        <div className="nav-links" style={{ display: 'flex', gap: '28px', alignItems: 'center' }}>
          <Link href="/about"      style={{ fontSize: '16px', color: 'var(--black)', textDecoration: 'none', fontWeight: 500 }}>소개</Link>
          <a    href="#cases"      style={{ fontSize: '16px', color: 'var(--black)', textDecoration: 'none', fontWeight: 500 }}>제작사례</a>
          <a    href="#pricing"    style={{ fontSize: '16px', color: 'var(--black)', textDecoration: 'none', fontWeight: 500 }}>가격</a>
          {isLoggedIn ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '14px', color: '#555', fontWeight: 500 }}>{userName || userEmail?.split('@')[0]} 님</span>
              <button
                onClick={() => setShowChargeModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '100px', padding: '6px 12px', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: 'var(--black)' }}
              >
                💎 {gemBalance.toLocaleString()}젬
              </button>
              <Link href="/mypage" style={{ fontSize: '14px', color: 'var(--orange)', textDecoration: 'none', fontWeight: 700 }}>마이페이지</Link>
            </div>
          ) : (
            <button
              onClick={() => { setLoginReturnTo('/mypage'); setLoginModal(true) }}
              style={{ fontSize: '15px', color: 'var(--orange)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >로그인</button>
          )}
        </div>
      </nav>

      {/* HERO */}
      {/* 히어로 고정 배경 — position:fixed로 스크롤해도 움직이지 않음 */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: `url(${BG_SRC})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />

      <section className="hero-sec" style={{ position: 'relative', width: '100vw', height: `calc(100vh - ${60 + BANNER_H}px)`, minHeight: '460px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '2vh', paddingBottom: '6vh', marginTop: 60 + BANNER_H }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 40%, rgba(0,0,0,0.12) 100%)' }} />
        <div className="hero-body" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '1040px', padding: '10vh 40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <h1 className="hero-headline" style={{ animation: 'fadeDown 0.7s ease forwards', opacity: 0, textAlign: 'center', fontSize: 'clamp(34px, 5.8vw, 64px)', fontWeight: 900, lineHeight: 1.15, letterSpacing: '-1.5px', color: '#fff' }}>
            <span style={{ fontSize: '0.65em', fontWeight: 700, opacity: 0.85 }}>스마트폰 사진 한 장,</span><br />
            <span style={{ color: 'var(--orange)' }}>스튜디오급</span>으로
          </h1>
          <p className="hero-badge" style={{ animation: 'fadeDown 0.6s ease 0.15s forwards', opacity: 0, textAlign: 'center', fontSize: 'clamp(13px, 1.8vw, 17px)', color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
            배달앱, 플레이스 메뉴사진 필요하세요?
          </p>
          <div className="hero-slider" style={{ animation: 'fadeUp 0.8s ease 0.25s forwards', opacity: 0, width: '100%', maxWidth: '860px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', borderRadius: '20px', marginTop: '4px' }}>
            <ImageCompareSlider />
          </div>
        </div>
      </section>

      {/* CTA 고정 버튼 */}
      <button
        onClick={() => {
          if (isLoggedIn) {
            window.location.href = '/mypage'
          } else {
            setLoginReturnTo('/mypage')
            setLoginModal(true)
          }
        }}
        className="cta-float"
        style={{ position: 'fixed', bottom: '56px', left: 0, right: 0, margin: '0 auto', width: 'fit-content', zIndex: 300, animation: 'float 2.2s ease-in-out infinite', background: 'var(--orange)', color: '#fff', padding: '24px 44px', borderRadius: '100px', fontSize: '22px', fontWeight: 800, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 8px 32px rgba(0,0,0,0.25)', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '10px' }}
      >
        <SparkleIcon />
        지금 주문하기
      </button>

      {/* PORTFOLIO */}
      <section id="cases" className="sec-portfolio" style={{ padding: '80px 5vw', background: '#fff', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)', letterSpacing: '2px', marginBottom: '12px' }}>PORTFOLIO</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1.2, marginBottom: '16px', color: 'var(--black)' }}>실제 제작 사례</h2>
          <p style={{ color: '#888', fontSize: '16px', marginBottom: '48px' }}>Before → After · 실제 클라이언트 작업물입니다</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {CASES.map((c, i) => (
              <div key={i} style={{ background: '#f9f9f9', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.07)' }}>
                <div style={{ padding: '20px 24px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ fontWeight: 800, fontSize: '18px', marginBottom: '2px', color: 'var(--black)' }}>{c.title}</h3>
                    <p style={{ color: '#888', fontSize: '13px' }}>{c.desc}</p>
                  </div>
                  <div style={{ background: 'rgba(255,92,0,0.1)', color: 'var(--orange)', padding: '5px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: 700 }}>{c.tag}</div>
                </div>
                {(c as any).sideBySide ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
                    <div style={{ position: 'relative' }}>
                      <img src={c.before} alt="before" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} loading="lazy" decoding="async" />
                      <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700 }}>BEFORE</div>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <img src={c.afters[0].src} alt="after" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} loading="lazy" decoding="async" />
                      <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'var(--orange)', color: '#fff', padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700 }}>AFTER</div>
                    </div>
                  </div>
                ) : (c as any).befores ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
                      {(c as any).befores.map((src: string, j: number) => (
                        <div key={j} style={{ position: 'relative' }}>
                          <img src={src} alt="before" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} loading="lazy" decoding="async" />
                          {j === 0 && <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700 }}>BEFORE</div>}
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
                      {c.afters.map((a, j) => (
                        <div key={j} style={{ position: 'relative' }}>
                          <img src={a.src} alt="after" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} loading="lazy" decoding="async" />
                          {j === 0 && <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'var(--orange)', color: '#fff', padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700 }}>AFTER</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ position: 'relative' }}>
                      <img src={c.before} alt="before" style={{ width: '100%', aspectRatio: c.afters.length > 1 ? '2/1' : '1', objectFit: 'cover', display: 'block' }} loading="lazy" decoding="async" />
                      <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700 }}>BEFORE</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: c.afters.length > 1 ? '1fr 1fr' : '1fr', gap: '2px' }}>
                      {c.afters.map((a, j) => (
                        <div key={j} style={{ position: 'relative' }}>
                          <img src={a.src} alt="after" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} loading="lazy" decoding="async" />
                          <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'var(--orange)', color: '#fff', padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700 }}>{c.afters.length > 1 ? a.label : 'AFTER'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="sec-pricing" style={{ padding: '100px 5vw', background: 'var(--cream)', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)', letterSpacing: '2px', marginBottom: '12px' }}>PRICING</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, letterSpacing: '-1px', color: 'var(--black)', lineHeight: 1.2, marginBottom: '12px' }}>필요한 컷만,<br />합리적으로</h2>
          <p style={{ color: '#888', fontSize: '15px', marginBottom: '28px' }}>정기 구독제 · 구독 즉시 젬 지급 · 언제든 해지 가능</p>

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
                <div key={plan.key} style={{ position: 'relative', paddingTop: isStandard ? '0' : '0' }}>
                  <div style={{
                    height: '100%', borderRadius: '20px', background: '#fff',
                    boxShadow: isStandard ? '0 8px 48px rgba(0,0,0,0.18)' : '0 2px 16px rgba(0,0,0,0.07)',
                    border: isStandard ? '2px solid var(--black)' : '1px solid rgba(0,0,0,0.07)',
                    display: 'flex', flexDirection: 'column', padding: '28px 24px', boxSizing: 'border-box',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    {/* Badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px', minHeight: '26px' }}>
                      {isStandard && (
                        <span style={{ background: 'var(--black)', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '100px' }}>⭐ MOST POPULAR</span>
                      )}
                      {isYearly && (
                        <span style={{ background: 'rgba(196,81,13,0.1)', color: 'var(--orange)', fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '100px' }}>🔥 Save {plan.discount}%</span>
                      )}
                    </div>

                    {/* Icon + Name */}
                    <div style={{ marginBottom: '6px' }}>
                      <span style={{ fontSize: '28px' }}>{plan.icon}</span>
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--black)', marginBottom: '4px', letterSpacing: '-0.5px' }}>{plan.name}</h3>
                    <p style={{ fontSize: '13px', color: '#888', marginBottom: '20px', lineHeight: 1.4 }}>{plan.subtitle}</p>

                    {/* Price */}
                    <div style={{ marginBottom: '6px' }}>
                      {isYearly && (
                        <span style={{ fontSize: '13px', color: '#ccc', textDecoration: 'line-through', display: 'block', marginBottom: '2px' }}>₩{plan.monthlyPrice.toLocaleString()}/월</span>
                      )}
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                        <span style={{ fontSize: '36px', fontWeight: 900, color: 'var(--black)', letterSpacing: '-1.5px', lineHeight: 1 }}>₩{price.toLocaleString()}</span>
                        <span style={{ fontSize: '13px', color: '#888', fontWeight: 500, paddingBottom: '5px' }}>/월</span>
                      </div>
                    </div>

                    {/* Annual total */}
                    {isYearly ? (
                      <p style={{ fontSize: '12px', color: '#22c55e', fontWeight: 700, marginBottom: '4px' }}>
                        Actually: ₩{plan.yearlyTotal.toLocaleString()}
                      </p>
                    ) : (
                      <p style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>매월 청구</p>
                    )}

                    {/* Gem badge */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.05)', borderRadius: '100px', padding: '5px 12px', marginBottom: '20px', alignSelf: 'flex-start' }}>
                      <span style={{ fontSize: '14px' }}>💎</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--black)' }}>{plan.gems}젬/월</span>
                    </div>

                    {/* Features */}
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '9px', flex: 1 }}>
                      {features.map((f, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#444', lineHeight: 1.5 }}>
                          <span style={{ color: '#22c55e', fontWeight: 900, flexShrink: 0, marginTop: '1px' }}>✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <button
                      onClick={handleChargeClick}
                      style={{
                        display: 'block', width: '100%', textAlign: 'center',
                        padding: '15px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                        background: isStandard ? 'var(--orange)' : 'var(--black)',
                        color: '#fff', fontWeight: 800, fontSize: '15px',
                        boxShadow: isStandard ? '0 4px 20px rgba(196,81,13,0.4)' : 'none',
                        transition: 'opacity 0.15s',
                      }}
                    >
                      젬 충전하기
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
                  position: 'relative',
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

      {/* HOW IT WORKS */}
      <section style={{ background: '#f0eeeb', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 clamp(24px,6vw,120px)' }}>

          {/* 헤드라인 2열 */}
          <div style={{ paddingTop: '80px', paddingBottom: '40px', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
            <p style={{ fontSize: '65px', fontWeight: 800, letterSpacing: '-0.03em', color: '#111', lineHeight: 1 }}>process</p>
          </div>

          <div>
            {/* Step 1 */}
            <div className="process-row reveal-up">
              <div>
                <p style={{ fontSize: '64px', fontWeight: 200, color: '#111', letterSpacing: '-0.04em', lineHeight: 1 }}>01</p>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111', marginTop: '8px' }}>사진 업로드</h3>
              </div>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 400, color: '#666', lineHeight: 1.7 }}>
                  스마트폰으로 찍은 사진 그대로 올리세요.<br />
                  밝은 조명에서 음식 전체가 담긴 사진이면 충분해요.<br />
                  별도 장비나 편집 실력은 필요 없어요.
                </p>
                <p style={{ fontSize: '13px', color: '#FF5722', marginTop: '12px' }}>✔ 자연광 OK&nbsp;&nbsp;&nbsp;✔ 스마트폰 OK&nbsp;&nbsp;&nbsp;✔ 무편집 OK</p>
              </div>
            </div>
            {/* Step 2 */}
            <div className="process-row reveal-up" data-delay="1">
              <div>
                <p style={{ fontSize: '64px', fontWeight: 200, color: '#111', letterSpacing: '-0.04em', lineHeight: 1 }}>02</p>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111', marginTop: '8px' }}>옵션 선택</h3>
              </div>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 400, color: '#666', lineHeight: 1.7 }}>
                  배경, 플랫폼, 구도를 선택하세요.<br />
                  배달의민족, 쿠팡이츠, 네이버 플레이스 —<br />
                  어디에 올릴지 맞춰서 만들어드려요.
                </p>
                <p style={{ fontSize: '13px', color: '#FF5722', marginTop: '12px' }}>✔ 배달의민족&nbsp;&nbsp;&nbsp;✔ 쿠팡이츠&nbsp;&nbsp;&nbsp;✔ 네이버 플레이스</p>
              </div>
            </div>
            {/* Step 3 */}
            <div className="process-row reveal-up" data-delay="2">
              <div>
                <p style={{ fontSize: '64px', fontWeight: 200, color: '#111', letterSpacing: '-0.04em', lineHeight: 1 }}>03</p>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111', marginTop: '8px' }}>AI 생성 완료</h3>
              </div>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 400, color: '#666', lineHeight: 1.7 }}>
                  30초 만에 전문 메뉴 사진이 완성됩니다.<br />
                  스튜디오 촬영 없이, 편집 실력 없이도<br />
                  누구나 프로급 결과물을 받을 수 있어요.
                </p>
                <p style={{ fontSize: '13px', color: '#FF5722', marginTop: '12px' }}>✔ 30초 완성&nbsp;&nbsp;&nbsp;✔ 고해상도 출력&nbsp;&nbsp;&nbsp;✔ 즉시 다운로드</p>
              </div>
            </div>
          </div>

        </div>
        {/* Platform marquee */}
        <div style={{ textAlign: 'center', paddingTop: '8px', paddingBottom: '16px' }}>
          <p style={{ fontSize: '12px', fontWeight: 400, color: '#999', letterSpacing: '0.12em' }}>지원 플랫폼</p>
        </div>
        <div style={{ overflow: 'hidden', padding: '0 0 80px' }}>
          <div className="pl-marquee-band">
            {[...PLATFORMS, ...PLATFORMS, ...PLATFORMS, ...PLATFORMS].map((p, i) => (
              <div key={i} style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '280px', flexShrink: 0, gap: '0px' }}>
                <img src={p.src} alt={p.name} style={{ width: '120px', height: '60px', objectFit: 'contain', flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '16px', color: '#111', fontWeight: 600, whiteSpace: 'nowrap', lineHeight: 1.2 }}>{p.name}</div>
                  <div style={{ fontSize: '13px', color: 'rgba(0,0,0,0.4)', fontWeight: 400, whiteSpace: 'nowrap', lineHeight: 1.2 }}>{p.size}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="sec-faq" style={{ padding: '100px 5vw', background: 'var(--cream)', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)', letterSpacing: '2px', marginBottom: '12px' }}>FAQ</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: '48px' }}>자주 묻는 질문</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {FAQ.map((item, i) => (
              <div key={i} style={{ border: `1px solid ${openFaq === i ? 'var(--orange)' : 'rgba(0,0,0,0.08)'}`, borderRadius: '14px', overflow: 'hidden', transition: 'border-color 0.2s' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: '100%', textAlign: 'left', padding: '20px 24px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>{item.q}</span>
                  <span style={{ color: 'var(--orange)', fontSize: '20px', fontWeight: 300, transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0)', flexShrink: 0 }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 24px 20px', color: '#555', fontSize: '14px', lineHeight: 1.7 }}>{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="sec-cta" style={{ padding: '120px 5vw', background: 'var(--black)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '900px', height: '500px', background: 'radial-gradient(ellipse at 50% 100%, rgba(196,81,13,0.25) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: '640px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(32px, 5.5vw, 64px)', fontWeight: 900, color: '#fff', letterSpacing: '-2px', lineHeight: 1.15, marginBottom: '24px' }}>
            비싼 돈 주고<br /><span style={{ color: 'var(--orange)' }}>촬영하시게요?</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(15px, 2vw, 17px)', lineHeight: 1.9, marginBottom: '48px' }}>
            AI가 만들고, 전문가가 검수해서 보내드려요<br />
            장당 7,900원부터 스튜디오급 사진을 만들어드려요
          </p>
          <Link href="/v2/order" className="cta-main-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: '#fff', color: 'var(--black)', padding: '22px 56px', borderRadius: '100px', fontSize: '18px', fontWeight: 800, textDecoration: 'none', boxShadow: '0 12px 48px rgba(0,0,0,0.3)', letterSpacing: '-0.3px' }}>
            지금 바로 시작하기 →
          </Link>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px', marginTop: '20px' }}>계좌이체 · 입금 확인 후 3일 이내 완료</p>
        </div>
      </section>

      <footer className="main-footer" style={{ background: 'var(--black)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '40px 5vw', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <img src="https://i.ibb.co/YF3csF80/image.png" alt="메뉴랩" style={{ height: '44px', width: '160px', objectFit: 'contain', objectPosition: 'left', filter: 'invert(1)' }} fetchPriority="high" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px' }}>
            {['상호명: 메뉴랩', '대표자: 최재이', '사업자등록번호: 331-39-01242', '주소: 화성시 동탄구 동탄대로 676, 힐스테이트동탄역멀티플라이어 오피스 406호', '전화: 010-5892-4221', '이메일: solip7131@gmail.com'].map(item => (
              <span key={item} style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>{item}</span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Link href="/terms"   style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', textDecoration: 'none' }}>이용약관</Link>
            <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', textDecoration: 'none' }}>개인정보처리방침</Link>
            <Link href="/refund"  style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', textDecoration: 'none' }}>환불정책</Link>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>© 2026 메뉴랩. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
