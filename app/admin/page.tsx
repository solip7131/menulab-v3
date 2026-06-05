'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const getSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Order {
  id: string
  created_at: string
  order_type: string
  cut_count: string
  menu_names: string
  angle: string
  background: string
  vessel_info: string
  customer_name: string
  customer_phone: string
  customer_email: string
  notes: string
  photo_urls: string[]
  ai_photo_urls: string[]
  status: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: '접수됨', color: '#FF9500' },
  ai_done: { label: 'AI완료', color: '#34C759' },
  in_progress: { label: '작업중', color: '#007AFF' },
  done: { label: '완료', color: '#8E8E93' },
}

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [selected, setSelected] = useState<Order | null>(null)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [aiProcessing, setAiProcessing] = useState(false)
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [showTest, setShowTest] = useState(false)
  const [testFiles, setTestFiles] = useState<File[]>([])
  const [testAngle, setTestAngle] = useState('side')
  const [testBg, setTestBg] = useState('bright')
  const [testMenu, setTestMenu] = useState('테스트메뉴')
  const [testVessel, setTestVessel] = useState('')
  const [testLoading, setTestLoading] = useState(false)
  const [testUploadStatus, setTestUploadStatus] = useState('')
  const [testResults, setTestResults] = useState<string[]>([])

  useEffect(() => {
    if (authed) fetchOrders()
  }, [authed])

  const handleLogin = async () => {
    setAuthLoading(true)
    setAuthError('')
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      if (res.ok) {
        setAuthed(true)
      } else {
        setAuthError('비밀번호가 틀렸어요')
      }
    } catch {
      setAuthError('서버 오류가 발생했어요')
    }
    setAuthLoading(false)
  }

  const fetchOrders = async () => {
    setLoading(true)
    const { data } = await getSupabase()
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  const runAI = async (orderId: string) => {
    setAiProcessing(true)
    try {
      const res = await fetch('/api/ai-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      })
      const data = await res.json()
      if (data.success) {
        await fetchOrders()
        alert('AI 처리 완료! ✨')
      } else {
        alert('AI 처리 실패: ' + data.error)
      }
    } catch (e) {
      alert('AI 처리 중 오류가 발생했어요')
    }
    setAiProcessing(false)
  }

  const runTestOrder = async () => {
    if (testFiles.length === 0) return alert('사진을 선택해주세요')
    setTestLoading(true)
    setTestResults([])
    try {
      // 1. 사진 업로드
      const uploadedUrls: string[] = []
      for (let i = 0; i < testFiles.length; i++) {
        setTestUploadStatus(`사진 업로드 중... (${i + 1}/${testFiles.length})`)
        const fd = new FormData()
        fd.append('photo', testFiles[i])
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const data = await res.json()
        if (!data.url) throw new Error('업로드 실패: ' + (data.error || ''))
        uploadedUrls.push(data.url)
      }

      // 2. 테스트 주문 생성 및 AI 실행
      setTestUploadStatus('AI 처리 중...')
      const { data: order, error } = await getSupabase().from('orders').insert({
        order_type: 'sample',
        status: 'paid',
        cut_count: String(uploadedUrls.length),
        menu_names: testMenu,
        angle: testAngle,
        background: testBg,
        vessel_info: testVessel,
        photo_urls: uploadedUrls,
        customer_name: '테스트',
        customer_email: 'test@menulab.dev',
        customer_phone: '010-0000-0000',
      }).select().single()
      if (error || !order) throw new Error(error?.message || '주문 생성 실패')

      const aiRes = await fetch('/api/ai-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      })
      const aiData = await aiRes.json()
      if (aiData.success) {
        setTestResults(aiData.aiPhotoUrls || [])
        await fetchOrders()
      } else {
        alert('AI 실패: ' + aiData.error)
      }
    } catch (e: any) {
      alert('오류: ' + e.message)
    }
    setTestUploadStatus('')
    setTestLoading(false)
  }

  const updateStatus = async (id: string, status: string) => {
    await getSupabase().from('orders').update({ status }).eq('id', id)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null)
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#1a1a1a', borderRadius: '20px', padding: '40px', width: '320px', textAlign: 'center' }}>
          <h2 style={{ color: '#fff', marginBottom: '24px', fontSize: '20px', fontWeight: 800 }}>🔐 관리자 로그인</h2>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="비밀번호 입력"
            style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '16px', outline: 'none', marginBottom: '16px', boxSizing: 'border-box' }}
          />
          {authError && <p style={{ color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{authError}</p>}
          <button
            onClick={handleLogin}
            disabled={authLoading}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--orange, #FF5C00)', color: '#fff', border: 'none', fontSize: '16px', fontWeight: 700, cursor: authLoading ? 'not-allowed' : 'pointer', opacity: authLoading ? 0.7 : 1 }}
          >
            {authLoading ? '확인 중...' : '입장하기'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', display: 'flex' }}>
      {/* 왼쪽 목록 */}
      <div style={{ width: '360px', borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: 900 }}>📋 메뉴랩 주문 관리</h1>
            <button onClick={() => { setShowTest(!showTest); setSelected(null); setTestResults([]) }} style={{ padding: '6px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', background: showTest ? '#FF5C00' : 'rgba(255,255,255,0.12)', color: '#fff' }}>
              🧪 테스트
            </button>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['all', 'pending', 'ai_done', 'in_progress', 'done'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '4px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', background: filter === f ? '#FF5C00' : 'rgba(255,255,255,0.08)', color: '#fff' }}>
                {f === 'all' ? '전체' : STATUS_LABELS[f]?.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <p style={{ padding: '20px', color: 'rgba(255,255,255,0.4)' }}>로딩 중...</p>
          ) : filtered.length === 0 ? (
            <p style={{ padding: '20px', color: 'rgba(255,255,255,0.4)' }}>주문이 없어요</p>
          ) : filtered.map(order => (
            <div key={order.id} onClick={() => setSelected(order)} style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', background: selected?.id === order.id ? 'rgba(255,92,0,0.1)' : 'transparent', borderLeft: selected?.id === order.id ? '3px solid #FF5C00' : '3px solid transparent' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontWeight: 700, fontSize: '14px' }}>{order.customer_name}</span>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '100px', background: STATUS_LABELS[order.status]?.color + '22', color: STATUS_LABELS[order.status]?.color }}>{STATUS_LABELS[order.status]?.label}</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '2px' }}>
                {order.order_type === 'sample' ? '첫주문 체험' : `본주문 ${order.cut_count}컷`} · {order.photo_urls?.length || 0}장
              </p>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>
                {new Date(order.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 오른쪽 상세 */}
      {selected ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div style={{ maxWidth: '900px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 900 }}>{selected.customer_name}</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>{selected.customer_phone} {selected.customer_email && `· ${selected.customer_email}`}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['pending', 'ai_done', 'in_progress', 'done'].map(s => (
                  <button key={s} onClick={() => updateStatus(selected.id, s)} style={{ padding: '8px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', background: selected.status === s ? STATUS_LABELS[s]?.color : 'rgba(255,255,255,0.08)', color: '#fff' }}>
                    {STATUS_LABELS[s]?.label}
                  </button>
                ))}
                <button
                  onClick={() => runAI(selected.id)}
                  disabled={aiProcessing}
                  style={{ padding: '8px 18px', borderRadius: '100px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: aiProcessing ? 'not-allowed' : 'pointer', background: aiProcessing ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #FFD600, #FF8C00)', color: '#000' }}
                >
                  {aiProcessing ? '✨ AI 처리 중...' : '✨ AI 처리 시작'}
                </button>
              </div>
            </div>

            {/* 주문 정보 */}
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '20px', marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { label: '주문 유형', value: selected.order_type === 'sample' ? '첫주문 체험' : `본주문 ${selected.cut_count}컷` },
                { label: '메뉴명', value: selected.menu_names },
                { label: '구도', value: selected.angle === 'aerial' ? '항공뷰' : '측면뷰' },
                { label: '배경', value: selected.background === 'bright' ? '밝고 깔끔' : selected.background === 'dark' ? '어둡고 고급' : '브랜드 컬러' },
                { label: '용기 정보', value: selected.vessel_info || '-' },
                { label: '요청사항', value: selected.notes || '-' },
              ].map(row => (
                <div key={row.label}>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginBottom: '4px' }}>{row.label}</p>
                  <p style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>{row.value}</p>
                </div>
              ))}
            </div>

            {/* 원본 사진 */}
            {selected.photo_urls?.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: 'rgba(255,255,255,0.7)' }}>📷 원본 사진 ({selected.photo_urls.length}장)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
                  {selected.photo_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt={`원본 ${i + 1}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '10px', display: 'block' }} />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* AI 처리 사진 - 4:3 비율 */}
            {selected.ai_photo_urls?.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: '#34C759' }}>✨ AI 처리 결과 ({selected.ai_photo_urls.length}장)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                  {selected.ai_photo_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt={`AI 결과 ${i + 1}`} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: '10px', display: 'block', border: '2px solid #34C759' }} />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {selected.status === 'pending' && (
              <div style={{ background: 'rgba(255,149,0,0.1)', border: '1px solid rgba(255,149,0,0.3)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <p style={{ color: '#FF9500', fontSize: '14px' }}>위의 <b>✨ AI 처리 시작</b> 버튼을 눌러 AI 처리를 시작하세요!</p>
              </div>
            )}
          </div>
        </div>
      ) : showTest ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div style={{ maxWidth: '600px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '24px' }}>🧪 테스트 주문</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px' }}>사진 업로드 ({testFiles.length}장 선택됨)</p>
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '24px', borderRadius: '10px', border: '1.5px dashed rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer' }}>
                  <span style={{ fontSize: '28px' }}>📷</span>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>클릭해서 사진 선택 (여러 장 가능)</span>
                  {testFiles.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {testFiles.map((f, i) => (
                        <span key={i} style={{ background: 'rgba(255,92,0,0.2)', color: '#FF5C00', padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 600 }}>{f.name}</span>
                      ))}
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={e => setTestFiles(Array.from(e.target.files || []))}
                  />
                </label>
              </div>

              <div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px' }}>메뉴명</p>
                <input value={testMenu} onChange={e => setTestMenu(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px' }}>구도</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[{ v: 'aerial', l: '항공뷰' }, { v: 'side', l: '측면뷰' }].map(({ v, l }) => (
                      <button key={v} onClick={() => setTestAngle(v)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: testAngle === v ? '#FF5C00' : 'rgba(255,255,255,0.08)', color: '#fff', fontWeight: 700, fontSize: '13px' }}>{l}</button>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px' }}>배경</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[{ v: 'bright', l: '밝고 깔끔' }, { v: 'dark', l: '어둡고 고급' }].map(({ v, l }) => (
                      <button key={v} onClick={() => setTestBg(v)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: testBg === v ? '#FF5C00' : 'rgba(255,255,255,0.08)', color: '#fff', fontWeight: 700, fontSize: '12px' }}>{l}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px' }}>그릇 옵션</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {[
                    { v: '', l: '원본 그릇 그대로' },
                    { v: 'white ceramic or porcelain — keep the exact same shape as the original vessel', l: '흰색 도자기' },
                    { v: 'matte black ceramic — keep the exact same shape as the original vessel', l: '검정 세라믹' },
                    { v: 'traditional Korean earthenware ttukbaegi (dark brown clay stone pot)', l: '뚝배기' },
                    { v: 'black Korean jeongol hot pot (wide shallow black metal pot)', l: '검정색 전골 냄비' },
                    { v: 'silver stainless steel — keep the exact same shape as the original vessel', l: '은색 스테인리스' },
                  ].map(({ v, l }) => (
                    <button key={l} onClick={() => setTestVessel(v)} style={{ padding: '8px 14px', borderRadius: '100px', border: 'none', cursor: 'pointer', background: testVessel === v ? '#FF5C00' : 'rgba(255,255,255,0.08)', color: '#fff', fontWeight: 600, fontSize: '12px', whiteSpace: 'nowrap' }}>{l}</button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={runTestOrder}
              disabled={testLoading}
              style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', cursor: testLoading ? 'not-allowed' : 'pointer', background: testLoading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #FFD600, #FF8C00)', color: '#000', fontSize: '16px', fontWeight: 800, marginBottom: '24px' }}
            >
              {testLoading ? (testUploadStatus || '✨ AI 처리 중...') : '✨ AI 실행'}
            </button>

            {testResults.length > 0 && (
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: '#34C759' }}>✨ 결과 ({testResults.length}장)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                  {testResults.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt={`결과 ${i + 1}`} style={{ width: '100%', aspectRatio: '3/2', objectFit: 'cover', borderRadius: '10px', display: 'block', border: '2px solid #34C759' }} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '16px' }}>왼쪽에서 주문을 선택하거나 🧪 테스트를 눌러보세요</p>
        </div>
      )}
    </div>
  )
}
