'use client'

import { useState } from 'react'
import Link from 'next/link'

const FAQ_CATEGORIES = [
  {
    key: 'general',
    label: '서비스 기본',
    items: [
      { q: '메뉴사진을 잘 찍는 방법이 있나요?', a: '핵심은 세 가지예요. ① 밝은 곳에서 흔들리지 않게 ② 음식이 화면 가득 차게 가까이서 찍기 ③ 스마트폰을 가로로 돌려서 촬영 — AI 결과물이 가로(3:2) 비율로 생성되기 때문에 가로 사진일수록 훨씬 자연스럽게 나와요. 완벽하지 않아도 메뉴랩에서 맛있어 보이게 리터치해드려요.' },
      { q: '스마트폰으로 찍어도 괜찮나요?', a: '물론이죠! 요즘 스마트폰 카메라 성능이 좋아서 충분해요. 단, 스마트폰을 가로로 돌려서 촬영해주세요 — AI 결과물은 가로(3:2) 비율로 생성되기 때문에 가로 사진을 업로드하시면 최상의 결과를 얻을 수 있어요. 어두운 곳에서 플래시 켜고 촬영한 사진은 활용이 어렵습니다. 배달앱·플레이스 리뷰 사진을 업로드하셔도 됩니다!' },
      { q: '"사진 사기" 리뷰가 생기지 않을까요?', a: '없는 재료를 만들어내지 않고, 실제 제공량을 그대로 반영하며, 과장된 광택이나 인위적 표현은 사용하지 않아요. "올려도 안전한" 수준의 자연스러운 보정만 합니다.' },
    ],
  },
  {
    key: 'process',
    label: '제작 과정',
    items: [
      { q: '작업 기간은 얼마나 걸리나요?', a: '입금 확인 후 3일 이내 제작 완료 후 카카오톡 채널을 통해 결과물 링크를 전달해드립니다.' },
      { q: '기본과 프리미엄의 차이는 무엇인가요?', a: '기본(7,900원)은 AI를 활용한 자동 생성이며, 그릇만 선택하면 됩니다. 프리미엄(14,900원)은 수작업으로 진행되며, 원하는 느낌·분위기를 브리핑 폼으로 세세하게 전달하실 수 있습니다. 수정도 기본 2회 포함돼요.' },
      { q: '마음에 안 들면 어떻게 하나요?', a: '프리미엄 플랜은 수정 2회가 기본 포함됩니다. 베이직은 결과물 확인 후 재제작이 필요하시면 카카오톡으로 문의해주세요.' },
    ],
  },
  {
    key: 'payment',
    label: '결제 & 젬',
    items: [
      { q: '결제는 어떻게 하나요?', a: '현재는 계좌이체(무통장 입금)로만 운영됩니다. 주문 접수 완료 후 화면에 표시되는 계좌로 입금하시면 입금 확인 후 작업이 시작됩니다. 결과물은 카카오톡 채널로 전달해드려요.' },
      { q: '젬은 어떻게 사용하나요?', a: '젬은 메뉴랩 서비스 이용 시 사용하는 포인트입니다. 구독 플랜을 선택하시면 매월 젬이 지급되며, 젬 1개당 메뉴 사진 1장을 제작하실 수 있습니다.' },
      { q: '젬 유효기간이 있나요?', a: '구독 플랜으로 지급된 젬은 스탠다드·프로 플랜의 경우 다음 달로 이월됩니다. 베이직 플랜과 추가 충전 젬은 90일 유효기간이 있습니다.' },
    ],
  },
  {
    key: 'account',
    label: '계정 & 기타',
    items: [
      { q: '로그인은 어떻게 하나요?', a: '카카오 계정으로 간편하게 로그인하실 수 있습니다. 별도 회원가입 없이 카카오로 바로 시작하세요.' },
      { q: '구독 해지는 어떻게 하나요?', a: '마이페이지에서 언제든지 구독을 해지하실 수 있습니다. 해지 후에도 결제 기간이 남아있다면 남은 기간까지 서비스를 이용하실 수 있어요.' },
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
              평일 10:00 ~ 18:00 운영 · 이메일 <a href="mailto:solip7131@gmail.com" style={{ color: 'var(--orange)', fontWeight: 700, textDecoration: 'none' }}>solip7131@gmail.com</a>
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
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#FEE500', color: '#000', padding: '11px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 800 }}>
                  @메뉴랩 채널 추가
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Operating hours notice */}
        <section style={{ padding: '32px 5vw 64px' }}>
          <div style={{ maxWidth: '860px', margin: '0 auto' }}>
            <div style={{ background: 'rgba(196,81,13,0.06)', border: '1px solid rgba(196,81,13,0.15)', borderRadius: '16px', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontSize: '22px' }}>⏰</span>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--black)', marginBottom: '2px' }}>운영 시간 안내</p>
                <p style={{ fontSize: '13px', color: '#666' }}>평일 10:00 ~ 18:00 · 주말 및 공휴일 휴무 · 전화: 010-5892-4221</p>
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
