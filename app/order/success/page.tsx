'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'

type Stage = 'confirming' | 'processing' | 'done' | 'error'

function SuccessPageInner() {
  const searchParams = useSearchParams()
  const paymentId = searchParams.get('paymentId')
  const orderType = searchParams.get('orderType') // 'sample' | 'full'
  const orderId = paymentId // paymentId = orderId (handlePayment에서 orderId를 paymentId로 사용)

  const [stage, setStage] = useState<Stage>('confirming')
  const [aiPhotoUrls, setAiPhotoUrls] = useState<string[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const processed = useRef(false)

  useEffect(() => {
    // React Strict Mode 이중 실행 방지
    if (processed.current) return
    processed.current = true

    if (!paymentId) {
      setErrorMsg('결제 정보가 올바르지 않아요.')
      setStage('error')
      return
    }

    ;(async () => {
      // 1. 결제 승인
      try {
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : '결제 승인에 실패했어요.')
        setStage('error')
        return
      }

      // 2. AI 처리 (첫주문 체험 + 본주문 모두 자동)
      setStage('processing')
      try {
        const aiRes = await fetch('/api/ai-process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        })
        const aiData = await aiRes.json()

        if (aiData.success && aiData.aiPhotoUrls?.length > 0) {
          setAiPhotoUrls(aiData.aiPhotoUrls)
          setStage('done')
        } else {
          throw new Error(aiData.error || 'AI 처리 결과가 없어요.')
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'AI 처리 중 오류가 생겼어요.'
        setErrorMsg(`AI 처리 실패: ${msg}\n카카오톡으로 문의해주세요.`)
        setStage('error')
      }
    })()
  }, [paymentId, orderId])

  if (stage === 'confirming') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)' }}>
        <div style={{ textAlign: 'center', padding: '0 24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px', display: 'inline-block', animation: 'spin 1.2s linear infinite' }}>⏳</div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, marginBottom: '8px' }}>결제를 확인하는 중이에요</h2>
          <p style={{ color: '#888', fontSize: '15px' }}>잠시만 기다려주세요...</p>
        </div>
      </div>
    )
  }

  if (stage === 'processing') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '0 24px' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px', animation: 'pulse 1.5s ease-in-out infinite' }}>✨</div>
          <h2 style={{ fontSize: '26px', fontWeight: 900, marginBottom: '12px', letterSpacing: '-0.5px' }}>AI가 사진을 처리하고 있어요</h2>
          <p style={{ color: '#666', lineHeight: 1.8, marginBottom: '32px', fontSize: '15px' }}>
            전문 음식 촬영 스타일로 변환 중입니다.<br />
            최대 60초 정도 소요될 수 있어요.
          </p>
          <div style={{ background: 'rgba(0,0,0,0.08)', borderRadius: '100px', height: '6px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--orange)', borderRadius: '100px', animation: 'progressBar 55s linear forwards' }} />
          </div>
          <p style={{ color: '#aaa', fontSize: '13px', marginTop: '12px' }}>결제가 완료됐어요. 결과물을 만드는 중입니다.</p>
        </div>
      </div>
    )
  }

  if (stage === 'error') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '480px' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>😢</div>
          <h2 style={{ fontSize: '26px', fontWeight: 900, marginBottom: '12px' }}>문제가 생겼어요</h2>
          <p style={{ color: '#666', marginBottom: '32px', lineHeight: 1.7, fontSize: '15px' }}>{errorMsg}</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="https://open.kakao.com/o/menulab"
              target="_blank"
              rel="noopener noreferrer"
              style={{ padding: '14px 24px', borderRadius: '100px', background: '#FEE500', color: '#000', fontWeight: 700, fontSize: '15px', textDecoration: 'none' }}
            >
              카카오톡으로 문의
            </a>
            <Link href="/" style={{ padding: '14px 24px', borderRadius: '100px', border: '2px solid rgba(0,0,0,0.1)', color: 'var(--black)', fontWeight: 700, fontSize: '15px', textDecoration: 'none', background: '#fff' }}>
              홈으로
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // done — AI 결과 표시
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '0 5vw', height: '64px', display: 'flex', alignItems: 'center' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="https://i.ibb.co/YF3csF80/image.png" alt="메뉴랩" style={{ height: '54px', width: 'auto' }} />
        </Link>
      </div>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '48px 5vw 80px' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '48px', animation: 'fadeUp 0.6s ease' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>✨</div>
          <h2 style={{ fontSize: '32px', fontWeight: 900, marginBottom: '12px', letterSpacing: '-1px' }}>
            AI 처리가 완료됐어요!
          </h2>
          <p style={{ color: '#666', fontSize: '16px', lineHeight: 1.7 }}>
            결과물을 확인하고 저장해주세요.<br />
            만족스러우셨다면 본 주문도 진행해보세요!
          </p>
        </div>

        {/* 결과 사진 그리드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '48px' }}>
          {aiPhotoUrls.map((url, i) => (
            <div key={i} style={{ borderRadius: '16px', overflow: 'hidden', background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', animation: `fadeUp 0.5s ease ${i * 0.1}s both` }}>
              <img
                src={url}
                alt={`AI 결과 ${i + 1}`}
                style={{ width: '100%', aspectRatio: '3/2', objectFit: 'cover', display: 'block' }}
              />
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#888' }}>결과 {i + 1}</span>
                <a
                  href={url}
                  download={`menulab_${i + 1}.jpg`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ padding: '7px 16px', borderRadius: '100px', background: 'var(--orange)', color: '#fff', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}
                >
                  저장
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', textAlign: 'center', border: '1px solid rgba(0,0,0,0.08)', animation: 'fadeUp 0.6s ease 0.3s both' }}>
          <h3 style={{ fontSize: '22px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.5px' }}>
            마이페이지에서 결과물을 관리하세요
          </h3>
          <p style={{ color: '#666', fontSize: '15px', marginBottom: '24px', lineHeight: 1.7 }}>
            모든 AI 처리 결과물을 마이페이지에서 언제든 확인할 수 있어요.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/mypage"
              style={{ display: 'inline-block', padding: '16px 32px', borderRadius: '100px', background: 'var(--orange)', color: '#fff', fontSize: '16px', fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 20px rgba(255,92,0,0.3)' }}
            >
              마이페이지 바로가기 →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#888' }}>로딩 중...</p>
      </div>
    }>
      <SuccessPageInner />
    </Suspense>
  )
}
