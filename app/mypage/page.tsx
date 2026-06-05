'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import BasicPlanModal from '../components/BasicPlanModal'
import CoinChargeModal from '../components/CoinChargeModal'

// ── Constants ────────────────────────────────────────────────────────────────

const SESSION_KEY      = 'menulab_session'
const GEN_OPTIONS_KEY  = 'menulab_last_gen_options'
const GENERATING_KEY   = 'menulab_generating'

const CATS = [
  '전체 보기', '배달앱', 'SNS', '포스터',
  '움직이는 사진', '배경 제거', '포스&키오스크', '테이블 오더', '지도앱',
] as const
type Cat = typeof CATS[number]

const CAT_TO_DB: Partial<Record<Cat, string>> = { '배달앱': '배달앱' }

// Map background label → BasicPlanModal preset id
const BG_ID_BY_LABEL: Record<string, string> = {
  '라이트그레이':         'lightgray',
  '실키 페브릭 아이보리': 'ivory',
  '콘크리트':             'concrete',
  '마블':                 'marble',
}


const SIDEBAR_SERVICES = [
  { id: 'retouch',    name: '메뉴 리터치',  gems: '10젬/장', subtitle: '내 음식사진을 더 먹음직스럽게! 원하는 배경 선택!' },
  { id: 'remake',     name: '메뉴 리메이크', gems: '20젬/장', subtitle: '업그레이드된 음식에 원하는 배경과 그릇까지 선택!' },
  { id: 'collection', name: '메뉴 모음컷',   gems: '',        subtitle: '일반 모음컷과 브랜딩용 모음컷 (프랜차이즈 본사 추천)' },
]

const SIDEBAR_SECTIONS = [
  {
    label: '추천 기능',
    items: [
      { name: '배달앱 메뉴', active: true  },
      { name: 'SNS',         active: false },
      { name: '포스터',      active: false },
      { name: '움직이는 사진', active: false },
      { name: '배경 제거',   active: false },
    ],
  },
  {
    label: '홀 매장',
    items: [
      { name: '포스&키오스크', active: false },
      { name: '테이블 오더',   active: false },
      { name: '지도앱',        active: false },
    ],
  },
]

// ── Types ────────────────────────────────────────────────────────────────────

interface GeneratedImage {
  id: string
  image_url: string
  category: string | null
  platform: string | null
  background_name: string | null
  created_at: string
}

interface LastGenOptions {
  platNames:  string[]
  bgPresetId: string | null
  bgLabel:    string
  bgPrompt:   string
}

interface GeneratingInfo {
  count: number
  completed?: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function downloadFromUrl(url: string, filename: string) {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) throw new Error('CORS fetch failed')
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  } catch {
    window.open(url, '_blank')
  }
}

// ── KakaoIcon ────────────────────────────────────────────────────────────────

function KakaoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 3C6.477 3 2 6.582 2 11.012c0 2.782 1.696 5.232 4.27 6.729l-1.088 3.98a.3.3 0 0 0 .46.325l4.603-3.05c.573.08 1.162.122 1.755.122 5.523 0 10-3.582 10-8.012S17.523 3 12 3Z" fill="#000" />
    </svg>
  )
}

// ── ImageCard ────────────────────────────────────────────────────────────────

