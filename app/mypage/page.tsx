'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { Suspense } from 'react'
import BasicPlanModal from '../components/BasicPlanModal'
import CoinChargeModal from '../components/CoinChargeModal'
import PhoneVerificationModal from '../components/PhoneVerificationModal'
import CollageModal from '../components/CollageModal'

// ── Constants ────────────────────────────────────────────────────────────────

const SESSION_KEY      = 'menulab_session'
const GEN_OPTIONS_KEY  = 'menulab_last_gen_options'
const GENERATING_KEY   = 'menulab_generating'
const PHONE_OK_KEY     = (id: string) => `menulab_phone_ok_${id}`
const PHONE_SKIP_KEY   = (id: string) => `menulab_phone_skip_${id}`

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
  { id: 'remake',     name: '메뉴샷',      gems: '20젬/장',  subtitle: '업그레이드된 음식에 원하는 배경과 그릇까지 선택!' },
  { id: 'collection', name: '메뉴 모음컷', gems: '💎 40젬~', subtitle: '일반 모음컷과 브랜딩용 모음컷 (프랜차이즈 본사 추천)' },
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
  onOpenPlan,
}: {
  image:        GeneratedImage
  downloading:  boolean
  menuOpen:     boolean
  onMenuToggle: () => void
  onMenuClose:  () => void
  onDownload:   () => void
  onDelete:     () => void
  onRegenerate: () => void
  onOpenPlan:   () => void
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

        {/* Watermark removal → subscription plan */}
        <button
          onClick={onOpenPlan}
          style={{
            width: '100%', padding: '8px', borderRadius: '10px',
            background: 'none', border: '1.5px solid rgba(196,81,13,0.25)',
            color: 'var(--orange)', fontWeight: 700, fontSize: '11px', cursor: 'pointer',
          }}
        >
          지금 워터마크 제거하기
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

// ── MiniCompareSlider ─────────────────────────────────────────────────────────

const MINI_BEFORE = 'https://i.ibb.co/qK9VJv9/image.png'
const MINI_AFTER  = 'https://i.ibb.co/xK5Pjg2h/12.png'
const MINI_KF  = [50, 10, 90, 50]
const MINI_DUR = [1500, 1500, 1500]
const MINI_CYCLE = 4500
function miniEase(t: number) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t }
function calcMiniPos(prog: number) {
  const t = prog % MINI_CYCLE; let s = 0
  for (let i = 0; i < MINI_DUR.length; i++) {
    const e = s + MINI_DUR[i]
    if (t <= e) return MINI_KF[i] + (MINI_KF[i+1] - MINI_KF[i]) * miniEase((t-s)/MINI_DUR[i])
    s = e
  }
  return 50
}

function MiniCompareSlider() {
  const [pos, setPos] = useState(50)
  const ref = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const animRef = useRef<number|null>(null)
  const pauseRef = useRef<ReturnType<typeof setTimeout>|null>(null)
  const progRef = useRef(0)
  const tsRef = useRef<number|null>(null)

  const tick = useCallback((ts: number) => {
    if (tsRef.current !== null) progRef.current = (progRef.current + ts - tsRef.current) % MINI_CYCLE
    tsRef.current = ts
    setPos(calcMiniPos(progRef.current))
    animRef.current = requestAnimationFrame(tick)
  }, [])

  const startAnim = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    tsRef.current = null
    animRef.current = requestAnimationFrame(tick)
  }, [tick])

  const stopAnim = useCallback(() => {
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null }
    tsRef.current = null
  }, [])

  useEffect(() => {
    const t = setTimeout(startAnim, 800)
    return () => { clearTimeout(t); stopAnim(); if (pauseRef.current) clearTimeout(pauseRef.current) }
  }, [startAnim, stopAnim])

  const updatePos = useCallback((clientX: number) => {
    const el = ref.current; if (!el) return
    const { left, width } = el.getBoundingClientRect()
    setPos(Math.min(100, Math.max(0, ((clientX - left) / width) * 100)))
  }, [])

  const onStart = () => { dragging.current = true; stopAnim(); if (pauseRef.current) clearTimeout(pauseRef.current) }
  const onEnd   = () => {
    dragging.current = false
    if (pauseRef.current) clearTimeout(pauseRef.current)
    pauseRef.current = setTimeout(startAnim, 2500)
  }

  return (
    <div ref={ref}
      onMouseDown={onStart} onMouseMove={e => { if (dragging.current) updatePos(e.clientX) }} onMouseUp={onEnd} onMouseLeave={() => { if (dragging.current) onEnd() }}
      onTouchStart={onStart} onTouchMove={e => updatePos(e.touches[0].clientX)} onTouchEnd={onEnd}
      style={{ position: 'relative', width: '100%', aspectRatio: '4/3', overflow: 'hidden', cursor: 'ew-resize', userSelect: 'none', touchAction: 'none' }}
    >
      <img src={MINI_AFTER}  alt="after"  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${100 - pos}% 0 0)`, pointerEvents: 'none' }}>
        <img src={MINI_BEFORE} alt="before" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pos}%`, transform: 'translateX(-50%)', width: '2px', background: '#fff', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '32px', height: '32px', borderRadius: '50%', background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 900, color: '#333', letterSpacing: '-1px' }}>◀▶</div>
      </div>
      <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '100px', pointerEvents: 'none' }}>BEFORE</div>
      <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: '#FF5722', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '100px', pointerEvents: 'none' }}>AFTER</div>
    </div>
  )
}

