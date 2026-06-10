import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '메뉴랩 | 촬영 없이 스튜디오급 메뉴사진',
  description: '스마트폰 사진 한 장으로 스튜디오급 메뉴사진을 만들어드립니다. 자영업자와 프랜차이즈 브랜드를 위한 하이엔드 메뉴사진 제작 서비스.',
  keywords: '메뉴사진, 음식사진, 메뉴사진제작, 촬영없이, 자영업자, 프랜차이즈',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="preload" href="/hero-bg.jpg" as="image" fetchPriority="high" />
        <link rel="stylesheet" href="https://use.typekit.net/ouk6aqt.css" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
