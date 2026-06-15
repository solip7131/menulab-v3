'use client'

import { useState } from 'react'

const PACKAGES = [
  { id: 'gem10',  gems: 10,  won: 5900,  photos: 1,  label: '10젬',  badge: '' },
  { id: 'gem50',  gems: 50,  won: 24900, photos: 5,  label: '50젬',  badge: '' },
  { id: 'gem100', gems: 100, won: 44900, photos: 10, label: '100젬', badge: '⭐ 가장 인기' },
  { id: 'gem300', gems: 300, won: 99000, photos: 30, label: '300젬', badge: '' },
]

interface Props {
  shortfall:  number
  userEmail:  string
  onClose:    () => void
  onSuccess?: () => void
}

export default function CoinChargeModal({ shortfall, onClose }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error,   setError]   = useState<string | null>(null)

  const handleCharge = async (packageId: string) => {
    setLoading(packageId)
    setError(null)

    // 팝업을 즉시 열어 팝업 차단 방지 + 빠른 반응
    const popup = window.open('about:blank', '_blank', 'width=480,height=700')

    try {
      const token = (() => {
        try { return JSON.parse(localStorage.getItem('menulab_session') ?? '{}').token ?? '' } catch { return '' }
      })()

      const res  = await fetch('/api/payapp/create-link', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ packageId }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || '결제 링크 생성 실패')

      if (popup) popup.location.href = data.url
      else window.open(data.url, '_blank', 'width=480,height=700')
      onClose()
    } catch (e: any) {
      popup?.close()
      setError(e?.message || '오류가 발생했어요. 다시 시도해주세요.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        padding: '16px',
      }}
    >
      <div style={{
        background: '#fff', borderRadius: '24px',
        width: '100%', maxWidth: '400px', maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 22px 14px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: '10px', color: '#2563eb', fontWeight: 700, letterSpacing: '2px', marginBottom: '3px' }}>GEM CHARGE</p>
            <h3 style={{ fontSize: '17px', fontWeight: 900, color: 'var(--black)', letterSpacing: '-0.3px' }}>💎 젬 충전하기</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '26px', cursor: 'pointer', color: '#bbb', lineHeight: 1, padding: '4px' }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px' }}>
          {shortfall > 0 && (
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '12px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#dc2626', fontWeight: 600 }}>
              💡 {shortfall}젬이 부족해요. 아래에서 충전하세요.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {PACKAGES.map(pkg => (
              <div
                key={pkg.id}
                style={{
                  position: 'relative',
                  border: pkg.badge ? '2px solid #2563eb' : '1.5px solid rgba(0,0,0,0.08)',
                  borderRadius: '16px',
                  padding: pkg.badge ? '18px 16px 14px' : '14px 16px',
                  background: pkg.badge ? 'rgba(37,99,235,0.03)' : '#fff',
                }}
              >
                {pkg.badge && (
                  <div style={{ position: 'absolute', top: '-1px', left: '14px', background: '#2563eb', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '2px 10px', borderRadius: '0 0 8px 8px' }}>{pkg.badge}</div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                      <span style={{ fontWeight: 900, fontSize: '16px', color: 'var(--black)' }}>💎 {pkg.label}</span>
                      <span style={{ fontSize: '12px', color: '#888' }}>사진 {pkg.photos}장</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                      <span style={{ fontWeight: 900, fontSize: '20px', color: 'var(--black)', letterSpacing: '-0.5px' }}>₩{pkg.won.toLocaleString()}</span>
                      <span style={{ fontSize: '12px', color: '#aaa' }}>일회성</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCharge(pkg.id)}
                    disabled={loading === pkg.id}
                    style={{
                      padding: '10px 18px', borderRadius: '12px',
                      background: pkg.badge ? '#2563eb' : 'var(--black)',
                      color: '#fff', fontWeight: 700, fontSize: '13px',
                      border: 'none', cursor: loading === pkg.id ? 'not-allowed' : 'pointer',
                      opacity: loading === pkg.id ? 0.6 : 1,
                      flexShrink: 0,
                    }}
                  >
                    {loading === pkg.id ? '...' : '충전하기'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '12px', textAlign: 'center' }}>{error}</p>
          )}

          <p style={{ textAlign: 'center', fontSize: '11px', color: '#ccc', marginTop: '14px', lineHeight: 1.6 }}>
            결제 완료 후 젬이 자동으로 충전돼요<br />
            구독 없이 필요할 때만 충전하세요
          </p>
        </div>
      </div>
    </div>
  )
}
