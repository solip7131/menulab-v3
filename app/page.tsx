'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import BasicPlanModal from './components/BasicPlanModal'
import CoinChargeModal from './components/CoinChargeModal'
import PhoneVerificationModal from './components/PhoneVerificationModal'

const PF_ITEMS = [
  { cat: 'korean',   ko: '한식', name: '김치말이냉국수', bg: '우드 테이블',    before: 'https://i.ibb.co/qK9VJv9/image.png',                                     after: 'https://i.ibb.co/xK5Pjg2h/12.png' },
  { cat: 'japanese', ko: '일식', name: '연어 사시미',    bg: '다크 슬레이트',  before: 'https://i.ibb.co/YFDSdrdG/before.png',                                   after: 'https://i.ibb.co/QFv2RLW0/after.png' },
  { cat: 'snack',    ko: '분식', name: '국물 떡볶이',    bg: '스튜디오 블랙',  before: 'https://i.ibb.co/vxDm2vrx/Kakao-Talk-20260124-144350686-01.png',          after: 'https://i.ibb.co/1J0wh6dW/01.jpg' },
  { cat: 'korean',   ko: '한식', name: '샐러드볼',       bg: '내추럴 린넨',    before: 'https://i.ibb.co/dJjyr7vC/jpg.png',                                       after: 'https://i.ibb.co/mrCMBYhD/18.png' },
  { cat: 'snack',    ko: '분식', name: '국물 떡볶이',    bg: '배경 · 스타일 변경', before: 'https://i.ibb.co/vxDm2vrx/Kakao-Talk-20260124-144350686-01.png',     after: 'https://i.ibb.co/nNW2kjBC/03.jpg' },
  { cat: 'korean',   ko: '한식', name: '샐러드볼',       bg: '배경 교체 2',    before: 'https://i.ibb.co/dJjyr7vC/jpg.png',                                       after: 'https://i.ibb.co/Mxpzc8TP/21.png' },
]

const PF_TABS = [
  { key: 'all',      label: '전체' },
  { key: 'korean',   label: '한식' },
  { key: 'chinese',  label: '중식' },
  { key: 'japanese', label: '일식' },
  { key: 'western',  label: '양식' },
  { key: 'snack',    label: '분식' },
  { key: 'cafe',     label: '카페' },
]

const FAQ = [
  { q: '메뉴랩은 어떤 서비스인가요?', a: '메뉴랩은 사장님이 직접 찍은 음식 사진을 AI로 스튜디오급으로 바꿔주는 서비스예요. 카카오 로그인 후 젬을 충전하고, 사진을 업로드하면 30초 만에 전문가 수준의 메뉴 사진이 완성됩니다. 촬영도, 포토그래퍼도 필요 없어요.' },
  { q: '젬(💎)이 뭔가요?', a: '젬은 메뉴랩에서 사진을 제작할 때 사용하는 포인트예요. 구독 플랜을 선택하면 매월 젬이 자동 지급되고, 추가로 필요할 땐 일회성 패키지로도 충전할 수 있어요. 리터치 1장에 10젬, 리메이크 1장에 20젬이 필요합니다.' },
  { q: '어떤 서비스 종류가 있나요?', a: '세 가지 서비스가 있어요. ① 메뉴 리터치(10젬): 기존 사진을 밝고 먹음직스럽게 보정 + 배경 선택 ② 메뉴 리메이크(20젬): 배경·그릇·분위기까지 원하는 스타일로 완전히 변경 ③ 메뉴 모음컷: 여러 메뉴를 하나의 고급 이미지로 구성.' },
  { q: '사진을 잘 찍는 방법이 있나요?', a: '세 가지만 지켜주세요. ① 밝은 곳에서 흔들리지 않게 ② 음식이 화면 가득 차도록 가까이서 촬영 ③ 스마트폰을 가로로 돌려서 찍기 — AI 결과물이 가로(3:2) 비율로 만들어지기 때문에 가로 사진일수록 훨씬 자연스러워요. 배달앱 리뷰 사진을 업로드하셔도 됩니다.' },
  { q: '결과물은 얼마나 걸리나요?', a: 'AI가 자동으로 생성하기 때문에 보통 30초~2분 이내로 완성돼요. 완성된 결과물은 마이페이지에서 바로 확인하고 다운로드할 수 있습니다.' },
  { q: '"사진 사기" 리뷰가 생기지 않을까요?', a: '없는 재료를 만들어내거나 실제 제공량을 과장하지 않아요. 실제 음식의 색감·질감·구도를 자연스럽게 개선하는 수준으로만 작업하기 때문에 "올려도 안전한" 보정입니다.' },
  { q: '구독은 언제든지 해지할 수 있나요?', a: '네, 언제든지 해지 가능해요. 해지 후에도 남은 구독 기간 동안은 서비스를 계속 이용할 수 있고, 이미 지급된 젬도 그대로 사용 가능합니다.' },
]

