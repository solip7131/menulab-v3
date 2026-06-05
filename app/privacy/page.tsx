import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '개인정보처리방침 | 메뉴랩',
  description: '메뉴랩 개인정보처리방침',
}

export default function PrivacyPage() {
  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      <nav style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '0 5vw', display: 'flex', alignItems: 'center', height: '60px' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="https://i.ibb.co/YF3csF80/image.png" alt="메뉴랩" style={{ height: '40px', width: 'auto' }} />
        </Link>
      </nav>

      <main style={{ maxWidth: '780px', margin: '0 auto', padding: '60px 5vw 100px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.5px' }}>개인정보처리방침</h1>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '48px' }}>최종 수정일: 2025년 1월 1일</p>

        <p style={{ color: '#444', fontSize: '15px', lineHeight: 1.8, marginBottom: '40px' }}>
          히트미디어(이하 "회사")는 메뉴랩 서비스(이하 "서비스") 이용자의 개인정보를 중요시하며, 「개인정보 보호법」을 준수합니다. 본 방침은 회사가 수집하는 개인정보의 항목, 수집 목적, 보유 기간 및 처리 방법에 대해 안내합니다.
        </p>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>제1조 (수집하는 개인정보 항목 및 수집 목적)</h2>
          <div style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>수집 항목</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>수집 목적</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>보유 기간</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <td style={{ padding: '12px 16px', color: '#444' }}>이메일 주소</td>
                  <td style={{ padding: '12px 16px', color: '#444' }}>주문 확인, 결과물 전달, 서비스 안내</td>
                  <td style={{ padding: '12px 16px', color: '#444' }}>서비스 이용 종료 후 3년</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <td style={{ padding: '12px 16px', color: '#444' }}>전화번호</td>
                  <td style={{ padding: '12px 16px', color: '#444' }}>주문 확인, 작업 관련 소통, 결과물 전달</td>
                  <td style={{ padding: '12px 16px', color: '#444' }}>서비스 이용 종료 후 3년</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <td style={{ padding: '12px 16px', color: '#444' }}>업로드된 음식 사진</td>
                  <td style={{ padding: '12px 16px', color: '#444' }}>AI 메뉴사진 제작 (서비스 핵심 기능)</td>
                  <td style={{ padding: '12px 16px', color: '#444' }}>결과물 납품 완료 후 30일</td>
                </tr>
                <tr>
                  <td style={{ padding: '12px 16px', color: '#444' }}>주문 정보 (메뉴명, 구도, 배경 요청 등)</td>
                  <td style={{ padding: '12px 16px', color: '#444' }}>서비스 제공 및 품질 관리</td>
                  <td style={{ padding: '12px 16px', color: '#444' }}>서비스 이용 종료 후 3년</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ color: '#666', fontSize: '13px', lineHeight: 1.7 }}>
            * 결제 정보(카드번호 등)는 토스페이먼츠가 직접 수집·처리하며 회사는 해당 정보를 저장하지 않습니다.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>제2조 (개인정보 수집 방법)</h2>
          <ul style={{ color: '#444', fontSize: '15px', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>서비스 주문 페이지에서 이용자가 직접 입력</li>
            <li style={{ marginBottom: '8px' }}>서비스 이용 과정에서 파일 업로드를 통한 수집</li>
          </ul>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>제3조 (개인정보의 처리 및 보유)</h2>
          <p style={{ color: '#444', fontSize: '15px', lineHeight: 1.8, marginBottom: '12px' }}>
            회사는 수집된 개인정보를 서비스 제공 목적 이외의 용도로 사용하지 않습니다. 보유 기간이 경과하거나 처리 목적이 달성된 경우 해당 개인정보를 지체 없이 파기합니다.
          </p>
          <p style={{ color: '#444', fontSize: '15px', lineHeight: 1.8 }}>
            단, 관련 법령에 따라 보존이 필요한 경우에는 해당 기간 동안 보관합니다.
          </p>
          <ul style={{ color: '#666', fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', marginTop: '12px' }}>
            <li style={{ marginBottom: '6px' }}>전자상거래 등에서의 소비자 보호에 관한 법률: 계약 또는 청약철회 기록 5년, 대금결제 및 재화 공급 기록 5년</li>
            <li>통신비밀보호법: 서비스 방문 기록 3개월</li>
          </ul>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>제4조 (개인정보의 제3자 제공)</h2>
          <p style={{ color: '#444', fontSize: '15px', lineHeight: 1.8, marginBottom: '12px' }}>
            회사는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 단, 다음의 경우는 예외입니다.
          </p>
          <ul style={{ color: '#444', fontSize: '15px', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>이용자가 사전에 동의한 경우</li>
            <li style={{ marginBottom: '8px' }}>법령에 따라 수사기관 등이 요청한 경우</li>
          </ul>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>제5조 (개인정보 처리 위탁)</h2>
          <div style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>수탁업체</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>위탁 업무</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <td style={{ padding: '12px 16px', color: '#444' }}>토스페이먼츠(주)</td>
                  <td style={{ padding: '12px 16px', color: '#444' }}>결제 처리</td>
                </tr>
                <tr>
                  <td style={{ padding: '12px 16px', color: '#444' }}>Vercel Inc.</td>
                  <td style={{ padding: '12px 16px', color: '#444' }}>서비스 호스팅 및 파일 저장</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>제6조 (이용자의 권리)</h2>
          <p style={{ color: '#444', fontSize: '15px', lineHeight: 1.8, marginBottom: '12px' }}>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
          <ul style={{ color: '#444', fontSize: '15px', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>개인정보 처리 현황 열람 요청</li>
            <li style={{ marginBottom: '8px' }}>오류가 있는 개인정보 정정 요청</li>
            <li style={{ marginBottom: '8px' }}>개인정보 삭제 요청</li>
            <li style={{ marginBottom: '8px' }}>개인정보 처리 정지 요청</li>
          </ul>
          <p style={{ color: '#444', fontSize: '15px', lineHeight: 1.8, marginTop: '12px' }}>
            권리 행사는 이메일(solip7131@gmail.com) 또는 전화(010-5892-4221)로 요청할 수 있으며, 회사는 지체 없이 조치합니다.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>제7조 (개인정보 보호책임자)</h2>
          <div style={{ background: '#f9f9f9', borderRadius: '12px', padding: '20px 24px' }}>
            <p style={{ color: '#444', fontSize: '15px', lineHeight: 1.8 }}>
              이름: 최재이<br />
              직책: 대표<br />
              이메일: solip7131@gmail.com<br />
              전화: 010-5892-4221
            </p>
          </div>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>제8조 (개인정보 파기 방법)</h2>
          <ul style={{ color: '#444', fontSize: '15px', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>전자적 파일 형태: 복구 불가능한 방법으로 영구 삭제</li>
            <li style={{ marginBottom: '8px' }}>출력물 등 비전자적 형태: 분쇄기로 분쇄하거나 소각</li>
          </ul>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>제9조 (개인정보 침해 신고)</h2>
          <p style={{ color: '#444', fontSize: '15px', lineHeight: 1.8 }}>
            개인정보 침해에 관한 신고나 상담은 아래 기관에 문의하실 수 있습니다.
          </p>
          <ul style={{ color: '#444', fontSize: '15px', lineHeight: 1.8, paddingLeft: '20px', marginTop: '12px' }}>
            <li style={{ marginBottom: '8px' }}>개인정보 침해신고센터: privacy.kisa.or.kr / 국번없이 118</li>
            <li style={{ marginBottom: '8px' }}>개인정보 분쟁조정위원회: www.kopico.go.kr / 1833-6972</li>
            <li>대검찰청 사이버수사과: www.spo.go.kr / 1301</li>
          </ul>
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
