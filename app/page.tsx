'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import BasicPlanModal from './components/BasicPlanModal'
import CoinChargeModal from './components/CoinChargeModal'
import PhoneVerificationModal from './components/PhoneVerificationModal'

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

const FAQ = [
  { q: '메뉴사진을 잘 찍는 방법이 있나요?', a: '핵심은 세 가지예요. ① 밝은 곳에서 흔들리지 않게 ② 음식이 화면 가득 차게 가까이서 찍기 ③ 스마트폰을 가로로 돌려서 촬영 — AI 결과물이 가로(3:2) 비율로 생성되기 때문에 가로 사진일수록 훨씬 자연스럽게 나와요. 완벽하지 않아도 메뉴랩에서 맛있어 보이게 리터치해드려요.' },
  { q: '스마트폰으로 찍어도 괜찮나요?', a: '물론이죠! 요즘 스마트폰 카메라 성능이 좋아서 충분해요. 단, 스마트폰을 가로로 돌려서 촬영해주세요 — AI 결과물은 가로(3:2) 비율로 생성되기 때문에 가로 사진을 업로드하시면 최상의 결과를 얻을 수 있어요.' },
  { q: '"사진 사기" 리뷰가 생기지 않을까요?', a: '없는 재료를 만들어내지 않고, 실제 제공량을 그대로 반영하며, 과장된 광택이나 인위적 표현은 사용하지 않아요. "올려도 안전한" 수준의 자연스러운 보정만 합니다.' },
  { q: '작업 기간은 얼마나 걸리나요?', a: '입금 확인 후 3일 이내 제작 완료 후 카카오톡 채널을 통해 결과물 링크를 전달해드립니다.' },
  { q: '기본과 프리미엄의 차이는 무엇인가요?', a: '기본(7,900원)은 AI를 활용한 자동 생성이며, 그릇만 선택하면 됩니다. 프리미엄(14,900원)은 수작업으로 진행되며, 원하는 느낌·분위기를 브리핑 폼으로 세세하게 전달하실 수 있습니다. 수정도 기본 2회 포함돼요.' },
  { q: '결제는 어떻게 하나요?', a: '현재는 계좌이체(무통장 입금)로만 운영됩니다. 주문 접수 완료 후 화면에 표시되는 계좌로 입금하시면 입금 확인 후 작업이 시작됩니다. 결과물은 카카오톡 채널로 전달해드려요.' },
  { q: '마음에 안 들면 어떻게 하나요?', a: '프리미엄 플랜은 수정 2회가 기본 포함됩니다. 베이직은 결과물 확인 후 재제작이 필요하시면 카카오톡으로 문의해주세요.' },
]

const BEFORE_SRC = '/noodle-before.jpg'
const AFTER_SRC  = '/noodle-after.jpg'
const BG_SRC     = '/hero-bg.jpg'

const REVIEWS = [
  { title: '배달앱 사진 바꾸고 주문이 늘었어요', body: '예전엔 사진이 어두웠는데 밝고 깔끔하게 바뀌었어요. 확실히 클릭이 늘었습니다.', name: '김*진 사장님', cat: '한식' },
  { title: '30초만에 이런 퀄리티가 나오다니', body: '직접 찍은 사진을 이렇게 바꿔준다니 신기해요. 매달 쓰게 될 것 같아요.', name: '박*수 사장님', cat: '중식' },
  { title: '이제 사진 때문에 고민 안 해요', body: '포토그래퍼 부르던 비용 아끼고 퀄리티는 더 좋아졌어요.', name: '이*영 사장님', cat: '카페' },
]

const SERVICES = [
  { gem: '💎 10젬 / 장', name: '메뉴 리터치', desc: '내 음식사진을 더 먹음직스럽게! 원하는 배경을 선택할 수 있어요.' },
  { gem: '💎 20젬 / 장', name: '메뉴 리메이크', desc: '업그레이드된 음식에 배경과 그릇까지 직접 선택하세요.' },
  { gem: '모음컷',        name: '메뉴 모음컷',  desc: '일반 모음컷부터 브랜딩용 모음컷까지 한 번에 완성해요.' },
]

const PLATFORMS = ['배달의민족', '쿠팡이츠', '요기요', '땡겨요', '먹깨비', '배달의민족', '쿠팡이츠', '요기요', '땡겨요', '먹깨비']

