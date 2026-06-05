import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '메뉴랩 소개 | 메뉴랩',
  description: '메뉴랩이 어떻게 스마트폰 사진 한 장을 스튜디오급 메뉴사진으로 만드는지 알아보세요.',
}

const COMPARE = [
  { label: '단가',    traditional: '150만~300만원\n+ 재촬영 시 추가비용', hit: '장당 7,900원~\n(20컷 기준)' },
  { label: '처리',    traditional: '1개월 이상',            hit: '결제 즉시 AI 자동처리' },
  { label: '수령',    traditional: '업체 별도 전달',         hit: '카카오톡 + 마이페이지' },
  { label: '퀄리티',  traditional: '업체 역량에 의존',        hit: '일관된 고퀄리티' },
  { label: '수정',    traditional: '재촬영 필요 (추가비용)',   hit: '즉시 반영 가능' },
  { label: '리소스',  traditional: '영업 일시 중단 필요',      hit: '사장님 시간 불필요' },
]

export default function AboutPage() {
  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>

      {/* NAV */}
      <nav style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '0 5vw', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px', position: 'sticky', top: 0, background: '#fff', zIndex: 100 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="https://i.ibb.co/YF3csF80/image.png" alt="메뉴랩" style={{ height: '44px', width: 'auto' }} />
        </Link>
        <div className="nav-links" style={{ display: 'flex', gap: '28px', alignItems: 'center' }}>
          <Link href="/about" style={{ fontSize: '16px', color: 'var(--orange)', textDecoration: 'none', fontWeight: 700 }}>소개</Link>
          <a href="/#cases" style={{ fontSize: '16px', color: 'var(--black)', textDecoration: 'none', fontWeight: 500 }}>제작사례</a>
          <a href="/#pricing" style={{ fontSize: '16px', color: 'var(--black)', textDecoration: 'none', fontWeight: 500 }}>가격</a>
          <Link href="/mypage" style={{ fontSize: '16px', color: 'var(--orange)', textDecoration: 'none', fontWeight: 700 }}>로그인</Link>
        </div>
      </nav>

      {/* 헤더 */}
      <section style={{ padding: '80px 5vw 60px', background: 'var(--cream)' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)', letterSpacing: '2px', marginBottom: '12px' }}>ABOUT MENULAB</p>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.2, marginBottom: '20px' }}>
            촬영 없이<br />스튜디오급 메뉴사진
          </h1>
          <p style={{ color: '#666', fontSize: 'clamp(15px, 2vw, 18px)', lineHeight: 1.8, maxWidth: '600px' }}>
            스마트폰으로 찍은 사진 한 장이면 충분합니다.<br />
            메뉴랩의 AI가 색감·배경·조명을 자동으로 재구성해 브랜드 가치를 높이는 메뉴사진을 만들어드립니다.
          </p>
        </div>
      </section>

      {/* WHAT WE DO */}
      <section style={{ padding: '80px 5vw', background: 'var(--black)' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)', letterSpacing: '2px', marginBottom: '12px' }}>WHAT WE DO</p>
          <h2 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(24px, 4vw, 36px)', marginBottom: '12px', letterSpacing: '-1px', lineHeight: 1.3 }}>
            촬영이 비싼 이유는 카메라가 아니라<br />
            <span style={{ color: 'var(--orange)' }}>'사람'</span>이에요
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', lineHeight: 1.7, marginBottom: '40px' }}>
            기존 음식 촬영은 식재료 준비·조리·플레이팅·카메라맨·후보정까지 수많은 사람이 관여해야 했습니다.<br />
            메뉴랩은 이 모든 과정을 AI로 대체합니다.
          </p>

          {/* 3가지 포인트 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '40px' }}>
            {[
              { icon: '🍱', title: '기존 촬영의 문제', desc: '식재료·조리·플레이팅·촬영·후보정\n비싸고, 느리고, 수정이 어렵습니다.' },
              { icon: '🤖', title: '메뉴랩의 방식', desc: '원본 사진 한 장 업로드 후 결제하면\nAI가 즉시 색감·배경·조명을 재구성합니다.' },
              { icon: '✅', title: '현실 보존 원칙', desc: '없는 재료는 절대 추가하지 않습니다.\n올려도 안전한 자연스러운 보정만 합니다.' },
            ].map(item => (
              <div key={item.title} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '18px', padding: '24px' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>{item.icon}</div>
                <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>{item.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{item.desc}</p>
              </div>
            ))}
          </div>

          {/* 비교표 */}
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: 'rgba(255,255,255,0.06)', padding: '14px 20px' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 700 }}>항목</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 700 }}>전통 촬영</span>
              <span style={{ color: 'var(--orange)', fontSize: '12px', fontWeight: 700 }}>메뉴랩</span>
            </div>
            {COMPARE.map(row => (
              <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: 700 }}>{row.label}</span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{row.traditional}</span>
                <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{row.hit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW TO UPLOAD */}
      <section style={{ padding: '80px 5vw', background: '#fff' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)', letterSpacing: '2px', marginBottom: '12px' }}>HOW TO UPLOAD</p>
          <h2 style={{ fontWeight: 900, fontSize: 'clamp(24px, 4vw, 36px)', marginBottom: '12px', letterSpacing: '-1px' }}>이런 사진을 업로드해주세요</h2>
          <p style={{ color: '#888', fontSize: '15px', lineHeight: 1.7, marginBottom: '40px' }}>
            완벽한 사진이 아니어도 됩니다. 핵심은 딱 두 가지 — <strong>밝고 선명하게</strong>.
          </p>

          {/* 4가지 팁 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '24px' }}>
            {[
              { icon: '☀️', title: '밝게', desc: '자연광 또는 밝은 실내 조명에서 촬영해주세요' },
              { icon: '🔍', title: '선명하게', desc: '흔들리지 않게 고정 후 촬영해주세요' },
              { icon: '📐', title: '가까이', desc: '음식이 화면 가득 차도록 가까이서 찍어주세요' },
              { icon: '🍽️', title: '그릇 전체', desc: '그릇 테두리까지 전부 나오게 찍어주세요' },
            ].map(item => (
              <div key={item.title} style={{ background: 'var(--cream)', borderRadius: '16px', padding: '20px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>{item.icon}</div>
                <p style={{ fontWeight: 800, fontSize: '15px', marginBottom: '6px' }}>{item.title}</p>
                <p style={{ color: '#888', fontSize: '12px', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          {/* OK / NG */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginBottom: '48px' }}>
            <div style={{ background: 'rgba(196,81,13,0.06)', border: '1px solid rgba(196,81,13,0.18)', borderRadius: '14px', padding: '16px 20px' }}>
              <p style={{ fontSize: '14px', color: '#555', lineHeight: 1.7 }}>
                📱 <strong>배달앱·플레이스 리뷰 사진도 OK!</strong><br />
                <span style={{ fontSize: '12px', color: '#888' }}>고객 리뷰 사진을 업로드하셔도 됩니다.</span>
              </p>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '14px', padding: '16px 20px' }}>
              <p style={{ fontSize: '14px', color: '#555', lineHeight: 1.7 }}>
                ❌ <strong>불가:</strong> 플래시 촬영, 심하게 흔들린 사진, AI로 이미 제작된 사진
              </p>
            </div>
          </div>

          {/* PROCESS */}
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)', letterSpacing: '2px', marginBottom: '12px' }}>PROCESS</p>
          <h2 style={{ fontWeight: 900, fontSize: 'clamp(24px, 4vw, 36px)', marginBottom: '32px', letterSpacing: '-1px' }}>5단계로 끝납니다</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
            {[
              { step: '01', icon: '📸', title: '사진 업로드',    desc: '스마트폰 사진 또는\n배달앱 리뷰 사진' },
              { step: '02', icon: '💳', title: '결제 완료',      desc: '체험 5,000원\n또는 본주문' },
              { step: '03', icon: '🤖', title: 'AI 즉시 처리',   desc: '결제 즉시 AI가\n자동으로 작업 시작' },
              { step: '04', icon: '💬', title: '카카오톡 알림',  desc: '완료되면 카카오톡으로\n링크 전송' },
              { step: '05', icon: '⬇️', title: '마이페이지 수령', desc: '로그인 후 마이페이지에서\n바로 다운로드' },
            ].map(p => (
              <div key={p.step} style={{ background: 'var(--cream)', borderRadius: '16px', padding: '20px 16px' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--orange)', letterSpacing: '1px', marginBottom: '8px' }}>STEP {p.step}</div>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{p.icon}</div>
                <p style={{ fontWeight: 800, fontSize: '14px', marginBottom: '4px' }}>{p.title}</p>
                <p style={{ color: '#888', fontSize: '12px', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 5vw', background: 'var(--black)', textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(28px, 4vw, 40px)', letterSpacing: '-1px', marginBottom: '16px' }}>
            5,000원으로 먼저 확인해보세요
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '16px', marginBottom: '36px' }}>
            퀄리티가 마음에 드셔야 본 주문을 진행하세요
          </p>
          <Link href="/order" style={{ display: 'inline-block', background: 'var(--orange)', color: '#fff', padding: '18px 52px', borderRadius: '100px', fontSize: '17px', fontWeight: 800, textDecoration: 'none', boxShadow: '0 8px 32px rgba(196,81,13,0.5)' }}>
            지금 체험하기 →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: 'var(--black)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 5vw' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <Link href="/terms" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', textDecoration: 'none' }}>이용약관</Link>
          <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', textDecoration: 'none' }}>개인정보처리방침</Link>
          <Link href="/refund" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', textDecoration: 'none' }}>환불정책</Link>
        </div>
      </footer>
    </div>
  )
}
