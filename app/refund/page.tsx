import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '환불정책 | 메뉴랩',
  description: '메뉴랩 취소 및 환불정책',
}

export default function RefundPage() {
  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      <nav style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '0 5vw', display: 'flex', alignItems: 'center', height: '60px' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="https://i.ibb.co/YF3csF80/image.png" alt="메뉴랩" style={{ height: '40px', width: 'auto' }} />
        </Link>
      </nav>

      <main style={{ maxWidth: '780px', margin: '0 auto', padding: '60px 5vw 100px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.5px' }}>환불정책</h1>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '48px' }}>최종 수정일: 2026년 6월 5일</p>

        <div style={{ marginBottom: '40px' }}>
          <p style={{ color: '#000', fontWeight: 700, fontSize: '15px', lineHeight: 1.7 }}>
            메뉴랩은 AI 처리 기반 서비스이므로, AI 작업이 시작된 이후에는 환불이 불가합니다. 주문 전 제공하는 무료 젬으로 퀄리티를 미리 확인하시길 권장합니다.
          </p>
        </div>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>취소·환불 가능 기준</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '20px 24px' }}>
              <p style={{ color: '#2a7a2a', fontWeight: 800, fontSize: '15px', marginBottom: '8px' }}>취소 가능</p>
              <ul style={{ color: '#444', fontSize: '14px', lineHeight: 1.8, paddingLeft: '0', margin: 0, listStyle: 'none' }}>
                <li style={{ marginBottom: '6px', display: 'flex', gap: '8px' }}><span style={{ color: '#000', fontWeight: 700, flexShrink: 0 }}>•</span>결제 완료 후 AI 작업 시작 전 취소 요청 시</li>
                <li style={{ marginBottom: '6px', display: 'flex', gap: '8px' }}><span style={{ color: '#000', fontWeight: 700, flexShrink: 0 }}>•</span>회사의 귀책 사유(시스템 오류, 서비스 불가 등)로 작업이 불가능한 경우</li>
                <li style={{ display: 'flex', gap: '8px' }}><span style={{ color: '#000', fontWeight: 700, flexShrink: 0 }}>•</span>업로드 사진이 작업 불가(심한 흔들림, 플래시 과다 등)로 판정된 경우 — 새 사진 제공 또는 전액 환불 중 선택</li>
              </ul>
            </div>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '20px 24px' }}>
              <p style={{ color: '#c94400', fontWeight: 800, fontSize: '15px', marginBottom: '8px' }}>취소 불가 (환불 불가)</p>
              <ul style={{ color: '#444', fontSize: '14px', lineHeight: 1.8, paddingLeft: '0', margin: 0, listStyle: 'none' }}>
                <li style={{ marginBottom: '6px', display: 'flex', gap: '8px' }}><span style={{ color: '#000', fontWeight: 700, flexShrink: 0 }}>•</span>AI 처리 작업이 시작된 이후</li>
                <li style={{ marginBottom: '6px', display: 'flex', gap: '8px' }}><span style={{ color: '#000', fontWeight: 700, flexShrink: 0 }}>•</span>초기 컨펌(3컷) 확인 후 작업 진행이 시작된 경우</li>
                <li style={{ marginBottom: '6px', display: 'flex', gap: '8px' }}><span style={{ color: '#000', fontWeight: 700, flexShrink: 0 }}>•</span>결과물 납품 완료 후</li>
                <li style={{ display: 'flex', gap: '8px' }}><span style={{ color: '#000', fontWeight: 700, flexShrink: 0 }}>•</span>단순 변심으로 인한 취소 (AI 처리 시작 후)</li>
              </ul>
            </div>
          </div>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>작업 진행 단계별 환불 기준</h2>
          <div style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>단계</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>상태</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>환불 여부</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <td style={{ padding: '12px 16px', color: '#444', fontWeight: 600 }}>결제 완료</td>
                  <td style={{ padding: '12px 16px', color: '#444' }}>AI 작업 시작 전</td>
                  <td style={{ padding: '12px 16px', color: '#2a7a2a', fontWeight: 700 }}>전액 환불 가능</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <td style={{ padding: '12px 16px', color: '#444', fontWeight: 600 }}>AI 작업 시작</td>
                  <td style={{ padding: '12px 16px', color: '#444' }}>초기 3컷 작업 중</td>
                  <td style={{ padding: '12px 16px', color: '#c94400', fontWeight: 700 }}>환불 불가</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <td style={{ padding: '12px 16px', color: '#444', fontWeight: 600 }}>초기 컨펌</td>
                  <td style={{ padding: '12px 16px', color: '#444' }}>3컷 확인 후 진행 승인</td>
                  <td style={{ padding: '12px 16px', color: '#c94400', fontWeight: 700 }}>환불 불가</td>
                </tr>
                <tr>
                  <td style={{ padding: '12px 16px', color: '#444', fontWeight: 600 }}>납품 완료</td>
                  <td style={{ padding: '12px 16px', color: '#444' }}>전체 결과물 전달 완료</td>
                  <td style={{ padding: '12px 16px', color: '#c94400', fontWeight: 700 }}>환불 불가</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>


        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>환불 신청 방법</h2>
          <p style={{ color: '#444', fontSize: '15px', lineHeight: 1.8, marginBottom: '12px' }}>
            취소 및 환불을 원하시면 아래 연락처로 문의해 주세요. 환불 승인 후 영업일 기준 3~5일 내 결제 수단으로 환불이 처리됩니다.
          </p>
          <div style={{ background: '#f9f9f9', borderRadius: '12px', padding: '20px 24px' }}>
            <p style={{ color: '#444', fontSize: '15px', lineHeight: 1.8 }}>
              이메일: solip7131@gmail.com<br />
              전화: 010-5892-4221<br />
              카카오톡: jymanager
            </p>
          </div>
          <p style={{ color: '#888', fontSize: '13px', marginTop: '12px', lineHeight: 1.7 }}>
            * 환불 신청 시 주문번호, 주문자명, 환불 사유를 함께 알려주시면 더 빠른 처리가 가능합니다.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>소비자 분쟁 해결 기준</h2>
          <p style={{ color: '#444', fontSize: '15px', lineHeight: 1.8 }}>
            본 환불정책에서 정하지 않은 사항은 공정거래위원회 고시 「소비자 분쟁 해결 기준」 및 관계 법령에 따릅니다.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>사업자 정보</h2>
          <div style={{ background: '#f9f9f9', borderRadius: '12px', padding: '20px 24px' }}>
            <p style={{ color: '#444', fontSize: '15px', lineHeight: 1.8 }}>
              상호명: 메뉴랩<br />
              대표자: 최재이<br />
              사업자등록번호: 331-39-01242<br />
              주소: 화성시 동탄구 동탄대로 676, 힐스테이트동탄역멀티플라이어 오피스 406호<br />
              전화: 010-5892-4221<br />
              이메일: solip7131@gmail.com
            </p>
          </div>
        </section>
      </main>

      <footer style={{ background: '#111', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 5vw' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <Link href="/terms" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', textDecoration: 'none' }}>이용약관</Link>
          <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', textDecoration: 'none' }}>개인정보처리방침</Link>
          <Link href="/refund" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', textDecoration: 'none' }}>환불정책</Link>
        </div>
      </footer>
    </div>
  )
}
