'use client'

import { useState } from 'react'
import Link from 'next/link'

const FAQ_CATEGORIES = [
  {
    key: 'general',
    label: '서비스 기본',
    items: [
      { q: '메뉴랩은 어떤 서비스인가요?', a: '메뉴랩은 사장님이 직접 찍은 음식 사진을 AI로 스튜디오급으로 바꿔주는 서비스예요. 카카오 로그인 후 젬을 충전하고, 사진을 업로드하면 30초 만에 전문가 수준의 메뉴 사진이 완성됩니다. 촬영도, 포토그래퍼도 필요 없어요.' },
      { q: '어떤 서비스 종류가 있나요?', a: '세 가지 서비스가 있어요. ① 메뉴 리터치(10젬): 기존 사진을 밝고 먹음직스럽게 보정 + 배경 선택 ② 메뉴 리메이크(20젬): 배경·그릇·분위기까지 원하는 스타일로 완전히 변경 ③ 메뉴 모음컷: 여러 메뉴를 하나의 고급 이미지로 구성.' },
      { q: '"사진 사기" 리뷰가 생기지 않을까요?', a: '없는 재료를 만들어내거나 실제 제공량을 과장하지 않아요. 실제 음식의 색감·질감·구도를 자연스럽게 개선하는 수준으로만 작업하기 때문에 "올려도 안전한" 보정입니다.' },
      { q: '사진을 잘 찍는 방법이 있나요?', a: '세 가지만 지켜주세요. ① 밝은 곳에서 흔들리지 않게 ② 음식이 화면 가득 차도록 가까이서 촬영 ③ 스마트폰을 가로로 돌려서 찍기. AI 결과물이 가로(3:2) 비율로 만들어지기 때문에 가로 사진일수록 자연스러워요. 배달앱 리뷰 사진을 업로드하셔도 됩니다.' },
    ],
  },
  {
    key: 'process',
    label: '제작 과정',
    items: [
      { q: '결과물은 얼마나 걸리나요?', a: 'AI가 자동으로 생성하기 때문에 보통 30초~2분 이내로 완성돼요. 완성된 결과물은 마이페이지에서 바로 확인하고 다운로드할 수 있습니다.' },
      { q: '어떻게 시작하나요?', a: '카카오 계정으로 로그인 → 요금제 선택 또는 젬 패키지 충전 → 사진 업로드 → AI 생성 완료. 마이페이지에서 결과물을 확인하고 다운로드하시면 돼요.' },
      { q: '결과물이 마음에 안 들면 어떻게 하나요?', a: '먼저 고객센터 이메일로 문의해주세요. 업로드한 사진의 밝기나 각도에 따라 결과물 품질이 달라질 수 있어요. 더 나은 원본 사진으로 재시도하시면 결과가 크게 개선됩니다.' },
    ],
  },
  {
    key: 'payment',
    label: '결제 & 젬',
    items: [
      { q: '젬(💎)이 뭔가요?', a: '젬은 메뉴랩에서 사진을 제작할 때 사용하는 포인트예요. 구독 플랜을 선택하면 매월 젬이 자동 지급되고, 추가로 필요할 땐 일회성 패키지로도 충전할 수 있어요. 리터치 1장에 10젬, 리메이크 1장에 20젬이 필요합니다.' },
      { q: '젬 유효기간이 있나요?', a: '구독으로 매월 지급된 젬은 스탠다드·프로 플랜의 경우 다음 달로 이월됩니다. 일회성 패키지로 충전한 젬은 90일 유효기간이 있어요.' },
      { q: '결제 수단은 무엇인가요?', a: '카드 결제(신용카드/체크카드)로 진행됩니다. 구독 플랜은 매월 자동 결제되며, 일회성 패키지는 1회 결제로 즉시 젬이 지급돼요.' },
    ],
  },
  {
    key: 'account',
    label: '계정 & 구독',
    items: [
      { q: '로그인은 어떻게 하나요?', a: '카카오 계정으로 간편하게 로그인하실 수 있습니다. 별도 회원가입 없이 카카오로 바로 시작하세요.' },
      { q: '구독은 언제든지 해지할 수 있나요?', a: '네, 마이페이지에서 언제든지 해지 가능해요. 해지 후에도 남은 구독 기간 동안은 서비스를 계속 이용할 수 있고, 이미 지급된 젬도 그대로 사용 가능합니다.' },
      { q: '여러 계정을 사용할 수 있나요?', a: '현재는 카카오 계정 1개당 1개의 메뉴랩 계정이 연결됩니다. 프랜차이즈나 여러 매장을 운영하시는 경우 프로 플랜을 추천드려요.' },
    ],
  },
]