const BEFORE_SRC = '/noodle-before.jpg'
const AFTER_SRC  = '/noodle-after.jpg'
const BG_SRC     = '/hero-bg.jpg'

const REVIEWS = [
  { title: '신메뉴 나올 때마다 써요', body: '배달앱 사진 바꾸고 나서 클릭률이 눈에 띄게 늘었어요.\n같은 메뉴인데 사진 하나로 이렇게 달라질 줄 몰랐습니다.\n이제 신메뉴 나올 때마다 바로 씁니다.', name: '김*진 사장님', cat: '한식' },
  { title: '이정도 퀄리티라니 아직도 신기해요', body: '30초 만에 이런 퀄리티가 나온다는 게 아직도 신기해요.\n포토그래퍼 부르면 최소 20만원인데, 비용이 진짜 말이 안 돼요. 매달 쓸 것 같아요.', name: '박*수 사장님', cat: '중식' },
  { title: '주변에 다 추천중!', body: '처음엔 반신반의했는데 결과물 보고 바로 결제했어요.\n배달의민족 검수도 한 번에 통과됐고요.\n주변 사장님들한테 다 추천하고 있어요.', name: '이*영 사장님', cat: '카페' },
  { title: '스튜디오촬영처럼 나와요', body: '스마트폰으로 찍은 사진이 스튜디오 사진처럼 나와요.\n옵션 고르는 것도 어렵지 않고 직관적이에요.\n자영업자한테 진짜 필요한 서비스예요.', name: '최*호 사장님', cat: '분식' },
  { title: '결과물이 기대 이상이에요!', body: '사진 때문에 고민이 많았는데 이제 해결됐어요.\n배경 옵션이 다양해서 메뉴 분위기에 맞게 고를 수 있어요.\n결과물이 기대 이상이에요.', name: '정*아 사장님', cat: '일식' },
  { title: '메뉴랩 덕분에 걱정 끝났어요.', body: '오픈 준비하면서 메뉴 사진이 제일 걱정이었는데\n메뉴랩 덕분에 비용도 아끼고 퀄리티도 잡았어요.\n창업하는 분들한테 강추합니다.', name: '손*민 사장님', cat: '치킨' },
]

const SERVICES = [
  { gem: '💎 10젬 / 장', name: '메뉴 리터치', desc: '내 음식사진을 더 먹음직스럽게! 원하는 배경을 선택할 수 있어요.' },
  { gem: '💎 20젬 / 장', name: '메뉴 리메이크', desc: '업그레이드된 음식에 배경과 그릇까지 직접 선택하세요.' },
  { gem: '모음컷',        name: '메뉴 모음컷',  desc: '일반 모음컷부터 브랜딩용 모음컷까지 한 번에 완성해요.' },
]

const PLATFORMS = [
  { name: '배달의민족', src: '/logos/baemin.png',      size: '1280×960' },
  { name: '쿠팡이츠',   src: '/logos/coupangeats.svg', size: '1080×660' },
  { name: '요기요',     src: '/logos/yogiyo.png',      size: '1080×640' },
  { name: '땡겨요',     src: '/logos/ddanggyeo.svg',   size: '1080×660' },
  { name: '먹깨비',     src: '/logos/mukggaebi.webp',  size: '800×533'  },
]

const STATS = [
  { to: 30, suffix: 'seconds', label: 'AI 메뉴 사진 완성', desc: '업로드부터 완성까지 단 30초', icon: '/clock.png' },
  { to: 5, suffix: 'percent', label: '스튜디오 촬영 비용의 5%', desc: '같은 퀄리티, 다른 가격', icon: '/percent.png' },
  { to: 5000, suffix: '+ pics', label: '지금까지 만들어진 메뉴 사진', desc: '실제 사장님들이 사용한 결과물', icon: '/camera.png' },
]

