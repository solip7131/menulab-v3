'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const getSupabase = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

const VIBE_LABELS: Record<string, string> = {
  warm: '따뜻한', premium: '고급스러운', modern: '깔끔모던', natural: '내추럴우드', cafe: '감성카페',
}

const STATUS: Record<string, { label: string; color: string; next?: string; nextLabel?: string }> = {
  pending_payment:   { label: '입금 대기',  color: '#FF9500', next: 'payment_confirmed', nextLabel: '✅ 입금 확인' },
  payment_confirmed: { label: '입금 확인',  color: '#34C759', next: 'in_progress',       nextLabel: '🔨 작업 시작' },
  in_progress:       { label: '작업중',    color: '#007AFF', next: 'done',              nextLabel: '✓ 완료 처리' },
  done:              { label: '완료',      color: '#8E8E93' },
}

interface V2Meta {
  plan_type:                'trial' | 'basic' | 'premium'
  mood:                     'black' | 'white'
  amount:                   number
  vessel_choice?:           'original' | 'recommended'
  recommended_vessel_id?:   string
  recommended_vessel_label?: string
  stage1_urls?:             string[]
  briefing?: {
    vibes:               string[]
    vessel_pref:         'recommend' | 'reference'
    reference_photo_urls: string[]
    free_request:        string
  }
  kakao_channel_sent: boolean
}

interface Order {
  id:             string
  created_at:     string
  status:         string
  order_type:     string
  cut_count:      string
  customer_name:  string
  customer_phone: string
  customer_email: string
  photo_urls:     string[]
  ai_photo_urls:  string[]
  v2_meta:        V2Meta | null
  source:         string
}