export default function CustomerPage() {
  const [activeCategory, setActiveCategory] = useState('general')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const currentCategory = FAQ_CATEGORIES.find(c => c.key === activeCategory)!

  return (
    <div style={{ background: '#fff', minHeight: '100vh', fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif" }}>
      {/* Header */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 clamp(20px,5vw,80px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img src="https://i.ibb.co/YF3csF80/image.png" alt="메뉴랩" style={{ height: '54px', width: 'auto' }} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/pricing" style={{ fontSize: '15px', fontWeight: 600, color: '#555', textDecoration: 'none' }}>요금제</Link>
            <Link href="/" style={{ background: 'var(--orange)', color: '#fff', borderRadius: '100px', padding: '10px 22px', fontSize: '14px', fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 16px rgba(196,81,13,0.3)' }}>
              무료로 시작
            </Link>
          </div>
        </div>
      </nav>

      <div style={{ paddingTop: '60px' }}>
        {/* Hero */}
        <section style={{ background: 'var(--cream)', padding: 'clamp(64px,10vw,120px) 5vw clamp(48px,6vw,80px)' }}>
          <div style={{ maxWidth: '760px', margin: '0 auto', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)', letterSpacing: '2px', marginBottom: '12px' }}>CUSTOMER SUPPORT</p>
            <h1 style={{ fontSize: 'clamp(32px,5vw,56px)', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.15, marginBottom: '16px', color: 'var(--black)' }}>
              무엇을 도와드릴까요?
            </h1>
            <p style={{ fontSize: 'clamp(15px,1.8vw,17px)', color: '#888', lineHeight: 1.7 }}>
              평일 10:00 ~ 18:00 운영
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ padding: 'clamp(56px,8vw,100px) 5vw' }}>
          <div style={{ maxWidth: '860px', margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(22px,3vw,30px)', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '32px', color: 'var(--black)' }}>자주 묻는 질문</h2>

            {/* Category tabs */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
              {FAQ_CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => { setActiveCategory(cat.key); setOpenFaq(null) }}
                  style={{
                    padding: '8px 18px', borderRadius: '100px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                    background: activeCategory === cat.key ? 'var(--black)' : 'rgba(0,0,0,0.06)',
                    color: activeCategory === cat.key ? '#fff' : '#555',
                    border: 'none', transition: 'all 0.2s',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* FAQ items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentCategory.items.map((item, i) => (
                <div key={i} style={{ border: `1px solid ${openFaq === i ? 'var(--orange)' : 'rgba(0,0,0,0.08)'}`, borderRadius: '14px', overflow: 'hidden', transition: 'border-color 0.2s' }}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{ width: '100%', textAlign: 'left', padding: '20px 24px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--black)' }}>{item.q}</span>
                    <span style={{ color: 'var(--orange)', fontSize: '20px', fontWeight: 300, transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0)', flexShrink: 0 }}>+</span>
                  </button>
                  {openFaq === i && (
                    <div style={{ padding: '0 24px 20px', color: '#555', fontSize: '14px', lineHeight: 1.75 }}>{item.a}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section style={{ background: 'var(--cream)', padding: 'clamp(56px,8vw,100px) 5vw' }}>
          <div style={{ maxWidth: '860px', margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(22px,3vw,30px)', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '8px', color: 'var(--black)' }}>직접 문의하기</h2>
            <p style={{ color: '#888', fontSize: '15px', marginBottom: '40px' }}>찾으시는 답변이 없다면 이메일로 문의해주세요.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
              {/* Email card */}
              <div style={{ background: '#fff', borderRadius: '20px', padding: '28px 24px', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '32px', marginBottom: '14px' }}>✉️</div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--black)', marginBottom: '8px' }}>이메일 문의</h3>
                <p style={{ fontSize: '13px', color: '#888', marginBottom: '16px', lineHeight: 1.6 }}>평일 10:00 ~ 18:00 응대<br />영업일 기준 1~2일 내 답변</p>
                <a
                  href="mailto:solip7131@gmail.com"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--black)', color: '#fff', padding: '11px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}
                >
                  solip7131@gmail.com
                </a>
              </div>

              {/* Kakao channel card */}
              <div style={{ background: '#fff', borderRadius: '20px', padding: '28px 24px', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '32px', marginBottom: '14px' }}>💬</div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--black)', marginBottom: '8px' }}>카카오톡 채널</h3>
                <p style={{ fontSize: '13px', color: '#888', marginBottom: '16px', lineHeight: 1.6 }}>평일 10:00 ~ 18:00 운영<br />제작 결과물도 카카오톡으로 전달돼요</p>
                <a
                  href="http://pf.kakao.com/_xnxnxmxn"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#FEE500', color: '#000', padding: '11px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 800, textDecoration: 'none' }}
                >
                  카카오톡 문의하기
                </a>
              </div>
            </div>
          </div>
        </section>

        <section style={{ padding: '0 5vw 64px' }}>
          <div style={{ maxWidth: '860px', margin: '0 auto' }}>
            <p style={{ fontSize: '13px', color: '#aaa' }}>평일 10:00 ~ 18:00 · 주말 및 공휴일 휴무</p>
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
            <Link href="/terms"    style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', textDecoration: 'none' }}>이용약관</Link>
            <Link href="/privacy"  style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', textDecoration: 'none' }}>개인정보처리방침</Link>
            <Link href="/refund"   style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', textDecoration: 'none' }}>환불정책</Link>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>© 2026 메뉴랩. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
