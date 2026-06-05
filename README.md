# 메뉴랩 웹사이트

촬영 없이 스튜디오급 메뉴사진을 만드는 서비스 — 최재이 매니저

## 시작하기

### 1. 패키지 설치
```bash
npm install
```

### 2. 환경변수 설정
```bash
cp .env.local.example .env.local
```
`.env.local` 파일을 열고 이메일 정보 입력:
- Gmail 사용 시 → Google 계정 → 보안 → 2단계 인증 → 앱 비밀번호 발급
- `SMTP_USER`: 본인 Gmail 주소
- `SMTP_PASS`: 앱 비밀번호 (16자리)
- `ADMIN_EMAIL`: 알림 받을 이메일

### 3. 개발 서버 실행
```bash
npm run dev
```
→ http://localhost:3000

### 4. 배포 (Vercel 추천 — 무료)
```bash
npm install -g vercel
vercel
```
Vercel 대시보드에서 환경변수 추가 후 완료.

---

## 페이지 구조

| URL | 설명 |
|-----|------|
| `/` | 메인 랜딩 페이지 |
| `/order` | 고객 주문 폼 (4단계) |
| `/admin` | 관리자 대시보드 |

## 자동화 흐름

```
고객이 /order 접속
  → 4단계 폼 작성 (메뉴명 / 구도 / 배경 / 사진업로드 / 연락처)
  → 주문 접수 시 → 재이님 이메일로 자동 알림 발송
    (고객 정보 + 주문 내용 + 업로드 사진 첨부)
  → /admin 에서 주문 현황 관리
  → 결제 링크 수동 발송 (추후 토스페이먼츠 자동화 가능)
```

## 다음 단계 자동화 로드맵

- [ ] 토스페이먼츠 결제 연동 (자동 결제 링크 발송)
- [ ] Supabase DB 연동 (주문 이력 저장)
- [ ] 나노바나나 API 연동 (자동 AI 처리)
- [ ] 카카오 알림톡 연동
- [ ] S3/Cloudflare R2 사진 저장소 연동

## 기술 스택

- **Frontend**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + Inline styles
- **Email**: Nodemailer (Gmail SMTP)
- **Deployment**: Vercel (추천)
