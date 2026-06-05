'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'

function FailPageInner() {
  const searchParams = useSearchParams()
  const code = searchParams.get('code')
  const message = searchParams.get('message')

  const isCancelled = code === 'PAY_PROCESS_CANCELED'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)', padding: '24px' }}>
      <div style={{ textAlign: 'center', maxWidth: '480px', animation: 'fadeUp 0.5s ease' }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>
          {isCancelled ? '🙅' : '😢'}
        </div>
        <h2 style={{ fontSize: '26px', fontWeight: 900, marginBottom: '12px' }}>
          {isCancelled ? '결제를 취소했어요' : '결제에 실패했어요'}
        </h2>
        <p style={{ color: '#666', marginBottom: '8px', fontSize: '15px', lineHeight: 1.7 }}>
          {isCancelled
            ? '결제를 취소하셨어요. 다시 시도하시거나 카카오톡으로 문의해주세요.'
            : message || '결제 처리 중 오류가 발생했어요. 다시 시도해주세요.'}
        </p>
        {code && !isCancelled && (
          <p style={{ color: '#bbb', fontSize: '12px', marginBottom: '32px' }}>오류 코드: {code}</p>
        )}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '24px' }}>
          <Link
            href="/order"
            style={{ padding: '14px 28px', borderRadius: '100px', background: 'var(--orange)', color: '#fff', fontWeight: 700, fontSize: '15px', textDecoration: 'none', boxShadow: '0 4px 16px rgba(255,92,0,0.3)' }}
          >
            다시 시도하기
          </Link>
          <a
            href="https://open.kakao.com/o/menulab"
            target="_blank"
            rel="noopener noreferrer"
            style={{ padding: '14px 28px', borderRadius: '100px', background: '#FEE500', color: '#000', fontWeight: 700, fontSize: '15px', textDecoration: 'none' }}
          >
            카카오톡 문의
          </a>
        </div>
        <Link href="/" style={{ display: 'block', marginTop: '20px', color: '#aaa', fontSize: '14px', textDecoration: 'none' }}>
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  )
}

export default function FailPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#888' }}>로딩 중...</p>
      </div>
    }>
      <FailPageInner />
    </Suspense>
  )
}
