'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

const PRICING = [
  { name: '1컷', cuts: '1 cut', price: '9,900', badge: '기본', highlight: false, desc: '컷당 9,900원' },
  { name: '10컷', cuts: '10 cut', price: '89,000', badge: '인기 · 10% 할인', highlight: false, desc: '컷당 8,900원' },
  { name: '20컷', cuts: '20 cut', price: '158,000', badge: 'BEST · 20% 할인', highlight: true, desc: '컷당 7,900원' },
  { name: '모음컷', cuts: '모음컷', price: '19,900', badge: '필수', highlight: false, desc: '여러 메뉴를 한 컷에' },
]

const COMPARE = [
  { label: '단가', traditional: '150만~300만원\n+ 재촬영 시 추가비용', hit: '장당 11,200원~\n(20컷 기준)' },
  { label: '기간', traditional: '1개월 이상', hit: '평균 2~5영업일' },
  { label: '퀄리티', traditional: '업체 역량에 의존', hit: '일관된 고퀄리티' },
  { label: '수정', traditional: '재촬영 필요\n(추가 비용 과다)', hit: '즉시 반영 가능' },
  { label: '리소스', traditional: '영업 일시 중단\n식재료·인건비 소모', hit: '사장님 시간 불필요' },
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

const MOEUM_SPECIAL = [
  { src: 'https://i.ibb.co/BH7wHTXB/1.png', label: '명함 합성' },
  { src: 'https://i.ibb.co/MDThj2pp/2.png', label: '브랜드 깃발 합성' },
]

const MOEUM_GENERAL = [
  { src: 'https://i.ibb.co/cKfcWM7F/02.png' },
  { src: 'https://i.ibb.co/N6FxT3xV/03.png' },
  { src: 'https://i.ibb.co/VcwwLw5G/9.png' },
  { src: 'https://i.ibb.co/qXHT96W/10.jpg' },
]

const FAQ = [
  { q: '메뉴사진을 잘 찍는 방법이 있나요?', a: '핵심은 두 가지예요. 배경은 깔끔하게, 음식은 선명하게. ① 밝은 곳에서 흔들리지 않게 ② 음식이 화면 가득 차게 가까이서 찍기. 완벽하지 않아도 메뉴랩에서 맛있어 보이게 리터치해드려요.' },
  { q: '스마트폰으로 찍어도 괜찮나요?', a: '물론이죠! 요즘 스마트폰 카메라 성능이 좋아서 충분해요. 어두운 곳에서 플래시 켜고 촬영한 사진은 활용이 어렵습니다. 영업 중인 매장의 배달앱·플레이스 리뷰 사진을 업로드하셔도 됩니다!' },
  { q: '"사진 사기" 리뷰가 생기지 않을까요?', a: '없는 재료를 만들어내지 않고, 실제 제공량을 그대로 반영하며, 과장된 광택이나 인위적 표현은 사용하지 않아요. "올려도 안전한" 수준의 자연스러운 보정만 합니다.' },
  { q: '작업 기간은 얼마나 걸리나요?', a: '결제 완료 즉시 AI가 자동으로 처리를 시작합니다. 1~2컷은 보통 1~3분 내로 완료되며, 사진 장 수가 많을수록 몇 분 더 소요될 수 있어요. 완료되면 카카오톡으로 링크가 전송되고, 마이페이지에서 바로 결과물을 확인하고 다운로드할 수 있습니다.' },
  { q: '마음에 안 들면 어떻게 하나요?', a: '먼저 샘플(5천원)로 퀄리티를 확인하신 후 본 주문을 진행하시는 걸 추천드립니다. 본 제작은 3컷 초기 컨펌 후 방향을 맞추고 나머지 작업을 진행해요.' },
  { q: '모음컷은 무엇인가요?', a: '여러 메뉴를 한 화면에 담은 구성 컷입니다. 배달앱 썸네일, SNS 홍보용으로 많이 사용됩니다. 브랜드 명함·소품 합성도 가능해요.' },
]

const BEFORE_SRC = '/noodle-before.jpg'
const AFTER_SRC  = '/noodle-after.jpg'
const BG_SRC     = '/hero-bg.jpg'

function ImageCompareSlider() {
  const [pos, setPos] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const updatePos = useCallback((clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const { left, width } = el.getBoundingClientRect()
    const pct = Math.min(100, Math.max(0, ((clientX - left) / width) * 100))
    setPos(pct)
  }, [])

  const onMouseDown = () => { dragging.current = true }
  const onMouseMove = (e: React.MouseEvent) => { if (dragging.current) updatePos(e.clientX) }
  const onMouseUp   = () => { dragging.current = false }
  const onTouchMove = (e: React.TouchEvent) => updatePos(e.touches[0].clientX)

  return (
    <div
      ref={containerRef}
      className="hero-compare"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchMove={onTouchMove}
      style={{ position: 'relative', width: '100%', borderRadius: '20px', overflow: 'hidden', cursor: 'ew-resize', userSelect: 'none', touchAction: 'none' }}
    >
      {/* After (base) */}
      <img src={AFTER_SRC} alt="after" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />

      {/* Before (clipped to left side) */}
      <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${100 - pos}% 0 0)`, pointerEvents: 'none' }}>
        <img src={BEFORE_SRC} alt="before" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>

      {/* Divider */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pos}%`, transform: 'translateX(-50%)', width: '2px', background: '#fff', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '36px', height: '36px', borderRadius: '50%', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 900, color: '#333', letterSpacing: '-1px' }}>
          ◀▶
        </div>
      </div>

      {/* Labels */}
      <div style={{ position: 'absolute', bottom: '14px', left: '14px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '100px', pointerEvents: 'none' }}>BEFORE</div>
      <div style={{ position: 'absolute', bottom: '14px', right: '14px', background: 'var(--orange)', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '100px', pointerEvents: 'none' }}>AFTER</div>
    </div>
  )
}

function SparkleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="white" style={{ flexShrink: 0 }}>
      {/* 큰 별 */}
      <path d="M10 2l1.5 5.5L17 9l-5.5 1.5L10 16l-1.5-5.5L3 9l5.5-1.5L10 2z"/>
      {/* 작은 별 우측상단 */}
      <path d="M18 2l.8 2.2L21 5l-2.2.8L18 8l-.8-2.2L15 5l2.2-.8L18 2z"/>
      {/* 작은 별 우측하단 */}
      <path d="M20 13l.6 1.8L22.4 15.5l-1.8.6L20 18l-.6-1.9L17.6 15.5l1.8-.6L20 13z"/>
    </svg>
  )
}

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('menulab_session')
      if (raw) {
        const { token, email } = JSON.parse(raw)
        if (token && email) setIsLoggedIn(true)
      }
    } catch {}
  }, [])

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh' }}>

      {/* NAV — OQ 스타일 */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        background: scrolled ? 'rgba(255,255,255,0.72)' : '#fff',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        padding: '0 5vw',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '60px',
        transition: 'background 0.3s ease, backdrop-filter 0.3s ease',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="https://i.ibb.co/YF3csF80/image.png" alt="메뉴랩" style={{ height: '54px', width: 'auto' }} fetchPriority="high" />
        </Link>
        <div className="nav-links" style={{ display: 'flex', gap: '28px', alignItems: 'center' }}>
          <Link href="/about" style={{ fontSize: '16px', color: 'var(--black)', textDecoration: 'none', fontWeight: 500 }}>소개</Link>
          <a href="#cases" style={{ fontSize: '16px', color: 'var(--black)', textDecoration: 'none', fontWeight: 500 }}>제작사례</a>
          <a href="#pricing" style={{ fontSize: '16px', color: 'var(--black)', textDecoration: 'none', fontWeight: 500 }}>가격</a>
          <Link href="/mypage" style={{ fontSize: '16px', color: 'var(--orange)', textDecoration: 'none', fontWeight: 700 }}>{isLoggedIn ? '마이페이지' : '로그인'}</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero-sec" style={{ position: 'relative', width: '100vw', height: '100vh', minHeight: '520px', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 'calc(60px + 3vh)', paddingBottom: '3vh' }}>

        {/* 배경 이미지 */}
        <div className="hero-bg" style={{ position: 'absolute', inset: 0, backgroundImage: `url(${BG_SRC})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        {/* 오버레이 — 상단만 살짝 밝게, 거의 없음 */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 40%, rgba(0,0,0,0.12) 100%)' }} />

        {/* 콘텐츠 — 넓게 */}
        <div className="hero-body" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '860px', padding: '0 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>

          {/* 헤드라인 (크게) */}
          <h1 className="hero-headline" style={{ animation: 'fadeDown 0.7s ease forwards', opacity: 0, textAlign: 'center', fontSize: 'clamp(30px, 5.2vw, 58px)', fontWeight: 900, lineHeight: 1.15, letterSpacing: '-1.5px', color: '#fff' }}>
            <span style={{ fontSize: '0.65em', fontWeight: 700, opacity: 0.85 }}>스마트폰 사진 한 장,</span><br />
            <span style={{ color: 'var(--orange)' }}>스튜디오급</span>으로
          </h1>

          {/* 서브텍스트 (헤드라인 아래) */}
          <p className="hero-badge" style={{ animation: 'fadeDown 0.6s ease 0.15s forwards', opacity: 0, textAlign: 'center', fontSize: 'clamp(13px, 1.8vw, 17px)', color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
            브랜드의 가치를 높이는 한 컷, 메뉴랩이 함께합니다
          </p>

          {/* Before/After 슬라이더 — 넓게 */}
          <div className="hero-slider" style={{ animation: 'fadeUp 0.8s ease 0.25s forwards', opacity: 0, width: '100%', maxWidth: '680px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', borderRadius: '20px', marginTop: '8px' }}>
            <ImageCompareSlider />
          </div>
        </div>
      </section>


      {/* CTA 버튼 — 화면 하단 고정 (전역 float) */}
      <Link href="/order" className="cta-float" style={{ position: 'fixed', bottom: '56px', left: 0, right: 0, margin: '0 auto', width: 'fit-content', zIndex: 300, animation: 'float 2.2s ease-in-out infinite', background: 'var(--orange)', color: '#fff', padding: '24px 44px', borderRadius: '100px', fontSize: '22px', fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap', boxShadow: '0 8px 32px rgba(0,0,0,0.25)', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <SparkleIcon />
        지금 체험하기
      </Link>

      {/* PORTFOLIO */}
      <section id="cases" className="sec-portfolio" style={{ padding: '80px 5vw', background: '#fff' }}>
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

                {/* 좌우 나란히 (sideBySide) */}
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

          {/* 모음컷 */}
          <div style={{ marginTop: '64px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <h3 style={{ fontWeight: 900, fontSize: '22px', color: 'var(--black)' }}>모음컷</h3>
              <div style={{ background: 'rgba(255,92,0,0.1)', color: 'var(--orange)', padding: '5px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: 700 }}>여러 메뉴를 한 컷에</div>
            </div>
            <div style={{ background: 'var(--black)', borderRadius: '20px', padding: '20px', marginBottom: '16px' }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'inline-block', background: 'var(--orange)', color: '#fff', padding: '8px 18px', borderRadius: '100px', fontSize: '14px', fontWeight: 800, marginBottom: '8px' }}>✨ 브랜드 소품 합성 가능</div>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>명함, 깃발 등 브랜드 소품을 사진에 합성해드려요</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {MOEUM_SPECIAL.map((m, i) => (
                  <div key={i} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
                    <img src={m.src} alt={m.label} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', objectPosition: i === 1 ? 'center top' : 'center center', display: 'block' }} loading="lazy" decoding="async" />
                    <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.65)', color: '#fff', padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 600 }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {MOEUM_GENERAL.map((m, i) => (
                <div key={i} style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <img src={m.src} alt={`모음컷 ${i + 1}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} loading="lazy" decoding="async" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="sec-pricing" style={{ padding: '100px 5vw', background: 'var(--cream)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)', letterSpacing: '2px', marginBottom: '12px' }}>PRICING</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, letterSpacing: '-1px', color: 'var(--black)', lineHeight: 1.2, marginBottom: '48px' }}>필요한 컷만,<br />합리적으로</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'start' }}>
            {PRICING.map(plan => {
              const isCollection = plan.cuts === '모음컷'
              return (
              <div key={plan.name} style={{ position: 'relative', paddingTop: '20px' }}>
                {/* 추천 배지 — 카드 위에 떠있음 */}
                {plan.highlight && (
                  <div style={{ position: 'absolute', top: 0, right: '20px', zIndex: 1, width: '48px', height: '72px', background: 'var(--orange)', clipPath: 'polygon(0 0, 100% 0, 100% 78%, 50% 100%, 0 78%)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '10px', boxShadow: '0 4px 16px rgba(196,81,13,0.45)', color: '#fff', fontSize: '15px', fontWeight: 800, letterSpacing: '0.5px' }}>
                    추천
                  </div>
                )}
                <div style={{ borderRadius: '20px', overflow: 'hidden', boxShadow: plan.highlight ? '0 8px 40px rgba(196,81,13,0.2)' : '0 2px 16px rgba(0,0,0,0.08)', border: plan.highlight ? '1.5px solid var(--orange)' : '1px solid rgba(0,0,0,0.07)', opacity: 1 }}>
                <div style={{ background: '#fff', padding: '28px 24px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#888', marginBottom: '8px' }}>{plan.badge}</p>
                  <h3 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--black)', marginBottom: '16px', letterSpacing: '-0.5px' }}>{plan.name}</h3>
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ fontSize: '36px', fontWeight: 900, color: 'var(--black)', letterSpacing: '-1px' }}>₩{plan.price}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#888', marginBottom: '24px', lineHeight: 1.5 }}>{plan.desc}</p>
                  <Link
                    href={isCollection ? '/order' : `/order?cut=${plan.cuts.replace(' cut','')}&step=2`}
                    style={{ display: 'block', textAlign: 'center', padding: '14px', borderRadius: '10px', background: 'var(--black)', color: '#fff', fontWeight: 700, fontSize: '15px', textDecoration: 'none', pointerEvents: isCollection ? 'none' : 'auto' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    주문하기
                  </Link>
                </div>
                {/* 공사중 오버레이 */}
                {isCollection && (
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', pointerEvents: 'none' }}>
                    <div style={{ background: '#FFD700', border: '3px solid #1a1a1a', borderRadius: '2px', padding: '8px 16px', boxShadow: '4px 4px 0px #1a1a1a', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: '"Courier New", monospace', fontWeight: 900, fontSize: '15px', letterSpacing: '2px', whiteSpace: 'nowrap', color: '#1a1a1a' }}>
                      <span>⚒️</span><span>공 사 중</span><span>⚒️</span>
                    </div>
                    <div style={{ background: '#1a1a1a', color: '#FFD700', fontFamily: '"Courier New", monospace', fontSize: '10px', fontWeight: 700, letterSpacing: '1px', padding: '3px 10px', borderRadius: '2px', boxShadow: '2px 2px 0px #555' }}>UNDER CONSTRUCTION</div>
                  </div>
                )}
                </div>
              </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="sec-faq" style={{ padding: '100px 5vw', background: '#fff' }}>
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
        {/* 배경 그라디언트 */}
        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '900px', height: '500px', background: 'radial-gradient(ellipse at 50% 100%, rgba(196,81,13,0.25) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: '640px', margin: '0 auto' }}>
          {/* 배지 */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(196,81,13,0.15)', border: '1px solid rgba(196,81,13,0.3)', color: 'var(--orange)', padding: '8px 20px', borderRadius: '100px', fontSize: '13px', fontWeight: 700, marginBottom: '36px', letterSpacing: '0.5px' }}>
            ✦ 첫 주문 체험
          </div>
          {/* 헤딩 */}
          <h2 style={{ fontSize: 'clamp(38px, 6vw, 72px)', fontWeight: 900, color: '#fff', letterSpacing: '-2px', lineHeight: 1.1, marginBottom: '24px' }}>
            메뉴사진 한 장이<br /><span style={{ color: 'var(--orange)' }}>매출을 바꿉니다</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 'clamp(15px, 2vw, 17px)', lineHeight: 1.8, marginBottom: '48px' }}>
            커피 한 잔 값으로 직접 확인해보세요
          </p>
          {/* CTA 버튼 */}
          <Link href="/order" className="cta-main-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: '#fff', color: 'var(--black)', padding: '22px 56px', borderRadius: '100px', fontSize: '18px', fontWeight: 800, textDecoration: 'none', boxShadow: '0 12px 48px rgba(0,0,0,0.3)', letterSpacing: '-0.3px' }}>
            5,000원으로 시작하기 →
          </Link>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px', marginTop: '20px' }}>AI 자동 처리 · 평균 60초 이내 완료</p>
        </div>
      </section>

      <footer className="main-footer" style={{ background: 'var(--black)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '40px 5vw' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <img src="https://i.ibb.co/YF3csF80/image.png" alt="메뉴랩" style={{ height: '44px', width: '160px', objectFit: 'contain', objectPosition: 'left', filter: 'invert(1)' }} fetchPriority="high" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px' }}>
            {[
              '상호명: 메뉴랩',
              '대표자: 최재이',
              '사업자등록번호: 331-39-01242',
              '주소: 화성시 동탄구 동탄대로 676, 힐스테이트동탄역멀티플라이어 오피스 406호',
              '전화: 010-5892-4221',
              '이메일: solip7131@gmail.com',
            ].map(item => (
              <span key={item} style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>{item}</span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Link href="/terms" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', textDecoration: 'none' }}>이용약관</Link>
            <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', textDecoration: 'none' }}>개인정보처리방침</Link>
            <Link href="/refund" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', textDecoration: 'none' }}>환불정책</Link>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>© 2026 메뉴랩. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