// ── Tabler icon SVGs ──────────────────────────────────────────────────────────

function IconPhoto() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 8h.01"/>
      <path d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6z"/>
      <path d="M3 16l5-5c.928-.893 2.072-.893 3 0l5 5"/>
      <path d="M14 14l1-1c.928-.893 2.072-.893 3 0l3 3"/>
    </svg>
  )
}

function IconViewfinder() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0"/>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>
    </svg>
  )
}

function IconBowl() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h16a1 1 0 0 1 1 1v1a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8V9a1 1 0 0 1 1-1z"/>
      <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

function MyPageContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const kakaoError   = searchParams.get('kakao_error')
  const kakaoDetail  = searchParams.get('detail')

  // Session
  const [sessionEmail,   setSessionEmail]   = useState<string | null>(null)
  const [sessionName,    setSessionName]    = useState<string>('')
  const [sessionToken,   setSessionToken]   = useState<string | null>(null)
  const [sessionKakaoId, setSessionKakaoId] = useState<string | null>(null)

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
  const [isMobile,        setIsMobile]        = useState(false)
  const [showMobileNav,   setShowMobileNav]   = useState(false)

  // Gem balance
  const [gemBalance,          setGemBalance]           = useState(0)

  // Subscription
  type Subscription = { id: string; plan_key: string; billing_cycle: string; gems_per_cycle: number; price_per_cycle: number; next_billing_at: string | null; status: string }
  const [subscription,        setSubscription]         = useState<Subscription | null>(null)
  const [cancellingSubscription, setCancellingSubscription] = useState(false)

  // Modals
  const [showPhoneVerify,     setShowPhoneVerify]     = useState(false)
  const [showBasicModal,      setShowBasicModal]      = useState(false)
  const [showChargeModal,     setShowChargeModal]      = useState(false)
  const [creditShortfall,     setCreditShortfall]      = useState(0)
  const [pendingDownloadId,   setPendingDownloadId]    = useState<string | null>(null)
  const [showUpsellModal,     setShowUpsellModal]      = useState(false)
  const [showGuideModal,      setShowGuideModal]       = useState(false)
  const [showCollageModal,    setShowCollageModal]     = useState(false)
  const upsellShownRef = useRef(false)
  const [selectedService,     setSelectedService]      = useState<'remake' | null>(null)
  const [modalServiceType,    setModalServiceType]     = useState<'remake'>('remake')

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
        localStorage.setItem(SESSION_KEY, JSON.stringify({ token: val.token, email: val.email, name: val.name, kakaoId: val.kakaoId }))
        document.cookie = 'ml_kakao_session=; max-age=0; path=/'
        setSessionEmail(val.email); setSessionName(val.name || ''); setSessionToken(val.token); setSessionKakaoId(val.kakaoId ?? null)
        return
      } catch { document.cookie = 'ml_kakao_session=; max-age=0; path=/' }
    }

    // Existing localStorage session
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return
    try {
      const { token, email: e, name, kakaoId: kid } = JSON.parse(raw)
      setSessionEmail(e); setSessionName(name || ''); setSessionToken(token); setSessionKakaoId(kid ?? null)
    } catch { localStorage.removeItem(SESSION_KEY) }
  }, [])

  // Phone verification check (1회) — kakaoId 기반 localStorage 캐시 우선 확인
  useEffect(() => {
    if (!sessionToken || !sessionEmail) return
    // kakaoId가 있으면 안정적인 kakaoId로 키 생성, 없으면 email fallback
    const phoneKey = sessionKakaoId ? PHONE_OK_KEY(sessionKakaoId) : PHONE_OK_KEY(sessionEmail)
    const skipKey  = sessionKakaoId ? PHONE_SKIP_KEY(sessionKakaoId) : PHONE_SKIP_KEY(sessionEmail)
    try {
      if (localStorage.getItem(phoneKey) === '1') return
      const skipUntil = Number(localStorage.getItem(skipKey) ?? 0)
      if (Date.now() < skipUntil) return
    } catch {}
    fetch('/api/auth/phone-status', { headers: { Authorization: `Bearer ${sessionToken}` } })
      .then(r => r.json())
      .then(d => {
        if (d.invalidSession) return
        if (d.hasPhone) {
          try { localStorage.setItem(phoneKey, '1') } catch {}
        } else {
          setShowPhoneVerify(true)
        }
      })
      .catch(() => {})
  }, [sessionToken, sessionEmail, sessionKakaoId])

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
    fetch('/api/subscription/status', { headers: { Authorization: `Bearer ${sessionToken}` } })
      .then(r => r.json())
      .then(d => { if (d.subscription) setSubscription(d.subscription) })
      .catch(() => {})
  }, [sessionToken, fetchGemBalance])

  const handleCancelSubscription = useCallback(async () => {
    if (!sessionToken || !subscription) return
    if (!confirm('구독을 해지하면 다음 결제일부터 자동 결제가 중단돼요.\n해지하시겠어요?')) return
    setCancellingSubscription(true)
    try {
      const res = await fetch('/api/subscription/status', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessionToken}` },
      })
      if (res.ok) {
        setSubscription(null)
        alert('구독이 해지됐어요.')
      } else {
        const d = await res.json()
        alert(d.error || '해지 중 오류가 발생했어요')
      }
    } catch {
      alert('네트워크 오류가 발생했어요')
    } finally {
      setCancellingSubscription(false)
    }
  }, [sessionToken, subscription])

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
    if (pendingStr) {
      sessionStorage.removeItem('menulab_pending_generate')
      try {
        const { requests } = JSON.parse(pendingStr) as { requests: Record<string, unknown>[] }
        if (Array.isArray(requests) && requests.length > 0) runGeneration(requests, sessionToken)
      } catch {}
      return
    }

    // No pending generate — restore generating state if a recent generation is in progress
    try {
      const raw = localStorage.getItem(GENERATING_KEY)
      if (raw) {
        const { count, startedAt } = JSON.parse(raw)
        const age = Date.now() - (startedAt ?? 0)
        if (age < 5 * 60 * 1000) {
          setIsGenerating(true)
          setGeneratingInfo({ count: count ?? 1, completed: 0 })
        } else {
          localStorage.removeItem(GENERATING_KEY)
        }
      }
    } catch {}
  }, [sessionToken])  // eslint-disable-line react-hooks/exhaustive-deps

  // Detect completion when generating state was restored from localStorage (cross-navigation)
  useEffect(() => {
    if (!isGenerating) return
    try {
      const raw = localStorage.getItem(GENERATING_KEY)
      if (!raw) return // runGeneration manages its own state
      const { startedAt } = JSON.parse(raw)
      if (!startedAt) return
      const arrived = images.filter(img => new Date(img.created_at).getTime() > startedAt).length
      if (arrived > 0) {
        localStorage.removeItem(GENERATING_KEY)
        setIsGenerating(false)
        setGeneratingInfo(null)
      }
    } catch {}
  }, [images, isGenerating])

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
          const data = await res.json().catch(() => ({ error: res.status === 413 ? '이미지가 너무 커요. 더 작은 사진을 사용해주세요.' : `서버 오류 (${res.status})` }))
          if (!res.ok) {
            failed   = true
            errorMsg = data.error || `생성 실패 (${res.status})`
            console.error('generate failed:', data)
            break
          }
          completed++
          setGeneratingInfo({ count: totalCount, completed })
          await fetchImages(token)
        }
      } catch (e: any) {
        failed   = true
        errorMsg = e?.message || '네트워크 오류가 발생했어요'
        console.error('generate error:', e)
      } finally {
        try { localStorage.removeItem(GENERATING_KEY) } catch {}
        await fetchImages(token)
        setIsGenerating(false)
        setGeneratingInfo(null)
        if (failed) setGenError(errorMsg)
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
            <Link href="/"><img src="https://i.ibb.co/YF3csF80/image.png" alt="메뉴랩" style={{ height: '40px', width: 'auto' }} /></Link>
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
      {/* Sticky nav */}
      <div style={{
        background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)',
        padding: '0 20px', height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        {/* 로고 + 가이드 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/"><img src="https://i.ibb.co/YF3csF80/image.png" alt="메뉴랩" style={{ height: '48px', width: 'auto' }} /></Link>
          <button
            onClick={() => setShowGuideModal(true)}
            style={{ fontSize: '12px', fontWeight: 700, color: '#555', background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '100px', padding: '5px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >사진 업로드 가이드</button>
        </div>

        {/* 데스크탑 우측 */}
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#888', fontWeight: 600 }}>{displayName} 님</span>
            <button
              onClick={() => setShowChargeModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '100px', border: '1.5px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', color: 'var(--black)' }}
            >💎 {gemBalance}젬</button>
            <button onClick={signOut} style={{ padding: '7px 14px', borderRadius: '100px', border: '1.5px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#555' }}>로그아웃</button>
          </div>
        )}

        {/* 모바일 우측: 젬 + 햄버거 */}
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setShowChargeModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 11px', borderRadius: '100px', border: '1.5px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', color: 'var(--black)' }}
            >💎 {gemBalance}</button>
            <button
              onClick={() => setShowMobileNav(true)}
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '5px', padding: '6px', background: 'none', border: 'none', cursor: 'pointer' }}
              aria-label="메뉴"
            >
              <span style={{ display: 'block', width: '22px', height: '2px', background: '#333', borderRadius: '2px' }} />
              <span style={{ display: 'block', width: '22px', height: '2px', background: '#333', borderRadius: '2px' }} />
              <span style={{ display: 'block', width: '22px', height: '2px', background: '#333', borderRadius: '2px' }} />
            </button>
          </div>
        )}
      </div>

      {/* 모바일 사이드 메뉴 드로어 */}
      {showMobileNav && (
        <div
          onClick={() => setShowMobileNav(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '272px', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.18)', overflowY: 'auto' }}
          >
            {/* 닫기 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 16px 0' }}>
              <button onClick={() => setShowMobileNav(false)} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#bbb', lineHeight: 1 }}>×</button>
            </div>

            {/* 유저 정보 + 요금제 */}
            <div style={{ padding: '8px 20px 20px', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
              <Link
                href="/mypage/profile"
                onClick={() => setShowMobileNav(false)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', marginBottom: '3px' }}
              >
                <p style={{ fontSize: '16px', fontWeight: 800, color: '#111', margin: 0 }}>{displayName} 님</p>
                <span style={{ fontSize: '18px', color: '#ccc' }}>›</span>
              </Link>
              <p style={{ fontSize: '12px', color: '#aaa', marginBottom: '16px' }}>
                {sessionEmail ?? ''}
              </p>
              {subscription ? (
                <div style={{ background: 'linear-gradient(135deg, #111 0%, #333 100%)', borderRadius: '14px', padding: '14px 16px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <p style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>
                      {subscription.plan_key === 'basic' ? '베이직' : subscription.plan_key === 'standard' ? '스탠다드' : '프로'} 플랜
                    </p>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.15)', padding: '2px 7px', borderRadius: '100px' }}>활성</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>💎 {subscription.gems_per_cycle}젬/월</p>
                  <button
                    onClick={() => { handleCancelSubscription(); setShowMobileNav(false) }}
                    disabled={cancellingSubscription}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >구독 해지</button>
                </div>
              ) : (
                <div style={{ background: '#f7f4ef', borderRadius: '14px', padding: '14px 16px', marginBottom: '12px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#aaa', letterSpacing: '0.5px', marginBottom: '6px' }}>사용 중인 요금제</p>
                  <p style={{ fontSize: '14px', fontWeight: 800, color: '#333', marginBottom: '2px' }}>무료 플랜</p>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--orange)' }}>💎 {gemBalance}젬 남음</p>
                </div>
              )}
              <Link
                href="/pricing"
                onClick={() => setShowMobileNav(false)}
                style={{ display: 'block', textAlign: 'center', padding: '11px', borderRadius: '10px', background: 'var(--black)', color: '#fff', fontWeight: 700, fontSize: '13px', textDecoration: 'none' }}
              >요금제 보러가기</Link>
            </div>

            {/* 메인 메뉴 */}
            <div style={{ padding: '8px 8px' }}>
              <button
                onClick={() => { setSelectedService(null); setActiveCat('전체 보기'); setShowMobileNav(false) }}
                style={{ width: '100%', textAlign: 'left', padding: '13px 14px', background: 'none', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, color: '#222', cursor: 'pointer' }}
              >내가 만든 사진</button>
            </div>

            {/* 계정 메뉴 */}
            <div style={{ padding: '0 8px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#ccc', letterSpacing: '1.5px', padding: '12px 14px 4px' }}>계정</p>
              {[
                { label: '요금제', href: '/pricing' },
                { label: '내 결제 수단', href: null },
                { label: '젬 이용 내역', href: null },
                { label: '결제 내역', href: null },
              ].map(item => (
                item.href ? (
                  <Link key={item.label} href={item.href} onClick={() => setShowMobileNav(false)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '13px 14px', textDecoration: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, color: '#222' }}
                  >{item.label}</Link>
                ) : (
                  <div key={item.label}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 14px', borderRadius: '10px', opacity: 0.45 }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#222' }}>{item.label}</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#bbb', background: 'rgba(0,0,0,0.06)', padding: '2px 8px', borderRadius: '100px' }}>준비 중</span>
                  </div>
                )
              ))}
            </div>

            {/* 고객지원 메뉴 */}
            <div style={{ padding: '0 8px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#ccc', letterSpacing: '1.5px', padding: '12px 14px 4px' }}>고객지원</p>
              <Link href="/customer" onClick={() => setShowMobileNav(false)}
                style={{ display: 'block', padding: '13px 14px', textDecoration: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, color: '#222' }}
              >고객센터</Link>
              <button onClick={() => { setShowGuideModal(true); setShowMobileNav(false) }}
                style={{ width: '100%', textAlign: 'left', padding: '13px 14px', background: 'none', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, color: '#222', cursor: 'pointer' }}
              >사진 업로드 가이드</button>
            </div>

            {/* 로그아웃 */}
            <div style={{ padding: '8px 8px 40px', marginTop: 'auto', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <button onClick={() => { signOut(); setShowMobileNav(false) }}
                style={{ width: '100%', textAlign: 'left', padding: '13px 14px', background: 'none', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, color: '#e53935', cursor: 'pointer' }}
              >로그아웃</button>
            </div>
          </div>
        </div>
      )}

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
                    if (svc.id === 'remake') setSelectedService('remake')
                    else if (svc.id === 'collection') setShowCollageModal(true)
                  }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                    width: '100%', padding: '8px 16px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    textAlign: 'left', opacity: 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#222' }}>{svc.name}</span>
                    {svc.gems && (
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--orange)', background: 'rgba(196,81,13,0.08)', padding: '2px 7px', borderRadius: '100px' }}>{svc.gems}</span>
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

            {/* Subscription & account */}
            <div style={{ padding: '14px 12px 20px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              {subscription ? (
                <div style={{ background: 'linear-gradient(135deg, #111 0%, #333 100%)', borderRadius: '14px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px' }}>구독 중</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.15)', padding: '2px 7px', borderRadius: '100px' }}>활성</span>
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: 800, color: '#fff', marginBottom: '2px' }}>
                    {subscription.plan_key === 'basic' ? '베이직' : subscription.plan_key === 'standard' ? '스탠다드' : '프로'} 플랜
                  </p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>
                    💎 {subscription.gems_per_cycle}젬/월 · {subscription.billing_cycle === 'yearly' ? '연간' : '월간'}
                  </p>
                  {subscription.next_billing_at && (
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px' }}>
                      다음 결제: {new Date(subscription.next_billing_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                    </p>
                  )}
                  <button
                    onClick={handleCancelSubscription}
                    disabled={cancellingSubscription}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600, cursor: cancellingSubscription ? 'not-allowed' : 'pointer' }}
                  >{cancellingSubscription ? '처리 중...' : '구독 해지'}</button>
                </div>
              ) : (
                <div style={{ background: '#f7f4ef', borderRadius: '14px', padding: '12px 14px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#aaa', marginBottom: '4px' }}>무료 플랜</p>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--orange)', marginBottom: '10px' }}>💎 {gemBalance}젬 남음</p>
                  <Link href="/pricing" style={{ display: 'block', textAlign: 'center', padding: '9px', borderRadius: '9px', background: 'var(--black)', color: '#fff', fontWeight: 700, fontSize: '12px', textDecoration: 'none' }}>구독 플랜 보기</Link>
                </div>
              )}
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#888', marginTop: '12px', padding: '0 2px' }}>{displayName}</p>
            </div>
          </aside>
        )}

        {/* ── Content ── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <style>{`@keyframes marquee-rtl { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>

          {selectedService === 'remake' ? (
            /* ── 미니 랜딩: 메뉴샷 ── */
            <div style={{ flex: 1, overflowY: 'auto', background: '#f0eeeb', padding: '16px 16px 100px' }}>
              <div style={{ maxWidth: '390px', margin: '0 auto', background: '#fff', borderRadius: '16px', overflow: 'hidden' }}>

                {/* Before/After 슬라이더 — 좌우 꽉 차게 */}
                <MiniCompareSlider />

                {/* 텍스트 콘텐츠 */}
                <div style={{ padding: '20px 20px 16px' }}>
                  <span style={{ display: 'inline-block', background: 'rgba(196,81,13,0.08)', color: 'var(--orange)', fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '100px', marginBottom: '12px' }}>💎 20젬 / 장</span>
                  <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--black)', letterSpacing: '-0.5px', marginBottom: '6px', lineHeight: 1.25 }}>스마트폰 사진을<br/>메뉴샷으로</h2>
                  <p style={{ color: '#888', fontSize: '13px', marginBottom: '20px', lineHeight: 1.6 }}>원하는 배경과 구도를 선택하면<br/>AI가 스튜디오급 메뉴 사진으로 만들어드려요.</p>

                  {/* 옵션 카드 3개 — 배경→구도→그릇 순서 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                    {([
                      { icon: <IconPhoto />,      label: '배경 선택', desc: '20+ 프리셋 배경 중 선택' },
                      { icon: <IconViewfinder />, label: '구도 선택', desc: '원본 유지 · 45도 측면 · 항공뷰' },
                      { icon: <IconBowl />,       label: '그릇 선택', desc: '원본 · 도자기 · 무쇠 · 세라믹 · 우드' },
                    ] as { icon: React.ReactNode; label: string; desc: string }[]).map(item => (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '16px', padding: '14px 16px' }}>
                        <span style={{ color: 'var(--orange)', flexShrink: 0 }}>{item.icon}</span>
                        <div>
                          <p style={{ fontWeight: 800, fontSize: '13px', color: 'var(--black)', marginBottom: '2px' }}>{item.label}</p>
                          <p style={{ color: '#aaa', fontSize: '12px', lineHeight: 1.5 }}>{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 플랫폼 마퀴 */}
                  <p style={{ fontSize: '11px', color: '#bbb', fontWeight: 600, marginBottom: '12px', textAlign: 'center', letterSpacing: '1px' }}>사용 가능 플랫폼</p>
                  <div style={{ overflow: 'hidden', WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)', maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}>
                    <div style={{ display: 'flex', gap: '16px', animation: 'marquee-rtl 14s linear infinite', width: 'max-content', alignItems: 'flex-start' }}>
                      {[
                        { name: '배달의민족', size: '1280×960', src: '/logos/baemin.png'      },
                        { name: '쿠팡이츠',   size: '1080×660', src: '/logos/coupangeats.svg' },
                        { name: '요기요',     size: '1080×640', src: '/logos/yogiyo.png'      },
                        { name: '땡겨요',     size: '1080×660', src: '/logos/ddanggyeo.svg'   },
                        { name: '먹깨비',     size: '800×533',  src: '/logos/mukggaebi.webp'  },
                        { name: '배달의민족', size: '1280×960', src: '/logos/baemin.png'      },
                        { name: '쿠팡이츠',   size: '1080×660', src: '/logos/coupangeats.svg' },
                        { name: '요기요',     size: '1080×640', src: '/logos/yogiyo.png'      },
                        { name: '땡겨요',     size: '1080×660', src: '/logos/ddanggyeo.svg'   },
                        { name: '먹깨비',     size: '800×533',  src: '/logos/mukggaebi.webp'  },
                      ].map((logo, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', flexShrink: 0, width: '68px' }}>
                          <img src={logo.src} alt={logo.name} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '12px' }} />
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#222', textAlign: 'center', whiteSpace: 'nowrap' }}>{logo.name}</span>
                          <span style={{ fontSize: '10px', color: '#aaa', textAlign: 'center', whiteSpace: 'nowrap' }}>{logo.size}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div style={{ padding: '8px 20px 20px' }}>
                  <button
                    onClick={() => { setSelectedService(null); setModalInitOpts({}); setModalServiceType('remake'); setShowBasicModal(true) }}
                    style={{ width: '100%', padding: '16px', borderRadius: '100px', background: '#FF5722', color: '#fff', fontWeight: 800, fontSize: '16px', border: 'none', cursor: 'pointer' }}
                  >메뉴샷 만들러 가기 →</button>
                </div>
              </div>
            </div>
          ) : (
            <>
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
                    onOpenPlan={() => setShowUpsellModal(true)}
                  />
                ))}
              </div>
            )}
          </div>
            </>
          )}
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
      {showPhoneVerify && sessionToken && (
        <PhoneVerificationModal
          token={sessionToken}
          onVerified={() => {
            const id = sessionKakaoId ?? sessionEmail
            try { if (id) localStorage.setItem(PHONE_OK_KEY(id), '1') } catch {}
            setShowPhoneVerify(false)
          }}
          onSkip={() => {
            const id = sessionKakaoId ?? sessionEmail
            try { if (id) localStorage.setItem(PHONE_SKIP_KEY(id), String(Date.now() + 30 * 24 * 60 * 60 * 1000)) } catch {}
            setShowPhoneVerify(false)
          }}
        />
      )}
      {showCollageModal && (
        <CollageModal onClose={() => setShowCollageModal(false)} />
      )}

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
          serviceType={modalServiceType}
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

      {/* 업셀 팝업 */}
      {showGuideModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowGuideModal(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', padding: '16px' }}
        >
          <div style={{ background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '400px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}>
            {/* 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 0' }}>
              <p style={{ fontWeight: 800, fontSize: '16px', color: '#222' }}>사진 업로드 가이드</p>
              <button onClick={() => setShowGuideModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888', lineHeight: 1 }}>×</button>
            </div>
            {/* 내용 */}
            <div style={{ padding: '16px 22px 8px' }}>
              <p style={{ fontWeight: 800, fontSize: '17px', marginBottom: '16px', color: '#222', lineHeight: 1.4 }}>
                메뉴사진의 에이스가 될 원본 사진 촬영방법입니다
              </p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {['/예시1.png', '/예시2.png'].map((src, i) => (
                  <div key={i} style={{ flex: 1, aspectRatio: '1/1', borderRadius: '10px', overflow: 'hidden', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={src} alt={`예시${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                  </div>
                ))}
              </div>
              <div style={{ background: '#f5f5f5', borderRadius: '16px', padding: '16px', marginBottom: '14px' }}>
                <p style={{ fontWeight: 800, fontSize: '15px', marginBottom: '12px', color: '#2e7d32', display: 'flex', alignItems: 'center', gap: '6px' }}><span>✔</span><span>좋아요</span></p>
                {['자연광 또는 밝은 조명에서 찍은 사진', '음식을 담은 그릇 전체가 보이는 사진', '흔들리지 않고 선명하게 찍힌 사진', '토핑과 재료 구분이 잘 되는 사진'].map((text, i, arr) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: i < arr.length - 1 ? '8px' : 0 }}>
                    <span style={{ fontSize: '13px', color: '#111', lineHeight: '20px', flexShrink: 0 }}>•</span>
                    <span style={{ fontSize: '13px', color: '#333', lineHeight: '20px' }}>{text}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: '#f5f5f5', borderRadius: '16px', padding: '16px', marginBottom: '14px' }}>
                <p style={{ fontWeight: 800, fontSize: '15px', marginBottom: '12px', color: '#c62828', display: 'flex', alignItems: 'center', gap: '6px' }}><span>✘</span><span>안돼요</span></p>
                {['어두운 곳에서 플래시 촬영한 사진', '음식이나 접시가 테두리에서 잘린 사진', '화질이 지나치게 낮은 사진', 'AI로 이미 제작한 사진'].map((text, i, arr) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: i < arr.length - 1 ? '8px' : 0 }}>
                    <span style={{ fontSize: '13px', color: '#111', lineHeight: '20px', flexShrink: 0 }}>•</span>
                    <span style={{ fontSize: '13px', color: '#333', lineHeight: '20px' }}>{text}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '12px', color: '#7a5c00', lineHeight: 1.6, textAlign: 'center', marginBottom: '16px' }}>
                가이드에 맞지 않는 사진을 업로드할 경우<br />결과가 부자연스럽거나 배달앱 검수에서 반려될 수 있어요.
              </p>
            </div>
            <div style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid rgba(0,0,0,0.07)', padding: '12px 22px 16px' }}>
              <button
                onClick={() => setShowGuideModal(false)}
                style={{ width: '100%', padding: '15px', borderRadius: '12px', background: 'var(--orange)', color: '#fff', fontWeight: 800, fontSize: '16px', border: 'none', cursor: 'pointer' }}
              >확인했어요</button>
            </div>
          </div>
        </div>
      )}

      {showUpsellModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowUpsellModal(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', padding: '16px' }}
        >
          <div style={{ background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '400px', padding: '28px 24px 24px', boxShadow: '0 24px 80px rgba(0,0,0,0.3)', marginBottom: '16px' }}>
            <p style={{ fontSize: '32px', marginBottom: '12px' }}>💎</p>
            <h3 style={{ fontWeight: 900, fontSize: '20px', color: 'var(--black)', letterSpacing: '-0.3px', marginBottom: '8px' }}>구독하면 매월 젬이 충전돼요!</h3>
            <p style={{ color: '#888', fontSize: '14px', lineHeight: 1.7, marginBottom: '24px' }}>구독 플랜을 이용하면 매월 젬이 자동으로 충전돼요.<br />사진이 많을수록 구독이 훨씬 유리해요.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => { setShowUpsellModal(false); window.location.href = '/pricing' }}
                style={{ padding: '14px', borderRadius: '12px', background: 'var(--black)', color: '#fff', fontWeight: 800, fontSize: '15px', border: 'none', cursor: 'pointer' }}
              >구독 플랜 보기 →</button>
              <button
                onClick={() => { setShowUpsellModal(false); setShowChargeModal(true) }}
                style={{ padding: '13px', borderRadius: '12px', background: 'rgba(0,0,0,0.05)', color: '#888', fontWeight: 600, fontSize: '14px', border: 'none', cursor: 'pointer' }}
              >젬 충전하기</button>
            </div>
          </div>
        </div>
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