export default function V2AdminPage() {
  const [orders, setOrders]         = useState<Order[]>([])
  const [selected, setSelected]     = useState<Order | null>(null)
  const [filter, setFilter]         = useState('all')
  const [loading, setLoading]       = useState(true)
  const [updating, setUpdating]     = useState(false)
  const [aiProcessing, setAiProcessing] = useState(false)

  // ── AI 2-stage state ──
  const [stage1Results, setStage1Results]   = useState<string[]>([])
  const [stage2Results, setStage2Results]   = useState<string[]>([])
  const [stage1Loading, setStage1Loading]   = useState(false)
  const [stage2Loading, setStage2Loading]   = useState(false)
  const [regenLoading, setRegenLoading]     = useState<{ stage: 1|2; index: number } | null>(null)
  const [regenPrompts, setRegenPrompts]     = useState<Record<string, string>>({})
  const [exportLoading, setExportLoading]   = useState(false)
  const [exportDone, setExportDone]         = useState(false)
  const [manualFiles, setManualFiles]       = useState<File[]>([])
  const manualInputRef                      = useRef<HTMLInputElement>(null)

  const [password, setPassword]     = useState('')
  const [authed, setAuthed]         = useState(false)
  const [authError, setAuthError]   = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [isMobile, setIsMobile]     = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── AI 테스트 패널 ──
  const [testMode, setTestMode]               = useState(false)
  const [testSubMode, setTestSubMode]         = useState<'single' | 'full'>('single')

  // ── 단일 호출 테스트 ──
  const [singlePhotos, setSinglePhotos]       = useState<File[]>([])
  const [singleAngle, setSingleAngle]         = useState<'original' | 'side45' | 'topdown'>('original')
  const [singleBg, setSingleBg]               = useState<'black' | 'white' | 'ivory' | 'gray'>('black')
  const [singleVesselId, setSingleVesselId]   = useState('original')
  const [singlePrompt, setSinglePrompt]       = useState('')
  const [singleStage, setSingleStage]         = useState<1 | 2 | 3 | 4 | 5>(1)
  const [singleResults, setSingleResults]     = useState<{ orig: string; result: string; error?: string }[]>([])
  const [singleLoading, setSingleLoading]     = useState(false)
  const singleInputRef                        = useRef<HTMLInputElement>(null)

  // ── 풀 플로우 테스트 ──
  type FullPlatResult = { platform: string; wmUrl: string; error?: string }
  const FULL_PLATFORMS = [
    { name: '배달의민족', width: 1280, height: 960  },
    { name: '쿠팡이츠',   width: 1080, height: 660  },
    { name: '요기요',     width: 1080, height: 640  },
    { name: '땡겨요',     width: 1080, height: 660  },
    { name: '먹깨비',     width: 800,  height: 533  },
  ]
  const FULL_BG_PRESETS = [
    { id: 'lightgray',          label: '라이트그레이',       src: '/backgrounds/lightgray.jpg',           promptSrc: null },
    { id: 'ivory',              label: '아이보리',           src: '/backgrounds/ivory.jpg',               promptSrc: null },
    { id: 'concrete',           label: '블랙 콘크리트',      src: '/backgrounds/concrete.jpg',            promptSrc: null },
    { id: 'marble',             label: '화이트 대리석타일',  src: '/backgrounds/marble.jpg',              promptSrc: null },
    { id: 'ivory-silk',         label: '아이보리 실크',      src: '/backgrounds/ivory-silk.jpg',          promptSrc: '/backgrounds/prompt/ivory-silk.png' },
    { id: 'gray-concrete',      label: '그레이 콘크리트',    src: '/backgrounds/gray-concrete.jpg',       promptSrc: '/backgrounds/prompt/gray-concrete.png' },
    { id: 'white-touched-paint',label: '화이트 터치드페인트',src: '/backgrounds/white-touched-paint.jpg', promptSrc: '/backgrounds/prompt/white-touched-paint.png' },
    { id: 'beige-wood',         label: '베이지우드',         src: '/backgrounds/beige-wood.jpg',          promptSrc: '/backgrounds/prompt/beige-wood.png' },
    { id: 'dark-brown-wood',    label: '다크브라운 우드',    src: '/backgrounds/dark-brown-wood.jpg',     promptSrc: '/backgrounds/prompt/dark-brown-wood.png' },
    { id: 'dark-gray',          label: '다크그레이',         src: '/backgrounds/dark-gray.jpg',           promptSrc: '/backgrounds/prompt/dark-gray.png' },
  ]
  const FULL_VESSELS = [
    { id: 'original',          label: '원본 그대로' },
    { id: 'white-noodle-bowl', label: '흰색 면기' },
    { id: 'black-noodle-bowl', label: '검정 면기' },
    { id: 'white-plate',       label: '흰색 접시' },
    { id: 'black-plate',       label: '검정 접시' },
    { id: 'ttukbbaeki',        label: '뚝배기' },
    { id: 'black-pot',         label: '전골냄비' },
    { id: 'cold-noodle-bowl',  label: '스텐 냉면보울' },
    { id: 'pasta-bowl',        label: '파스타볼' },
  ]
  const [fullPhoto, setFullPhoto]             = useState<File | null>(null)
  const [fullServiceType, setFullServiceType] = useState<'remake' | 'collection'>('remake')
  const [fullAngle, setFullAngle]             = useState<'original' | 'side45' | 'topdown'>('original')
  const [fullVessel, setFullVessel]           = useState('original')
  const [fullBgPresetId, setFullBgPresetId]   = useState<string | null>('lightgray')
  const [fullBgPrompt, setFullBgPrompt]       = useState('')
  const [fullBgMode, setFullBgMode]           = useState<'preset' | 'prompt'>('preset')
  const [fullPlatSel, setFullPlatSel]         = useState<Set<string>>(new Set(['배달의민족']))
  const [fullLoading, setFullLoading]         = useState(false)
  const [fullResults, setFullResults]         = useState<FullPlatResult[]>([])
  const [fullOrigUrl, setFullOrigUrl]         = useState<string | null>(null)
  const [fullError, setFullError]             = useState<string | null>(null)
  const fullInputRef                          = useRef<HTMLInputElement>(null)

  const SINGLE_VESSELS = [
    { id: 'original',          label: '원본 그대로' },
    { id: 'white-noodle-bowl', label: '흰색 면기' },
    { id: 'black-noodle-bowl', label: '검정 면기' },
    { id: 'white-plate',       label: '흰색 접시' },
    { id: 'black-plate',       label: '검정 접시' },
    { id: 'ttukbbaeki',        label: '뚝배기' },
    { id: 'black-pot',         label: '전골냄비' },
    { id: 'cold-noodle-bowl',  label: '스텐 냉면보울' },
    { id: 'pasta-bowl',        label: '파스타볼' },
  ]

  useEffect(() => { if (authed) fetchOrders() }, [authed])

  useEffect(() => {
    if (!selected) return
    setStage1Results(selected.v2_meta?.stage1_urls || [])
    setStage2Results(selected.ai_photo_urls || [])
    setExportDone(!!(selected.ai_photo_urls?.length))
    setRegenPrompts({})
    setManualFiles([])
  }, [selected?.id])

  const handleLogin = async () => {
    setAuthLoading(true); setAuthError('')
    try {
      const res = await fetch('/api/admin/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
      if (res.ok) setAuthed(true)
      else setAuthError('비밀번호가 틀렸어요')
    } catch { setAuthError('서버 오류') }
    setAuthLoading(false)
  }

  const fetchOrders = async () => {
    const sb = getSupabase()
    if (!sb) { setLoading(false); return }
    setLoading(true)
    const { data } = await sb
      .from('orders')
      .select('*')
      .not('v2_meta', 'is', null)
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  const updateStatus = async (id: string, status: string) => {
    setUpdating(true)
    await getSupabase()?.from('orders').update({ status }).eq('id', id)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null)
    setUpdating(false)
  }

  const sendNotification = async (id: string, type: string) => {
    try {
      const res = await fetch('/api/v2/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id, type }),
      })
      const data = await res.json()
      if (data.success) alert('✅ 알림톡이 발송됐어요!')
      else alert('알림톡 발송 실패: ' + (data.error || '알 수 없는 오류'))
    } catch {
      alert('알림톡 발송 중 오류가 발생했어요')
    }
  }

  const markKakaoSent = async (id: string) => {
    const newMeta = { ...(selected?.v2_meta || {}), kakao_channel_sent: true }
    await getSupabase()?.from('orders').update({ v2_meta: newMeta }).eq('id', id)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, v2_meta: newMeta as V2Meta } : o))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, v2_meta: newMeta as V2Meta } : null)
  }

  const runAI = async (orderId: string) => {
    setAiProcessing(true)
    try {
      const res  = await fetch('/api/ai-process', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId }) })
      const data = await res.json()
      if (data.success) { await fetchOrders(); alert('AI 처리 완료! ✨') }
      else alert('AI 처리 실패: ' + data.error)
    } catch { alert('AI 처리 중 오류') }
    setAiProcessing(false)
  }

  const runStage1 = async () => {
    if (!selected) return
    setStage1Loading(true)
    try {
      const res = await fetch('/api/v2/ai-stage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: selected.id, stage: 1 }),
      })
      const data = await res.json()
      if (data.success) {
        setStage1Results(data.urls)
        setSelected(prev => prev ? { ...prev, v2_meta: prev.v2_meta ? { ...prev.v2_meta, stage1_urls: data.urls } : prev.v2_meta } : null)
      } else alert('1단계 실패: ' + (data.error || ''))
    } catch { alert('1단계 처리 중 오류') }
    setStage1Loading(false)
  }

  const runStage2 = async () => {
    if (!selected || !stage1Results.length) return
    setStage2Loading(true)
    try {
      const res = await fetch('/api/v2/ai-stage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: selected.id, stage: 2, stage1Urls: stage1Results }),
      })
      const data = await res.json()
      if (data.success) {
        setStage2Results(data.urls)
        setSelected(prev => prev ? { ...prev, ai_photo_urls: data.urls, status: 'ai_done' } : null)
        setOrders(prev => prev.map(o => o.id === selected.id ? { ...o, ai_photo_urls: data.urls, status: 'ai_done' } : o))
      } else alert('2단계 실패: ' + (data.error || ''))
    } catch { alert('2단계 처리 중 오류') }
    setStage2Loading(false)
  }

  const regenPhoto = async (stage: 1|2, index: number) => {
    if (!selected) return
    setRegenLoading({ stage, index })
    const key = `${stage}-${index}`
    try {
      const body: Record<string, unknown> = { orderId: selected.id, stage, photoIndex: index }
      const cp = regenPrompts[key]
      if (cp) body.customPrompt = cp
      if (stage === 2) body.stage1Urls = stage1Results
      const res = await fetch('/api/v2/ai-stage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success && data.urls?.length) {
        if (stage === 1) setStage1Results(data.urls)
        else setStage2Results(data.urls)
      } else alert('재생성 실패: ' + (data.error || ''))
    } catch { alert('재생성 중 오류') }
    setRegenLoading(null)
  }

  const doExport = async (useManual: boolean) => {
    if (!selected) return
    setExportLoading(true)
    try {
      let res: Response
      if (useManual) {
        const fd = new FormData()
        fd.append('orderId', selected.id)
        manualFiles.forEach(f => fd.append('files', f))
        res = await fetch('/api/v2/export', { method: 'POST', body: fd })
      } else {
        const urls = stage2Results.length ? stage2Results : stage1Results
        res = await fetch('/api/v2/export', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: selected.id, urls }),
        })
      }
      const data = await res.json()
      if (data.success) {
        setExportDone(true)
        setStage2Results(data.finalUrls)
        setSelected(prev => prev ? { ...prev, ai_photo_urls: data.finalUrls } : null)
        setOrders(prev => prev.map(o => o.id === selected.id ? { ...o, ai_photo_urls: data.finalUrls } : o))
      } else alert('내보내기 실패: ' + (data.error || ''))
    } catch { alert('내보내기 중 오류') }
    setExportLoading(false)
  }

  const runSingleCallTest = async () => {
    if (!singlePhotos.length) return
    setSingleLoading(true)
    setSingleResults([])
    const results: { orig: string; result: string; error?: string }[] = []
    for (const photo of singlePhotos) {
      const origUrl = URL.createObjectURL(photo)
      try {
        const fd = new FormData()
        fd.append('photo', photo)
        fd.append('angle', singleAngle)
        fd.append('background', singleBg)
        fd.append('vesselId', singleVesselId)
        fd.append('customPrompt', singlePrompt)
        fd.append('stage', String(singleStage))
        const res = await fetch('/api/admin/single-call-test', {
          method: 'POST',
          headers: { 'x-admin-password': password },
          body: fd,
        })
        const data = await res.json()
        results.push({ orig: origUrl, result: data.error ? '' : data.url, error: data.error })
      } catch (e: any) {
        results.push({ orig: origUrl, result: '', error: String(e) })
      }
      setSingleResults([...results])
    }
    setSingleLoading(false)
  }

  const runFullTest = async () => {
    if (!fullPhoto) return
    setFullLoading(true)
    setFullResults([])
    setFullError(null)
    setFullOrigUrl(URL.createObjectURL(fullPhoto))

    try {
      // 사진 → base64 (FileReader — non-blocking)
      const toBase64 = (file: File | Blob): Promise<string> =>
        new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve((reader.result as string).split(',')[1])
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

      // 이미지 압축 (큰 사진 → request body 4.5MB 초과 방지)
      const compressForUpload = async (file: File | Blob, quality = 0.85): Promise<Blob> => {
        const bitmap = await createImageBitmap(file)
        const MAX_DIM = 1400
        let w = bitmap.width, h = bitmap.height
        if (w > MAX_DIM || h > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / w, MAX_DIM / h)
          w = Math.round(w * ratio); h = Math.round(h * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)
        return new Promise<Blob>(res => canvas.toBlob(blob => res(blob!), 'image/jpeg', quality))
      }

      const compressed = await compressForUpload(fullPhoto)
      const base64 = await toBase64(compressed)
      const mime = 'image/jpeg'

      // 배경 이미지 로드 (preset인 경우 promptSrc 우선)
      let bgImageBase64: string | undefined
      let bgImageMime: string | undefined
      let backgroundName: string | undefined
      let bgPromptVal: string | undefined

      if (fullBgMode === 'preset' && fullBgPresetId) {
        const preset = FULL_BG_PRESETS.find(p => p.id === fullBgPresetId)
        if (preset) {
          backgroundName = preset.label
          const bgSrc = preset.promptSrc ?? preset.src
          try {
            const bgRes = await fetch(bgSrc)
            const bgBlob = await bgRes.blob()
            const compressedBg = await compressForUpload(bgBlob)
            bgImageBase64 = await toBase64(compressedBg)
            bgImageMime = 'image/jpeg'
          } catch {}
        }
      } else if (fullBgMode === 'prompt') {
        bgPromptVal = fullBgPrompt.trim()
      }

      const selectedPlats = FULL_PLATFORMS.filter(p => fullPlatSel.has(p.name))
      const platforms = selectedPlats.length > 0 ? selectedPlats : [{ name: '기본', width: 1280, height: 960 }]

      const body: Record<string, unknown> = {
        foodImages: [{ base64, mime }],
        platforms,
        serviceType: fullServiceType,
        angle: fullAngle,
        vessel: fullVessel,
        adminToken: password,
      }
      if (backgroundName)  body.backgroundName = backgroundName
      if (bgImageBase64)   { body.bgImageBase64 = bgImageBase64; body.bgImageMime = bgImageMime }
      if (bgPromptVal)     body.bgPrompt = bgPromptVal

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const rawText = await res.text()
      let data: any
      try {
        data = JSON.parse(rawText)
      } catch {
        setFullError(`서버 오류 (HTTP ${res.status}): ${rawText.slice(0, 300)}`)
        return
      }

      if (!res.ok || data.error) {
        setFullError(data.error ?? `HTTP ${res.status}`)
      } else if (data.wmUrl) {
        setFullResults(platforms.map(p => ({ platform: p.name, wmUrl: data.wmUrl })))
      } else if (data.imageBase64) {
        setFullResults(platforms.map(p => ({ platform: p.name, wmUrl: `data:image/jpeg;base64,${data.imageBase64}` })))
      } else {
        setFullError(`응답 내용: ${JSON.stringify(data).slice(0, 200)}`)
      }
    } catch (e: any) {
      setFullError(String(e))
    }
    setFullLoading(false)
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  const planLabel = (order: Order) => {
    const p = order.v2_meta?.plan_type
    if (p === 'trial')   return '체험 5,000원'
    if (p === 'premium') return '프리미엄 14,900원'
    const count = parseInt(order.cut_count) || 0
    return `기본 ${count}장 · ${(count * 7900).toLocaleString()}원`
  }

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#1a1a1a', borderRadius: '20px', padding: '40px', width: '320px', textAlign: 'center' }}>
          <h2 style={{ color: '#fff', marginBottom: '8px', fontSize: '20px', fontWeight: 800 }}>🔐 v2 어드민</h2>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', marginBottom: '24px' }}>배달앱 주문 관리</p>
          <input
            type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="비밀번호 입력"
            style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '16px', outline: 'none', marginBottom: '16px', boxSizing: 'border-box' }}
          />
          {authError && <p style={{ color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{authError}</p>}
          <button
            onClick={handleLogin} disabled={authLoading}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#C4510D', color: '#fff', border: 'none', fontSize: '16px', fontWeight: 700, cursor: authLoading ? 'not-allowed' : 'pointer', opacity: authLoading ? 0.7 : 1 }}
          >
            {authLoading ? '확인 중...' : '입장하기'}
          </button>
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <Link href="/admin" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', textDecoration: 'none' }}>v1 어드민으로 →</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', display: 'flex' }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>

      {/* 왼쪽 목록 — 모바일에서는 주문 선택 전에만 표시 */}
      <div style={{ width: isMobile ? '100%' : '360px', borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.08)', display: isMobile && selected ? 'none' : 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh', position: 'sticky', top: 0 }}>
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h1 style={{ fontSize: '16px', fontWeight: 900 }}>📋 메뉴랩 v2 주문 관리</h1>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => { setTestMode(v => !v); setSelected(null) }}
                style={{ padding: '6px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', background: testMode ? '#C4510D' : 'rgba(255,255,255,0.12)', color: '#fff' }}
              >
                🧪 AI 테스트
              </button>
              <button onClick={fetchOrders} style={{ padding: '6px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.12)', color: '#fff' }}>
                새로고침
              </button>
            </div>
          </div>

          {/* 통계 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            {[
              { label: '입금 대기',  count: orders.filter(o => o.status === 'pending_payment').length,   color: '#FF9500' },
              { label: '입금 확인',  count: orders.filter(o => o.status === 'payment_confirmed').length,  color: '#34C759' },
              { label: '작업중',    count: orders.filter(o => o.status === 'in_progress').length,         color: '#007AFF' },
              { label: '완료',      count: orders.filter(o => o.status === 'done').length,                color: '#8E8E93' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{s.label}</span>
                <span style={{ fontWeight: 800, fontSize: '16px', color: s.color }}>{s.count}</span>
              </div>
            ))}
          </div>

          {/* 필터 */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[['all', '전체'], ...Object.entries(STATUS).map(([k, v]) => [k, v.label])].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{ padding: '4px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', background: filter === key ? '#C4510D' : 'rgba(255,255,255,0.08)', color: '#fff' }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 목록 */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <p style={{ padding: '20px', color: 'rgba(255,255,255,0.4)' }}>로딩 중...</p>
          ) : filtered.length === 0 ? (
            <p style={{ padding: '20px', color: 'rgba(255,255,255,0.4)' }}>주문이 없어요</p>
          ) : filtered.map(order => {
            const st    = STATUS[order.status]
            const meta  = order.v2_meta
            return (
              <div
                key={order.id}
                onClick={() => setSelected(order)}
                style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', background: selected?.id === order.id ? 'rgba(196,81,13,0.12)' : 'transparent', borderLeft: `3px solid ${selected?.id === order.id ? '#C4510D' : 'transparent'}` }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>{order.customer_name}</span>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '100px', background: (st?.color || '#888') + '22', color: st?.color || '#888' }}>
                    {st?.label || order.status}
                  </span>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '2px' }}>
                  {planLabel(order)} · {order.photo_urls?.length || 0}장
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>
                    {new Date(order.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {meta?.kakao_channel_sent && (
                    <span style={{ fontSize: '10px', color: '#FEE500', fontWeight: 700 }}>카톡 전달 ✓</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 오른쪽 — 테스트 패널 or 상세 */}
      {testMode ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div style={{ maxWidth: '860px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '12px' }}>🧪 AI 이미지 테스트</h2>

            {/* 탭 */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              {([['single', '단일 호출 테스트'], ['full', '풀 플로우 테스트']] as const).map(([v, l]) => (
                <button key={v} onClick={() => setTestSubMode(v)} style={{ padding: '8px 18px', borderRadius: '100px', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer', background: testSubMode === v ? '#C4510D' : 'rgba(255,255,255,0.1)', color: '#fff' }}>{l}</button>
              ))}
            </div>

            {testSubMode === 'single' ? (
              /* ── 단일 호출 테스트 ── */
              <div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '20px' }}>gemini-3-pro-image 1회 호출로 구도 + 배경 + 그릇을 한 번에 처리한 결과를 확인합니다.</p>

                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
                  {/* 사진 업로드 */}
                  <div
                    onClick={() => singleInputRef.current?.click()}
                    style={{ border: `2px dashed ${singlePhotos.length ? 'rgba(196,81,13,0.5)' : 'rgba(255,255,255,0.15)'}`, borderRadius: '12px', padding: '16px 20px', cursor: 'pointer', marginBottom: singlePhotos.length ? '10px' : '16px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}
                  >
                    <p style={{ fontSize: '20px' }}>📷</p>
                    <p style={{ fontWeight: 700, fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                      {singlePhotos.length ? `${singlePhotos.length}장 선택됨 — 클릭해서 추가/변경` : '테스트할 사진 업로드 (여러 장 가능)'}
                    </p>
                    <input ref={singleInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { if (e.target.files?.length) { setSinglePhotos(Array.from(e.target.files)); setSingleResults([]) } e.target.value = '' }} />
                  </div>

                  {singlePhotos.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                      {singlePhotos.map((f, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <img src={URL.createObjectURL(f)} alt="" style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px', display: 'block' }} />
                          <button onClick={e => { e.stopPropagation(); setSinglePhotos(prev => prev.filter((_, j) => j !== i)); setSingleResults([]) }} style={{ position: 'absolute', top: '-4px', right: '-4px', width: '18px', height: '18px', borderRadius: '50%', background: '#ff3b30', border: 'none', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 구도 + 배경 */}
                  <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '7px', fontWeight: 600 }}>구도</p>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {([['original', '원본구도'], ['topdown', '항공뷰'], ['side45', '측면뷰']] as const).map(([v, l]) => (
                          <button key={v} onClick={() => setSingleAngle(v)} style={{ padding: '7px 16px', borderRadius: '100px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', background: singleAngle === v ? '#C4510D' : 'rgba(255,255,255,0.1)', color: '#fff' }}>{l}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '7px', fontWeight: 600 }}>배경</p>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {([['black', '🌑 블랙'], ['white', '☀️ 화이트'], ['ivory', '🟡 아이보리'], ['gray', '⬜ 그레이']] as const).map(([v, l]) => (
                          <button key={v} onClick={() => setSingleBg(v)} style={{ padding: '7px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', background: singleBg === v ? '#C4510D' : 'rgba(255,255,255,0.1)', color: '#fff' }}>{l}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 그릇 선택 */}
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '7px', fontWeight: 600 }}>그릇</p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {SINGLE_VESSELS.map(v => (
                        <button key={v.id} onClick={() => setSingleVesselId(v.id)} style={{ padding: '6px 13px', borderRadius: '100px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', background: singleVesselId === v.id ? '#5856D6' : 'rgba(255,255,255,0.1)', color: '#fff' }}>{v.label}</button>
                      ))}
                    </div>
                  </div>

                  {/* Config 단계 선택 */}
                  <div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '7px', fontWeight: 600 }}>Config 단계</p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {([
                        { stage: 1, label: '1단계 — 기본' },
                        { stage: 2, label: '2단계 — aspectRatio' },
                        { stage: 3, label: '3단계 — 2K' },
                        { stage: 4, label: '4단계 — temperature' },
                        { stage: 5, label: '5단계 — mediaResolution' },
                      ] as const).map(({ stage, label }) => (
                        <button key={stage} onClick={() => setSingleStage(stage)} style={{ padding: '7px 15px', borderRadius: '100px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', background: singleStage === stage ? '#34C759' : 'rgba(255,255,255,0.1)', color: '#fff' }}>{label}</button>
                      ))}
                    </div>
                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '6px' }}>
                      {singleStage === 1 && 'responseModalities: ["TEXT","IMAGE"]'}
                      {singleStage === 2 && 'responseModalities + imageConfig: { aspectRatio: "1:1" }'}
                      {singleStage === 3 && 'responseModalities + imageConfig: { aspectRatio: "1:1", imageSize: "2K" }'}
                      {singleStage === 4 && '3단계 + temperature: 0.2'}
                      {singleStage === 5 && '3단계 + mediaResolution: "MEDIA_RESOLUTION_HIGH"'}
                    </p>
                  </div>

                  {/* 커스텀 프롬프트 */}
                  <div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '7px', fontWeight: 600 }}>커스텀 프롬프트 <span style={{ fontWeight: 400, opacity: 0.7 }}>(비워두면 위 옵션 기반 자동 생성)</span></p>
                    <textarea
                      value={singlePrompt}
                      onChange={e => setSinglePrompt(e.target.value)}
                      placeholder="비워두면 구도 + 배경 + 그릇 선택을 기반으로 프롬프트가 자동 생성됩니다."
                      rows={3}
                      style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '12px', outline: 'none', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                  </div>
                </div>

                {/* 실행 버튼 */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                  <button
                    onClick={runSingleCallTest}
                    disabled={singleLoading || !singlePhotos.length}
                    style={{ padding: '12px 28px', borderRadius: '100px', fontSize: '14px', fontWeight: 800, border: 'none', cursor: (singleLoading || !singlePhotos.length) ? 'not-allowed' : 'pointer', background: (singleLoading || !singlePhotos.length) ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #C4510D, #FF8C00)', color: (singleLoading || !singlePhotos.length) ? 'rgba(255,255,255,0.3)' : '#fff' }}
                  >
                    {singleLoading ? `처리 중... (${singleResults.length}/${singlePhotos.length})` : singleResults.length ? '↺ 재실행' : '▶ 단일 호출 실행'}
                  </button>
                </div>

                {/* 결과 */}
                {singleResults.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {singleResults.map((r, i) => (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '14px', padding: '14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div>
                            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '5px' }}>원본 {singlePhotos.length > 1 ? i + 1 : ''}</p>
                            <img src={r.orig} alt="원본" style={{ width: '100%', aspectRatio: '3/2', objectFit: 'cover', borderRadius: '8px', display: 'block' }} />
                          </div>
                          <div>
                            <p style={{ fontSize: '11px', color: '#C4510D', marginBottom: '5px' }}>단일 호출 결과 {singlePhotos.length > 1 ? i + 1 : ''} ✨</p>
                            {r.result ? (
                              <a href={r.result} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                                <img src={r.result} alt="결과" style={{ width: '100%', aspectRatio: '3/2', objectFit: 'cover', borderRadius: '8px', display: 'block', border: '2px solid #C4510D' }} />
                              </a>
                            ) : (
                              <div style={{ width: '100%', aspectRatio: '3/2', borderRadius: '8px', background: 'rgba(255,0,0,0.06)', border: '1px solid rgba(255,0,0,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px', boxSizing: 'border-box' }}>
                                <p style={{ fontSize: '12px', color: '#ff6b6b', marginBottom: r.error ? '6px' : 0 }}>{singleLoading ? '처리 중...' : '실패'}</p>
                                {r.error && <p style={{ fontSize: '10px', color: 'rgba(255,100,100,0.7)', wordBreak: 'break-all', textAlign: 'center', lineHeight: 1.4 }}>{r.error}</p>}
                              </div>
                            )}
                            {r.result && <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '3px', textAlign: 'center' }}>클릭하면 다운로드</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* ── 풀 플로우 테스트 ── */
              <div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '20px' }}>/api/generate 실제 호출 — 실제 앱과 동일한 플로우로 테스트합니다.</p>

                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '20px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  {/* 사진 업로드 */}
                  <div>
                    <div onClick={() => fullInputRef.current?.click()} style={{ border: `2px dashed ${fullPhoto ? 'rgba(196,81,13,0.5)' : 'rgba(255,255,255,0.15)'}`, borderRadius: '12px', padding: '16px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                      <p style={{ fontSize: '20px' }}>📷</p>
                      <p style={{ fontWeight: 700, fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{fullPhoto ? fullPhoto.name : '사진 1장 업로드'}</p>
                      <input ref={fullInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) { setFullPhoto(e.target.files[0]); setFullResults([]); setFullError(null) } e.target.value = '' }} />
                    </div>
                  </div>

                  {/* 서비스 타입 */}
                  <div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '7px', fontWeight: 600 }}>서비스 타입</p>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {([['remake', '메뉴샷'], ['collection', '모음컷']] as const).map(([v, l]) => (
                        <button key={v} onClick={() => setFullServiceType(v)} style={{ padding: '7px 16px', borderRadius: '100px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', background: fullServiceType === v ? '#C4510D' : 'rgba(255,255,255,0.1)', color: '#fff' }}>{l}</button>
                      ))}
                    </div>
                  </div>

                  {/* 구도 + 그릇 (메뉴샷만) */}
                  {fullServiceType === 'remake' && (
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '7px', fontWeight: 600 }}>구도</p>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {([['original', '원본'], ['side45', '측면45'], ['topdown', '탑다운']] as const).map(([v, l]) => (
                            <button key={v} onClick={() => setFullAngle(v)} style={{ padding: '7px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', background: fullAngle === v ? '#C4510D' : 'rgba(255,255,255,0.1)', color: '#fff' }}>{l}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '7px', fontWeight: 600 }}>그릇</p>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {FULL_VESSELS.map(v => (
                            <button key={v.id} onClick={() => setFullVessel(v.id)} style={{ padding: '6px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', background: fullVessel === v.id ? '#5856D6' : 'rgba(255,255,255,0.1)', color: '#fff' }}>{v.label}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 배경 모드 */}
                  <div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '7px', fontWeight: 600 }}>배경</p>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                      {([['preset', '프리셋'], ['prompt', '텍스트']] as const).map(([v, l]) => (
                        <button key={v} onClick={() => setFullBgMode(v)} style={{ padding: '7px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', background: fullBgMode === v ? '#34C759' : 'rgba(255,255,255,0.1)', color: '#fff' }}>{l}</button>
                      ))}
                    </div>
                    {fullBgMode === 'preset' ? (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {FULL_BG_PRESETS.map(p => (
                          <button key={p.id} onClick={() => setFullBgPresetId(p.id)} style={{ padding: '6px 12px', borderRadius: '100px', fontSize: '11px', fontWeight: 700, border: `2px solid ${fullBgPresetId === p.id ? '#34C759' : 'transparent'}`, cursor: 'pointer', background: 'rgba(255,255,255,0.08)', color: '#fff' }}>{p.label}</button>
                        ))}
                      </div>
                    ) : (
                      <input value={fullBgPrompt} onChange={e => setFullBgPrompt(e.target.value)} placeholder="배경 설명 (예: dark wooden table)" style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                    )}
                  </div>

                  {/* 플랫폼 선택 */}
                  <div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '7px', fontWeight: 600 }}>플랫폼</p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {FULL_PLATFORMS.map(p => (
                        <button key={p.name} onClick={() => setFullPlatSel(prev => { const s = new Set(prev); s.has(p.name) ? s.delete(p.name) : s.add(p.name); return s })} style={{ padding: '6px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', background: fullPlatSel.has(p.name) ? '#FF8C00' : 'rgba(255,255,255,0.1)', color: '#fff' }}>{p.name} <span style={{ opacity: 0.6, fontSize: '10px' }}>{p.width}×{p.height}</span></button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 실행 */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                  <button onClick={runFullTest} disabled={fullLoading || !fullPhoto} style={{ padding: '12px 28px', borderRadius: '100px', fontSize: '14px', fontWeight: 800, border: 'none', cursor: (fullLoading || !fullPhoto) ? 'not-allowed' : 'pointer', background: (fullLoading || !fullPhoto) ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #C4510D, #FF8C00)', color: (fullLoading || !fullPhoto) ? 'rgba(255,255,255,0.3)' : '#fff' }}>
                    {fullLoading ? '생성 중...' : fullResults.length ? '↺ 재실행' : '▶ 생성 실행'}
                  </button>
                </div>

                {/* 에러 */}
                {fullError && (
                  <div style={{ background: 'rgba(255,0,0,0.08)', border: '1px solid rgba(255,0,0,0.2)', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                    <p style={{ fontSize: '12px', color: '#ff6b6b', wordBreak: 'break-all' }}>{fullError}</p>
                  </div>
                )}

                {/* 결과: 좌 원본 / 우 결과 or 생성중 */}
                {fullOrigUrl && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {/* 왼쪽 — 원본 */}
                    <div>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '6px' }}>원본</p>
                      <img src={fullOrigUrl} alt="원본" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: '10px', display: 'block' }} />
                    </div>

                    {/* 오른쪽 — 결과 or 생성중 */}
                    <div>
                      <p style={{ fontSize: '11px', color: '#C4510D', marginBottom: '6px' }}>
                        {fullLoading ? '생성 중...' : fullResults.length ? `결과 (${fullResults[0].platform})` : ''}
                      </p>
                      {fullLoading ? (
                        <div style={{ width: '100%', aspectRatio: '4/3', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid transparent', borderTopColor: '#C4510D', animation: 'spin 1s linear infinite' }} />
                          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>생성 중...</p>
                        </div>
                      ) : fullResults[0]?.wmUrl ? (
                        <a href={fullResults[0].wmUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                          <img src={fullResults[0].wmUrl} alt="결과" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: '10px', display: 'block', border: '2px solid #C4510D' }} />
                        </a>
                      ) : fullResults[0]?.error ? (
                        <div style={{ width: '100%', aspectRatio: '4/3', borderRadius: '10px', background: 'rgba(255,0,0,0.06)', border: '1px solid rgba(255,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', boxSizing: 'border-box' }}>
                          <p style={{ fontSize: '11px', color: '#ff6b6b', textAlign: 'center', wordBreak: 'break-all' }}>{fullResults[0].error}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : selected ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px' : '24px', width: isMobile ? '100%' : 'auto' }}>
          <div style={{ maxWidth: '900px' }}>
            {isMobile && (
              <button
                onClick={() => setSelected(null)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', borderRadius: '100px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', marginBottom: '16px' }}
              >
                ← 목록으로
              </button>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 900 }}>{selected.customer_name}</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
                  {selected.customer_phone || '-'}
                  {selected.customer_email && ` · ${selected.customer_email}`}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>

                {/* 단계 진행 버튼 */}
                {STATUS[selected.status]?.next && (
                  <button
                    onClick={() => updateStatus(selected.id, STATUS[selected.status].next!)}
                    disabled={updating}
                    style={{ padding: '10px 20px', borderRadius: '100px', fontSize: '13px', fontWeight: 800, border: 'none', cursor: updating ? 'not-allowed' : 'pointer', background: selected.status === 'pending_payment' ? '#34C759' : selected.status === 'payment_confirmed' ? '#007AFF' : '#C4510D', color: '#fff', opacity: updating ? 0.6 : 1 }}
                  >
                    {STATUS[selected.status].nextLabel}
                  </button>
                )}

                {/* 수동 상태 전환 */}
                {Object.entries(STATUS).map(([s, info]) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(selected.id, s)}
                    style={{ padding: '7px 14px', borderRadius: '100px', fontSize: '11px', fontWeight: 700, border: 'none', cursor: 'pointer', background: selected.status === s ? info.color : 'rgba(255,255,255,0.08)', color: '#fff', opacity: selected.status === s ? 1 : 0.6 }}
                  >
                    {info.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 입금 대기 강조 박스 */}
            {selected.status === 'pending_payment' && (
              <div style={{ background: 'rgba(255,149,0,0.1)', border: '1px solid rgba(255,149,0,0.3)', borderRadius: '14px', padding: '16px 20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <p style={{ color: '#FF9500', fontWeight: 800, fontSize: '15px', marginBottom: '4px' }}>⏳ 입금 대기 중</p>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                    입금 금액: <b style={{ color: '#fff' }}>{selected.v2_meta?.amount?.toLocaleString() || '-'}원</b>
                  </p>
                </div>
                <button
                  onClick={() => updateStatus(selected.id, 'payment_confirmed')}
                  disabled={updating}
                  style={{ padding: '12px 24px', borderRadius: '100px', fontSize: '14px', fontWeight: 800, border: 'none', cursor: updating ? 'not-allowed' : 'pointer', background: '#34C759', color: '#fff' }}
                >
                  ✅ 입금 확인 처리
                </button>
              </div>
            )}

            {/* 입금 확인 알림톡 발송 */}
            {selected.status === 'payment_confirmed' && (
              <div style={{ background: 'rgba(52,199,89,0.08)', border: '1px solid rgba(52,199,89,0.25)', borderRadius: '14px', padding: '16px 20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <p style={{ color: '#34C759', fontWeight: 800, fontSize: '15px', marginBottom: '4px' }}>✅ 입금 확인됨</p>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>고객에게 입금 확인 알림톡을 발송하세요</p>
                </div>
                <button
                  onClick={() => sendNotification(selected.id, 'payment_confirmed')}
                  style={{ padding: '12px 24px', borderRadius: '100px', fontSize: '14px', fontWeight: 800, border: 'none', cursor: 'pointer', background: '#007AFF', color: '#fff' }}
                >
                  💬 알림톡 발송
                </button>
              </div>
            )}

            {/* 주문 정보 */}
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '14px' }}>주문 정보</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {[
                  { label: '플랜',   value: planLabel(selected) },
                  { label: '분위기', value: selected.v2_meta?.mood === 'black' ? '어두운 (Black)' : '밝은 (White)' },
                  { label: '사진 수', value: `${selected.photo_urls?.length || 0}장` },
                  { label: '입금 금액', value: `${selected.v2_meta?.amount?.toLocaleString() || '-'}원` },
                  ...(selected.v2_meta?.plan_type !== 'premium' ? [
                    { label: '그릇 선택', value: selected.v2_meta?.vessel_choice === 'original' ? '원본 그대로' : `추천: ${selected.v2_meta?.recommended_vessel_label || '-'}` },
                  ] : []),
                ].map(row => (
                  <div key={row.label}>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginBottom: '4px' }}>{row.label}</p>
                    <p style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>{row.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 프리미엄 브리핑 */}
            {selected.v2_meta?.plan_type === 'premium' && selected.v2_meta.briefing && (
              <div style={{ background: 'rgba(196,81,13,0.08)', border: '1px solid rgba(196,81,13,0.2)', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--orange, #C4510D)', marginBottom: '14px' }}>📋 프리미엄 브리핑</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginBottom: '6px' }}>원하는 느낌</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {(selected.v2_meta.briefing.vibes || []).map(v => (
                        <span key={v} style={{ padding: '4px 12px', borderRadius: '100px', background: 'rgba(196,81,13,0.2)', color: '#C4510D', fontSize: '12px', fontWeight: 700 }}>
                          {VIBE_LABELS[v] || v}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginBottom: '4px' }}>그릇 희망</p>
                    <p style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>
                      {selected.v2_meta.briefing.vessel_pref === 'recommend' ? '기본 그릇 추천' : '레퍼런스 이미지 참고'}
                    </p>
                  </div>
                  {selected.v2_meta.briefing.free_request && (
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginBottom: '4px' }}>자유 요청</p>
                      <p style={{ color: '#fff', fontSize: '14px', lineHeight: 1.6, background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '12px 14px' }}>{selected.v2_meta.briefing.free_request}</p>
                    </div>
                  )}
                  {/* 레퍼런스 이미지 */}
                  {(selected.v2_meta.briefing.reference_photo_urls?.length > 0) && (
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginBottom: '8px' }}>레퍼런스 이미지</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
                        {selected.v2_meta.briefing.reference_photo_urls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            <img src={url} alt={`ref ${i + 1}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '8px', display: 'block', border: '1px solid rgba(255,255,255,0.1)' }} />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 원본 사진 */}
            {selected.photo_urls?.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: 'rgba(255,255,255,0.7)' }}>
                  📷 원본 사진 ({selected.photo_urls.length}장)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                  {selected.photo_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt={`원본 ${i + 1}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '10px', display: 'block' }} />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* ── AI 생성 (2단계) ── */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>AI 생성</h3>

              {/* 1단계: 음식 업그레이드 */}
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '18px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: stage1Results.length ? '16px' : 0 }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '3px' }}>① 음식 업그레이드</p>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>원본 사진 → 각도/배경 기준 업그레이드 (그릇 유지)</p>
                  </div>
                  <button
                    onClick={runStage1}
                    disabled={stage1Loading}
                    style={{ padding: '10px 20px', borderRadius: '100px', fontSize: '13px', fontWeight: 800, border: 'none', cursor: stage1Loading ? 'not-allowed' : 'pointer', background: stage1Loading ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #FFD600, #FF8C00)', color: stage1Loading ? 'rgba(255,255,255,0.3)' : '#000', flexShrink: 0 }}
                  >
                    {stage1Loading ? '처리 중...' : stage1Results.length ? '↺ 재실행' : '▶ 실행'}
                  </button>
                </div>

                {stage1Results.map((url, i) => (
                  <div key={i} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '12px', marginBottom: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '5px' }}>원본 {i+1}</p>
                        <img src={selected.photo_urls?.[i]} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: '8px', display: 'block' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: '11px', color: '#FF8C00', marginBottom: '5px' }}>1단계 결과</p>
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: '8px', display: 'block', border: '1.5px solid #FF8C00' }} />
                        </a>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="추가 지시사항 (선택)"
                        value={regenPrompts[`1-${i}`] || ''}
                        onChange={e => setRegenPrompts(p => ({ ...p, [`1-${i}`]: e.target.value }))}
                        style={{ flex: 1, padding: '7px 11px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '12px', outline: 'none' }}
                      />
                      <button
                        onClick={() => regenPhoto(1, i)}
                        disabled={regenLoading?.stage === 1 && regenLoading?.index === i}
                        style={{ padding: '7px 13px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', background: 'rgba(255,149,0,0.18)', color: '#FF9500', flexShrink: 0, whiteSpace: 'nowrap' }}
                      >
                        {regenLoading?.stage === 1 && regenLoading?.index === i ? '...' : '↺ 재생성'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* 2단계: 그릇 합성 */}
              {selected.v2_meta?.recommended_vessel_id && (
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '18px', marginBottom: '12px', opacity: stage1Results.length ? 1 : 0.4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: stage2Results.length ? '16px' : 0 }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '3px' }}>② 그릇 합성</p>
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>1단계 결과 → {selected.v2_meta.recommended_vessel_label || selected.v2_meta.recommended_vessel_id} 적용</p>
                    </div>
                    <button
                      onClick={runStage2}
                      disabled={stage2Loading || !stage1Results.length}
                      style={{ padding: '10px 20px', borderRadius: '100px', fontSize: '13px', fontWeight: 800, border: 'none', cursor: (stage2Loading || !stage1Results.length) ? 'not-allowed' : 'pointer', background: (stage2Loading || !stage1Results.length) ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #5856D6, #007AFF)', color: (stage2Loading || !stage1Results.length) ? 'rgba(255,255,255,0.3)' : '#fff', flexShrink: 0 }}
                    >
                      {stage2Loading ? '처리 중...' : stage2Results.length ? '↺ 재실행' : '▶ 실행'}
                    </button>
                  </div>

                  {stage2Results.map((url, i) => (
                    <div key={i} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '12px', marginBottom: '10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        <div>
                          <p style={{ fontSize: '11px', color: '#FF8C00', marginBottom: '5px' }}>1단계</p>
                          <img src={stage1Results[i]} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: '8px', display: 'block' }} />
                        </div>
                        <div>
                          <p style={{ fontSize: '11px', color: '#34C759', marginBottom: '5px' }}>최종 결과 ✨</p>
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <img src={url} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: '8px', display: 'block', border: '1.5px solid #34C759' }} />
                          </a>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="추가 지시사항 (선택)"
                          value={regenPrompts[`2-${i}`] || ''}
                          onChange={e => setRegenPrompts(p => ({ ...p, [`2-${i}`]: e.target.value }))}
                          style={{ flex: 1, padding: '7px 11px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '12px', outline: 'none' }}
                        />
                        <button
                          onClick={() => regenPhoto(2, i)}
                          disabled={regenLoading?.stage === 2 && regenLoading?.index === i}
                          style={{ padding: '7px 13px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', background: 'rgba(52,199,89,0.15)', color: '#34C759', flexShrink: 0, whiteSpace: 'nowrap' }}
                        >
                          {regenLoading?.stage === 2 && regenLoading?.index === i ? '...' : '↺ 재생성'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 내보내기 */}
              {(stage1Results.length > 0 || stage2Results.length > 0) && (
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '18px', marginBottom: '12px' }}>
                  <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '14px' }}>📤 내보내기</p>
                  <button
                    onClick={() => doExport(false)}
                    disabled={exportLoading}
                    style={{ padding: '11px 22px', borderRadius: '100px', fontSize: '13px', fontWeight: 800, border: 'none', cursor: exportLoading ? 'not-allowed' : 'pointer', background: exportLoading ? 'rgba(255,255,255,0.08)' : '#34C759', color: exportLoading ? 'rgba(255,255,255,0.3)' : '#000', marginBottom: '14px' }}
                  >
                    {exportLoading ? '처리 중...' : 'AI 결과물 그대로 내보내기'}
                  </button>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '8px' }}>또는 직접 업로드</p>
                    <div
                      onClick={() => manualInputRef.current?.click()}
                      style={{ border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '10px', padding: '14px', textAlign: 'center', cursor: 'pointer', marginBottom: '10px' }}
                    >
                      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
                        {manualFiles.length ? `${manualFiles.length}장 선택됨` : '클릭하여 이미지 업로드 (여러 장)'}
                      </p>
                      <input
                        ref={manualInputRef}
                        type="file" accept="image/*" multiple style={{ display: 'none' }}
                        onChange={e => { if (e.target.files) setManualFiles(Array.from(e.target.files)); e.target.value = '' }}
                      />
                    </div>
                    {manualFiles.length > 0 && (
                      <button
                        onClick={() => doExport(true)}
                        disabled={exportLoading}
                        style={{ padding: '11px 22px', borderRadius: '100px', fontSize: '13px', fontWeight: 800, border: 'none', cursor: exportLoading ? 'not-allowed' : 'pointer', background: exportLoading ? 'rgba(255,255,255,0.08)' : '#007AFF', color: '#fff' }}
                      >
                        {exportLoading ? '업로드 중...' : '업로드 후 내보내기'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 완성 알림톡 */}
              {exportDone && (
                <div style={{ background: 'rgba(52,199,89,0.08)', border: '1px solid rgba(52,199,89,0.22)', borderRadius: '14px', padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div>
                    <p style={{ color: '#34C759', fontWeight: 800, fontSize: '14px', marginBottom: '3px' }}>✅ 내보내기 완료</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>고객에게 완성 알림톡을 발송하세요</p>
                  </div>
                  <button
                    onClick={() => sendNotification(selected.id, 'ai_done')}
                    style={{ padding: '10px 20px', borderRadius: '100px', fontSize: '13px', fontWeight: 800, border: 'none', cursor: 'pointer', background: '#34C759', color: '#000', flexShrink: 0, whiteSpace: 'nowrap' }}
                  >
                    💬 완성 알림톡 보내기
                  </button>
                </div>
              )}
            </div>

            {/* 카카오톡 채널 전달 */}
            <div style={{ background: 'rgba(254,229,0,0.06)', border: '1px solid rgba(254,229,0,0.15)', borderRadius: '14px', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px', color: '#FEE500' }}>💬 카카오톡 채널 전달</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                  {selected.v2_meta?.kakao_channel_sent ? '✓ 전달 완료됨' : '결과물 전달 후 아래 버튼으로 처리하세요'}
                </p>
              </div>
              {!selected.v2_meta?.kakao_channel_sent ? (
                <button
                  onClick={() => markKakaoSent(selected.id)}
                  style={{ padding: '10px 20px', borderRadius: '100px', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer', background: '#FEE500', color: '#000' }}
                >
                  카카오톡 전달 완료 체크
                </button>
              ) : (
                <span style={{ fontSize: '14px', color: '#FEE500', fontWeight: 700 }}>✅ 완료</span>
              )}
            </div>
          </div>
        </div>
      ) : !isMobile ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '16px' }}>왼쪽에서 주문을 선택하세요</p>
        </div>
      ) : null}
    </div>
  )
}
