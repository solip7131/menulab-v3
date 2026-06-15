'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import CoinChargeModal from './CoinChargeModal'

// ── Types ────────────────────────────────────────────────────────────────────

interface FoodPhoto {
  id: string
  base64: string
  mime: string
  preview: string
  isSample: boolean
}

interface Platform {
  name: string
  width: number
  height: number
}

interface BgPreset {
  id: string
  label: string
  category: 'solid' | 'tile' | 'fabric' | 'wood' | 'concrete'
  src: string
}

type ModalStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
// 8 = 구도 선택 (remake only)
// 9 = 그릇 선택 (remake only)
type BgCatTab = '전체' | '단색' | '타일' | '패브릭' | '우드' | '콘크리트'

// ── Constants ────────────────────────────────────────────────────────────────

const DELIVERY_PLATFORMS: Platform[] = [
  { name: '배달의민족', width: 1280, height: 960 },
  { name: '쿠팡이츠',   width: 1080, height: 660 },
  { name: '요기요',     width: 1080, height: 640 },
  { name: '땡겨요',     width: 1080, height: 660 },
  { name: '먹깨비',     width: 800,  height: 533 },
]

const BG_PRESETS: BgPreset[] = [
  { id: 'lightgray', label: '라이트그레이',         category: 'solid',    src: '/backgrounds/lightgray.jpg' },
  { id: 'ivory',     label: '실키 페브릭 아이보리', category: 'solid',    src: '/backgrounds/ivory.jpg'     },
  { id: 'concrete',  label: '콘크리트',             category: 'concrete', src: '/backgrounds/concrete.jpg'  },
  { id: 'marble',    label: '마블',                 category: 'tile',     src: '/backgrounds/marble.jpg'    },
]

const SAMPLE_SRCS = [
  { id: 'sample-1', src: '/noodle-before.jpg', mime: 'image/jpeg' },
  { id: 'sample-2', src: '/noodle-after.jpg',  mime: 'image/jpeg' },
]

const BG_CAT_TABS: BgCatTab[] = ['전체', '단색', '타일', '패브릭', '우드', '콘크리트']

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fileToPhoto(file: File): Promise<FoodPhoto> {
  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const MAX = 1280
      let w = img.naturalWidth, h = img.naturalHeight
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX }
        else { w = Math.round(w * MAX / h); h = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      canvas.toBlob((blob) => {
        if (!blob) { resolve({ id: `photo-${Date.now()}`, base64: '', mime: 'image/jpeg', preview: '', isSample: false }); return }
        const reader = new FileReader()
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string
          resolve({
            id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            base64: dataUrl.split(',')[1],
            mime: 'image/jpeg',
            preview: dataUrl,
            isSample: false,
          })
        }
        reader.readAsDataURL(blob)
      }, 'image/jpeg', 0.85)
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        resolve({ id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, base64: dataUrl.split(',')[1], mime: file.type, preview: dataUrl, isSample: false })
      }
      reader.readAsDataURL(file)
    }
    img.src = objectUrl
  })
}

async function urlToBase64(src: string, maxPx = 1280): Promise<{ base64: string; mime: string }> {
  const res = await fetch(src)
  const blob = await res.blob()
  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(blob)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let w = img.naturalWidth, h = img.naturalHeight
      if (w > maxPx || h > maxPx) {
        if (w > h) { h = Math.round(h * maxPx / w); w = maxPx }
        else { w = Math.round(w * maxPx / h); h = maxPx }
      }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      canvas.toBlob((b) => {
        if (!b) { resolve({ base64: '', mime: 'image/jpeg' }); return }
        const reader = new FileReader()
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string
          resolve({ base64: dataUrl.split(',')[1], mime: 'image/jpeg' })
        }
        reader.readAsDataURL(b)
      }, 'image/jpeg', 0.85)
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        resolve({ base64: dataUrl.split(',')[1], mime: blob.type || 'image/jpeg' })
      }
      reader.readAsDataURL(blob)
    }
    img.src = objectUrl
  })
}

async function ensureSampleBase64(photo: FoodPhoto): Promise<FoodPhoto> {
  if (photo.base64) return photo
  const cfg = SAMPLE_SRCS.find(s => s.id === photo.id)
  if (!cfg) return photo
  try {
    const data = await urlToBase64(cfg.src)
    return { ...photo, base64: data.base64, mime: data.mime }
  } catch {
    return photo
  }
}

async function applyWatermark(base64: string, mime: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      ctx.save()
      ctx.font = 'bold 48px Arial, sans-serif'
      const angle = -35 * Math.PI / 180
      for (let y = -120; y < canvas.height + 240; y += 120) {
        for (let x = -200; x < canvas.width + 400; x += 200) {
          ctx.save()
          ctx.translate(x, y)
          ctx.rotate(angle)
          ctx.strokeStyle = 'rgba(0,0,0,0.15)'
          ctx.lineWidth = 1
          ctx.strokeText('Menulab', 0, 0)
          ctx.fillStyle = 'rgba(255,255,255,0.45)'
          ctx.fillText('Menulab', 0, 0)
          ctx.restore()
        }
      }
      ctx.restore()
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(`data:${mime};base64,${base64}`); return }
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        },
        'image/jpeg',
        0.92,
      )
    }
    img.onerror = () => resolve(`data:${mime};base64,${base64}`)
    img.src = `data:${mime};base64,${base64}`
  })
}

async function downloadResized(
  base64: string,
  mime: string,
  width: number,
  height: number,
  filename: string,
) {
  return new Promise<void>((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      const imgAspect = img.width / img.height
      const tgtAspect = width / height
      let sx = 0, sy = 0, sw = img.width, sh = img.height
      if (imgAspect > tgtAspect) {
        sw = img.height * tgtAspect
        sx = (img.width - sw) / 2
      } else {
        sh = img.width / tgtAspect
        sy = (img.height - sh) / 2
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(); return }
          const a = document.createElement('a')
          a.href = URL.createObjectURL(blob)
          a.download = filename
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          setTimeout(() => URL.revokeObjectURL(a.href), 1000)
          resolve()
        },
        'image/jpeg',
        0.92,
      )
    }
    img.onerror = () => resolve()
    img.src = `data:${mime};base64,${base64}`
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
  onGenerate?: (requests: Record<string, unknown>[]) => void
  initialPlatNames?: string[]
  initialBgPresetId?: string | null
  initialBgPrompt?: string
  serviceType?: 'retouch' | 'remake'
}

