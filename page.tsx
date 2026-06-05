'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const PRICING = [
  { name: '1컷', cuts: '1 cut', price: '14,000', badge: '기본', highlight: false, desc: '단품 1장 제작' },
  { name: '10컷', cuts: '10 cut', price: '126,000', badge: '인기 · 10% 할인', highlight: false, desc: '컷당 12,600원' },
  { name: '20컷', cuts: '20 cut', price: '224,000', badge: 'BEST · 20% 할인', highlight: true, desc: '컷당 11,200원' },
  { name: '모음컷', cuts: '모음컷', price: '18,000~', badge: '필수', highlight: false, desc: '여러 메뉴를 한 컷에' },
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
    before: 'https://i.ibb.co/YFDSdrdG/before.png',
    afters: [{ src: 'https://i.ibb.co/QFv2RLW0/after.png', label: 'After' }],
  },
  {
    title: '분식 단품',
    desc: '같은 원본 소스로 메뉴별 개별 컷 제작',
    tag: '원본 1장 → 단품 2컷',
    before: 'https://i.ibb.co/vxDm2vrx/Kakao-Talk-20260124-144350686-01.png',
    afters: [
      { src: 'https://i.ibb.co/1J0wh6dW/01.jpg', label: '오리지널 스피떡' },
      { src: 'https://i.ibb.co/nNW2kjBC/03.jpg', label: '치즈오븐함박파스타' },
    ],
  },
  {
    title: '샐러드볼 A',
    desc: '배달앱 리뷰 사진 → 스튜디오 구도로',
    tag: '구도 변경 + 배경 교체',
    before: 'https://i.ibb.co/dJjyr7vC/jpg.png',
    afters: [{ src: 'https://i.ibb.co/mrCMBYhD/18.png', label: 'After' }],
  },
  {
    title: '샐러드볼 B',
    desc: '항공뷰 원본 → 측면 스튜디오 구도',
    tag: '구도 변경 + 배경 교체',
    before: 'https://i.ibb.co/27b90LZD/Kakao-Talk-20260109-173308783-15-jpg.png',
    afters: [{ src: 'https://i.ibb.co/Mxpzc8TP/21.png', label: 'After' }],
  },
  {
    title: '김치말이냉국수',
    desc: '심플한 원본 → 고급스러운 무드 연출',
    tag: '배경 · 조명 · 분위기 변경',
    before: 'https://i.ibb.co/qK9VJv9/image.png',
    afters: [{ src: 'https://i.ibb.co/xK5Pjg2h/12.png', label: 'After' }],
  },
]

const MOEUM_SPECIAL = [
  { src: 'https://i.ibb.co/HDyb0TqF/00.jpg', label: '명함 합성' },
  { src: 'https://i.ibb.co/Kjs04X7Z/01.jpg', label: '브랜드 깃발 합성' },
]

const MOEUM_GENERAL = [
  { src: 'https://i.ibb.co/cKfcWM7F/02.png' },
  { src: 'https://i.ibb.co/N6FxT3xV/03.png' },
  { src: 'https://i.ibb.co/VcwwLw5G/9.png' },
  { src: 'https://i.ibb.co/qXHT96W/10.jpg' },
]

const PROCESS = [
  { step: '01', title: '주문서 작성', desc: '메뉴명, 구도, 배경 선택 후\n사진 업로드' },
  { step: '02', title: '결제 완료', desc: '샘플 5천원 또는\n본 주문 결제' },
  { step: '03', title: '초기 컨펌', desc: '본 제작 3건 먼저 확인\n방향 맞추기' },
  { step: '04', title: '전체 작업', desc: '확정 후 나머지\n일괄 작업 진행' },
  { step: '05', title: '최종 전달', desc: '평균 2~5영업일 내\n고화질 파일 전달' },
]

