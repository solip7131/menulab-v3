'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import PhoneVerificationModal from '../../components/PhoneVerificationModal'

const SESSION_KEY = 'menulab_session'

export default function ProfilePage() {
  const [name,       setName]       = useState('')
  const [email,      setEmail]      = useState<string | null>(null)
  const [token,      setToken]      = useState<string | null>(null)
  const [phone,      setPhone]      = useState<string | null>(null)
  const [showVerify, setShowVerify] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return
    const { token: t, email: e, name: n } = JSON.parse(raw)
    setToken(t); setEmail(e); setName(n || '')
  }, [])

  useEffect(() => {
    if (!token) return
    fetch('/api/auth/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setPhone(d.phone ?? null))
  }, [token])

  const displayEmail = email?.startsWith('kakao:') ? email : (email ?? '')

  const formatPhone = (p: string) => {
    const d = p.replace(/\D/g, '')
    if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
    return p
  }

  if (!email) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Link href="/api/auth/kakao?returnTo=/mypage/profile" style={{ padding: '14px 28px', background: '#FEE500', borderRadius: '12px', fontWeight: 800, textDecoration: 'none', color: '#000' }}>카카오로 로그인</Link>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F4EF', fontFamily: 'Pretendard, sans-serif' }}>
      {/* 헤더 */}
      <div style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)', height: '56px', display: 'flex', alignItems: 'center', padding: '0 20px', position: 'sticky', top: 0, zIndex: 50 }}>
        <Link href="/mypage" style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#333', lineHeight: 1, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>‹</Link>
        <span style={{ fontSize: '16px', fontWeight: 700, color: '#111', marginLeft: '12px' }}>내 정보</span>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 20px' }}>

        {/* 계정 정보 */}
        <div style={{ background: '#fff', borderRadius: '18px', overflow: 'hidden', marginBottom: '12px' }}>
          <div style={{ padding: '22px 20px' }}>
            <p style={{ fontSize: '19px', fontWeight: 800, color: '#111', marginBottom: '6px' }}>{name} 님</p>
            <p style={{ fontSize: '13px', color: '#aaa' }}>{displayEmail}</p>
          </div>
        </div>

        {/* 휴대폰 번호 */}
        <div style={{ background: '#fff', borderRadius: '18px', overflow: 'hidden', marginBottom: '12px' }}>
          {/* 섹션 제목 */}
          <div style={{ padding: '18px 20px 12px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#aaa', letterSpacing: '0.5px' }}>휴대폰 번호</p>
            <p style={{ fontSize: '13px', color: '#888', marginTop: '4px', lineHeight: 1.5 }}>
              제작이 완료되면 카카오톡 알림톡으로 생성된 사진을 받을 수 있어요.
            </p>
          </div>

          {/* 등록된 번호 (비활성) */}
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', padding: '16px 20px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#ccc', marginBottom: '6px' }}>인증된 번호</p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: phone ? '#bbb' : '#ddd' }}>
              {phone ? formatPhone(phone) : '등록된 번호 없음'}
            </p>
          </div>

          {/* 수정하기 */}
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
            <button
              onClick={() => setShowVerify(true)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#222', marginBottom: '2px' }}>휴대폰 번호 수정하기</p>
                <p style={{ fontSize: '12px', color: '#aaa' }}>본인인증 후 인증한 번호로 자동 수정돼요.</p>
              </div>
              <span style={{ fontSize: '18px', color: '#ccc', flexShrink: 0 }}>›</span>
            </button>
          </div>
        </div>

      </div>

      {/* 전화번호 인증 모달 */}
      {showVerify && token && (
        <PhoneVerificationModal
          token={token}
          onVerified={() => {
            setShowVerify(false)
            fetch('/api/auth/profile', { headers: { Authorization: `Bearer ${token}` } })
              .then(r => r.json())
              .then(d => setPhone(d.phone ?? null))
          }}
          onSkip={() => setShowVerify(false)}
        />
      )}
    </div>
  )
}