export default function BasicPlanModal({ onClose, onGenerate, initialPlatNames, initialBgPresetId, initialBgPrompt, serviceType = 'retouch' }: Props) {
  const router = useRouter()
  const [step, setStep]                     = useState<ModalStep>(1)
  const [photos, setPhotos]                 = useState<FoodPhoto[]>([])
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set())
  const [photoMenuOpen, setPhotoMenuOpen]   = useState(false)

  const [platformTab, setPlatformTab]       = useState<'delivery' | 'custom'>('delivery')
  const [selectedPlatNames, setSelectedPlatNames] = useState<Set<string>>(
    () => new Set(initialPlatNames ?? []),
  )
  const [customWidth, setCustomWidth]       = useState('')
  const [customHeight, setCustomHeight]     = useState('')

  const [bgMethod, setBgMethod]             = useState<'prompt' | 'preset' | null>(
    () => initialBgPresetId ? 'preset' : initialBgPrompt ? 'prompt' : null,
  )
  const [bgPrompt, setBgPrompt]             = useState(initialBgPrompt ?? '')
  const [selectedBgId, setSelectedBgId]     = useState<string | null>(initialBgPresetId ?? null)
  const [bgData, setBgData]                 = useState<{ base64: string; mime: string } | null>(null)
  const [bgCatTab, setBgCatTab]             = useState<BgCatTab>('전체')

  const [genProgress, setGenProgress]       = useState(0)
  const [results, setResults]               = useState<{ base64: string; mime: string; imageId?: string }[]>([])
  const [watermarked, setWatermarked]       = useState<string[]>([])

  const [paying, setPaying]                 = useState(false)
  const [error, setError]                   = useState<string | null>(null)

  // 리메이크 전용 상태
  const [remakeAngle,  setRemakeAngle]  = useState<'original' | 'side45' | 'topdown'>('original')
  const [remakeVessel, setRemakeVessel] = useState<string>('original')

  // 콩(크레딧) 관련 상태
  const [userEmail, setUserEmail]           = useState<string | null>(null)
  const [showChargeModal, setShowChargeModal] = useState(false)
  const [creditShortfall, setCreditShortfall] = useState(0)

  // 업로드 가이드
  const [showGuide,    setShowGuide]    = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoMenuRef = useRef<HTMLDivElement>(null)

  // Load sample photos + saved user photos on mount
  useEffect(() => {
    const samples: FoodPhoto[] = SAMPLE_SRCS.map(s => ({
      id: s.id, base64: '', mime: s.mime, preview: s.src, isSample: true,
    }))
    try {
      const saved = localStorage.getItem('menulab_saved_photos')
      if (saved) {
        const userPhotos: FoodPhoto[] = JSON.parse(saved)
        setPhotos([...userPhotos, ...samples])
        return
      }
    } catch {}
    setPhotos(samples)
  }, [])

  // localStorage에서 세션 이메일 로드
  useEffect(() => {
    try {
      const raw = localStorage.getItem('menulab_session')
      if (raw) {
        const { email } = JSON.parse(raw)
        if (email) setUserEmail(email)
      }
    } catch {}
  }, [])

  // Close photo menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (photoMenuRef.current && !photoMenuRef.current.contains(e.target as Node)) {
        setPhotoMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Load bgData for initially selected preset
  useEffect(() => {
    if (!initialBgPresetId) return
    const bg = BG_PRESETS.find(b => b.id === initialBgPresetId)
    if (!bg) return
    urlToBase64(bg.src).then(data => setBgData(data)).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Computed ──────────────────────────────────────────────────────────────

  const selectedPhotos = photos.filter(p => selectedPhotoIds.has(p.id))

  const activePlatforms: Platform[] = (() => {
    if (platformTab === 'custom') {
      const w = parseInt(customWidth, 10)
      const h = parseInt(customHeight, 10)
      if (w > 0 && h > 0) return [{ name: '직접입력', width: w, height: h }]
      return []
    }
    return DELIVERY_PLATFORMS.filter(p => selectedPlatNames.has(p.name))
  })()

  const selectedBgPreset = BG_PRESETS.find(b => b.id === selectedBgId) ?? null

  const bgLabel = bgMethod === 'prompt'
    ? (bgPrompt.trim() || '직접 입력한 배경')
    : (selectedBgPreset?.label ?? '')

  const mainPlatName   = activePlatforms[0]?.name ?? '플랫폼'
  const extraPlatCount = activePlatforms.length - 1
  const totalGenCount  = selectedPhotos.length * Math.max(activePlatforms.length, 1)

  const filteredBgs = bgCatTab === '전체'    ? BG_PRESETS
    : bgCatTab === '단색'                    ? BG_PRESETS.filter(b => b.category === 'solid')
    : bgCatTab === '타일'                    ? BG_PRESETS.filter(b => b.category === 'tile')
    : bgCatTab === '패브릭'                  ? BG_PRESETS.filter(b => b.category === 'fabric')
    : bgCatTab === '우드'                    ? BG_PRESETS.filter(b => b.category === 'wood')
    : bgCatTab === '콘크리트'                ? BG_PRESETS.filter(b => b.category === 'concrete')
    : BG_PRESETS

  const canProceed1 = selectedPhotoIds.size > 0
  const canProceed2 = activePlatforms.length > 0
  const canProceed3 = (bgMethod === 'prompt' && bgPrompt.trim().length > 0)
                   || (bgMethod === 'preset' && !!selectedBgId)

  // ── Handlers ──────────────────────────────────────────────────────────────

  const goTo = useCallback((s: ModalStep) => { setError(null); setStep(s) }, [])

  const addFromFiles = useCallback(async (files: FileList | null) => {
    if (!files) return
    const valid = Array.from(files).filter(f => f.type.startsWith('image/'))
    const newPhotos = await Promise.all(valid.map(fileToPhoto))
    setPhotos(prev => {
      const merged = [...prev, ...newPhotos]
      const samples = merged.filter(p => p.isSample)
      const user    = merged.filter(p => !p.isSample).slice(0, 10)
      const next    = [...user, ...samples]
      // Save user photos to localStorage for persistence
      try {
        localStorage.setItem('menulab_saved_photos', JSON.stringify(user))
      } catch {}
      return next
    })
    // Auto-select newly added photos
    setSelectedPhotoIds(prev => {
      const n = new Set(prev)
      newPhotos.forEach(p => { if (n.size < 10) n.add(p.id) })
      return n
    })
  }, [])

  const removePhoto = useCallback((id: string) => {
    setPhotos(prev => {
      const next = prev.filter(p => p.id !== id || p.isSample)
      try {
        localStorage.setItem('menulab_saved_photos', JSON.stringify(next.filter(p => !p.isSample)))
      } catch {}
      return next
    })
    setSelectedPhotoIds(prev => { const n = new Set(prev); n.delete(id); return n })
  }, [])

  const togglePhotoSelect = useCallback((id: string) => {
    setSelectedPhotoIds(prev => {
      const n = new Set(prev)
      if (n.has(id)) { n.delete(id) }
      else if (n.size < 10) { n.add(id) }
      return n
    })
  }, [])

  const togglePlatform = useCallback((name: string) => {
    setSelectedPlatNames(prev => {
      const n = new Set(prev)
      if (n.has(name)) n.delete(name)
      else n.add(name)
      return n
    })
  }, [])

  const selectBgPreset = useCallback(async (bg: BgPreset) => {
    setBgMethod('preset')
    setBgPrompt('')
    setSelectedBgId(bg.id)
    setBgData(null)
    setError(null)
    try {
      const data = await urlToBase64(bg.src)
      setBgData(data)
    } catch {
      setError('배경 이미지를 불러오지 못했어요.')
    }
  }, [])

  const handleGenerate = useCallback(async () => {
    setError(null)

    // Load base64 for sample photos (user-uploaded already have it)
    let loadedPhotos: FoodPhoto[]
    try {
      loadedPhotos = await Promise.all(selectedPhotos.map(ensureSampleBase64))
    } catch {
      loadedPhotos = selectedPhotos
    }

    const validPhotos = loadedPhotos.filter(p => p.base64)
    if (validPhotos.length === 0) {
      setError('사진 데이터를 불러오지 못했어요. 다시 시도해주세요.')
      return
    }

    // One request per photo — all platforms passed together (route saves one record per platform)
    const requests: Record<string, unknown>[] = validPhotos.map(photo => {
      const body: Record<string, unknown> = {
        foodImages:     [{ base64: photo.base64, mime: photo.mime }],
        platforms:      activePlatforms.length > 0 ? activePlatforms : [{ name: '기본', width: 1280, height: 960 }],
        userEmail:      userEmail ?? undefined,
        backgroundName: bgMethod === 'preset' ? (selectedBgPreset?.label ?? undefined) : undefined,
        serviceType,
        angle:  remakeAngle,
        vessel: remakeVessel,
      }
      if (bgMethod === 'preset' && bgData) {
        body.bgImageBase64 = bgData.base64
        body.bgImageMime   = bgData.mime
      } else if (bgMethod === 'prompt' && bgPrompt.trim()) {
        body.bgPrompt = bgPrompt.trim()
      }
      return body
    })

    try {
      localStorage.setItem('menulab_last_gen_options', JSON.stringify({
        platNames:  activePlatforms.map(p => p.name),
        bgPresetId: bgMethod === 'preset' ? (selectedBgPreset?.id ?? null) : null,
        bgLabel:    bgMethod === 'preset'
          ? (selectedBgPreset?.label ?? '')
          : (bgMethod === 'prompt' ? bgPrompt : ''),
        bgPrompt:   bgMethod === 'prompt' ? bgPrompt : '',
      }))
      localStorage.setItem('menulab_generating', JSON.stringify({ count: validPhotos.length }))
    } catch {}

    if (onGenerate) {
      // Direct callback — avoids sessionStorage quota issues with large images
      onGenerate(requests)
      onClose()
    } else {
      // Cross-page navigation fallback (e.g. navigating from /v2 to /mypage)
      try {
        sessionStorage.setItem('menulab_pending_generate', JSON.stringify({ requests }))
      } catch {}
      onClose()
      router.push('/mypage')
    }
  }, [selectedPhotos, bgMethod, bgData, bgPrompt, activePlatforms, onClose, onGenerate, router, userEmail, selectedBgPreset])

  // 다운로드 버튼 클릭 → 10젬 차감 → 원본 다운로드
  const handleDownloadWithCredits = useCallback(async () => {
    setError(null)
    setPaying(true)

    try {
      const firstWithId = results.find(r => r.imageId)

      if (firstWithId?.imageId) {
        const res = await fetch('/api/credits/download', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ imageId: firstWithId.imageId, userEmail }),
        })
        const data = await res.json()

        if (res.status === 402 && data.error === 'insufficient') {
          setCreditShortfall(data.needed - data.balance)
          setShowChargeModal(true)
          return
        }

        if (!res.ok) throw new Error(data.error || '다운로드 처리 중 오류가 발생했어요')
      } else {
        // Supabase Storage 저장 실패 케이스 — 콩만 차감
        const gemCost = serviceType === 'remake' ? 20 : 10
        const res = await fetch('/api/credits/use', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ userEmail, amount: gemCost, description: `사진 다운로드 (${serviceType === 'remake' ? '리메이크' : '리터치'})` }),
        })
        const data = await res.json()

        if (res.status === 402 && data.error === 'insufficient') {
          setCreditShortfall(data.needed - data.balance)
          setShowChargeModal(true)
          return
        }

        if (!res.ok) throw new Error(data.error || '다운로드 처리 중 오류가 발생했어요')
      }

      // 콩 차감 성공 → 원본 다운로드
      const ts = Date.now()
      const platforms = activePlatforms.length > 0
        ? activePlatforms
        : [{ name: 'menulab', width: 1280, height: 960 }]

      for (let ri = 0; ri < results.length; ri++) {
        const r = results[ri]
        for (const platform of platforms) {
          const filename = `menulab_${platform.name}_${ri + 1}_${ts}.jpg`
          await downloadResized(r.base64, r.mime, platform.width, platform.height, filename)
          await new Promise(resolve => setTimeout(resolve, 150))
        }
      }

      goTo(7)
    } catch (e: any) {
      setError(e?.message || '다운로드 중 오류가 발생했어요')
    } finally {
      setPaying(false)
    }
  }, [userEmail, results, activePlatforms, goTo])

  // ── Shared bottom bar (STEP 1–3) ──────────────────────────────────────────

  // 리메이크는 스텝 2 → 8(구도) → 9(그릇) → 3, 리터치는 2 → 3
  const isRemake = serviceType === 'remake'
  const canNext  = step === 1 ? canProceed1
                 : step === 2 ? canProceed2
                 : step === 8 ? true
                 : step === 9 ? true
                 : canProceed3
  const btnLabel = step === 1 ? `선택 (${selectedPhotoIds.size}장)` : '다음'
  const onNext   = step === 1 ? () => { if (canProceed1) goTo(2) }
                 : step === 2 ? () => { if (canProceed2) goTo(isRemake ? 8 : 3) }
                 : step === 8 ? () => goTo(9)
                 : step === 9 ? () => goTo(3)
                 : () => { if (canProceed3) goTo(4) }

  // 뒤로가기 (step < 5)
  const goPrevStep = () => {
    if (step === 3 && isRemake) goTo(9)
    else if (step === 9) goTo(8)
    else if (step === 8) goTo(2)
    else if (step > 1 && step < 5) goTo((step - 1) as ModalStep)
  }

  // 총 스텝 수 (헤더 표시용)
  const totalSteps = isRemake ? 9 : 7
  // 스텝 순서 인덱스 (표시용)
  const remakeOrder: ModalStep[] = [1, 2, 8, 9, 3, 4, 5, 6, 7]
  const retouchOrder: ModalStep[] = [1, 2, 3, 4, 5, 6, 7]
  const stepOrder = isRemake ? remakeOrder : retouchOrder
  const visualStep = stepOrder.indexOf(step) + 1

  // ── Step title ────────────────────────────────────────────────────────────

  const stepTitles: Record<ModalStep, string> = {
    1: `사진 선택하기 ${selectedPhotoIds.size} / 10`,
    2: '어떤 플랫폼에 필요한가요?',
    3: '배경을 설정해 주세요',
    4: '이렇게 만들게요',
    5: 'AI 생성 중...',
    6: '미리보기',
    7: '다운로드 완료!',
    8: '구도를 선택해 주세요',
    9: '그릇을 선택해 주세요',
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
        padding: '16px',
      }}
    >
      <div style={{
        background: '#fff', borderRadius: '24px',
        width: '100%', maxWidth: '560px', maxHeight: '94vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
      }}>

        {/* ── Sticky Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 22px 14px', borderBottom: '1px solid rgba(0,0,0,0.07)',
          flexShrink: 0, borderRadius: '24px 24px 0 0', background: '#fff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {(showGuide || (step > 1 && step < 5)) && (
              <button
                onClick={() => showGuide ? setShowGuide(false) : goPrevStep()}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#888', padding: '2px 6px 2px 0', lineHeight: 1 }}
              >←</button>
            )}
            <div>
              {showGuide ? (
                <h3 style={{ fontSize: '16px', fontWeight: 900, color: 'var(--black)', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                  사진 업로드 가이드
                </h3>
              ) : (
                <>
                  <p style={{ fontSize: '10px', color: 'var(--orange)', fontWeight: 700, letterSpacing: '2px', marginBottom: '2px' }}>
                    {isRemake ? '리메이크' : '리터치'} · STEP {visualStep} / {totalSteps}
                  </p>
                  <h3 style={{ fontSize: '16px', fontWeight: 900, color: 'var(--black)', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                    {stepTitles[step]}
                  </h3>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '26px', cursor: 'pointer', color: '#bbb', lineHeight: 1, padding: '4px', flexShrink: 0 }}
          >×</button>
        </div>

        {/* ── Scrollable Body ── */}
        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* ── 업로드 가이드 ── */}
          {showGuide && (
            <>
              <div style={{ padding: '20px 22px' }}>
                <p style={{ fontWeight: 800, fontSize: '18px', marginBottom: '16px', color: '#222', lineHeight: 1.4 }}>
                  메뉴사진의 에이스가 될 원본 사진 촬영방법입니다
                </p>

                {/* 예시 이미지 */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  {['/예시1.png', '/예시2.png'].map((src, i) => (
                    <div key={i} style={{ flex: 1, aspectRatio: '1/1', borderRadius: '10px', overflow: 'hidden', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={src} alt={`예시${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                    </div>
                  ))}
                </div>

                {/* 좋아요 */}
                <div style={{ background: '#f5f5f5', borderRadius: '16px', padding: '16px', marginBottom: '14px' }}>
                  <p style={{ fontWeight: 800, fontSize: '15px', marginBottom: '12px', color: '#2e7d32', display: 'flex', alignItems: 'center', gap: '6px' }}><span>✔</span><span>좋아요</span></p>
                  {[
                    '자연광 또는 밝은 조명에서 찍은 사진',
                    '음식을 담은 그릇 전체가 보이는 사진',
                    '흔들리지 않고 선명하게 찍힌 사진',
                    '토핑과 재료 구분이 잘 되는 사진',
                  ].map((text, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: i < 3 ? '8px' : 0 }}>
                      <span style={{ fontSize: '13px', color: '#111', lineHeight: '20px', flexShrink: 0 }}>•</span>
                      <span style={{ fontSize: '13px', color: '#333', lineHeight: '20px' }}>{text}</span>
                    </div>
                  ))}
                </div>

                {/* 사용 불가 */}
                <div style={{ background: '#f5f5f5', borderRadius: '16px', padding: '16px', marginBottom: '14px' }}>
                  <p style={{ fontWeight: 800, fontSize: '15px', marginBottom: '12px', color: '#c62828', display: 'flex', alignItems: 'center', gap: '6px' }}><span>✘</span><span>안돼요</span></p>
                  {[
                    '어두운 곳에서 플래시 촬영한 사진',
                    '음식이나 접시가 테두리에서 잘린 사진',
                    '화질이 지나치게 낮은 사진',
                    'AI로 이미 제작한 사진',
                  ].map((text, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: i < 3 ? '8px' : 0 }}>
                      <span style={{ fontSize: '13px', color: '#111', lineHeight: '20px', flexShrink: 0 }}>•</span>
                      <span style={{ fontSize: '13px', color: '#333', lineHeight: '20px' }}>{text}</span>
                    </div>
                  ))}
                </div>

                {/* 주의 */}
                <p style={{ fontSize: '12px', color: '#7a5c00', lineHeight: 1.6, textAlign: 'center' }}>
                  가이드에 맞지 않는 사진을 업로드할 경우<br />결과가 부자연스럽거나 배달앱 검수에서 반려될 수 있어요.
                </p>
              </div>

              {/* Confirm — sticky bottom */}
              <div style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid rgba(0,0,0,0.07)', padding: '12px 22px 16px' }}>
                <button
                  onClick={() => setShowGuide(false)}
                  style={{ width: '100%', padding: '15px', borderRadius: '12px', background: 'var(--orange)', color: '#fff', fontWeight: 800, fontSize: '16px', border: 'none', cursor: 'pointer' }}
                >확인했어요</button>
              </div>
            </>
          )}

          {/* ── STEP 1: 사진 선택 ── */}
          {!showGuide && step === 1 && (
            <>
              <div style={{ padding: '16px 22px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                  <span
                    onClick={() => setShowGuide(true)}
                    style={{ fontSize: '12px', color: 'var(--orange)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    사진 업로드 가이드
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {/* + Add button */}
                  <div style={{ position: 'relative' }} ref={photoMenuRef}>
                    <button
                      onClick={() => setPhotoMenuOpen(prev => !prev)}
                      style={{
                        width: '100%', aspectRatio: '1', borderRadius: '12px',
                        border: '2px dashed rgba(0,0,0,0.18)', background: '#fafafa',
                        cursor: 'pointer', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: '4px',
                      }}
                    >
                      <div style={{ position: 'relative', width: '36px', height: '36px' }}>
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                          <circle cx="12" cy="13" r="4"/>
                        </svg>
                        <div style={{
                          position: 'absolute', bottom: 0, right: 0,
                          width: '16px', height: '16px', borderRadius: '50%',
                          background: 'var(--orange)', border: '2px solid #fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span style={{ color: '#fff', fontSize: '11px', fontWeight: 900, lineHeight: 1, marginTop: '-1px' }}>+</span>
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', color: '#aaa', fontWeight: 600 }}>추가</span>
                    </button>

                    {photoMenuOpen && (
                      <div style={{
                        position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 30,
                        background: '#fff', borderRadius: '14px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                        border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden', minWidth: '200px',
                      }}>
                        <button
                          onClick={() => { setPhotoMenuOpen(false); fileInputRef.current?.click() }}
                          style={{
                            display: 'block', width: '100%', padding: '14px 18px',
                            background: 'none', border: 'none', cursor: 'pointer',
                            textAlign: 'left', fontSize: '14px', fontWeight: 600,
                            borderBottom: '1px solid rgba(0,0,0,0.06)',
                          }}
                        >📱 앨범에서 가져오기</button>
                        <button
                          onClick={() => setPhotoMenuOpen(false)}
                          style={{
                            display: 'block', width: '100%', padding: '14px 18px',
                            background: 'none', border: 'none', cursor: 'not-allowed',
                            textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#ccc',
                          }}
                        >✨ 내가 만든 사진에서</button>
                      </div>
                    )}
                  </div>

                  {/* Photo cards */}
                  {photos.map((photo) => {
                    const selected = selectedPhotoIds.has(photo.id)
                    return (
                      <div key={photo.id} style={{ position: 'relative' }}>
                        <button
                          onClick={() => togglePhotoSelect(photo.id)}
                          style={{
                            width: '100%', aspectRatio: '1', borderRadius: '12px',
                            overflow: 'hidden', padding: 0,
                            border: `2.5px solid ${selected ? '#3b82f6' : 'transparent'}`,
                            cursor: 'pointer', background: '#f0f0f0',
                            boxShadow: selected ? '0 0 0 2px rgba(59,130,246,0.25)' : 'none',
                            transition: 'all 0.15s',
                          }}
                        >
                          <img
                            src={photo.preview}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        </button>

                        {selected && (
                          <div style={{
                            position: 'absolute', top: '5px', left: '5px',
                            width: '20px', height: '20px', borderRadius: '50%',
                            background: '#3b82f6', border: '2px solid #fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: '10px', fontWeight: 900, pointerEvents: 'none',
                          }}>✓</div>
                        )}

                        {!photo.isSample && (
                          <button
                            onClick={(e) => { e.stopPropagation(); removePhoto(photo.id) }}
                            style={{
                              position: 'absolute', top: '5px', right: '5px',
                              width: '22px', height: '22px', borderRadius: '50%',
                              background: 'rgba(0,0,0,0.55)', border: 'none',
                              color: '#fff', fontSize: '12px', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >×</button>
                        )}

                        {photo.isSample && (
                          <div style={{
                            position: 'absolute', bottom: '5px', left: '5px',
                            background: 'rgba(0,0,0,0.6)', color: '#fff',
                            fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '100px',
                            pointerEvents: 'none',
                          }}>샘플</div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => { addFromFiles(e.target.files); e.target.value = '' }}
                />
              </div>

              {/* STEP 1 bottom bar */}
              <BottomBar selectedPhotos={selectedPhotos} canNext={canNext} label={btnLabel} onNext={onNext} />
            </>
          )}

          {/* ── STEP 2: 플랫폼 선택 ── */}
          {step === 2 && (
            <>
              <div style={{ padding: '16px 22px' }}>
                {/* Tabs */}
                <div style={{ display: 'flex', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px' }}>
                  {(['배달앱', '사이즈 직접 입력'] as const).map((tab, i) => {
                    const active = i === 0 ? platformTab === 'delivery' : platformTab === 'custom'
                    return (
                      <button
                        key={tab}
                        onClick={() => setPlatformTab(i === 0 ? 'delivery' : 'custom')}
                        style={{
                          flex: 1, padding: '11px', border: 'none', cursor: 'pointer',
                          fontWeight: 700, fontSize: '14px',
                          background: active ? 'var(--orange)' : '#fff',
                          color: active ? '#fff' : '#888',
                          transition: 'all 0.2s',
                        }}
                      >{tab}</button>
                    )
                  })}
                </div>

                {platformTab === 'delivery' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {DELIVERY_PLATFORMS.map((p) => {
                      const selected = selectedPlatNames.has(p.name)
                      return (
                        <button
                          key={p.name}
                          onClick={() => togglePlatform(p.name)}
                          style={{
                            padding: '15px 18px', borderRadius: '14px',
                            border: `2px solid ${selected ? 'var(--orange)' : 'rgba(0,0,0,0.08)'}`,
                            background: selected ? 'rgba(196,81,13,0.04)' : '#fff',
                            cursor: 'pointer', textAlign: 'left',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            transition: 'all 0.15s',
                          }}
                        >
                          <span style={{ fontWeight: 700, fontSize: '15px', color: selected ? 'var(--orange)' : 'var(--black)' }}>{p.name}</span>
                          <span style={{ fontSize: '13px', color: '#aaa' }}>{p.width}×{p.height}</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {platformTab === 'custom' && (
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', color: '#888', marginBottom: '6px' }}>가로 (px)</label>
                      <input
                        type="number"
                        value={customWidth}
                        onChange={e => setCustomWidth(e.target.value)}
                        placeholder="1280"
                        style={{ width: '100%', padding: '13px', borderRadius: '10px', border: '1.5px solid rgba(0,0,0,0.12)', fontSize: '16px', fontWeight: 700, textAlign: 'center', outline: 'none' }}
                      />
                    </div>
                    <span style={{ fontSize: '20px', color: '#ccc', paddingBottom: '12px' }}>×</span>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', color: '#888', marginBottom: '6px' }}>세로 (px)</label>
                      <input
                        type="number"
                        value={customHeight}
                        onChange={e => setCustomHeight(e.target.value)}
                        placeholder="960"
                        style={{ width: '100%', padding: '13px', borderRadius: '10px', border: '1.5px solid rgba(0,0,0,0.12)', fontSize: '16px', fontWeight: 700, textAlign: 'center', outline: 'none' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <BottomBar selectedPhotos={selectedPhotos} canNext={canNext} label="다음" onNext={onNext} />
            </>
          )}

          {/* ── STEP 8: 구도 선택 (remake only) ── */}
          {step === 8 && (
            <>
              <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>
                {[
                  { id: 'original', emoji: '📷', label: '원본 구도 유지', desc: '업로드한 사진의 카메라 각도를 그대로 유지해요' },
                  { id: 'side45',   emoji: '↗️',  label: '45도 측면샷',   desc: '그릇 옆면이 보이는 클래식한 배달앱 구도예요' },
                  { id: 'topdown',  emoji: '🔭',  label: '수직 항공뷰',   desc: '위에서 내려다보는 탑뷰로 음식 전체가 보여요' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setRemakeAngle(opt.id as typeof remakeAngle)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'flex-start', gap: '14px',
                      padding: '18px 16px', marginBottom: '10px',
                      borderRadius: '14px', border: `2px solid ${remakeAngle === opt.id ? 'var(--orange)' : 'rgba(0,0,0,0.09)'}`,
                      background: remakeAngle === opt.id ? 'rgba(196,81,13,0.05)' : '#fff',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: '26px', flexShrink: 0 }}>{opt.emoji}</span>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '15px', color: 'var(--black)', marginBottom: '4px' }}>{opt.label}</p>
                      <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.5 }}>{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <BottomBar selectedPhotos={selectedPhotos} canNext label="다음" onNext={onNext} />
            </>
          )}

          {/* ── STEP 9: 그릇 선택 (remake only) ── */}
          {step === 9 && (
            <>
              <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>
                {[
                  { id: 'original',      emoji: '🥣', label: '원본 그릇 유지',   desc: '업로드한 사진의 그릇을 그대로 사용해요' },
                  { id: 'round_ceramic', emoji: '⚪',  label: '둥근 도자기',      desc: '깔끔하고 모던한 흰 도자기' },
                  { id: 'black_iron',    emoji: '⚫',  label: '검은 무쇠',        desc: '고급스럽고 강렬한 블랙 무쇠 팬' },
                  { id: 'white_ceramic', emoji: '🍽️', label: '흰 세라믹',        desc: '심플하고 깔끔한 흰 세라믹 플레이트' },
                  { id: 'wood_tray',     emoji: '🪵',  label: '우드 트레이',      desc: '따뜻하고 자연스러운 원목 트레이' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setRemakeVessel(opt.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'flex-start', gap: '14px',
                      padding: '16px', marginBottom: '10px',
                      borderRadius: '14px', border: `2px solid ${remakeVessel === opt.id ? 'var(--orange)' : 'rgba(0,0,0,0.09)'}`,
                      background: remakeVessel === opt.id ? 'rgba(196,81,13,0.05)' : '#fff',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: '24px', flexShrink: 0 }}>{opt.emoji}</span>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '15px', color: 'var(--black)', marginBottom: '4px' }}>{opt.label}</p>
                      <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.5 }}>{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <BottomBar selectedPhotos={selectedPhotos} canNext label="다음" onNext={onNext} />
            </>
          )}

          {/* ── STEP 3: 배경 설정 ── */}
          {step === 3 && (
            <>
              <div style={{ padding: '16px 22px' }}>
                <p style={{ fontSize: '13px', color: '#999', marginBottom: '18px', lineHeight: 1.6 }}>
                  2가지 방법 중, 하나만 선택 가능
                </p>

                {/* Method 1: text */}
                <div style={{
                  padding: '16px', borderRadius: '16px', marginBottom: '14px',
                  border: `2px solid ${bgMethod === 'prompt' ? 'var(--orange)' : 'rgba(0,0,0,0.08)'}`,
                  background: bgMethod === 'prompt' ? 'rgba(196,81,13,0.03)' : '#fff',
                  transition: 'all 0.2s',
                }}>
                  <p style={{ fontWeight: 800, fontSize: '14px', marginBottom: '10px', color: bgMethod === 'prompt' ? 'var(--orange)' : 'var(--black)' }}>
                    방법1. 원하는 배경을 직접 입력
                  </p>
                  <textarea
                    value={bgPrompt}
                    onFocus={() => { if (bgMethod !== 'prompt') { setBgMethod('prompt'); setSelectedBgId(null); setBgData(null) } }}
                    onChange={(e) => { setBgMethod('prompt'); setSelectedBgId(null); setBgData(null); setBgPrompt(e.target.value) }}
                    placeholder="예) 배경을 깔끔한 흰색으로 바꿔줘"
                    style={{
                      width: '100%', padding: '11px 13px', borderRadius: '10px',
                      border: '1px solid rgba(0,0,0,0.1)', background: '#f9f9f9',
                      fontSize: '14px', lineHeight: 1.6, minHeight: '76px',
                      resize: 'vertical', outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                </div>

                {/* Method 2: preset */}
                <div style={{
                  padding: '16px', borderRadius: '16px',
                  border: `2px solid ${bgMethod === 'preset' ? 'var(--orange)' : 'rgba(0,0,0,0.08)'}`,
                  background: bgMethod === 'preset' ? 'rgba(196,81,13,0.03)' : '#fff',
                  transition: 'all 0.2s',
                }}>
                  <p style={{ fontWeight: 800, fontSize: '14px', marginBottom: '12px', color: bgMethod === 'preset' ? 'var(--orange)' : 'var(--black)' }}>
                    방법2. 원하는 배경을 선택
                  </p>

                  {/* Category tabs */}
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto' }}>
                    {BG_CAT_TABS.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setBgCatTab(cat)}
                        style={{
                          padding: '5px 12px', borderRadius: '100px', border: 'none', flexShrink: 0,
                          background: bgCatTab === cat ? 'var(--black)' : 'rgba(0,0,0,0.06)',
                          color: bgCatTab === cat ? '#fff' : '#888',
                          fontWeight: 700, fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >{cat}</button>
                    ))}
                  </div>

                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#aaa', letterSpacing: '1px', marginBottom: '10px' }}>인기</p>

                  {filteredBgs.length === 0 ? (
                    <p style={{ color: '#ccc', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>해당 카테고리 배경이 없어요</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {filteredBgs.map((bg) => {
                        const sel = selectedBgId === bg.id && bgMethod === 'preset'
                        return (
                          <button
                            key={bg.id}
                            onClick={() => selectBgPreset(bg)}
                            style={{
                              padding: 0,
                              border: `2px solid ${sel ? 'var(--orange)' : 'transparent'}`,
                              borderRadius: '12px', overflow: 'hidden',
                              cursor: 'pointer', background: 'none',
                              boxShadow: sel
                                ? '0 0 0 3px rgba(196,81,13,0.15)'
                                : '0 2px 8px rgba(0,0,0,0.08)',
                              transition: 'all 0.2s', position: 'relative',
                            }}
                          >
                            <img src={bg.src} alt={bg.label} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
                            <div style={{ padding: '7px 10px', background: '#fff', textAlign: 'left' }}>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: sel ? 'var(--orange)' : 'var(--black)' }}>{bg.label}</span>
                            </div>
                            {sel && (
                              <div style={{
                                position: 'absolute', top: '6px', right: '6px',
                                width: '20px', height: '20px', borderRadius: '50%',
                                background: 'var(--orange)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontSize: '10px',
                              }}>✓</div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <BottomBar selectedPhotos={selectedPhotos} canNext={canNext} label="다음" onNext={onNext} />
            </>
          )}

          {/* ── STEP 4: 확인 ── */}
          {step === 4 && (
            <div style={{ padding: '20px 22px' }}>
              <p style={{ fontSize: '15px', color: '#555', lineHeight: 1.7, marginBottom: '22px' }}>
                아래 선택한 사진에{' '}
                <strong>{mainPlatName}{extraPlatCount > 0 ? ` 외 ${extraPlatCount}개` : ''}</strong>,{' '}
                <strong>{bgLabel}</strong>을 적용할게요
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
                {/* Photos card */}
                <div style={{ padding: '14px 16px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.08)', background: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    {selectedPhotos.slice(0, 3).map(p => (
                      <img key={p.id} src={p.preview} style={{ width: '38px', height: '38px', objectFit: 'cover', borderRadius: '7px' }} />
                    ))}
                    {selectedPhotos.length > 3 && (
                      <div style={{ width: '38px', height: '38px', borderRadius: '7px', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#888' }}>+{selectedPhotos.length - 3}</div>
                    )}
                  </div>
                  <p style={{ fontWeight: 700, fontSize: '14px', flex: 1 }}>선택한 사진 {selectedPhotos.length}장</p>
                  <button onClick={() => goTo(1)} style={editBtnStyle}>수정</button>
                </div>

                {/* Platform card */}
                <div style={{ padding: '14px 16px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.08)', background: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: '14px' }}>
                      {activePlatforms.length > 0
                        ? `${activePlatforms[0].name}${activePlatforms.length > 1 ? ` 외 ${activePlatforms.length - 1}개` : ''}`
                        : '플랫폼 미선택'}
                    </p>
                    <p style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>
                      {activePlatforms.map(p => `${p.width}×${p.height}`).join(' / ')}
                    </p>
                  </div>
                  <button onClick={() => goTo(2)} style={editBtnStyle}>수정</button>
                </div>

                {/* Background card */}
                <div style={{ padding: '14px 16px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.08)', background: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {selectedBgPreset && bgMethod === 'preset' && (
                    <img src={selectedBgPreset.src} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '7px', flexShrink: 0 }} />
                  )}
                  <p style={{ fontWeight: 700, fontSize: '14px', flex: 1 }}>{bgLabel}</p>
                  <button onClick={() => goTo(3)} style={editBtnStyle}>수정</button>
                </div>
              </div>

              {/* Generated count */}
              <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '12px', padding: '12px 16px', textAlign: 'center', marginBottom: '20px' }}>
                <p style={{ fontWeight: 800, fontSize: '15px', color: '#16a34a' }}>+ 생성될 사진 +{totalGenCount}장</p>
                <p style={{ fontSize: '12px', color: '#86efac', marginTop: '3px' }}>
                  {selectedPhotos.length}장 × {Math.max(activePlatforms.length, 1)}개 플랫폼
                </p>
              </div>

              {error && <p style={{ color: '#e53e3e', fontSize: '13px', marginBottom: '14px', lineHeight: 1.5 }}>{error}</p>}

              <button
                onClick={handleGenerate}
                style={{
                  width: '100%', padding: '16px', borderRadius: '14px',
                  background: 'var(--orange)', color: '#fff',
                  fontWeight: 800, fontSize: '16px', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                }}
              >✨ 이대로 만들기</button>
            </div>
          )}

          {/* ── STEP 5: 생성 중 ── */}
          {step === 5 && (
            <div style={{ padding: '48px 22px', textAlign: 'center' }}>
              <div style={{ fontSize: '52px', marginBottom: '16px' }}>✨</div>
              <h3 style={{ fontWeight: 900, fontSize: '21px', letterSpacing: '-0.5px', marginBottom: '8px' }}>AI가 만들고 있어요</h3>
              <p style={{ color: '#888', fontSize: '14px', lineHeight: 1.7, marginBottom: '28px' }}>
                사진 {selectedPhotos.length}장 처리 중<br />약 30~60초 소요돼요
              </p>
              <div style={{ width: '100%', height: '6px', background: '#f0f0f0', borderRadius: '100px', overflow: 'hidden', marginBottom: '10px' }}>
                <div style={{ height: '100%', background: 'var(--orange)', borderRadius: '100px', width: `${genProgress}%`, transition: 'width 0.6s ease' }} />
              </div>
              <p style={{ color: '#bbb', fontSize: '13px', marginBottom: '20px' }}>{genProgress}%</p>
              <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid rgba(196,81,13,0.2)', borderTopColor: 'var(--orange)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          )}

          {/* ── STEP 6: 결과 (워터마크) ── */}
          {step === 6 && (
            <div style={{ padding: '16px 22px' }}>
              {watermarked.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  {watermarked.map((wm, i) => (
                    <div key={i} style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.07)' }}>
                      <img src={wm} alt={`result-${i + 1}`} style={{ width: '100%', display: 'block' }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', color: '#bbb' }}>이미지 처리 중...</div>
              )}

              <button
                onClick={handleDownloadWithCredits}
                disabled={paying}
                style={{
                  width: '100%', padding: '16px', borderRadius: '14px',
                  background: paying ? '#eee' : 'var(--orange)',
                  color: paying ? '#bbb' : '#fff',
                  fontWeight: 800, fontSize: '16px', border: 'none',
                  cursor: paying ? 'not-allowed' : 'pointer',
                  marginBottom: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  transition: 'all 0.2s',
                }}
              >
                {paying ? (
                  <>
                    <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                    처리 중...
                  </>
                ) : '사진 다운로드 💎 10젬'}
              </button>
              <p style={{ textAlign: 'center', fontSize: '12px', color: '#aaa' }}>10젬으로 워터마크 없는 원본을 받을 수 있어요</p>
            </div>
          )}

          {/* ── STEP 7: 완료 ── */}
          {step === 7 && (
            <div style={{ padding: '32px 22px', textAlign: 'center' }}>
              <div style={{ fontSize: '52px', marginBottom: '16px' }}>🎉</div>
              <h3 style={{ fontWeight: 900, fontSize: '22px', letterSpacing: '-0.5px', marginBottom: '10px' }}>다운로드 완료!</h3>
              <p style={{ color: '#888', fontSize: '14px', lineHeight: 1.7, marginBottom: '28px' }}>
                {activePlatforms.map(p => p.name).join(', ')} 사이즈로<br />저장되었어요
              </p>
              <button
                onClick={onClose}
                style={{ padding: '14px 40px', borderRadius: '14px', background: 'var(--black)', color: '#fff', fontWeight: 800, fontSize: '15px', border: 'none', cursor: 'pointer' }}
              >닫기</button>
            </div>
          )}

        </div>
      </div>
    </div>

    {/* 콩 충전 모달 (BasicPlanModal 위에 z-index 1100으로 표시) */}
    {showChargeModal && userEmail && (
      <CoinChargeModal
        shortfall={creditShortfall}
        userEmail={userEmail}
        onClose={() => setShowChargeModal(false)}
        onSuccess={() => {
          setShowChargeModal(false)
          handleDownloadWithCredits()
        }}
      />
    )}

    {/* 가이드 이미지 크게보기 */}
    {previewImage && (
      <div
        onClick={() => setPreviewImage(null)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      >
        <img src={previewImage} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '12px' }} />
        <button
          onClick={() => setPreviewImage(null)}
          style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: '22px', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >×</button>
      </div>
    )}
    </>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

const editBtnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: '8px',
  padding: '5px 11px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 700,
  color: '#888',
  flexShrink: 0,
}

function BottomBar({
  selectedPhotos,
  canNext,
  label,
  onNext,
}: {
  selectedPhotos: FoodPhoto[]
  canNext: boolean
  label: string
  onNext: () => void
}) {
  return (
    <div style={{
      position: 'sticky', bottom: 0,
      background: '#fff', borderTop: '1px solid rgba(0,0,0,0.07)',
      padding: '12px 22px 16px',
    }}>
      {selectedPhotos.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '10px', paddingBottom: '2px' }}>
          {selectedPhotos.map(p => (
            <img
              key={p.id}
              src={p.preview}
              style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0, border: '2px solid #3b82f6' }}
            />
          ))}
        </div>
      )}
      <button
        onClick={onNext}
        disabled={!canNext}
        style={{
          width: '100%', padding: '15px', borderRadius: '12px',
          background: canNext ? 'var(--orange)' : '#eee',
          color: canNext ? '#fff' : '#bbb',
          fontWeight: 800, fontSize: '16px', border: 'none',
          cursor: canNext ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s',
        }}
      >{label}</button>
    </div>
  )
}