const STATS = [
  { to: 20000, suffix: '명+', label: '가입한 사장님', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.4"/></svg>
  )},
  { to: 100000, suffix: '장+', label: '만들어진 메뉴 사진', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6.5" width="18" height="13" rx="3"/><path d="M8.5 6.5l1.4-2.2h4.2l1.4 2.2"/><circle cx="12" cy="13" r="3.2"/></svg>
  )},
  { to: 72, suffix: '시간+', label: '평균 절약 시간', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12.5" r="8"/><path d="M12 8.5v4l2.6 1.6"/><path d="M9 3.2h6"/></svg>
  )},
]

function ImageCompareSlider() {
  const [pos, setPos] = useState(50)
  const containerRef  = useRef<HTMLDivElement>(null)
  const dragging      = useRef(false)

  const updatePos = useCallback((clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const { left, width } = el.getBoundingClientRect()
    setPos(Math.min(100, Math.max(0, ((clientX - left) / width) * 100)))
  }, [])

  return (
    <div
      ref={containerRef}
      className="hero-compare"
      onMouseDown={() => { dragging.current = true }}
      onMouseMove={e => { if (dragging.current) updatePos(e.clientX) }}
      onMouseUp={() => { dragging.current = false }}
      onMouseLeave={() => { dragging.current = false }}
      onTouchMove={e => updatePos(e.touches[0].clientX)}
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

function StatCounter({ to, suffix }: { to: number; suffix: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const animated = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !animated.current) {
        animated.current = true
        const start = performance.now()
        const dur = 1600
        const step = (now: number) => {
          const p = Math.min(1, (now - start) / dur)
          const e = 1 - Math.pow(1 - p, 3)
          setCount(Math.round(to * e))
          if (p < 1) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
        observer.disconnect()
      }
    }, { threshold: 0.3 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [to])

  return <span ref={ref}>{count.toLocaleString('ko-KR')}{suffix}</span>
}

export default function HomePage() {
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
  const [showPhoneVerify, setShowPhoneVerify] = useState(false)
  const [hasPhone, setHasPhone]       = useState(true)
  const [loginReturnTo, setLoginReturnTo] = useState('/mypage')

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

    try {
      const pending = localStorage.getItem('menulab_pending_action')
      if (pending === 'openBasicModal' && loggedIn) {
        localStorage.removeItem('menulab_pending_action')
        setBasicModal(true)
      }
    } catch {}

    if (loggedIn && token) {
      fetch('/api/auth/phone-status', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => {
          setHasPhone(!!d.hasPhone)
          if (!d.hasPhone) setShowPhoneVerify(true)
        })
        .catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!userToken) return
    fetch('/api/credits/balance', { headers: { Authorization: `Bearer ${userToken}` } })
      .then(r => r.json())
      .then(d => { if (typeof d.balance === 'number') setGemBalance(d.balance) })
      .catch(() => {})
  }, [userToken])

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12 })
    document.querySelectorAll('.reveal-up').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const handleOpenBasic = () => {
    if (isLoggedIn) {
      if (!hasPhone) { setShowPhoneVerify(true); return }
      setBasicModal(true)
    } else {
      setLoginReturnTo('/mypage')
      setLoginModal(true)
    }
  }

  const handleChargeClick = () => {
    if (isLoggedIn) {
      if (!hasPhone) { setShowPhoneVerify(true); return }
      setShowChargeModal(true)
    } else {
      setLoginReturnTo('/')
      setLoginModal(true)
    }
  }

  const startKakaoLogin = () => {
    window.location.href = `/api/auth/kakao?returnTo=${encodeURIComponent(loginReturnTo)}`
  }

  return (
    <div style={{ background: '#fff', minHeight: '100vh', fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif" }}>

      {/* ── Modals ── */}
      {showPhoneVerify && userToken && (
        <PhoneVerificationModal
          token={userToken}
          onVerified={() => { setHasPhone(true); setShowPhoneVerify(false) }}
          onSkip={() => setShowPhoneVerify(false)}
        />
      )}
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
              <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--black)', letterSpacing: '-0.3px', marginBottom: '6px' }}>로그인 후 시작할 수 있어요</h3>
              <p style={{ fontSize: '13px', color: '#888', marginBottom: '24px', lineHeight: 1.6 }}>카카오 계정으로 간편하게 시작하고<br />내 AI 사진을 바로 확인해보세요</p>
              <button
                onClick={startKakaoLogin}
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

      {/* ── Header ── */}
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
          <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {isLoggedIn ? (
              <div className="nav-user-area" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '14px', color: '#555', fontWeight: 500 }}>{userName || userEmail?.split('@')[0]} 님</span>
                <button
                  onClick={() => setShowChargeModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '100px', padding: '6px 14px', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: 'var(--black)' }}
                >
                  💎 {gemBalance.toLocaleString()}젬
                </button>
                <Link href="/mypage" style={{ fontSize: '14px', color: 'var(--orange)', textDecoration: 'none', fontWeight: 700 }}>마이페이지</Link>
              </div>
            ) : (
              <>
                <Link href="/pricing" className="nav-pricing-link" style={{ fontSize: '15px', fontWeight: 600, color: '#333', textDecoration: 'none' }}>요금제</Link>
                <button
                  onClick={() => { setLoginReturnTo('/mypage'); setLoginModal(true) }}
                  className="nav-login-btn"
                  style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: '100px', padding: '10px 22px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(196,81,13,0.3)', transition: 'transform 0.2s, box-shadow 0.2s' }}
                >
                  무료로 시작
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero (keep existing) ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: `url(${BG_SRC})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <section className="hero-sec" style={{ position: 'relative', width: '100vw', height: 'calc(100vh - 60px)', minHeight: '460px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '2vh', paddingBottom: '6vh', marginTop: 60 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 40%, rgba(0,0,0,0.12) 100%)' }} />
        <div className="hero-body" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '860px', padding: '0 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <h1 className="hero-headline" style={{ animation: 'fadeDown 0.7s ease forwards', opacity: 0, textAlign: 'center', fontSize: 'clamp(34px, 5.8vw, 64px)', fontWeight: 900, lineHeight: 1.15, letterSpacing: '-1.5px', color: '#fff' }}>
            <span style={{ fontSize: '0.65em', fontWeight: 700, opacity: 0.85 }}>스마트폰 사진 한 장,</span><br />
            <span style={{ color: 'var(--orange)' }}>스튜디오급</span>으로
          </h1>
          <p className="hero-badge" style={{ animation: 'fadeDown 0.6s ease 0.15s forwards', opacity: 0, textAlign: 'center', fontSize: 'clamp(13px, 1.8vw, 17px)', color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
            배달앱, 플레이스 메뉴사진 필요하세요?
          </p>
          <div className="hero-slider" style={{ animation: 'fadeUp 0.8s ease 0.25s forwards', opacity: 0, width: '100%', maxWidth: '680px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', borderRadius: '20px', marginTop: '4px' }}>
            <ImageCompareSlider />
          </div>
        </div>
      </section>

      {/* ── Marquee band ── */}
      <div style={{ background: 'var(--black)', overflow: 'hidden', padding: '14px 0', position: 'relative', zIndex: 1, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="marquee-band">
          {[...Array(16)].map((_, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', padding: '0 44px', fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap', letterSpacing: '-0.1px' }}>
              간편가입시 💎 20젬 선물
              <span style={{ color: 'var(--orange)', fontSize: '10px', opacity: 0.7 }}>✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Stats ── */}
      <section style={{ padding: 'clamp(80px,10vw,140px) 5vw', background: '#fff', position: 'relative', zIndex: 1 }}>
        <div className="stats-grid">
          {STATS.map((stat, i) => (
            <div key={i} className="reveal-up" data-delay={i as unknown as string} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center' }}>
              <div className="clay-icon" style={{ width: '84px', height: '84px', borderRadius: '26px' }}>
                {stat.icon}
              </div>
              <div>
                <div style={{ fontSize: 'clamp(36px,4.5vw,56px)', fontWeight: 900, letterSpacing: '-2px', color: 'var(--black)', lineHeight: 1 }}>
                  <StatCounter to={stat.to} suffix={stat.suffix} />
                </div>
                <div style={{ fontSize: '15px', color: '#888', marginTop: '6px', fontWeight: 500 }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: 'clamp(80px,10vw,140px) 5vw', background: 'var(--cream)', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px', marginBottom: '0' }}>
            <div>
              <p className="reveal-up" style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: '10px' }}>process</p>
              <h2 className="reveal-up" data-delay="1" style={{ fontSize: 'clamp(32px,4.8vw,60px)', fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.05, color: 'var(--black)' }}>how it works.</h2>
            </div>
            <p className="reveal-up" data-delay="2" style={{ fontSize: 'clamp(15px,1.6vw,18px)', color: '#8a8a8a', maxWidth: '30ch', lineHeight: 1.6, alignSelf: 'flex-end' }}>
              복잡한 장비도, 편집 기술도 필요 없어요.<br />단 세 단계면 충분합니다.
            </p>
          </div>

          <div className="how-steps" style={{ marginTop: '56px' }}>
            {/* Step 1 */}
            <div className="reveal-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="clay-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4"/><path d="M7.5 8.5L12 4l4.5 4.5"/><path d="M4.5 16v2.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V16"/></svg>
              </div>
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--orange)', letterSpacing: '0.05em' }}>01. 사진 업로드</p>
              <h3 style={{ fontSize: 'clamp(20px,2vw,24px)', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--black)' }}>사진 업로드</h3>
              <p style={{ fontSize: '15px', color: '#8a8a8a', lineHeight: 1.6 }}>스마트폰으로 찍은 사진 그대로 올려주세요.</p>
            </div>
            {/* Arrow 1 */}
            <div className="how-arrow reveal-up" data-delay="1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '24px', color: '#ccc' }}>
              <svg viewBox="0 0 46 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: '40px' }}><path d="M1 11h42"/><path d="M35 4l8 7-8 7"/></svg>
            </div>
            {/* Step 2 */}
            <div className="reveal-up" data-delay="1" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="clay-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6h12M6 12h12M6 18h7"/><circle cx="18.5" cy="18" r="2.2"/></svg>
              </div>
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--orange)', letterSpacing: '0.05em' }}>02. 옵션 선택</p>
              <h3 style={{ fontSize: 'clamp(20px,2vw,24px)', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--black)' }}>옵션 선택</h3>
              <p style={{ fontSize: '15px', color: '#8a8a8a', lineHeight: 1.6 }}>배경, 플랫폼, 구도를 자유롭게 선택하세요.</p>
            </div>
            {/* Arrow 2 */}
            <div className="how-arrow reveal-up" data-delay="2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '24px', color: '#ccc' }}>
              <svg viewBox="0 0 46 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: '40px' }}><path d="M1 11h42"/><path d="M35 4l8 7-8 7"/></svg>
            </div>
            {/* Step 3 */}
            <div className="reveal-up" data-delay="2" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="clay-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"/><circle cx="12" cy="12" r="3.4"/></svg>
              </div>
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--orange)', letterSpacing: '0.05em' }}>03. AI 생성 완료</p>
              <h3 style={{ fontSize: 'clamp(20px,2vw,24px)', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--black)' }}>AI 생성 완료</h3>
              <p style={{ fontSize: '15px', color: '#8a8a8a', lineHeight: 1.6 }}>30초 만에 전문 메뉴 사진이 완성됩니다.</p>
            </div>
          </div>

          <div className="reveal-up" data-delay="3" style={{ marginTop: '48px' }}>
            <button
              onClick={handleOpenBasic}
              style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: '100px', padding: '16px 40px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 24px rgba(196,81,13,0.35)', transition: 'transform 0.2s, box-shadow 0.2s' }}
            >
              지금 무료로 시작하기 →
            </button>
          </div>
        </div>
      </section>

      {/* ── Portfolio ── */}
      <section id="cases" className="sec-portfolio" style={{ padding: 'clamp(80px,10vw,140px) 5vw', background: '#fff', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px', marginBottom: '48px' }}>
            <div>
              <p className="reveal-up" style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: '10px' }}>portfolio</p>
              <h2 className="reveal-up" data-delay="1" style={{ fontSize: 'clamp(32px,4.8vw,60px)', fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.05, color: 'var(--black)' }}>our works.</h2>
            </div>
            <p className="reveal-up" data-delay="2" style={{ fontSize: 'clamp(14px,1.5vw,17px)', color: '#8a8a8a', lineHeight: 1.6 }}>가운데 손잡이를 드래그해 비포·애프터를 비교해 보세요.</p>
          </div>

          <div className="reveal-up" data-delay="1" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {CASES.map((c, i) => (
              <div key={i} style={{ background: '#f8f8f8', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ padding: '20px 24px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ fontWeight: 800, fontSize: '17px', marginBottom: '2px', color: 'var(--black)', letterSpacing: '-0.3px' }}>{c.title}</h3>
                    <p style={{ color: '#999', fontSize: '13px' }}>{c.desc}</p>
                  </div>
                  <div style={{ background: 'rgba(196,81,13,0.1)', color: 'var(--orange)', padding: '5px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: 700 }}>{c.tag}</div>
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

      {/* ── Reviews ── */}
      <section style={{ padding: 'clamp(80px,10vw,140px) 5vw', background: 'var(--cream)', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '0' }}>
            <p className="reveal-up" style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: '10px' }}>reviews</p>
            <h2 className="reveal-up" data-delay="1" style={{ fontSize: 'clamp(32px,4.8vw,60px)', fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 1.05, color: 'var(--black)' }}>사장님들의 실제 후기</h2>
          </div>
          <div className="rv-grid">
            {REVIEWS.map((r, i) => (
              <div key={i} className="reveal-up" data-delay={i as unknown as string} style={{
                background: '#fff', borderRadius: '20px', padding: '28px 24px',
                border: '1px solid rgba(0,0,0,0.05)',
                boxShadow: '0 2px 20px rgba(0,0,0,0.05)',
                display: 'flex', flexDirection: 'column', gap: '14px',
                marginTop: '48px',
              }}>
                <div style={{ fontSize: '28px', color: 'var(--orange)', fontFamily: 'serif', lineHeight: 1 }}>&ldquo;</div>
                <div style={{ display: 'flex', gap: '2px', color: '#f59e0b', fontSize: '14px' }}>{'★★★★★'}</div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--black)', letterSpacing: '-0.3px', lineHeight: 1.35 }}>{r.title}</h3>
                <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.7, flex: 1 }}>{r.body}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #f97316 0%, #c4510d 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#fff', fontWeight: 700 }}>
                    {r.name[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--black)' }}>{r.name}</div>
                    <div style={{ fontSize: '12px', color: '#999' }}>{r.cat}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ── */}
      <section style={{ padding: 'clamp(80px,10vw,140px) 5vw', background: '#fff', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '0' }}>
            <p className="reveal-up" style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: '10px' }}>service</p>
            <h2 className="reveal-up" data-delay="1" style={{ fontSize: 'clamp(32px,4.8vw,60px)', fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 1.05, color: 'var(--black)' }}>우리의 서비스</h2>
          </div>
          <div className="sv-grid">
            {SERVICES.map((s, i) => (
              <div
                key={i}
                className="reveal-up"
                data-delay={i as unknown as string}
                onClick={handleOpenBasic}
                style={{
                  marginTop: '48px', borderRadius: '20px', padding: '28px 24px 24px',
                  border: '1px solid rgba(0,0,0,0.07)', cursor: 'pointer',
                  background: '#fff', boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
                  display: 'flex', flexDirection: 'column', gap: '12px',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(0,0,0,0.1)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 16px rgba(0,0,0,0.05)' }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(196,81,13,0.08)', color: 'var(--orange)', borderRadius: '100px', padding: '5px 14px', fontSize: '13px', fontWeight: 700, alignSelf: 'flex-start' }}>{s.gem}</div>
                <h3 style={{ fontSize: 'clamp(18px,2vw,22px)', fontWeight: 600, letterSpacing: '-0.3px', color: 'var(--black)' }}>{s.name}</h3>
                <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.65, flex: 1 }}>{s.desc}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', color: 'var(--orange)' }}><path d="M6 18L18 6M9 6h9v9"/></svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing teaser → /pricing ── */}
      <section style={{ padding: 'clamp(80px,10vw,140px) 5vw', background: 'var(--cream)', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
          <p className="reveal-up" style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: '10px' }}>pricing</p>
          <h2 className="reveal-up" data-delay="1" style={{ fontSize: 'clamp(32px,4.8vw,60px)', fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.05, color: 'var(--black)', marginBottom: '16px' }}>pricing.</h2>
          <p className="reveal-up" data-delay="2" style={{ fontSize: 'clamp(15px,1.6vw,18px)', color: '#888', marginBottom: '48px', lineHeight: 1.6 }}>
            정기 구독제 · 구독 즉시 젬 지급 · 언제든 해지 가능
          </p>
          <div className="pr-teaser-grid reveal-up" data-delay="2">
            {[
              { name: '베이직', price: '₩19,900', period: '/월 (연간)', gems: '100젬/월', tag: '' },
              { name: '스탠다드', price: '₩34,900', period: '/월 (연간)', gems: '200젬/월', tag: 'MOST POPULAR' },
              { name: '프로', price: '₩59,900', period: '/월 (연간)', gems: '400젬/월', tag: '' },
            ].map((plan, i) => (
              <div key={i} style={{
                background: plan.tag ? 'var(--black)' : '#fff', borderRadius: '16px', padding: '24px 20px',
                border: plan.tag ? 'none' : '1px solid rgba(0,0,0,0.07)',
                boxShadow: plan.tag ? '0 8px 40px rgba(0,0,0,0.2)' : '0 2px 16px rgba(0,0,0,0.06)',
              }}>
                {plan.tag && <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--orange)', letterSpacing: '0.08em', marginBottom: '10px' }}>⭐ {plan.tag}</div>}
                <div style={{ fontSize: '16px', fontWeight: 700, color: plan.tag ? '#fff' : 'var(--black)', marginBottom: '8px' }}>{plan.name}</div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: plan.tag ? '#fff' : 'var(--black)', letterSpacing: '-1px', lineHeight: 1 }}>{plan.price}</div>
                <div style={{ fontSize: '13px', color: plan.tag ? 'rgba(255,255,255,0.5)' : '#aaa', marginBottom: '14px' }}>{plan.period}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: plan.tag ? 'rgba(255,255,255,0.8)' : '#555' }}>💎 {plan.gems}</div>
              </div>
            ))}
          </div>
          <div className="reveal-up" data-delay="3" style={{ marginTop: '32px' }}>
            <Link href="/pricing" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--orange)', color: '#fff', borderRadius: '100px', padding: '16px 40px', fontSize: '16px', fontWeight: 700, textDecoration: 'none', boxShadow: '0 8px 24px rgba(196,81,13,0.35)' }}>
              요금제 전체 보기 →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Platforms marquee ── */}
      <section style={{ padding: 'clamp(80px,10vw,120px) 0', background: '#fff', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 5vw', textAlign: 'center', marginBottom: '40px' }}>
          <h2 className="reveal-up" style={{ fontSize: 'clamp(26px,4vw,48px)', fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.2, color: 'var(--black)' }}>
            원하는 플랫폼에 맞는<br /><span style={{ fontWeight: 300, color: '#999' }}>메뉴 사진을 만들어요</span>
          </h2>
        </div>
        <div style={{ overflow: 'hidden', padding: '4px 0' }}>
          <div className="pl-marquee-band">
            {PLATFORMS.concat(PLATFORMS).map((name, i) => (
              <div key={i} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 36px', gap: '6px', minWidth: '160px' }}>
                <div style={{ fontSize: 'clamp(17px,2vw,22px)', fontWeight: 800, color: 'var(--black)', letterSpacing: '-0.5px', whiteSpace: 'nowrap' }}>
                  {name.slice(0, -1)}<span style={{ color: 'var(--orange)' }}>{name.slice(-1)}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#ccc', fontWeight: 500 }}>플랫폼 규격 자동 맞춤</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="sec-faq" style={{ padding: 'clamp(80px,10vw,140px) 5vw', background: 'var(--cream)', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>
          <p className="reveal-up" style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: '10px' }}>FAQ</p>
          <h2 className="reveal-up" data-delay="1" style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: '48px', color: 'var(--black)' }}>자주 묻는 질문</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {FAQ.map((item, i) => (
              <div key={i} style={{ border: `1px solid ${openFaq === i ? 'var(--orange)' : 'rgba(0,0,0,0.08)'}`, borderRadius: '14px', overflow: 'hidden', transition: 'border-color 0.2s' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: '100%', textAlign: 'left', padding: '20px 24px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--black)' }}>{item.q}</span>
                  <span style={{ color: 'var(--orange)', fontSize: '20px', fontWeight: 300, transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0)', flexShrink: 0 }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 24px 20px', color: '#555', fontSize: '14px', lineHeight: 1.7 }}>{item.a}</div>
                )}
              </div>
            ))}
          </div>
          <div className="reveal-up" style={{ marginTop: '32px', textAlign: 'center' }}>
            <Link href="/customer" style={{ fontSize: '14px', color: 'var(--orange)', fontWeight: 600, textDecoration: 'none' }}>더 많은 질문이 있으신가요? 고객센터 방문하기 →</Link>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="sec-cta" style={{ padding: 'clamp(80px,10vw,140px) 5vw', background: 'var(--black)', textAlign: 'center', position: 'relative', overflow: 'hidden', zIndex: 1 }}>
        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '900px', height: '500px', background: 'radial-gradient(ellipse at 50% 100%, rgba(196,81,13,0.3) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '-80px', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '400px', background: 'radial-gradient(ellipse at 50% 0%, rgba(196,81,13,0.15) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: '640px', margin: '0 auto' }}>
          <p className="reveal-up" style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(196,81,13,0.8)', marginBottom: '16px' }}>Get started today</p>
          <h2 className="reveal-up" data-delay="1" style={{ fontSize: 'clamp(32px, 5.5vw, 64px)', fontWeight: 900, color: '#fff', letterSpacing: '-2px', lineHeight: 1.1, marginBottom: '16px' }}>
            지금 가입하면<br /><span style={{ color: 'var(--orange)' }}>💎 20젬 무료</span>
          </h2>
          <p className="reveal-up" data-delay="2" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(15px, 2vw, 17px)', lineHeight: 1.9, marginBottom: '40px' }}>
            첫 메뉴 사진을 무료로 만들어 보세요.<br />카드 등록도 필요 없어요.
          </p>
          <div className="reveal-up" data-delay="3">
            <button
              onClick={() => { setLoginReturnTo('/mypage'); setLoginModal(true) }}
              className="cta-main-btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: '#fff', color: 'var(--black)', padding: '20px 52px', borderRadius: '100px', fontSize: '17px', fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 12px 48px rgba(0,0,0,0.3)', letterSpacing: '-0.3px' }}
            >
              무료로 시작하기 →
            </button>
          </div>
          <p className="reveal-up" data-delay="4" style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', marginTop: '20px' }}>카카오 계정으로 5초 만에 시작</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="main-footer" style={{ background: 'var(--black)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: 'clamp(40px,6vw,80px) 5vw', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '40px', marginBottom: '48px' }}>
            {/* Brand */}
            <div style={{ maxWidth: '280px' }}>
              <img src="https://i.ibb.co/YF3csF80/image.png" alt="메뉴랩" style={{ height: '40px', width: 'auto', filter: 'invert(1)', marginBottom: '16px' }} fetchPriority="high" />
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>스마트폰 사진 한 장으로 완성하는<br />AI 메뉴 사진 서비스, 메뉴랩.</p>
            </div>
            {/* Links */}
            <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em', marginBottom: '4px' }}>서비스</h4>
                {['메뉴 리터치', '메뉴 리메이크', '메뉴 모음컷'].map(item => (
                  <span key={item} onClick={handleOpenBasic} style={{ fontSize: '14px', color: 'rgba(255,255,255,0.38)', cursor: 'pointer', transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.7)'}
                    onMouseLeave={e => (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.38)'}
                  >{item}</span>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em', marginBottom: '4px' }}>회사</h4>
                <Link href="/#cases" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.38)', textDecoration: 'none' }}>제작 사례</Link>
                <Link href="/pricing" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.38)', textDecoration: 'none' }}>요금제</Link>
                <Link href="/#faq" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.38)', textDecoration: 'none' }}>자주 묻는 질문</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em', marginBottom: '4px' }}>고객지원</h4>
                <Link href="/customer" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.38)', textDecoration: 'none' }}>고객센터</Link>
                <Link href="/terms"   style={{ fontSize: '14px', color: 'rgba(255,255,255,0.38)', textDecoration: 'none' }}>이용약관</Link>
                <Link href="/privacy" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.38)', textDecoration: 'none' }}>개인정보처리방침</Link>
                <Link href="/refund"  style={{ fontSize: '14px', color: 'rgba(255,255,255,0.38)', textDecoration: 'none' }}>환불정책</Link>
              </div>
            </div>
          </div>

          {/* Business info + bottom bar */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '24px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', marginBottom: '12px' }}>
              {['상호명: 메뉴랩', '대표자: 최재이', '사업자등록번호: 331-39-01242', '주소: 화성시 동탄구 동탄대로 676, 힐스테이트동탄역멀티플라이어 오피스 406호', '전화: 010-5892-4221', '이메일: solip7131@gmail.com'].map(item => (
                <span key={item} style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px' }}>{item}</span>
              ))}
            </div>
            <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: '12px' }}>© 2026 메뉴랩. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