function PlatformMarquee() {
  const bandRef = useRef<HTMLDivElement>(null)
  const drag = useRef({ active: false, startX: 0, baseX: 0 })

  const getX = () => {
    const el = bandRef.current
    if (!el) return 0
    return new DOMMatrix(getComputedStyle(el).transform).m41
  }

  const onStart = (clientX: number) => {
    const el = bandRef.current
    if (!el) return
    const x = getX()
    drag.current = { active: true, startX: clientX, baseX: x }
    el.style.animationPlayState = 'paused'
    el.style.transform = `translateX(${x}px)`
  }

  const onMove = (clientX: number) => {
    if (!drag.current.active || !bandRef.current) return
    const dx = clientX - drag.current.startX
    bandRef.current.style.transform = `translateX(${drag.current.baseX + dx}px)`
  }

  const onEnd = (clientX: number) => {
    if (!drag.current.active || !bandRef.current) return
    drag.current.active = false
    const el = bandRef.current
    const dx = clientX - drag.current.startX
    const finalX = drag.current.baseX + dx
    const animDist = el.scrollWidth * 0.25
    let pos = finalX % (-animDist)
    if (pos > 0) pos -= animDist
    const progress = Math.abs(pos) / animDist
    el.style.animationDelay = `${-(progress * 22)}s`
    el.style.transform = ''
    el.style.animationPlayState = 'running'
  }

  return (
    <div style={{ overflow: 'hidden', padding: '0 0 40px', cursor: 'grab' }}>
      <div
        ref={bandRef}
        className="pl-marquee-band"
        onMouseDown={e => onStart(e.clientX)}
        onMouseMove={e => onMove(e.clientX)}
        onMouseUp={e => onEnd(e.clientX)}
        onMouseLeave={e => { if (drag.current.active) onEnd(e.clientX) }}
        onTouchStart={e => onStart(e.touches[0].clientX)}
        onTouchMove={e => { e.preventDefault(); onMove(e.touches[0].clientX) }}
        onTouchEnd={e => onEnd(e.changedTouches[0].clientX)}
        style={{ userSelect: 'none', touchAction: 'none' }}
      >
        {[...PLATFORMS, ...PLATFORMS, ...PLATFORMS, ...PLATFORMS].map((p, i) => (
          <div key={i} className="pl-marquee-item" style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: '0 12px', flexShrink: 0, gap: '0px' }}>
            <img src={p.src} alt={p.name} style={{ width: '120px', height: '60px', objectFit: 'contain', flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '16px', color: '#111', fontWeight: 600, whiteSpace: 'nowrap', lineHeight: 1.2 }}>{p.name}</div>
              <div style={{ fontSize: '13px', color: 'rgba(0,0,0,0.4)', fontWeight: 400, whiteSpace: 'nowrap', lineHeight: 1.2 }}>{p.size}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

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
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '6px' }}>
      <span>{to.toLocaleString('ko-KR')}</span>
      <span style={{ fontSize: '28px', fontWeight: 700 }}>{suffix}</span>
    </span>
  )
}

function CompareCard({ item }: { item: typeof PF_ITEMS[0] }) {
  const [pos, setPos] = useState(50)
  const cmpRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const setPosition = useCallback((clientX: number) => {
    const el = cmpRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const p = Math.max(2, Math.min(98, ((clientX - r.left) / r.width) * 100))
    setPos(p)
  }, [])

  return (
    <div className="pf__card">
      <div
        ref={cmpRef}
        className="cmp"
        onPointerDown={e => { dragging.current = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); setPosition(e.clientX) }}
        onPointerMove={e => { if (dragging.current) setPosition(e.clientX); else if (e.pointerType === 'mouse') setPosition(e.clientX) }}
        onPointerUp={() => { dragging.current = false }}
        onPointerLeave={() => { dragging.current = false }}
      >
        <img className="cmp__before" src={item.before} alt={`${item.name} 변경 전`} loading="lazy" />
        <img className="cmp__after"  src={item.after}  alt={`${item.name} 변경 후`} loading="lazy" style={{ clipPath: `inset(0 0 0 ${pos}%)` }} />
        <span className="cmp__tag cmp__tag--b">BEFORE</span>
        <span className="cmp__tag cmp__tag--a" style={{ opacity: pos < 92 ? 1 : 0 }}>AFTER</span>
        <div className="cmp__handle" style={{ left: `${pos}%` }}>
          <div className="cmp__grip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 7l-4 5 4 5M15 7l4 5-4 5"/></svg>
          </div>
        </div>
      </div>
      <div className="pf__meta">
        <b>{item.ko} · {item.name}</b>
        <span>{item.bg}</span>
      </div>
    </div>
  )
}