const FAQ = [
  { q: '메뉴사진을 잘 찍는 방법이 있나요?', a: '핵심은 두 가지예요. 배경은 깔끔하게, 음식은 선명하게. ① 밝은 곳에서 흔들리지 않게 ② 음식이 화면 가득 차게 가까이서 찍기. 완벽하지 않아도 메뉴랩에서 맛있어 보이게 리터치해드려요.' },
  { q: '스마트폰으로 찍어도 괜찮나요?', a: '물론이죠! 요즘 스마트폰 카메라 성능이 좋아서 충분해요. 어두운 곳에서 플래시 켜고 촬영한 사진은 활용이 어렵습니다. 영업 중인 매장의 배달앱·플레이스 리뷰 사진을 전달해주셔도 됩니다!' },
  { q: '"사진 사기" 리뷰가 생기지 않을까요?', a: '없는 재료를 만들어내지 않고, 실제 제공량을 그대로 반영하며, 과장된 광택이나 인위적 표현은 사용하지 않아요. "올려도 안전한" 수준의 자연스러운 보정만 합니다.' },
  { q: '작업 기간은 얼마나 걸리나요?', a: '평균 2~5영업일입니다. 샘플의 경우 더 빠르게 처리됩니다.' },
  { q: '마음에 안 들면 어떻게 하나요?', a: '먼저 샘플(5천원)로 퀄리티를 확인하신 후 본 주문을 진행하시는 걸 추천드립니다. 본 제작은 3컷 초기 컨펌 후 방향을 맞추고 나머지 작업을 진행해요.' },
  { q: '모음컷은 무엇인가요?', a: '여러 메뉴를 한 화면에 담은 구성 컷입니다. 배달앱 썸네일, SNS 홍보용으로 많이 사용됩니다. 브랜드 명함·소품 합성도 가능해요.' },
]

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh' }}>

      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(250,247,242,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(0,0,0,0.08)' : 'none',
        transition: 'all 0.3s ease',
        padding: '0 5vw',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '64px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src="https://i.ibb.co/YF3csF80/image.png" alt="메뉴랩" style={{ height: '28px', width: 'auto' }} />
        </div>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <a href="#about" style={{ fontSize: '14px', color: 'var(--black)', textDecoration: 'none', fontWeight: 500 }}>서비스소개</a>
          <a href="#cases" style={{ fontSize: '14px', color: 'var(--black)', textDecoration: 'none', fontWeight: 500 }}>제작사례</a>
          <a href="#pricing" style={{ fontSize: '14px', color: 'var(--black)', textDecoration: 'none', fontWeight: 500 }}>가격</a>
          <a href="#faq" style={{ fontSize: '14px', color: 'var(--black)', textDecoration: 'none', fontWeight: 500 }}>FAQ</a>
          <Link href="/order" style={{ background: 'var(--orange)', color: '#fff', padding: '10px 20px', borderRadius: '100px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>주문하기</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '120px 5vw 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '10%', right: '-5%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,92,0,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '800px', animation: 'fadeUp 0.8s ease forwards' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,92,0,0.1)', border: '1px solid rgba(255,92,0,0.2)', borderRadius: '100px', padding: '6px 16px', marginBottom: '32px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--orange)' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)' }}>촬영 없이 스튜디오급 메뉴사진</span>
          </div>
          <h1 style={{ fontSize: 'clamp(42px, 8vw, 80px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-2px', marginBottom: '24px', color: 'var(--black)' }}>
            스마트폰 사진 한 장,<br />
            <span style={{ color: 'var(--orange)' }}>스튜디오급</span>으로<br />
            바꿔드립니다.
          </h1>
          <p style={{ fontSize: '18px', color: '#555', lineHeight: 1.7, marginBottom: '32px', maxWidth: '500px' }}>
            리터칭·합성 중심의 디지털 메뉴사진 제작 서비스<br />
            자영업자와 프랜차이즈 브랜드를 위한 하이엔드 솔루션
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', background: 'var(--black)', borderRadius: '20px', padding: '20px 28px', marginBottom: '40px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'inline-block', background: 'var(--orange)', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '100px', letterSpacing: '1px', marginBottom: '8px' }}>🔥 기간 한정 이벤트</div>
              <p style={{ color: '#fff', fontWeight: 900, fontSize: '20px', margin: 0, lineHeight: 1.3 }}>첫 샘플 <span style={{ color: 'var(--orange)' }}>5,000원</span>에 체험해보세요</p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', marginTop: '4px' }}>정가 14,000원 · 지금만 64% 할인</p>
            </div>
            <Link href="/order" style={{ background: 'var(--orange)', color: '#fff', padding: '14px 28px', borderRadius: '100px', fontSize: '15px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0, boxShadow: '0 4px 20px rgba(255,92,0,0.4)' }}>지금 체험하기 →</Link>
          </div>
          <div style={{ display: 'flex', gap: '40px' }}>
            {[{ num: '500+', label: '제작 완료' }, { num: '2~5일', label: '평균 납기' }, { num: '1/10', label: '촬영 대비 비용' }].map(stat => (
              <div key={stat.label}>
                <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--orange)' }}>{stat.num}</div>
                <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" style={{ padding: '100px 5vw', background: 'var(--black)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)', letterSpacing: '2px', marginBottom: '12px' }}>WHAT WE DO</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, letterSpacing: '-1px', color: '#fff', lineHeight: 1.2, marginBottom: '48px' }}>
            촬영이 비싼 이유는<br />카메라가 아니라 <span style={{ color: 'var(--orange)' }}>'사람'</span>이에요
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '48px' }}>
            {[
              { icon: '🍱', title: '기존 촬영의 문제', desc: '식재료 구입 → 조리 → 플레이팅 → 촬영 → 후보정\n많은 사람이 동시에 움직여야 해서 비싸고, 느리고, 수정이 어려워요.' },
              { icon: '💻', title: '메뉴랩의 방식', desc: '고객이 보낸 원본 사진을 기반으로\n재료 질감, 소스 윤기, 색감, 배경, 분위기를\n촬영급 비주얼로 디지털 재구성합니다.' },
              { icon: '✅', title: '현실 보존 원칙', desc: '"사진 사기" 리뷰를 만들지 않기 위해\n없는 재료를 추가하거나 양을 과장하지 않아요.\n올려도 안전한 자연스러운 보정만 합니다.' },
            ].map(item => (
              <div key={item.title} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '32px 28px' }}>
                <div style={{ fontSize: '36px', marginBottom: '16px' }}>{item.icon}</div>
                <h3 style={{ color: '#fff', fontWeight: 800, fontSize: '18px', marginBottom: '12px' }}>{item.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{item.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: 'rgba(255,255,255,0.06)', padding: '16px 24px' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 700 }}>항목</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 700 }}>전통 촬영</span>
              <span style={{ color: 'var(--orange)', fontSize: '13px', fontWeight: 700 }}>메뉴랩</span>
            </div>
            {COMPARE.map((row, i) => (
              <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: 700 }}>{row.label}</span>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{row.traditional}</span>
                <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{row.hit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BEFORE/AFTER 제작 사례 */}
      <section id="cases" style={{ padding: '100px 5vw', background: 'var(--cream)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)', letterSpacing: '2px', marginBottom: '12px' }}>PORTFOLIO</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1.2, marginBottom: '16px' }}>실제 제작 사례</h2>
          <p style={{ color: '#666', fontSize: '16px', marginBottom: '64px' }}>Before → After · 실제 클라이언트 작업물입니다</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            {CASES.map((c, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ padding: '24px 28px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontWeight: 800, fontSize: '20px', marginBottom: '4px' }}>{c.title}</h3>
                    <p style={{ color: '#666', fontSize: '14px' }}>{c.desc}</p>
                  </div>
                  <div style={{ background: 'rgba(255,92,0,0.08)', color: 'var(--orange)', padding: '6px 16px', borderRadius: '100px', fontSize: '12px', fontWeight: 700 }}>{c.tag}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: `1fr ${c.afters.length > 1 ? '1fr 1fr' : '1fr'}`, gap: '2px', background: 'rgba(0,0,0,0.06)' }}>
                  <div style={{ position: 'relative' }}>
                    <img src={c.before} alt="before" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '4px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 700 }}>BEFORE</div>
                  </div>
                  {c.afters.map((a, j) => (
                    <div key={j} style={{ position: 'relative' }}>
                      <img src={a.src} alt="after" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                      <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'var(--orange)', color: '#fff', padding: '4px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 700 }}>
                        {c.afters.length > 1 ? a.label : 'AFTER'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 모음컷 섹션 */}
          <div style={{ marginTop: '80px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
              <h3 style={{ fontWeight: 900, fontSize: '24px' }}>모음컷</h3>
              <div style={{ background: 'rgba(255,92,0,0.08)', color: 'var(--orange)', padding: '6px 16px', borderRadius: '100px', fontSize: '12px', fontWeight: 700 }}>여러 메뉴를 한 컷에</div>
            </div>

            {/* 소품 합성 강조 */}
            <div style={{ background: 'var(--black)', borderRadius: '20px', padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: 'var(--orange)', color: '#fff', padding: '4px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: 700 }}>✨ 브랜드 소품 합성 가능</div>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>명함, 깃발 등 브랜드 소품을 사진에 합성해드려요</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {MOEUM_SPECIAL.map((m, i) => (
                  <div key={i} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
                    <img src={m.src} alt={m.label} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '4px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 600 }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 일반 모음컷 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              {MOEUM_GENERAL.map((m, i) => (
                <div key={i} style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <img src={m.src} alt={`모음컷 ${i + 1}`} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 사진 가이드 */}
      <section style={{ padding: '100px 5vw', background: '#fff' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)', letterSpacing: '2px', marginBottom: '12px' }}>HOW TO SEND</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1.2, marginBottom: '48px' }}>이런 사진을 보내주세요</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            {[
              { icon: '☀️', title: '밝게', desc: '자연광 또는 밝은 조명에서 촬영' },
              { icon: '🔍', title: '선명하게', desc: '흔들리지 않게, 음식이 또렷하게' },
              { icon: '📐', title: '가까이', desc: '음식이 화면 가득 차게' },
              { icon: '🍽️', title: '그릇 전체', desc: '그릇 전체가 나오도록' },
            ].map(item => (
              <div key={item.title} style={{ background: 'var(--cream)', borderRadius: '20px', padding: '28px 24px', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>{item.icon}</div>
                <h3 style={{ fontWeight: 800, fontSize: '17px', marginBottom: '8px' }}>{item.title}</h3>
                <p style={{ color: '#666', fontSize: '14px', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'rgba(255,92,0,0.06)', border: '1px solid rgba(255,92,0,0.15)', borderRadius: '16px', padding: '20px 24px' }}>
              <p style={{ fontSize: '14px', color: '#555', lineHeight: 1.7 }}>📱 <strong>배달앱·플레이스 리뷰 사진도 OK!</strong><br />영업 중인 매장의 리뷰 사진을 전달해주셔도 됩니다.</p>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '16px', padding: '20px 24px' }}>
              <p style={{ fontSize: '14px', color: '#555', lineHeight: 1.7 }}>❌ <strong>사용 불가:</strong> 어두운 곳에서 플래시 촬영, 심하게 흔들리거나 잘린 사진, AI로 제작된 사진</p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: '100px 5vw', background: 'var(--black)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)', letterSpacing: '2px', marginBottom: '12px' }}>PRICING</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, letterSpacing: '-1px', color: '#fff', lineHeight: 1.2, marginBottom: '60px' }}>필요한 컷만,<br />합리적으로</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            {PRICING.map(plan => (
              <div key={plan.name} style={{ background: plan.highlight ? 'var(--orange)' : 'rgba(255,255,255,0.04)', border: plan.highlight ? 'none' : '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '32px 28px', transition: 'transform 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-4px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
                <div style={{ display: 'inline-block', background: plan.highlight ? 'rgba(255,255,255,0.2)' : 'rgba(255,92,0,0.15)', color: plan.highlight ? '#fff' : 'var(--orange)', borderRadius: '100px', padding: '4px 12px', fontSize: '12px', fontWeight: 700, marginBottom: '20px' }}>{plan.badge}</div>
                <p style={{ color: plan.highlight ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '4px' }}>{plan.cuts}</p>
                <h3 style={{ color: '#fff', fontWeight: 900, fontSize: '22px', marginBottom: '8px' }}>{plan.name}</h3>
                <p style={{ color: plan.highlight ? '#fff' : 'var(--orange)', fontWeight: 900, fontSize: '32px', marginBottom: '12px' }}>{plan.price}원</p>
                <p style={{ color: plan.highlight ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)', fontSize: '13px' }}>{plan.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px 28px', display: 'flex', flexWrap: 'wrap', gap: '32px', marginBottom: '48px' }}>
            {[{ icon: '⏱', text: '작업기간 평균 2~5영업일' }, { icon: '🔄', text: '본 제작 3컷 초기 컨펌 후 진행' }, { icon: '💬', text: '처음 주문도 편하게 문의 가능' }].map(item => (
              <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>{item.icon}</span>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>{item.text}</span>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center' }}>
            <Link href="/order" style={{ background: 'var(--orange)', color: '#fff', padding: '18px 48px', borderRadius: '100px', fontSize: '17px', fontWeight: 700, textDecoration: 'none', display: 'inline-block', boxShadow: '0 8px 32px rgba(255,92,0,0.4)' }}>지금 주문하기 →</Link>
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section id="process" style={{ padding: '100px 5vw', background: 'var(--cream)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)', letterSpacing: '2px', marginBottom: '12px' }}>PROCESS</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1.2, marginBottom: '60px' }}>5단계로 끝납니다</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            {PROCESS.map(p => (
              <div key={p.step} style={{ background: '#fff', borderRadius: '20px', padding: '28px 24px', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--orange)', letterSpacing: '1px', marginBottom: '16px' }}>STEP {p.step}</div>
                <h3 style={{ fontWeight: 800, fontSize: '18px', marginBottom: '10px' }}>{p.title}</h3>
                <p style={{ color: '#666', fontSize: '14px', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: '100px 5vw', background: '#fff' }}>
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)', letterSpacing: '2px', marginBottom: '12px' }}>FAQ</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: '60px' }}>자주 묻는 질문</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {FAQ.map((item, i) => (
              <div key={i} style={{ border: `1px solid ${openFaq === i ? 'var(--orange)' : 'rgba(0,0,0,0.08)'}`, borderRadius: '16px', overflow: 'hidden', transition: 'border-color 0.2s' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: '100%', textAlign: 'left', padding: '24px 28px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontWeight: 700, fontSize: '16px' }}>{item.q}</span>
                  <span style={{ color: 'var(--orange)', fontSize: '20px', fontWeight: 300, transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0)', flexShrink: 0 }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 28px 24px', color: '#555', fontSize: '15px', lineHeight: 1.7 }}>{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '100px 5vw', background: 'var(--black)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,92,0,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, color: '#fff', letterSpacing: '-1.5px', lineHeight: 1.2, marginBottom: '24px' }}>지금 바로 시작해보세요</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '17px', marginBottom: '16px' }}>5천원으로 퀄리티 먼저 확인하세요</p>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', marginBottom: '40px' }}>카카오톡 문의도 환영해요 · jymanager</p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/order" style={{ background: 'var(--orange)', color: '#fff', padding: '20px 56px', borderRadius: '100px', fontSize: '18px', fontWeight: 700, textDecoration: 'none', display: 'inline-block', boxShadow: '0 8px 40px rgba(255,92,0,0.5)' }}>샘플 5,000원으로 시작하기 →</Link>
            <a href="https://open.kakao.com/o/sjymanager" style={{ background: '#FEE500', color: '#000', padding: '20px 40px', borderRadius: '100px', fontSize: '18px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>💬 카카오톡 문의</a>
          </div>
        </div>
      </section>

      <footer style={{ background: 'var(--black)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 5vw', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <img src="https://i.ibb.co/YF3csF80/image.png" alt="메뉴랩" style={{ height: '24px', width: 'auto', filter: 'invert(1)' }} />
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>© 2025 메뉴랩 · 최재이 매니저 · jymanager</p>
      </footer>
    </div>
  )
}
