'use client'

import { useState, useEffect } from 'react'

interface Props {
  token:      string
  onVerified: () => void
  onSkip:     () => void
}

export default function PhoneVerificationModal({ token, onVerified, onSkip }: Props) {
  const [step,    setStep]    = useState<'phone' | 'code'>('phone')
  const [phone,   setPhone]   = useState('')
  const [code,    setCode]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)

  useEffect(() => {
    if (timeLeft <= 0) return
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(id)
  }, [timeLeft])

  const formatPhone = (val: string) => {
    const d = val.replace(/\D/g, '').slice(0, 11)
    if (d.length <= 3) return d
    if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
  }

  const handleSendCode = async () => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) { setError('올바른 전화번호를 입력해주세요.'); return }
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '발송 실패')
      setStep('code')
      setTimeLeft(180)
    } catch (e: any) {
      setError(e?.message || '인증번호 발송에 실패했어요.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (code.length !== 6) { setError('6자리 인증번호를 입력해주세요.'); return }
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ phone, code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '인증 실패')
      onVerified()
    } catch (e: any) {
      setError(e?.message || '인증번호가 틀렸어요.')
    } finally {
      setLoading(false)
    }
  }

  const min = Math.floor(timeLeft / 60)
  const sec = timeLeft % 60

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
      padding: '16px',
    }}>
      <div style={{
        background: '#fff', borderRadius: '24px',
        width: '100%', maxWidth: '360px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '28px 24px 0' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', marginBottom: '16px' }}>
            📱
          </div>
          <h3 style={{ fontSize: '19px', fontWeight: 900, color: 'var(--black)', letterSpacing: '-0.3px', marginBottom: '7px' }}>
            {step === 'phone' ? '휴대폰 번호 인증' : '인증번호 입력'}
          </h3>
          <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.65, marginBottom: '20px', whiteSpace: 'pre-line' }}>
            {step === 'phone'
              ? '알림톡 수신을 위해\n1회만 인증하면 다음부터 자동으로 사용돼요.'
              : `${phone}으로 발송된\n6자리 인증번호를 입력해주세요.`}
          </p>
        </div>

        <div style={{ padding: '0 24px 24px' }}>
          {step === 'phone' ? (
            <>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(formatPhone(e.target.value))}
                placeholder="010-0000-0000"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleSendCode() }}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '14px 16px', borderRadius: '12px',
                  border: `1.5px solid ${error ? '#ef4444' : 'rgba(0,0,0,0.12)'}`,
                  fontSize: '17px', fontWeight: 600, letterSpacing: '1px',
                  outline: 'none', marginBottom: '8px', color: 'var(--black)',
                }}
              />
              {error && (
                <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '8px' }}>{error}</p>
              )}
              <button
                onClick={handleSendCode}
                disabled={loading}
                style={{
                  width: '100%', padding: '15px', borderRadius: '12px', marginBottom: '10px',
                  background: loading ? '#93c5fd' : '#2563eb',
                  color: '#fff', fontWeight: 800, fontSize: '15px',
                  border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? '발송 중...' : '인증번호 받기'}
              </button>
            </>
          ) : (
            <>
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  autoFocus
                  maxLength={6}
                  onKeyDown={e => { if (e.key === 'Enter') handleVerify() }}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '14px 70px 14px 16px', borderRadius: '12px',
                    border: `1.5px solid ${error ? '#ef4444' : 'rgba(0,0,0,0.12)'}`,
                    fontSize: '22px', fontWeight: 700, letterSpacing: '6px',
                    outline: 'none', color: 'var(--black)',
                  }}
                />
                {timeLeft > 0 && (
                  <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: 700, color: '#ef4444' }}>
                    {min}:{String(sec).padStart(2, '0')}
                  </span>
                )}
              </div>
              {timeLeft === 0 && (
                <p style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
                  인증번호가 만료됐어요.{' '}
                  <button
                    onClick={() => { setStep('phone'); setCode(''); setError(null) }}
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: '13px' }}
                  >
                    다시 받기
                  </button>
                </p>
              )}
              {error && (
                <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '8px' }}>{error}</p>
              )}
              <button
                onClick={handleVerify}
                disabled={loading || timeLeft === 0}
                style={{
                  width: '100%', padding: '15px', borderRadius: '12px', marginBottom: '10px',
                  background: loading || timeLeft === 0 ? '#e5e7eb' : '#2563eb',
                  color:  loading || timeLeft === 0 ? '#9ca3af' : '#fff',
                  fontWeight: 800, fontSize: '15px',
                  border: 'none', cursor: loading || timeLeft === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? '확인 중...' : '확인'}
              </button>
            </>
          )}

          <button
            onClick={onSkip}
            style={{
              width: '100%', padding: '12px',
              background: 'none', border: 'none',
              color: '#bbb', fontSize: '13px', fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            나중에 하기
          </button>
        </div>
      </div>
    </div>
  )
}