export default function HomePage() {
  const [openFaq, setOpenFaq]         = useState<number | null>(null)
  const [scrolled, setScrolled]       = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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
  const [pfCategory, setPfCategory]       = useState('all')
  const [statsVisible, setStatsVisible]   = useState(false)
  const statsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const check = () => {
      const el = statsRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      if (r.top < window.innerHeight * 0.9 && r.bottom > 0) {
        setStatsVisible(true)
        window.removeEventListener('scroll', check)
      }
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    return () => window.removeEventListener('scroll', check)
  }, [])

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
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view')
            io.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0 }
    )
    document.querySelectorAll('.reveal-up, .mask').forEach(el => io.observe(el))
    return () => io.disconnect()
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
      <nav className="nav-root" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        background: scrolled ? 'rgba(255,255,255,0)' : 'rgba(255,255,255,1)',
        borderBottom: scrolled ? 'none' : '1px solid rgba(0,0,0,0.06)',
        transition: 'background 0.3s ease, border-bottom 0.3s ease',
        overflow: 'visible',
      }}>
        {/* ── 데스크톱 nav ── */}
        <div className="nav-desktop" style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 clamp(24px,6vw,120px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '68px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              <img src="https://i.ibb.co/YF3csF80/image.png" alt="메뉴랩" style={{ height: '70px', width: 'auto' }} fetchPriority="high" />
            </Link>
            <Link href="/pricing" className="nav-pricing-link" style={{ fontSize: '15px', fontWeight: 600, color: '#333', textDecoration: 'none' }}>요금제</Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {isLoggedIn ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '14px', color: '#555', fontWeight: 500 }}>{userName || userEmail?.split('@')[0]} 님</span>
                <button onClick={() => setShowChargeModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '100px', padding: '6px 14px', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: 'var(--black)' }}>
                  💎 {gemBalance.toLocaleString()}젬
                </button>
                <Link href="/mypage" style={{ fontSize: '14px', color: 'var(--orange)', textDecoration: 'none', fontWeight: 700 }}>마이페이지</Link>
              </div>
            ) : (
              <button onClick={() => { setLoginReturnTo('/mypage'); setLoginModal(true) }} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: '0', padding: '10px 22px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(196,81,13,0.3)', transition: 'transform 0.2s, box-shadow 0.2s' }}>
                무료로 시작하기
              </button>
            )}
          </div>
        </div>

        {/* ── 모바일 nav ── */}
        <div className="nav-mobile" style={{ display: 'none', padding: '0 20px', height: '48px', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          {/* 좌: 햄버거 */}
          <button onClick={() => setMobileMenuOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span style={{ display: 'block', width: '22px', height: '2px', background: '#111', borderRadius: '2px', transition: 'transform 0.2s', transform: mobileMenuOpen ? 'translateY(7px) rotate(45deg)' : 'none' }} />
            <span style={{ display: 'block', width: '22px', height: '2px', background: '#111', borderRadius: '2px', opacity: mobileMenuOpen ? 0 : 1, transition: 'opacity 0.2s' }} />
            <span style={{ display: 'block', width: '22px', height: '2px', background: '#111', borderRadius: '2px', transition: 'transform 0.2s', transform: mobileMenuOpen ? 'translateY(-7px) rotate(-45deg)' : 'none' }} />
          </button>
          {/* 중앙: 로고 */}
          <Link href="/" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img src="https://i.ibb.co/YF3csF80/image.png" alt="메뉴랩" style={{ height: '62px', width: 'auto' }} />
          </Link>
          {/* 우: 시작하기 */}
          <button
            onClick={() => { setLoginReturnTo('/mypage'); isLoggedIn ? window.location.href = '/mypage' : setLoginModal(true) }}
            style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: '0', padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
          >
            {isLoggedIn ? '마이페이지' : '시작하기'}
          </button>
        </div>

        {/* ── 모바일 드로어 ── */}
        {mobileMenuOpen && (
          <div className="nav-mobile" style={{ display: 'flex', flexDirection: 'column', background: '#fff', borderTop: '1px solid rgba(0,0,0,0.06)', padding: '8px 20px 16px' }}>
            <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '15px', fontWeight: 600, color: '#333', textDecoration: 'none', padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>요금제</Link>
            {isLoggedIn ? (
              <>
                <Link href="/mypage" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '15px', fontWeight: 600, color: '#333', textDecoration: 'none', padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>마이페이지</Link>
                <button onClick={() => setShowChargeModal(true)} style={{ textAlign: 'left', background: 'none', border: 'none', fontSize: '15px', fontWeight: 600, color: '#333', cursor: 'pointer', padding: '12px 0' }}>💎 {gemBalance.toLocaleString()}젬 충전</button>
              </>
            ) : (
              <button onClick={() => { setMobileMenuOpen(false); setLoginReturnTo('/mypage'); setLoginModal(true) }} style={{ textAlign: 'left', background: 'none', border: 'none', fontSize: '15px', fontWeight: 600, color: 'var(--orange)', cursor: 'pointer', padding: '12px 0' }}>로그인</button>
            )}
          </div>
        )}
      </nav>

        {/* ── Hero ── */}
        <section className="hero-sec" style={{ background: 'linear-gradient(to bottom, #efefef 0%, #f4f4f4 40%, #fafafa 70%, #ffffff 100%)', position: 'relative', width: '100vw', height: 'calc(100vh - 68px)', minHeight: '460px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '0', paddingBottom: '0', marginTop: 68 }}>
          <div className="hero-body" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '860px', padding: '0 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '48px' }}>
            <div style={{ width: 'fit-content', maxWidth: '100%' }}>
              {/* 데스크탑 헤드라인 */}
              <h1 className="hero-headline hero-headline-desktop" style={{ animation: 'fadeDown 0.7s ease forwards', opacity: 0, fontSize: 'clamp(32px, 5.2vw, 64px)', fontWeight: 700, lineHeight: 1.45, letterSpacing: '-1.5px', color: '#111', whiteSpace: 'nowrap', margin: 0 }}>
                스마트폰 사진이 <span style={{ color: 'var(--orange)' }}>스튜디오급</span>으로
              </h1>
              {/* 모바일 헤드라인 */}
              <h1 className="hero-headline hero-headline-mobile" style={{ animation: 'fadeDown 0.7s ease forwards', opacity: 0, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-1.5px', color: '#111', margin: 0, textAlign: 'center' }}>
                스마트폰 사진이<br /><span style={{ color: 'var(--orange)' }}>스튜디오급</span>으로
              </h1>
              <p className="hero-subheadline" style={{ animation: 'fadeDown 0.7s ease 0.15s forwards', opacity: 0, textAlign: 'right', fontSize: 'clamp(16px, 1.8vw, 24px)', fontWeight: 400, color: '#111', marginTop: '10px', letterSpacing: '-0.3px' }}>내 매장이 돋보이는 이유, 메뉴랩</p>
            </div>
            <div className="hero-slider" style={{ animation: 'fadeUp 0.8s ease 0.25s forwards', opacity: 0, width: '100%', maxWidth: '506px', boxShadow: '0 20px 60px rgba(0,0,0,0.12)', borderRadius: '20px', marginTop: '0' }}>
              <ImageCompareSlider />
            </div>
          </div>
        </section>

        {/* ── Marquee band ── */}
        <div className="hero-marquee-wrap" style={{ background: '#fff', overflow: 'hidden', padding: '20px 0 0', marginTop: '80px', position: 'relative' }}>
          <div className="marquee-band">
            {[...Array(4)].flatMap((_, r) =>
              [
                { text: 'digital studio', icon: 'camera', gap: '4px' },
                { text: 'for eatery',     icon: 'fork',   gap: '0px' },
                { text: 'for franchise',  icon: 'dish',   gap: '4px' },
                { text: 'branding',       icon: 'light',  gap: '4px' },
              ].map((item, i) => (
                <span key={`${r}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: item.gap, padding: '0 20px', fontSize: '28px', fontWeight: 400, color: 'rgba(0,0,0,0.7)', whiteSpace: 'nowrap', letterSpacing: '0' }}>
                  {item.text}
                  <img src={`/icons/${item.icon}.png`} alt="" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                </span>
              ))
            )}
          </div>
        </div>

        {/* ── Gem gift banner ── */}
        <div style={{ padding: 'clamp(120px,18vh,240px) 0 clamp(120px,18vh,240px)', overflow: 'hidden', background: '#fff' }}>
          <div className="gem-banner-inner" style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 clamp(24px,6vw,120px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            <p className="try-now-text" style={{ position: 'absolute', bottom: '0', left: 'calc(clamp(24px,6vw,120px) + 160px)', fontSize: '65px', fontWeight: 400, fontFamily: "'Athena', sans-serif", letterSpacing: '-0.03em', color: '#111', lineHeight: 1, whiteSpace: 'nowrap' }}>Try now!</p>
            <div className="gem-banner-image" style={{ flex: '0 0 auto', transform: 'translateX(-50%)', marginLeft: '0' }}>
              <img src="/gem.png" alt="" className="gem-img" style={{ width: 'clamp(420px, 46vw, 714px)', height: 'auto', display: 'block' }} />
            </div>
            <div className="gem-banner-text" style={{ textAlign: 'right', maxWidth: '520px', flexShrink: 0 }}>
              <p style={{ fontSize: 'clamp(13px, 1.6vw, 22px)', fontWeight: 400, letterSpacing: '-0.02em', color: '#111', lineHeight: 1.2, margin: '0 0 0.5em' }}>
                외식업 프랜차이즈 브랜딩 전문가의 안목을 녹여낸 메뉴랩에서,
              </p>
              <p style={{ fontSize: 'clamp(13px, 1.6vw, 22px)', fontWeight: 400, letterSpacing: '-0.02em', color: '#111', lineHeight: 1.2, margin: '0 0 0.5em' }}>
                사장님의 음식 사진을 [환골탈태]시켜보세요.
              </p>
              <p style={{ fontSize: 'clamp(13px, 1.6vw, 22px)', fontWeight: 400, letterSpacing: '-0.02em', color: '#111', lineHeight: 1.2, margin: 0 }}>
                참, 지금 메뉴랩에 가입하면 20젬을 선물로 드려요!
              </p>
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        <section className="stats-section" style={{ background: '#fff', paddingTop: '0', paddingBottom: '100px', position: 'relative' }}>
          <div className="stats-inner" style={{ maxWidth: '1440px', margin: '-24px auto 0', paddingLeft: 'clamp(24px,6vw,120px)', paddingRight: 'clamp(24px,6vw,120px)' }}>
            <div ref={statsRef} className="stats-grid">
              {STATS.map((stat, i) => (
                <div key={i} className={`stat-item${statsVisible ? ' triggered' : ''}`}>
                  <div className="stat-icon" style={{ width: '156px', height: '156px', marginBottom: '4px' }}>
                    <img src={stat.icon} alt="" style={{ width: '156px', height: '156px', objectFit: 'contain', display: 'block' }} />
                  </div>
                  <div className="stat-num" style={{ fontSize: '60px', fontWeight: 400, fontFamily: "'Athena', sans-serif", letterSpacing: '-0.03em', lineHeight: 1, color: '#111', whiteSpace: 'nowrap' }}>
                    <StatCounter to={stat.to} suffix={stat.suffix} />
                  </div>
                  <div className="stat-label" style={{ marginTop: '20px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 400, color: '#111', marginBottom: '6px', whiteSpace: 'nowrap' }}>{stat.label}</div>
                    <div style={{ fontSize: '15px', fontWeight: 400, color: '#111', lineHeight: 1.15, whiteSpace: 'nowrap' }}>{stat.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      {/* ── HOW IT WORKS ── */}
      <section className="process-section" style={{ background: '#f0eeeb', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 clamp(24px,6vw,120px)' }}>

          {/* 헤드라인 2열 */}
          <div className="process-headline-wrap" style={{ paddingTop: '80px', paddingBottom: '40px' }}>
            <p style={{ fontSize: '65px', fontWeight: 400, fontFamily: "'Athena', sans-serif", letterSpacing: '-0.03em', color: '#111', lineHeight: 1 }}>process</p>
          </div>

        </div>
        <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 clamp(24px,6vw,120px)' }}>
          <div className="process-steps-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '40px', paddingTop: '60px', paddingBottom: '120px' }}>
            {/* Step 1 */}
            <div className="process-col">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <p style={{ fontSize: '64px', fontWeight: 200, color: '#111', letterSpacing: '-0.04em', lineHeight: 1 }}>01</p>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111' }}>사진 업로드</h3>
              </div>
              <p style={{ fontSize: '15px', fontWeight: 400, color: '#666', lineHeight: 1.7, marginTop: '24px' }}>
                스마트폰으로 찍은 사진 그대로 올리세요.<br />
                밝은 조명에서 음식 전체가 담긴 사진이면 충분해요.<br />
                별도 장비나 편집 실력은 필요 없어요.
              </p>
              <p style={{ fontSize: '13px', color: '#FF5722', marginTop: '12px' }}>✔ 자연광 OK&nbsp;&nbsp;&nbsp;✔ 스마트폰 OK&nbsp;&nbsp;&nbsp;✔ 무편집 OK</p>
            </div>
            {/* Step 2 */}
            <div className="process-col" data-delay="1">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <p style={{ fontSize: '64px', fontWeight: 200, color: '#111', letterSpacing: '-0.04em', lineHeight: 1 }}>02</p>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111' }}>옵션 선택</h3>
              </div>
              <p style={{ fontSize: '15px', fontWeight: 400, color: '#666', lineHeight: 1.7, marginTop: '24px' }}>
                배경, 플랫폼, 구도를 선택하세요.<br />
                배달의민족, 쿠팡이츠, 네이버 플레이스 —<br />
                어디에 올릴지 맞춰서 만들어드려요.
              </p>
              <p style={{ fontSize: '13px', color: '#FF5722', marginTop: '12px' }}>✔ 배달의민족&nbsp;&nbsp;&nbsp;✔ 쿠팡이츠&nbsp;&nbsp;&nbsp;✔ 네이버 플레이스</p>
            </div>
            {/* Step 3 */}
            <div className="process-col" data-delay="2">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <p style={{ fontSize: '64px', fontWeight: 200, color: '#111', letterSpacing: '-0.04em', lineHeight: 1 }}>03</p>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111' }}>AI 생성 완료</h3>
              </div>
              <p style={{ fontSize: '15px', fontWeight: 400, color: '#666', lineHeight: 1.7, marginTop: '24px' }}>
                30초 만에 전문 메뉴 사진이 완성됩니다.<br />
                스튜디오 촬영 없이, 편집 실력 없이도<br />
                누구나 프로급 결과물을 받을 수 있어요.
              </p>
              <p style={{ fontSize: '13px', color: '#FF5722', marginTop: '12px' }}>✔ 30초 완성&nbsp;&nbsp;&nbsp;✔ 고해상도 출력&nbsp;&nbsp;&nbsp;✔ 즉시 다운로드</p>
            </div>
          </div>

        </div>
        {/* Platform marquee */}
        <PlatformMarquee />
        <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 clamp(24px,6vw,120px) 48px', textAlign: 'right' }}>
          <p style={{ fontSize: '12px', fontWeight: 400, color: '#999', letterSpacing: '0.12em' }}>지원 플랫폼</p>
        </div>
      </section>

      {/* ── Portfolio ── */}
      <section id="cases" className="sec-portfolio" style={{ padding: 'clamp(48px,6vw,80px) 0', background: '#fff', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 clamp(24px,6vw,120px)' }}>
          <div style={{ textAlign: 'left', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '65px', fontWeight: 400, fontFamily: "'Athena', sans-serif", letterSpacing: '-0.03em', color: '#111', lineHeight: 1, margin: 0 }}>our works.</h2>
            <p style={{ fontSize: '15px', fontWeight: 400, color: '#666', lineHeight: 1.7, marginTop: '24px' }}>가운데 손잡이를 드래그해 비포·애프터를 비교해 보세요.</p>
          </div>

          <div className="pf__tabs reveal-up">
            {PF_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setPfCategory(tab.key)}
                className={`pf__tab${pfCategory === tab.key ? ' on' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="pf-grid">
            {PF_ITEMS.filter(item => pfCategory === 'all' || item.cat === pfCategory).length === 0 ? (
              <div className="pf__empty">
                <b>{PF_TABS.find(t => t.key === pfCategory)?.label} 사례를 준비 중이에요</b>
                <span>곧 멋진 {PF_TABS.find(t => t.key === pfCategory)?.label} 메뉴 사진을 보여드릴게요.</span>
              </div>
            ) : (
              PF_ITEMS.filter(item => pfCategory === 'all' || item.cat === pfCategory).map((item, i) => (
                <CompareCard key={`${item.cat}-${i}`} item={item} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── Reviews ── */}
      <section className="reviews-section" style={{ padding: 'clamp(48px,6vw,80px) 0', background: 'var(--cream)', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 clamp(24px,6vw,120px)' }}>
          <div style={{ textAlign: 'left', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '65px', fontWeight: 400, fontFamily: "'Athena', sans-serif", letterSpacing: '-0.03em', color: '#111', lineHeight: 1, margin: 0 }}>reviews</h2>
            <p style={{ fontSize: '15px', fontWeight: 400, color: '#666', lineHeight: 1.7, marginTop: '16px' }}>사장님들의 실제 후기</p>
          </div>
          <div className="rv-grid">
            {REVIEWS.map((r, i) => (
              <div key={i} className="rv-card-hover" style={{
                background: '#fff', borderRadius: '20px', padding: '28px 24px',
                border: '1px solid rgba(0,0,0,0.05)',
                boxShadow: '0 2px 20px rgba(0,0,0,0.05)',
                display: 'flex', flexDirection: 'column', gap: '14px',
                marginTop: '0',
              }}>
                <img src="/stars.png" alt="별점 5점" style={{ height: '84px', width: 'auto', maxWidth: '160px', objectFit: 'contain' }} />
                <h3 className="h-3">{r.title}</h3>
                <p style={{ fontSize: '15px', color: '#666', lineHeight: 1.7, flex: 1, whiteSpace: 'pre-line', marginTop: '8px' }}>{r.body}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#fff', fontWeight: 700 }}>
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
      <section className="services-section" style={{ padding: 'clamp(48px,6vw,80px) 0', background: '#fff', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 clamp(24px,6vw,120px)' }}>
          <div style={{ textAlign: 'left', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '65px', fontWeight: 400, fontFamily: "'Athena', sans-serif", letterSpacing: '-0.03em', color: '#111', lineHeight: 1, margin: 0 }}>services</h2>
            <p style={{ fontSize: '15px', fontWeight: 400, color: '#666', lineHeight: 1.7, marginTop: '16px' }}>메뉴랩 서비스</p>
          </div>
          <div className="sv-grid">
            {SERVICES.map((s, i) => (
              <div
                key={i}
                className="reveal-up sv-card-hover"
                data-delay={i as unknown as string}
                onClick={handleOpenBasic}
                style={{
                  borderRadius: '20px', padding: '28px 24px 24px',
                  border: '1.5px solid rgba(0,0,0,0.07)', cursor: 'pointer',
                  background: '#fff', boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
                  display: 'flex', flexDirection: 'column', gap: '12px',
                }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(196,81,13,0.08)', color: 'var(--orange)', borderRadius: '100px', padding: '5px 14px', fontSize: '13px', fontWeight: 700, alignSelf: 'flex-start' }}>{s.gem}</div>
                <h3 className="h-3">{s.name}</h3>
                <p className="lead" style={{ flex: 1 }}>{s.desc}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', color: 'var(--orange)' }}><path d="M6 18L18 6M9 6h9v9"/></svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── FAQ ── */}
      <section id="faq" className="sec-faq" style={{ padding: 'clamp(48px,6vw,80px) 0', background: 'var(--cream)', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '780px', margin: '0 auto', padding: '0 clamp(24px,6vw,120px)' }}>
          <p className="eyebrow reveal-up" style={{ marginBottom: '10px' }}>FAQ</p>
          <h2 className="h-sec" style={{ marginBottom: '48px' }}><div className="mask" data-delay="1"><span>자주 묻는 질문</span></div></h2>
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
      <section className="sec-cta" style={{ padding: 'clamp(48px,6vw,80px) 0', background: 'var(--black)', textAlign: 'center', position: 'relative', overflow: 'hidden', zIndex: 1 }}>
        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '900px', height: '500px', background: 'radial-gradient(ellipse at 50% 100%, rgba(196,81,13,0.3) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '-80px', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '400px', background: 'radial-gradient(ellipse at 50% 0%, rgba(196,81,13,0.15) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: '640px', margin: '0 auto' }}>
          <p className="eyebrow reveal-up" style={{ color: 'rgba(196,81,13,0.8)', marginBottom: '16px' }}>Get started today</p>
          <h2 className="h-sec" style={{ color: '#fff', marginBottom: '16px' }}>
            <div className="mask"><span>지금 가입하면</span></div>
            <div className="mask" data-delay="1"><span style={{ color: 'var(--orange)' }}>💎 20젬 무료</span></div>
          </h2>
          <p className="lead reveal-up" data-delay="2" style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.9, marginBottom: '40px' }}>
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
      <footer className="main-footer" style={{ background: 'var(--black)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: 'clamp(40px,6vw,80px) 0', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 clamp(24px,6vw,120px)' }}>
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
