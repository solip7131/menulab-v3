import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '이용약관 | 메뉴랩',
  description: '메뉴랩 AI 메뉴사진 제작 서비스 이용약관',
}

export default function TermsPage() {
  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      <nav style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '0 5vw', display: 'flex', alignItems: 'center', height: '60px' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="https://i.ibb.co/YF3csF80/image.png" alt="메뉴랩" style={{ height: '40px', width: 'auto' }} />
        </Link>
      </nav>

      <main style={{ maxWidth: '780px', margin: '0 auto', padding: '60px 5vw 100px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.5px' }}>이용약관</h1>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '48px' }}>최종 수정일: 2025년 1월 1일</p>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>제1조 (목적)</h2>
          <p style={{ color: '#444', fontSize: '15px', lineHeight: 1.8 }}>
            본 약관은 히트미디어(이하 "회사")가 운영하는 메뉴랩(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리·의무 및 책임 사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>제2조 (정의)</h2>
          <ul style={{ color: '#444', fontSize: '15px', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>"서비스"란 이용자가 제공한 음식 사진을 AI 기반 기술로 보정·재구성하여 고퀄리티 메뉴 사진으로 제작해주는 메뉴랩의 AI 메뉴사진 제작 서비스를 말합니다.</li>
            <li style={{ marginBottom: '8px' }}>"이용자"란 본 약관에 동의하고 서비스를 이용하는 개인 또는 법인을 말합니다.</li>
            <li style={{ marginBottom: '8px' }}>"결과물"이란 회사가 이용자의 원본 사진을 기반으로 AI 처리하여 납품하는 완성된 메뉴 사진을 말합니다.</li>
            <li style={{ marginBottom: '8px' }}>"원본 사진"이란 이용자가 서비스 이용을 위해 회사에 제공하는 음식 사진 파일을 말합니다.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>제3조 (약관의 효력 및 변경)</h2>
          <p style={{ color: '#444', fontSize: '15px', lineHeight: 1.8, marginBottom: '12px' }}>
            본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다. 회사는 합리적인 사유가 발생할 경우 약관을 변경할 수 있으며, 변경된 약관은 공지 후 7일 이후부터 효력이 발생합니다.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>제4조 (서비스 내용)</h2>
          <p style={{ color: '#444', fontSize: '15px', lineHeight: 1.8, marginBottom: '12px' }}>회사가 제공하는 서비스는 다음과 같습니다.</p>
          <ul style={{ color: '#444', fontSize: '15px', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>AI 기반 메뉴 사진 색감·배경·조명 보정 및 재구성</li>
            <li style={{ marginBottom: '8px' }}>단품 컷, 모음컷 등 다양한 구성의 메뉴 사진 제작</li>
            <li style={{ marginBottom: '8px' }}>브랜드 소품(명함, 깃발 등) 합성 서비스</li>
            <li style={{ marginBottom: '8px' }}>배달앱·SNS 등 활용 목적의 메뉴 사진 납품</li>
          </ul>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>제5조 (주문 및 결제)</h2>
          <ul style={{ color: '#444', fontSize: '15px', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>이용자는 서비스 내 주문 페이지에서 제작 컷 수, 구도, 배경 등을 선택하여 주문할 수 있습니다.</li>
            <li style={{ marginBottom: '8px' }}>결제는 토스페이먼츠(신용카드, 계좌이체 등)를 통해 이루어집니다.</li>
            <li style={{ marginBottom: '8px' }}>결제 완료 후 작업이 시작되며, 평균 2~5영업일 이내에 결과물이 납품됩니다.</li>
            <li style={{ marginBottom: '8px' }}>본 제작의 경우 초기 3컷 컨펌 후 나머지 작업이 진행됩니다.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>제6조 (취소 및 환불)</h2>
          <p style={{ color: '#444', fontSize: '15px', lineHeight: 1.8 }}>
            취소 및 환불에 관한 사항은 별도의 <Link href="/refund" style={{ color: '#FF5C00', textDecoration: 'underline' }}>환불정책</Link>에 따릅니다.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>제7조 (이용자의 의무)</h2>
          <ul style={{ color: '#444', fontSize: '15px', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>이용자는 타인의 저작권을 침해하는 사진을 제공해서는 안 됩니다.</li>
            <li style={{ marginBottom: '8px' }}>이용자는 허위 정보를 제공하거나 서비스를 부정한 방법으로 이용해서는 안 됩니다.</li>
            <li style={{ marginBottom: '8px' }}>이용자는 결과물을 상업적 목적으로 사용할 수 있으며, 이에 따른 법적 책임은 이용자에게 있습니다.</li>
            <li style={{ marginBottom: '8px' }}>이용자는 결과물이 AI 처리된 보정 이미지임을 인지하고, 실제 제공 음식과 현저히 다르게 표시·광고하지 않아야 합니다.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>제8조 (지식재산권)</h2>
          <ul style={{ color: '#444', fontSize: '15px', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>결제 완료 및 납품 이후 결과물의 저작권은 이용자에게 귀속됩니다.</li>
            <li style={{ marginBottom: '8px' }}>회사는 서비스 홍보 목적으로 포트폴리오에 결과물 일부를 활용할 수 있습니다. 이를 원하지 않을 경우 주문 시 별도로 요청해 주세요.</li>
            <li style={{ marginBottom: '8px' }}>원본 사진의 저작권은 이용자에게 있으며, 회사는 서비스 제공 목적 외에 원본 사진을 사용하지 않습니다.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>제9조 (서비스 제한 및 중단)</h2>
          <p style={{ color: '#444', fontSize: '15px', lineHeight: 1.8 }}>
            회사는 시스템 점검, 장애, 천재지변 등 불가피한 사유 발생 시 서비스 제공을 일시 중단할 수 있으며, 이 경우 회사는 사전 공지를 원칙으로 합니다.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>제10조 (분쟁 해결)</h2>
          <p style={{ color: '#444', fontSize: '15px', lineHeight: 1.8 }}>
            서비스 이용 관련 분쟁이 발생한 경우 회사와 이용자는 상호 협의를 통해 해결을 위해 노력합니다. 협의가 이루어지지 않을 경우 관할 법원은 회사 소재지를 관할하는 법원으로 합니다.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>제11조 (연락처)</h2>
          <div style={{ background: '#f9f9f9', borderRadius: '12px', padding: '20px 24px' }}>
            <p style={{ color: '#444', fontSize: '15px', lineHeight: 1.8 }}>
              상호명: 히트미디어<br />
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