function ImageCard({
  image,
  downloading,
  menuOpen,
  onMenuToggle,
  onMenuClose,
  onDownload,
  onDelete,
  onRegenerate,
}: {
  image:        GeneratedImage
  downloading:  boolean
  menuOpen:     boolean
  onMenuToggle: () => void
  onMenuClose:  () => void
  onDownload:   () => void
  onDelete:     () => void
  onRegenerate: () => void
}) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onMenuClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen, onMenuClose])

  const meta = [image.category, image.platform, image.background_name].filter(Boolean).join(' / ')
  const date = new Date(image.created_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })

  return (
    <div style={{
      borderRadius: '16px', overflow: 'hidden',
      background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Image + watermark + menu */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <img
          src={image.image_url}
          alt=""
          style={{ width: '100%', display: 'block', aspectRatio: '4/3', objectFit: 'cover' }}
        />
        {/* ⋮ menu */}
        <div ref={menuRef} style={{ position: 'absolute', top: '8px', right: '8px' }}>
          <button
            onClick={onMenuToggle}
            style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'rgba(0,0,0,0.5)', border: 'none',
              color: '#fff', fontSize: '14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, lineHeight: 1,
            }}
          >⋮</button>
          {menuOpen && (
            <div style={{
              position: 'absolute', top: '34px', right: 0,
              background: '#fff', borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              border: '1px solid rgba(0,0,0,0.06)',
              overflow: 'hidden', minWidth: '120px', zIndex: 20,
            }}>
              <button
                onClick={() => { onMenuClose(); onRegenerate() }}
                style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '13px', fontWeight: 600, borderBottom: '1px solid rgba(0,0,0,0.06)' }}
              >🔄 재생성</button>
              <button
                onClick={() => { onMenuClose(); onDelete() }}
                style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#e53e3e' }}
              >🗑 삭제</button>
            </div>
          )}
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        {/* Metadata */}
        <div>
          <p style={{ fontSize: '11px', color: '#888', marginBottom: '2px', lineHeight: 1.4 }}>{meta || '배달앱 메뉴'}</p>
          <p style={{ fontSize: '10px', color: '#ccc' }}>{date}</p>
        </div>

        {/* Download */}
        <button
          onClick={onDownload}
          disabled={downloading}
          style={{
            width: '100%', padding: '10px', borderRadius: '10px',
            background: downloading ? '#eee' : 'var(--orange)',
            color: downloading ? '#bbb' : '#fff',
            fontWeight: 700, fontSize: '13px', border: 'none',
            cursor: downloading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            transition: 'all 0.15s',
          }}
        >
          {downloading ? (
            <>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
              처리 중...
            </>
          ) : '사진 다운로드 💎 10젬'}
        </button>

        {/* Watermark trial */}
        <button style={{
          width: '100%', padding: '8px', borderRadius: '10px',
          background: 'none', border: '1.5px solid rgba(196,81,13,0.25)',
          color: 'var(--orange)', fontWeight: 700, fontSize: '11px', cursor: 'pointer',
        }}>
          워터마크 제거 1개월 무료 체험하기
        </button>

        {/* Secondary actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <button style={{ padding: '7px 4px', borderRadius: '8px', background: 'rgba(0,0,0,0.04)', border: 'none', fontSize: '11px', fontWeight: 600, color: '#888', cursor: 'pointer' }}>배달앱에 올리기</button>
          <button style={{ padding: '7px 4px', borderRadius: '8px', background: 'rgba(0,0,0,0.04)', border: 'none', fontSize: '11px', fontWeight: 600, color: '#888', cursor: 'pointer' }}>음료 추가하기</button>
        </div>
      </div>
    </div>
  )
}

// ── GeneratingCard ────────────────────────────────────────────────────────────

function GeneratingCard({ count, completed = 0 }: { count: number; completed?: number }) {
  return (
    <div style={{
      borderRadius: '16px', overflow: 'hidden',
      background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Image area — same aspect ratio as ImageCard */}
      <div style={{
        aspectRatio: '4/3', background: '#f5f4f2',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <div style={{ position: 'relative', width: '64px', height: '64px' }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '3px solid transparent',
            borderTopColor: 'var(--orange)',
            animation: 'spin 1s linear infinite',
          }} />
          <div style={{
            position: 'absolute', inset: '10px', borderRadius: '50%',
            border: '3px solid transparent',
            borderTopColor: 'rgba(196,81,13,0.3)',
            animation: 'spin 1.6s linear infinite reverse',
          }} />
          <div style={{
            position: 'absolute', inset: '20px', borderRadius: '50%',
            background: 'rgba(196,81,13,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '11px' }}>✨</span>
          </div>
        </div>
      </div>

      {/* Card body — matches ImageCard */}
      <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        <div>
          <p style={{ fontSize: '11px', color: '#ccc', marginBottom: '2px' }}>AI 생성 중...</p>
          <p style={{ fontSize: '10px', color: '#ddd' }}>잠시만 기다려주세요</p>
        </div>
        <button
          disabled
          style={{
            width: '100%', padding: '10px', borderRadius: '10px',
            background: '#f0f0f0', color: '#bbb',
            fontWeight: 700, fontSize: '13px', border: 'none',
            cursor: 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}
        >
          <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #ddd', borderTopColor: '#bbb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
          생성 중...
        </button>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

function MyPageContent() {
  const searchParams = useSearchParams()
  const kakaoError   = searchParams.get('kakao_error')
  const kakaoDetail  = searchParams.get('detail')

  // Session
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)
  const [sessionName,  setSessionName]  = useState<string>('')
  const [sessionToken, setSessionToken] = useState<string | null>(null)

  // Images
  const [images,      setImages]      = useState<GeneratedImage[]>([])
  const [imgLoading,  setImgLoading]  = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingInfo, setGeneratingInfo] = useState<GeneratingInfo | null>(null)
  const [genError, setGenError] = useState<string | null>(null)
  const baseImageCountRef = useRef(0)

  // UI
  const [activeCat,   setActiveCat]   = useState<Cat>('전체 보기')
  const [menuOpenId,  setMenuOpenId]  = useState<string | null>(null)
  const [downloading, setDownloading] = useState<Set<string>>(new Set())
  const [isMobile,    setIsMobile]    = useState(false)

  // Gem balance
  const [gemBalance,          setGemBalance]           = useState(0)

  // Modals
  const [showBasicModal,      setShowBasicModal]      = useState(false)
  const [showChargeModal,     setShowChargeModal]      = useState(false)
  const [creditShortfall,     setCreditShortfall]      = useState(0)
  const [pendingDownloadId,   setPendingDownloadId]    = useState<string | null>(null)
  const [showCollectionInfo,  setShowCollectionInfo]   = useState(false)
  const [showUpsellModal,     setShowUpsellModal]      = useState(false)
  const upsellShownRef = useRef(false)

  // BasicPlanModal initial options (for "다시 만들기" / regenerate)
  const [modalInitOpts, setModalInitOpts] = useState<{
    platNames?: string[]
    bgPresetId?: string | null
    bgPrompt?: string
  }>({})

  // Last gen options for floating bar
  const [lastOptions, setLastOptions] = useState<LastGenOptions | null>(null)

  // Login slideshow (unchanged from original)
  const SLIDES = [
    { before: '/noodle-before.jpg',                                              after: '/noodle-after.jpg',                 label: '냉면' },
    { before: 'https://i.ibb.co/qK9VJv9/image.png',                             after: 'https://i.ibb.co/xK5Pjg2h/12.png', label: '김치말이냉국수' },
    { before: 'https://i.ibb.co/vxDm2vrx/Kakao-Talk-20260124-144350686-01.png', after: 'https://i.ibb.co/1J0wh6dW/01.jpg', label: '분식 단품' },
    { before: 'https://i.ibb.co/dJjyr7vC/jpg.png',                              after: 'https://i.ibb.co/mrCMBYhD/18.png', label: '샐러드볼' },
  ]
  const slideRef   = useRef<{ idx: number; isAfter: boolean }>({ idx: 0, isAfter: false })
  const [imgSrc,     setImgSrc]     = useState(SLIDES[0].before)
  const [imgLabel,   setImgLabel]   = useState<'BEFORE' | 'AFTER'>('BEFORE')
  const [menuLabel,  setMenuLabel]  = useState(SLIDES[0].label)
  const [slideIdx,   setSlideIdx]   = useState(0)
  const [imgVisible, setImgVisible] = useState(true)

  // ── Effects ────────────────────────────────────────────────────────────────

  // Slideshow for login screen
  useEffect(() => {
    const SHOW_MS = 2200; const FADE_MS = 450
    const timer = setInterval(() => {
      setImgVisible(false)
      setTimeout(() => {
        const { idx, isAfter } = slideRef.current
        let newIdx = idx; let newAfter = !isAfter
        if (isAfter) newIdx = (idx + 1) % SLIDES.length
        slideRef.current = { idx: newIdx, isAfter: newAfter }
        setSlideIdx(newIdx)
        setImgSrc(newAfter ? SLIDES[newIdx].after : SLIDES[newIdx].before)
        setImgLabel(newAfter ? 'AFTER' : 'BEFORE')
        setMenuLabel(SLIDES[newIdx].label)
        setImgVisible(true)
      }, FADE_MS)
    }, SHOW_MS + FADE_MS)
    return () => clearInterval(timer)
  }, [])

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Session + last gen options restore
  useEffect(() => {
    // Last gen options
    try {
      const raw = localStorage.getItem(GEN_OPTIONS_KEY)
      if (raw) setLastOptions(JSON.parse(raw))
    } catch {}

    // Kakao callback cookie
    const kakaoSessionCookie = document.cookie.split(';').find(c => c.trim().startsWith('ml_kakao_session='))
    if (kakaoSessionCookie) {
      try {
        const val = JSON.parse(decodeURIComponent(kakaoSessionCookie.split('=').slice(1).join('=')))
        localStorage.setItem(SESSION_KEY, JSON.stringify({ token: val.token, email: val.email, name: val.name }))
        document.cookie = 'ml_kakao_session=; max-age=0; path=/'
        setSessionEmail(val.email); setSessionName(val.name || ''); setSessionToken(val.token)
        return
      } catch { document.cookie = 'ml_kakao_session=; max-age=0; path=/' }
    }

    // Existing localStorage session
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return
    try {
      const { token, email: e, name } = JSON.parse(raw)
      setSessionEmail(e); setSessionName(name || ''); setSessionToken(token)
    } catch { localStorage.removeItem(SESSION_KEY) }
  }, [])

  // Fetch gem balance
  const fetchGemBalance = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/credits/balance', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (typeof data.balance === 'number') setGemBalance(data.balance)
    } catch {}
  }, [])

  useEffect(() => {
    if (!sessionToken) return
    fetchGemBalance(sessionToken)
  }, [sessionToken, fetchGemBalance])

  // Handle pending plan (from pricing page CTA)
  useEffect(() => {
    if (!sessionToken) return
    try {
      const pending = localStorage.getItem('menulab_pending_plan')
      if (!pending) return
      localStorage.removeItem('menulab_pending_plan')
      setCreditShortfall(0)
      setShowChargeModal(true)
    } catch {}
  }, [sessionToken])

  // Fetch images + run pending generation when token is available
  useEffect(() => {
    if (!sessionToken) return
    fetchImages(sessionToken)

    // Pick up generation request stored by BasicPlanModal before navigation
    const pendingStr = sessionStorage.getItem('menulab_pending_generate')
    if (!pendingStr) {
      try { localStorage.removeItem(GENERATING_KEY) } catch {}
      return
    }
    sessionStorage.removeItem('menulab_pending_generate')
    try {
      const { requests } = JSON.parse(pendingStr) as { requests: Record<string, unknown>[] }
      if (Array.isArray(requests) && requests.length > 0) runGeneration(requests, sessionToken)
    } catch {}
  }, [sessionToken])  // eslint-disable-line react-hooks/exhaustive-deps

  // Polling: 3s during generation, 10s otherwise
  useEffect(() => {
    if (!sessionToken) return
    const ms = isGenerating ? 3000 : 10000
    const interval = setInterval(() => fetchImages(sessionToken), ms)
    return () => clearInterval(interval)
  }, [sessionToken, isGenerating])

  // Show upsell popup once per generation session
  useEffect(() => {
    if (isGenerating && !upsellShownRef.current) {
      upsellShownRef.current = true
      setShowUpsellModal(true)
    }
    if (!isGenerating) {
      upsellShownRef.current = false
      if (sessionToken) fetchGemBalance(sessionToken)
    }
  }, [isGenerating]) // eslint-disable-line react-hooks/exhaustive-deps

  // Shared generation runner — works whether navigating from /v2 or opening modal on this page
  const runGeneration = useCallback((requests: Record<string, unknown>[], token: string) => {
    // Total expected images = sum of platforms per request
    const totalCount = requests.reduce((sum, req) => {
      const plats = (req.platforms as unknown[]) ?? []
      return sum + Math.max(plats.length, 1)
    }, 0)
    setGenError(null)
    setIsGenerating(true)
    setGeneratingInfo({ count: totalCount, completed: 0 })
    ;(async () => {
      // Capture baseline before generation starts
      await fetchImages(token, true)
      let failed = false
      let errorMsg = ''
      let completed = 0
      try {
        for (const body of requests) {
          const res  = await fetch('/api/generate', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body),
          })
          const data = await res.json()
          if (!res.ok) {
            failed   = true
            errorMsg = data.error || `생성 실패 (${res.status})`
            console.error('generate failed:', data)
            break
          }
          completed++
          setGeneratingInfo({ count: totalCount, completed })
          fetchImages(token)
        }
      } catch (e: any) {
        failed   = true
        errorMsg = e?.message || '네트워크 오류가 발생했어요'
        console.error('generate error:', e)
      } finally {
        try { localStorage.removeItem(GENERATING_KEY) } catch {}
        setIsGenerating(false)
        setGeneratingInfo(null)
        if (failed) setGenError(errorMsg)
        fetchImages(token)
      }
    })()
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh lastOptions when BasicPlanModal closes; also pick up any pending generation
  const handleBasicModalClose = useCallback(() => {
    setShowBasicModal(false)
    try {
      const raw = localStorage.getItem(GEN_OPTIONS_KEY)
      if (raw) setLastOptions(JSON.parse(raw))
    } catch {}

    const pendingStr = sessionStorage.getItem('menulab_pending_generate')
    if (pendingStr && sessionToken) {
      sessionStorage.removeItem('menulab_pending_generate')
      try {
        const { requests } = JSON.parse(pendingStr) as { requests: Record<string, unknown>[] }
        if (Array.isArray(requests) && requests.length > 0) {
          runGeneration(requests, sessionToken)
          return
        }
      } catch {}
    }
    if (sessionToken) setTimeout(() => fetchImages(sessionToken), 2000)
  }, [sessionToken, runGeneration])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchImages = useCallback(async (token: string, isBaseline = false) => {
    setImgLoading(true)
    try {
      const res = await fetch('/api/mypage/generated-images', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) { signOut(); return }
      const data = await res.json()
      const imgs: GeneratedImage[] = data.images ?? []
      if (isBaseline) baseImageCountRef.current = imgs.length
      setImages(imgs)
    } catch {}
    setImgLoading(false)
  }, [])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const signOut = () => {
    localStorage.removeItem(SESSION_KEY)
    setSessionEmail(null); setSessionName(''); setSessionToken(null); setImages([])
  }

  const handleDownload = useCallback(async (imageId: string) => {
    if (!sessionEmail) return
    setDownloading(prev => new Set(prev).add(imageId))

    try {
      const res  = await fetch('/api/credits/download', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ imageId, userEmail: sessionEmail }),
      })
      const data = await res.json()

      if (res.status === 402 && data.error === 'insufficient') {
        setCreditShortfall(data.needed - data.balance)
        setPendingDownloadId(imageId)
        setShowChargeModal(true)
        return
      }
      if (!res.ok) throw new Error(data.error || '다운로드 처리 중 오류가 발생했어요')

      await downloadFromUrl(data.url, `menulab_${imageId.slice(-6)}_${Date.now()}.jpg`)
    } catch (e: any) {
      alert(e?.message || '다운로드 중 오류가 발생했어요')
    } finally {
      setDownloading(prev => { const n = new Set(prev); n.delete(imageId); return n })
    }
  }, [sessionEmail])

  const handleDelete = useCallback(async (imageId: string) => {
    if (!sessionToken) return
    if (!confirm('이 사진을 삭제할까요?')) return

    try {
      await fetch('/api/mypage/generated-images', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
        body:    JSON.stringify({ imageId }),
      })
      setImages(prev => prev.filter(img => img.id !== imageId))
    } catch {}
  }, [sessionToken])

  const handleRegenerate = useCallback((image: GeneratedImage) => {
    const bgPresetId = image.background_name ? (BG_ID_BY_LABEL[image.background_name] ?? null) : null
    setModalInitOpts({
      platNames:  image.platform ? [image.platform] : [],
      bgPresetId: bgPresetId,
      bgPrompt:   '',
    })
    setShowBasicModal(true)
  }, [])

  const openNewGeneration = useCallback(() => {
    setModalInitOpts({
      platNames:  lastOptions?.platNames,
      bgPresetId: lastOptions?.bgPresetId,
      bgPrompt:   lastOptions?.bgPrompt,
    })
    setShowBasicModal(true)
  }, [lastOptions])

  // ── Derived ────────────────────────────────────────────────────────────────

  const filteredImages = activeCat === '전체 보기'
    ? images
    : images.filter(img => img.category === CAT_TO_DB[activeCat])

  const recentThumbs = images.slice(0, 5)
  const displayName  = sessionName || (sessionEmail?.startsWith('kakao:') ? '카카오 사용자' : sessionEmail)

  // ── Login screen ──────────────────────────────────────────────────────────

  if (!sessionEmail) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: '360px', animation: 'fadeUp 0.4s ease' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Link href="/v2"><img src="https://i.ibb.co/YF3csF80/image.png" alt="메뉴랩" style={{ height: '40px', width: 'auto' }} /></Link>
          </div>
          <div style={{ background: '#fff', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.1)' }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', overflow: 'hidden', background: '#111' }}>
              <img src={imgSrc} alt={imgLabel} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: imgVisible ? 1 : 0, transition: 'opacity 0.45s ease' }} />
              <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: imgLabel === 'AFTER' ? 'var(--orange)' : 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '100px' }}>{imgLabel}</div>
              <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '100px' }}>{menuLabel}</div>
              <div style={{ position: 'absolute', bottom: '12px', right: '12px', display: 'flex', gap: '5px' }}>
                {SLIDES.map((_, i) => (<div key={i} style={{ width: i === slideIdx ? '16px' : '6px', height: '6px', borderRadius: '3px', background: i === slideIdx ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'all 0.4s' }} />))}
              </div>
            </div>
            <div style={{ padding: '24px 24px 28px' }}>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#222', marginBottom: '16px', lineHeight: 1.5 }}>AI 결과물, 마이페이지에서 바로 확인하세요</p>
              {kakaoError && (
                <div style={{ background: 'rgba(255,59,48,0.07)', border: '1px solid rgba(255,59,48,0.18)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px' }}>
                  <p style={{ color: '#ff3b30', fontSize: '12px', fontWeight: 600, margin: 0 }}>{kakaoError === 'denied' ? '카카오 로그인을 취소했습니다.' : `오류: ${kakaoError}${kakaoDetail ? ` — ${kakaoDetail}` : ''}`}</p>
                </div>
              )}
              <a href="/api/auth/kakao" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', padding: '15px', background: '#FEE500', color: '#000', borderRadius: '12px', fontSize: '15px', fontWeight: 800, textDecoration: 'none', boxSizing: 'border-box', boxShadow: '0 2px 12px rgba(254,229,0,0.5)', transition: 'transform 0.1s, background 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F0D800'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#FEE500'; e.currentTarget.style.transform = 'translateY(0)' }}
              ><KakaoIcon />카카오로 시작하기</a>
              <p style={{ color: '#ccc', fontSize: '11px', textAlign: 'center', marginTop: '14px' }}>
                <Link href="/terms" style={{ color: '#bbb', textDecoration: 'none' }}>이용약관</Link>{' · '}
                <Link href="/privacy" style={{ color: '#bbb', textDecoration: 'none' }}>개인정보처리방침</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Logged-in view ─────────────────────────────────────────────────────────

  return (
    <>
      {/* 모음컷 안내 미니 패널 */}
      {showCollectionInfo && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowCollectionInfo(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', padding: '16px' }}
        >
          <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '400px', padding: '28px 24px', boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--black)' }}>메뉴 모음컷</h3>
              <button onClick={() => setShowCollectionInfo(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#bbb', lineHeight: 1 }}>×</button>
            </div>
            {[
              { name: '일반 모음컷', price: '16,900원~', desc: '여러 메뉴를 한 장에 담는 기본 구성컷', tag: '배달앱·SNS 추천' },
              { name: '브랜딩 모음컷', price: '27,900원~', desc: '브랜드 아이덴티티가 살아있는 프리미엄 구성컷', tag: '프랜차이즈 본사 추천' },
            ].map(item => (
              <div key={item.name} style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 800, fontSize: '15px' }}>{item.name}</span>
                  <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--orange)' }}>{item.price}</span>
                </div>
                <p style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>{item.desc}</p>
                <span style={{ background: 'rgba(196,81,13,0.1)', color: 'var(--orange)', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '100px' }}>{item.tag}</span>
              </div>
            ))}
            <a href="/v2/order?plan=collection" style={{ display: 'block', textAlign: 'center', padding: '13px', borderRadius: '12px', background: 'var(--black)', color: '#fff', fontWeight: 700, fontSize: '14px', textDecoration: 'none', marginTop: '8px' }}>모음컷 주문하기</a>
          </div>
        </div>
      )}

      {/* Sticky nav */}
      <div style={{
        background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)',
        padding: '0 20px', height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <Link href="/v2"><img src="https://i.ibb.co/YF3csF80/image.png" alt="메뉴랩" style={{ height: '48px', width: 'auto' }} /></Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: '#888' }}>{displayName}</span>
          <button onClick={signOut} style={{ padding: '7px 14px', borderRadius: '100px', border: '1.5px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#555' }}>로그아웃</button>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)', background: '#F7F4EF' }}>

        {/* ── Sidebar ── */}
        {!isMobile && (
          <aside style={{
            width: '220px', flexShrink: 0,
            position: 'sticky', top: '56px', height: 'calc(100vh - 56px)',
            overflowY: 'auto', background: '#fff',
            borderRight: '1px solid rgba(0,0,0,0.06)',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Recent thumbnails */}
            <div style={{ padding: '20px 16px 16px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#ccc', letterSpacing: '1.5px', marginBottom: '10px' }}>내가 만든 사진</p>
              {recentThumbs.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '3px' }}>
                  {recentThumbs.map(img => (
                    <div
                      key={img.id}
                      onClick={() => setActiveCat('전체 보기')}
                      style={{ aspectRatio: '1', borderRadius: '5px', overflow: 'hidden', cursor: 'pointer' }}
                    >
                      <img src={img.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ height: '38px', borderRadius: '8px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#ccc' }}>아직 없어요</span>
                </div>
              )}
            </div>

            {/* Service menus */}
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', padding: '14px 0 4px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#ccc', letterSpacing: '1.5px', padding: '0 16px', marginBottom: '6px' }}>서비스</p>
              {SIDEBAR_SERVICES.map(svc => (
                <button
                  key={svc.id}
                  onClick={() => {
                    if (svc.id === 'retouch') { setModalInitOpts({}); setShowBasicModal(true) }
                    else if (svc.id === 'collection') setShowCollectionInfo(true)
                  }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                    width: '100%', padding: '8px 16px',
                    background: 'none', border: 'none', cursor: svc.id === 'remake' ? 'default' : 'pointer',
                    textAlign: 'left', opacity: svc.id === 'remake' ? 0.5 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#222' }}>{svc.name}</span>
                    {svc.gems ? (
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--orange)', background: 'rgba(196,81,13,0.08)', padding: '2px 7px', borderRadius: '100px' }}>{svc.gems}</span>
                    ) : (
                      svc.id === 'remake' && <span style={{ fontSize: '10px', fontWeight: 700, color: '#bbb', background: 'rgba(0,0,0,0.05)', padding: '2px 7px', borderRadius: '100px' }}>준비 중</span>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: '#aaa', lineHeight: 1.4, marginTop: '2px' }}>{svc.subtitle}</span>
                </button>
              ))}
            </div>

            <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', flex: 1 }}>
              {SIDEBAR_SECTIONS.map(section => (
                <div key={section.label} style={{ padding: '16px 0 4px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#ccc', letterSpacing: '1.5px', padding: '0 16px', marginBottom: '6px' }}>{section.label}</p>
                  {section.items.map(item => (
                    <button
                      key={item.name}
                      onClick={() => {
                        if (item.active) {
                          setModalInitOpts({})
                          setShowBasicModal(true)
                        }
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', padding: '9px 16px',
                        background: 'none', border: 'none',
                        cursor: item.active ? 'pointer' : 'default',
                        textAlign: 'left',
                        opacity: item.active ? 1 : 0.55,
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>{item.name}</span>
                      {!item.active && (
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#bbb', background: 'rgba(0,0,0,0.05)', padding: '2px 7px', borderRadius: '100px' }}>준비 중</span>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Username */}
            <div style={{ padding: '16px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#555' }}>{displayName}</p>
            </div>
          </aside>
        )}

        {/* ── Content ── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

          {/* Category tabs */}
          <div style={{
            display: 'flex', gap: '6px',
            padding: '12px 20px', overflowX: 'auto',
            background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.06)',
            position: 'sticky', top: '56px', zIndex: 10,
            scrollbarWidth: 'none',
          }}>
            {CATS.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                style={{
                  padding: '6px 14px', borderRadius: '100px', border: 'none', flexShrink: 0,
                  background: activeCat === cat ? 'var(--black)' : 'rgba(0,0,0,0.06)',
                  color: activeCat === cat ? '#fff' : '#555',
                  fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >{cat}</button>
            ))}
          </div>

          {/* Photo grid */}
          <div style={{ padding: '20px', flex: 1 }}>
            {imgLoading && images.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#bbb' }}>
                <div style={{ fontSize: '28px', marginBottom: '10px', display: 'inline-block', animation: 'spin 1.2s linear infinite' }}>⏳</div>
                <p style={{ fontSize: '14px' }}>불러오는 중...</p>
              </div>
            ) : filteredImages.length === 0 && !isGenerating && !genError ? (
              /* Empty state */
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ fontSize: '52px', marginBottom: '16px' }}>📷</div>
                <p style={{ fontWeight: 800, fontSize: '18px', marginBottom: '8px', color: 'var(--black)' }}>아직 만든 사진이 없어요</p>
                <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '28px', lineHeight: 1.6 }}>
                  베이직 플랜으로 AI 음식 사진을<br />지금 바로 만들어보세요
                </p>
                <button
                  onClick={() => { setModalInitOpts({}); setShowBasicModal(true) }}
                  style={{ padding: '14px 32px', borderRadius: '100px', background: 'var(--orange)', color: '#fff', fontWeight: 800, fontSize: '15px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(196,81,13,0.3)' }}
                >베이직 플랜 시작하기</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', maxWidth: '800px' }}>
                {/* Placeholder cards — one per pending image */}
                {isGenerating && generatingInfo && (() => {
                  const arrived = Math.max(0, images.length - baseImageCountRef.current)
                  const pending = Math.max(0, generatingInfo.count - arrived)
                  return Array.from({ length: pending }).map((_, i) => (
                    <GeneratingCard key={`placeholder-${i}`} count={generatingInfo.count} completed={arrived} />
                  ))
                })()}
                {/* Generation error card */}
                {genError && !isGenerating && (
                  <div style={{
                    borderRadius: '16px', overflow: 'hidden',
                    background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                    padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '10px',
                    border: '1.5px solid rgba(239,68,68,0.25)',
                  }}>
                    <div style={{ fontSize: '28px' }}>⚠️</div>
                    <p style={{ fontWeight: 800, fontSize: '14px', color: '#dc2626' }}>생성에 실패했어요</p>
                    <p style={{ fontSize: '12px', color: '#888', lineHeight: 1.5, wordBreak: 'break-all' }}>{genError}</p>
                    <button
                      onClick={() => setGenError(null)}
                      style={{ padding: '8px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#555' }}
                    >닫기</button>
                  </div>
                )}
                {/* Image cards */}
                {filteredImages.map(img => (
                  <ImageCard
                    key={img.id}
                    image={img}
                    downloading={downloading.has(img.id)}
                    menuOpen={menuOpenId === img.id}
                    onMenuToggle={() => setMenuOpenId(prev => prev === img.id ? null : img.id)}
                    onMenuClose={() => setMenuOpenId(null)}
                    onDownload={() => handleDownload(img.id)}
                    onDelete={() => handleDelete(img.id)}
                    onRegenerate={() => handleRegenerate(img)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Floating bar ── */}
      {lastOptions && images.length > 0 && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: '#fff', borderRadius: '100px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
          padding: '10px 10px 10px 20px',
          display: 'flex', alignItems: 'center', gap: '12px',
          zIndex: 100, whiteSpace: 'nowrap',
          animation: 'fadeUp 0.4s ease',
        }}>
          <p style={{ fontSize: '12px', color: '#888' }}>
            최근 옵션: {lastOptions.platNames[0] || '플랫폼'}{lastOptions.bgLabel ? ` / ${lastOptions.bgLabel}` : ''}
          </p>
          <button
            onClick={openNewGeneration}
            style={{ padding: '10px 18px', borderRadius: '100px', background: 'var(--orange)', color: '#fff', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(196,81,13,0.3)', flexShrink: 0 }}
          >다른 사진으로 또 만들기</button>
        </div>
      )}

      {/* ── Modals ── */}
      {showBasicModal && (
        <BasicPlanModal
          onClose={handleBasicModalClose}
          onGenerate={(requests) => {
            setShowBasicModal(false)
            try {
              const raw = localStorage.getItem(GEN_OPTIONS_KEY)
              if (raw) setLastOptions(JSON.parse(raw))
            } catch {}
            if (sessionToken) runGeneration(requests, sessionToken)
          }}
          initialPlatNames={modalInitOpts.platNames}
          initialBgPresetId={modalInitOpts.bgPresetId}
          initialBgPrompt={modalInitOpts.bgPrompt}
        />
      )}

      {showChargeModal && sessionEmail && (
        <CoinChargeModal
          shortfall={creditShortfall}
          userEmail={sessionEmail}
          onClose={() => setShowChargeModal(false)}
          onSuccess={() => {
            setShowChargeModal(false)
            if (pendingDownloadId) handleDownload(pendingDownloadId)
          }}
        />
      )}
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MyPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)' }}>
        <div style={{ fontSize: '32px', animation: 'spin 1.2s linear infinite' }}>⏳</div>
      </div>
    }>
      <MyPageContent />
    </Suspense>
  )
}
