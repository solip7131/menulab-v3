'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import BasicPlanModal from '../../components/BasicPlanModal'

// ─────────────────────────────────────────
// 상수
// ─────────────────────────────────────────

// ★ 입금 계좌 정보 — 실제 계좌로 교체 필요
const BANK_INFO = {
  bankName:      'IBK기업은행',
  accountNumber: '986-033973-04-015',
  accountHolder: '최재이',
}

const VIBE_OPTIONS = [
  { id: 'warm',    label: '따뜻한' },
  { id: 'premium', label: '고급스러운' },
  { id: 'modern',  label: '깔끔모던' },
  { id: 'natural', label: '내추럴우드' },
  { id: 'cafe',    label: '감성카페' },
]

// 그릇 선택 카드 — /public/vessels/ 에 실제 이미지 추가 필요
const VESSEL_CARDS = [
  { id: 'plate:white',            label: '흰색 접시',     hint: '단품·덮밥·반찬류에 잘 어울려요',       imgPath: '/vessels/plate-white.png'        },
  { id: 'plate:black',            label: '검정 접시',     hint: '스테이크·고급 플레이팅에 잘 어울려요', imgPath: '/vessels/plate-black.png'        },
  { id: 'ttukbaegi:default',      label: '뚝배기',        hint: '찌개·국밥류에 잘 어울려요',            imgPath: '/vessels/ttukbaegi.jpg'          },
  { id: 'noodle_bowl:white',      label: '면기',          hint: '국수·우동·짜장면류에 잘 어울려요',     imgPath: '/vessels/noodle-bowl-white.jpg'  },
  { id: 'naengmyeon_bowl:silver', label: '냉면기',        hint: '냉면·비빔면에 잘 어울려요',            imgPath: '/vessels/naengmyeon-silver.jpg'  },
  { id: 'jeongol_pot:black',      label: '전골냄비',      hint: '전골·찜·볶음탕에 잘 어울려요',         imgPath: '/vessels/jeongol-pot.jpg'        },
  { id: 'pasta_bowl:white',       label: '파스타 볼',     hint: '파스타·리조또·샐러드에 잘 어울려요',   imgPath: '/vessels/pasta-bowl.jpg'         },
  { id: 'wood_board:natural',     label: '우드 도마',     hint: '피자·빵·샌드위치류에 잘 어울려요',     imgPath: '/vessels/wood-board.jpg'         },
]

type Step = 1 | 2 | 3 | 4 | 5 | 6
type Plan = 'basic' | 'premium' | 'collection' | ''
type Mood = 'black' | 'white' | ''
type Angle = 'aerial' | 'side' | ''
type VesselChoice = 'original' | 'recommended' | ''
type VesselPref   = 'recommend' | 'reference' | ''
type CollectionTier = 'standard' | 'premium' | ''
type CollectionBg   = 'dark' | 'light' | 'wood' | ''

const ANGLE_OPTIONS = [
  { id: 'aerial', emoji: '🔭', label: '항공뷰', desc: '위에서 내려다보는 구도 — 깔끔하고 정돈된 느낌' },
  { id: 'side',   emoji: '📸', label: '측면뷰', desc: '45도 측면 구도 — 음식의 두께와 층이 보여 풍성한 느낌' },
] as const

interface V2Form {
  photos:              File[]
  mood:                Mood
  angle:               Angle
  planType:            Plan
  // 그릇 (basic)
  vesselChoice:        VesselChoice
  vesselId:            string
  vesselLabel:         string
  // 브리핑 (premium)
  vibes:               string[]
  vesselPref:          VesselPref
  refFiles:            File[]
  freeRequest:         string
  // 모음컷
  collectionTier:       CollectionTier
  collectionBg:         CollectionBg
  collectionOutputCount: number
  // 연락처
  customerName:        string
  customerPhone:       string
  customerEmail:       string
}

async function compressImage(file: File, maxSizeKB = 300): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.onload  = () => {
      URL.revokeObjectURL(url)
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(file); return }
        const maxPx = 1024
        let w = img.width, h = img.height
        if (w > maxPx || h > maxPx) {
          if (w > h) { h = Math.round(h * maxPx / w); w = maxPx }
          else       { w = Math.round(w * maxPx / h); h = maxPx }
        }
        canvas.width = w; canvas.height = h
        ctx.drawImage(img, 0, 0, w, h)
        let quality = 0.65
        const tryCompress = () => {
          canvas.toBlob(blob => {
            if (!blob) { resolve(file); return }
            if (blob.size <= maxSizeKB * 1024 || quality <= 0.2) {
              resolve(new File([blob], `${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`, { type: 'image/jpeg' }))
            } else { quality -= 0.1; tryCompress() }
          }, 'image/jpeg', quality)
        }
        tryCompress()
      } catch { resolve(file) }
    }
    img.src = url
  })
}

function calcAmount(planType: Plan, count: number, collectionTier?: CollectionTier, collectionOutputCount?: number): number {
  if (planType === 'premium') return count * 14900
  if (planType === 'collection') {
    if (collectionTier === 'standard') return 16900
    if (collectionTier === 'premium')  return 27900 * (collectionOutputCount ?? 1)
    return 0
  }
  return count * 7900
}

// ─────────────────────────────────────────
// 컴포넌트
// ─────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: '6px' }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{ width: '24px', height: '4px', borderRadius: '2px', background: i < current ? 'var(--orange)' : 'rgba(0,0,0,0.1)', transition: 'background 0.3s' }} />
      ))}
    </div>
  )
}

function SummaryBadges({ form }: { form: V2Form }) {
  const parts: string[] = []
  if (form.planType === 'basic')   parts.push(`베이직 ${form.photos.length}장 × 7,900원`)
  if (form.planType === 'premium') parts.push(`프리미엄 ${form.photos.length}장 × 14,900원`)
  if (form.planType === 'collection' && form.collectionTier === 'standard') parts.push('모음컷 일반 · 16,900원')
  if (form.planType === 'collection' && form.collectionTier === 'premium')  parts.push(`모음컷 프리미엄 · ${form.collectionOutputCount}장 · ${(27900 * form.collectionOutputCount).toLocaleString()}원`)
  if (form.mood === 'black')       parts.push('어두운 분위기')
  if (form.mood === 'white')       parts.push('밝은 분위기')
  if (form.angle === 'aerial')     parts.push('항공뷰')
  if (form.angle === 'side')       parts.push('측면뷰')
  if (!parts.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '24px' }}>
      {parts.map(p => (
        <span key={p} style={{ padding: '4px 12px', borderRadius: '100px', background: 'rgba(255,92,0,0.1)', color: 'var(--orange)', fontSize: '12px', fontWeight: 600 }}>{p}</span>
      ))}
    </div>
  )
}

function OrderPageInner() {
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<V2Form>({
    photos: [], mood: '', angle: '', planType: '',
    vesselChoice: '', vesselId: '', vesselLabel: '',
    vibes: [], vesselPref: '', refFiles: [], freeRequest: '',
    collectionTier: '', collectionBg: '', collectionOutputCount: 1,
    customerName: '', customerPhone: '', customerEmail: '',
  })
  const [session, setSession] = useState<{ email: string; name: string; token: string } | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [restoringForm, setRestoringForm] = useState(false)
  const [showLoginGate, setShowLoginGate] = useState(false)
  const [restoredPhotoCount, setRestoredPhotoCount] = useState(0)

  const [isCompressing, setIsCompressing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [completedOrder, setCompletedOrder] = useState<{ orderId: string; amount: number } | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null)
  const [savingLoginState, setSavingLoginState] = useState(false)
  const [showPortraitModal, setShowPortraitModal] = useState(false)
  const [showPhotoGuide, setShowPhotoGuide] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [basicModal, setBasicModal] = useState(false)

  const photoInputRef  = useRef<HTMLInputElement>(null)
  const refInputRef    = useRef<HTMLInputElement>(null)
  const uploadCacheRef = useRef<Map<File, Promise<string>>>(new Map())
  const uploadPromise  = useRef<Promise<string[]> | null>(null)
  const uploadedUrls   = useRef<string[] | null>(null)

  const update = useCallback(<K extends keyof V2Form>(key: K, value: V2Form[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }, [])

  // ── 카카오 로그인 전 주문 상태 저장 ──
  const saveOrderDraft = () => {
    try {
      sessionStorage.setItem('v2_order_draft', JSON.stringify({
        step,
        form: {
          mood: form.mood, angle: form.angle, planType: form.planType,
          vesselChoice: form.vesselChoice, vesselId: form.vesselId, vesselLabel: form.vesselLabel,
          vibes: form.vibes, vesselPref: form.vesselPref, freeRequest: form.freeRequest,
          customerName: form.customerName, customerPhone: form.customerPhone,
        },
        preUploadedUrls: uploadedUrls.current || [],
        photoCount: form.photos.length,
      }))
    } catch {}
  }

  // ── 카카오 세션 복원 ──
  useEffect(() => {
    // 카카오 콜백 쿠키 처리
    const cookie = document.cookie.split(';').find(c => c.trim().startsWith('ml_kakao_session='))
    if (cookie) {
      try {
        const val = JSON.parse(decodeURIComponent(cookie.split('=').slice(1).join('=')))
        localStorage.setItem('menulab_session', JSON.stringify({ token: val.token, email: val.email, name: val.name }))
        document.cookie = 'ml_kakao_session=; max-age=0; path=/'
        // 복원할 폼이 있으면 flash 방지용 로딩 유지
        if (sessionStorage.getItem('v2_order_restore')) setRestoringForm(true)
        setSession({ email: val.email, name: val.name, token: val.token })

        // 주문 진행 상태 복원
        const draft = sessionStorage.getItem('v2_order_draft')
        if (draft) {
          sessionStorage.removeItem('v2_order_draft')
          try {
            const parsed = JSON.parse(draft)
            if (parsed.step) setStep(parsed.step)
            if (parsed.form) setForm(prev => ({ ...prev, ...parsed.form, customerName: val.name || parsed.form.customerName || '', customerEmail: val.email || '' }))
            if (parsed.preUploadedUrls?.length) { uploadedUrls.current = parsed.preUploadedUrls; setRestoredPhotoCount(parsed.photoCount || parsed.preUploadedUrls.length) }
          } catch {}
        } else {
          update('customerName',  val.name  || '')
          update('customerEmail', val.email || '')
        }
        setSessionLoading(false)
        return
      } catch { document.cookie = 'ml_kakao_session=; max-age=0; path=/' }
    }
    // localStorage 복원
    try {
      const raw = localStorage.getItem('menulab_session')
      if (raw) {
        const { token, email, name } = JSON.parse(raw)
        if (token && email) {
          setSession({ email, name: name || '', token })
          update('customerName',  name  || '')
          update('customerEmail', email || '')
        }
      }
    } catch {}
    setSessionLoading(false)
  }, [])

  // ── 로그인 후 sessionStorage 폼 복원 ──
  useEffect(() => {
    if (!session) return
    const raw = sessionStorage.getItem('v2_order_restore')
    if (!raw) { setRestoringForm(false); return }
    try {
      const saved = JSON.parse(raw)
      setForm(prev => ({
        ...prev,
        planType:     saved.planType     || '',
        mood:         saved.mood         || '',
        angle:        saved.angle        || '',
        vesselChoice: saved.vesselChoice || '',
        vesselId:     saved.vesselId     || '',
        vesselLabel:  saved.vesselLabel  || '',
        vibes:        saved.vibes        || [],
        vesselPref:   saved.vesselPref   || '',
        freeRequest:  saved.freeRequest  || '',
        customerName:  session.name  || '',
        customerEmail: session.email || '',
      }))
      if (saved.photoUrls?.length > 0) uploadedUrls.current = saved.photoUrls
      if (saved.photoCount > 0) setRestoredPhotoCount(saved.photoCount)
      setShowLoginGate(false)
      setStep(5)
      sessionStorage.removeItem('v2_order_restore')
    } catch {}
    setRestoringForm(false)
  }, [session])

  // ── URL plan 파라미터로 플랜 사전 선택 ──
  useEffect(() => {
    const plan = searchParams.get('plan') as Plan | null
    if (plan && ['basic', 'premium', 'collection'].includes(plan)) {
      update('planType', plan)
    }
  }, [])

  // ── 사진 업로드 헬퍼 ──
  const uploadOne = (photo: File): Promise<string> => {
    if (uploadCacheRef.current.has(photo)) return uploadCacheRef.current.get(photo)!
    const p = (async () => {
      try {
        const fd = new FormData(); fd.append('photo', photo)
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const data = await res.json()
        return data.url || ''
      } catch { return '' }
    })()
    uploadCacheRef.current.set(photo, p)
    return p
  }

  const startBgUpload = (photos: File[]) => {
    uploadedUrls.current = null
    let done = 0
    setUploadProgress({ done: 0, total: photos.length })
    const p = Promise.all(photos.map(async photo => {
      const url = await uploadOne(photo)
      done++
      setUploadProgress({ done, total: photos.length })
      return url
    })).then(urls => { setUploadProgress(null); uploadedUrls.current = urls; return urls })
    uploadPromise.current = p
    return p
  }

  const checkPortrait = (file: File): Promise<boolean> =>
    new Promise(resolve => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => { URL.revokeObjectURL(url); resolve(img.height > img.width) }
      img.onerror = () => { URL.revokeObjectURL(url); resolve(false) }
      img.src = url
    })

  const handlePhotos = async (files: FileList | null) => {
    if (!files) return
    const valid = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!valid.length) return
    const orientations = await Promise.all(valid.map(checkPortrait))
    if (orientations.some(Boolean)) setShowPortraitModal(true)
    setIsCompressing(true)
    const compressed = await Promise.all(valid.map(f => compressImage(f)))
    setForm(prev => {
      const merged = [...prev.photos, ...compressed]
      const limited = (prev.planType === 'collection' && prev.collectionTier === 'standard')
        ? merged.slice(0, 5)
        : merged
      return { ...prev, photos: limited }
    })
    setIsCompressing(false)
    compressed.forEach(f => uploadOne(f)) // 백그라운드 프리업로드
  }

  const removePhoto = (idx: number) => {
    setForm(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== idx) }))
  }

  // ── 레퍼런스 이미지 업로드 & DB 저장용 URL 확보 ──
  const uploadRefFiles = async (): Promise<string[]> => {
    if (!form.refFiles.length) return []
    return Promise.all(form.refFiles.map(async f => {
      const fd = new FormData(); fd.append('photo', f)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      return data.url || ''
    }))
  }

  // ── 스텝 이동 ──
  const goNext = async () => {
    if (step === 2) startBgUpload(form.photos)
    if (step === 4 && !session) {
      // 업로드가 진행 중이면 완료까지 대기 후 URL 포함하여 저장
      setSavingLoginState(true)
      let photoUrls: string[] = []
      try {
        if (uploadPromise.current) photoUrls = await uploadPromise.current
        else photoUrls = uploadedUrls.current ?? []
      } catch { photoUrls = uploadedUrls.current ?? [] }
      sessionStorage.setItem('v2_order_restore', JSON.stringify({
        planType: form.planType, mood: form.mood, angle: form.angle,
        vesselChoice: form.vesselChoice, vesselId: form.vesselId, vesselLabel: form.vesselLabel,
        vibes: form.vibes, vesselPref: form.vesselPref, freeRequest: form.freeRequest,
        photoUrls,
        photoCount: form.photos.length,
      }))
      setSavingLoginState(false)
      setShowLoginGate(true)
      return
    }
    if (step < 6) setStep((step + 1) as Step)
  }
  const goPrev = () => {
    if (showLoginGate) { setShowLoginGate(false); return }
    if (step > 1) setStep((step - 1) as Step)
  }

  const canProceed = (): boolean => {
    if (step === 1) {
      if (!form.planType) return false
      if (form.planType === 'collection') {
        if (!form.collectionTier) return false
      }
      return true
    }
    if (step === 2) return form.photos.length > 0 && !isCompressing
    if (step === 3) {
      if (form.planType === 'collection' && form.collectionTier === 'standard') return form.collectionBg !== ''
      if (form.planType === 'collection' && form.collectionTier === 'premium')  return form.collectionOutputCount >= 1
      return form.mood !== '' && form.angle !== ''
    }
    if (step === 4) {
      if (form.planType === 'collection') return true
      if (form.planType === 'premium') {
        return form.vibes.length > 0 && form.vesselPref !== ''
      }
      // basic: 원본 선택 또는 그릇 카드 선택
      if (form.vesselChoice === 'original') return true
      if (form.vesselChoice === 'recommended' && form.vesselId) return true
      return false
    }
    if (step === 5) return form.customerName.trim() !== '' && form.customerPhone.trim() !== ''
    return true
  }

  // ── 주문 제출 ──
  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      // 사진 URL 확보
      let preUrls: string[] = []
      if (uploadPromise.current) preUrls = await uploadPromise.current
      else preUrls = uploadedUrls.current ?? []

      // 레퍼런스 이미지 업로드
      const refUrls = (form.planType === 'premium' || (form.planType === 'collection' && form.collectionTier === 'premium')) ? await uploadRefFiles() : []

      const fd = new FormData()
      fd.append('planType',            form.planType)
      fd.append('mood',                form.mood)
      fd.append('angle',               form.angle)
      fd.append('vesselChoice',        form.vesselChoice)
      fd.append('vesselId',            form.vesselId)
      fd.append('vesselLabel',         form.vesselLabel)
      fd.append('vibes',               JSON.stringify(form.vibes))
      fd.append('vesselPref',          form.vesselPref)
      fd.append('freeRequest',         form.freeRequest)
      fd.append('collectionTier',        form.collectionTier)
      fd.append('collectionBg',          form.collectionBg)
      fd.append('collectionOutputCount', String(form.collectionOutputCount))
      fd.append('customerName',        form.customerName)
      fd.append('customerPhone',       form.customerPhone)
      fd.append('customerEmail',       form.customerEmail)
      fd.append('referenceUrls',       JSON.stringify(refUrls))

      if (preUrls.length > 0 && preUrls.every(Boolean)) {
        fd.append('preUploadedUrls', JSON.stringify(preUrls))
      } else {
        form.photos.forEach(f => fd.append('photos', f))
      }

      const res  = await fetch('/api/v2/order', { method: 'POST', body: fd })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `서버 오류 (${res.status})`)
      }
      const data = await res.json()
      setCompletedOrder({ orderId: data.orderId, amount: data.amount })
      setStep(6)
    } catch (e: any) {
      alert(e.message || '전송 중 오류가 발생했습니다. 카카오톡으로 문의해주세요.')
    }
    setSubmitting(false)
  }

  const photoCount    = form.photos.length > 0 ? form.photos.length : restoredPhotoCount
  const displayAmount = calcAmount(form.planType, photoCount, form.collectionTier, form.collectionOutputCount)
  const TOTAL_STEPS   = 6

  // ── 렌더 ──
  if (sessionLoading || restoringForm) {
    return <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#aaa' }}>로딩 중...</p></div>
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      {basicModal && <BasicPlanModal onClose={() => setBasicModal(false)} />}

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '0 5vw', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <Link href="/v2" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="https://i.ibb.co/YF3csF80/image.png" alt="메뉴랩" style={{ height: '54px', width: 'auto' }} />
        </Link>
        <StepDots current={step} total={TOTAL_STEPS} />
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '48px 5vw 140px' }}>

        {/* ─── STEP 2: 사진 업로드 ─── */}
        {step === 2 && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)', letterSpacing: '2px', marginBottom: '12px' }}>STEP 02</p>
            <div style={{ marginBottom: '8px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '10px' }}>
                {form.planType === 'collection' ? '메뉴 사진을 올려주세요' : '원본 사진을 올려주세요'}
              </h2>
              {form.planType !== 'collection' && (
                <button
                  onClick={() => setShowPhotoGuide(true)}
                  style={{ background: 'var(--orange)', border: 'none', borderRadius: '20px', color: '#fff', fontSize: '12px', fontWeight: 800, padding: '7px 14px', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(196,81,13,0.35)' }}
                >필독 · 업로드 가이드 📋</button>
              )}
            </div>
            {form.planType === 'collection' && form.collectionTier === 'standard' && (
              <>
                <p style={{ color: '#666', fontSize: '15px', marginBottom: '4px' }}>담고 싶은 메뉴마다 사진 1장씩 올려주세요</p>
                <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '28px' }}>최대 5가지 메뉴 · 배달앱 리뷰 사진도 OK</p>
              </>
            )}
            {form.planType === 'collection' && form.collectionTier === 'premium' && (
              <>
                <p style={{ color: '#666', fontSize: '15px', marginBottom: '4px' }}>원하는 메뉴 사진을 올려주세요</p>
                <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '28px' }}>수량 제한 없음 · 배달앱 리뷰 사진도 OK</p>
              </>
            )}
            {form.planType !== 'collection' && (
              <>
                <p style={{ color: '#666', fontSize: '15px', marginBottom: '8px' }}>사진 장수만큼 제작돼요 · 올리면 바로 견적이 나와요</p>
                <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '28px' }}>배달앱 리뷰 사진, 직접 찍은 사진 모두 OK</p>
              </>
            )}

            {/* 드롭존 */}
            {(
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handlePhotos(e.dataTransfer.files) }}
                onClick={() => photoInputRef.current?.click()}
                style={{ border: `2px dashed ${dragOver ? 'var(--orange)' : 'rgba(0,0,0,0.15)'}`, borderRadius: '18px', padding: '40px 24px', textAlign: 'center', cursor: 'pointer', background: dragOver ? 'rgba(255,92,0,0.04)' : '#fff', transition: 'all 0.2s', marginBottom: '20px' }}
              >
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>{isCompressing ? '⏳' : '📤'}</div>
                <p style={{ fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>
                  {isCompressing ? '이미지 최적화 중...' : '드래그하거나 클릭해서 업로드'}
                </p>
                <p style={{ color: '#aaa', fontSize: '13px' }}>
                  {isCompressing ? '잠시만 기다려주세요' : 'JPG, PNG · 여러 장 한 번에 가능'}
                </p>
                <input ref={photoInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { handlePhotos(e.target.files); e.target.value = '' }} />
              </div>
            )}

            {/* 업로드된 사진 목록 */}
            {form.photos.length > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>
                    메뉴 <span style={{ color: 'var(--orange)', fontSize: '20px' }}>{form.photos.length}</span>
                    {form.planType === 'collection' ? `가지${form.collectionTier === 'standard' ? ` / 최대 5` : ''}` : '장'}
                  </span>
                  {form.planType === 'collection' && form.collectionTier === 'standard' && (
                    <span style={{ fontWeight: 800, color: 'var(--orange)', fontSize: '16px' }}>16,900원</span>
                  )}
                  {form.planType === 'collection' && form.collectionTier === 'premium' && (
                    <span style={{ fontWeight: 700, color: '#888', fontSize: '14px' }}>장수는 다음 스텝에서 선택</span>
                  )}
                  {form.planType !== 'collection' && (
                    <span style={{ fontWeight: 800, color: 'var(--orange)', fontSize: '16px' }}>
                      {(form.photos.length * 7900).toLocaleString()}원 (기본 기준)
                    </span>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                  {form.photos.map((photo, i) => (
                    <div key={i} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
                      <img src={URL.createObjectURL(photo)} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                      <button onClick={() => removePhoto(i)} style={{ position: 'absolute', top: '6px', right: '6px', width: '22px', height: '22px', borderRadius: '50%', background: '#ff3b30', border: 'none', color: '#fff', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>×</button>
                      <div style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '100px' }}>{i + 1}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── STEP 3: 촬영 스타일 ─── */}
        {step === 3 && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)', letterSpacing: '2px', marginBottom: '12px' }}>STEP 03</p>

            {/* 모음컷 일반 — 배경 선택 */}
            {form.planType === 'collection' && form.collectionTier === 'standard' && (
              <>
                <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.5px' }}>배경을 선택해주세요</h2>
                <p style={{ color: '#666', fontSize: '15px', marginBottom: '24px' }}>모음컷에 적용할 배경 분위기를 골라주세요</p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {([
                    { id: 'dark',  emoji: '🌑', label: '다크',   desc: '고급스럽고 묵직한 느낌' },
                    { id: 'light', emoji: '☀️', label: '라이트', desc: '밝고 깔끔한 느낌' },
                    { id: 'wood',  emoji: '🪵', label: '우드',   desc: '따뜻한 내추럴 느낌' },
                  ] as { id: CollectionBg; emoji: string; label: string; desc: string }[]).map(bg => (
                    <button
                      key={bg.id}
                      onClick={() => update('collectionBg', bg.id)}
                      style={{ flex: 1, padding: '20px 10px', borderRadius: '16px', border: `2px solid ${form.collectionBg === bg.id ? 'var(--orange)' : 'rgba(0,0,0,0.08)'}`, background: form.collectionBg === bg.id ? 'rgba(255,92,0,0.04)' : '#fff', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}
                    >
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>{bg.emoji}</div>
                      <p style={{ fontWeight: 800, fontSize: '15px', marginBottom: '4px', color: form.collectionBg === bg.id ? 'var(--orange)' : 'var(--black)' }}>{bg.label}</p>
                      <p style={{ color: '#888', fontSize: '12px', lineHeight: 1.4 }}>{bg.desc}</p>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* 모음컷 프리미엄 — 제작 장수 */}
            {form.planType === 'collection' && form.collectionTier === 'premium' && (
              <>
                <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.5px' }}>제작 장수를 선택해주세요</h2>
                <p style={{ color: '#666', fontSize: '15px', marginBottom: '24px' }}>구도는 메뉴와 레퍼런스에 따라 최적으로 작업해드려요</p>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '15px', marginBottom: '12px' }}>제작 장수 <span style={{ color: 'var(--orange)' }}>*</span></label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                    <button
                      onClick={() => { if (form.collectionOutputCount > 1) update('collectionOutputCount', form.collectionOutputCount - 1) }}
                      style={{ width: '44px', height: '44px', borderRadius: '50%', border: '1.5px solid rgba(0,0,0,0.12)', background: '#fff', fontSize: '22px', cursor: form.collectionOutputCount <= 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: form.collectionOutputCount <= 1 ? '#ccc' : '#333' }}
                    >−</button>
                    <span style={{ fontWeight: 900, fontSize: '26px', minWidth: '36px', textAlign: 'center' }}>{form.collectionOutputCount}</span>
                    <button
                      onClick={() => update('collectionOutputCount', form.collectionOutputCount + 1)}
                      style={{ width: '44px', height: '44px', borderRadius: '50%', border: '1.5px solid rgba(0,0,0,0.12)', background: '#fff', fontSize: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}
                    >+</button>
                    <span style={{ fontSize: '13px', color: '#888' }}>장</span>
                  </div>
                  <p style={{ fontWeight: 800, color: 'var(--orange)', fontSize: '16px' }}>
                    합계 {(27900 * form.collectionOutputCount).toLocaleString()}원
                  </p>
                </div>
              </>
            )}

            {/* 일반 플랜 — 구도 + 배경 분위기 */}
            {form.planType !== 'collection' && (
              <>
                <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.5px' }}>촬영 스타일을 선택해주세요</h2>
                <p style={{ color: '#666', fontSize: '15px', marginBottom: '20px' }}>배달앱에 최적화된 구도와 배경을 선택해주세요</p>
                <div style={{ marginBottom: '32px' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '15px', marginBottom: '12px' }}>촬영 구도 <span style={{ color: 'var(--orange)' }}>*</span></label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {ANGLE_OPTIONS.map(a => (
                      <button key={a.id} onClick={() => update('angle', a.id as Angle)} style={{ padding: '20px', borderRadius: '14px', border: `2px solid ${form.angle === a.id ? 'var(--orange)' : 'rgba(0,0,0,0.08)'}`, background: form.angle === a.id ? 'rgba(255,92,0,0.04)' : '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: '16px', transition: 'all 0.15s' }}>
                        <span style={{ fontSize: '28px', flexShrink: 0 }}>{a.emoji}</span>
                        <div><p style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>{a.label}</p><p style={{ color: '#888', fontSize: '13px' }}>{a.desc}</p></div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '15px', marginBottom: '12px' }}>배경 분위기 <span style={{ color: 'var(--orange)' }}>*</span></label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { id: 'black', emoji: '🌑', label: '어두운 분위기 (Black)', desc: '다크 톤 배경 — 고급스럽고 묵직한 느낌. 육류·야식·주류에 잘 어울려요.' },
                      { id: 'white', emoji: '☀️', label: '밝은 분위기 (White)',  desc: '밝고 깔끔한 배경 — 음식이 선명하게 돋보이는 배달앱 최적 스타일.' },
                    ].map(opt => (
                      <button key={opt.id} onClick={() => update('mood', opt.id as Mood)} style={{ padding: '20px', borderRadius: '14px', border: `2px solid ${form.mood === opt.id ? 'var(--orange)' : 'rgba(0,0,0,0.08)'}`, background: form.mood === opt.id ? 'rgba(255,92,0,0.04)' : '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: '16px', transition: 'all 0.15s' }}>
                        <span style={{ fontSize: '28px', flexShrink: 0 }}>{opt.emoji}</span>
                        <div><p style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>{opt.label}</p><p style={{ color: '#888', fontSize: '13px', lineHeight: 1.6 }}>{opt.desc}</p></div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── STEP 1: 제작 방식 ─── */}
        {step === 1 && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)', letterSpacing: '2px', marginBottom: '12px' }}>STEP 01</p>
            <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.5px' }}>어떻게 시작할까요?</h2>
            <p style={{ color: '#666', fontSize: '15px', marginBottom: '32px' }}>제작 방식을 먼저 선택해주세요</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* 기본 */}
              <button
                onClick={() => setBasicModal(true)}
                style={{ padding: '28px', borderRadius: '20px', border: `2px solid ${form.planType === 'basic' ? 'var(--orange)' : 'rgba(0,0,0,0.08)'}`, background: form.planType === 'basic' ? 'rgba(255,92,0,0.04)' : '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 900, fontSize: '18px' }}>베이직</span>
                    <span style={{ fontSize: '11px', fontWeight: 800, background: 'rgba(255,92,0,0.12)', color: 'var(--orange)', padding: '2px 8px', borderRadius: '100px' }}>가성비최고</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, fontSize: '22px', color: 'var(--orange)' }}>7,900원<span style={{ fontSize: '14px', color: '#888', fontWeight: 500 }}>/장</span></div>
                    {form.photos.length > 0 && (
                      <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>
                        {form.photos.length}장 = {(form.photos.length * 7900).toLocaleString()}원
                      </div>
                    )}
                  </div>
                </div>
                <p style={{ color: '#666', fontSize: '14px' }}>마음에 드셨나요? 이제 본격적으로 시작해요</p>
              </button>

              {/* 프리미엄 */}
              <button
                onClick={() => update('planType', 'premium')}
                style={{ padding: '28px', borderRadius: '20px', border: `2px solid ${form.planType === 'premium' ? 'var(--orange)' : 'rgba(0,0,0,0.08)'}`, background: form.planType === 'premium' ? 'rgba(255,92,0,0.04)' : '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <span style={{ fontWeight: 900, fontSize: '18px' }}>프리미엄</span>
                    <span style={{ marginLeft: '10px', fontSize: '12px', fontWeight: 700, background: 'rgba(196,81,13,0.1)', color: 'var(--orange)', padding: '2px 8px', borderRadius: '100px' }}>맞춤제작</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, fontSize: '22px', color: 'var(--orange)' }}>14,900원<span style={{ fontSize: '14px', color: '#888', fontWeight: 500 }}>/장</span></div>
                    {form.photos.length > 0 && (
                      <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>
                        {form.photos.length}장 = {(form.photos.length * 14900).toLocaleString()}원
                      </div>
                    )}
                  </div>
                </div>
                <p style={{ color: '#666', fontSize: '14px' }}>프리미엄 브랜딩 · 프랜차이즈 본사 추천 · 수정 2회 포함</p>
              </button>

              {/* 모음컷 */}
              <div>
                <button
                  onClick={() => { update('planType', 'collection'); update('collectionTier', ''); update('collectionBg', '') }}
                  style={{ width: '100%', padding: '28px', borderRadius: '20px', border: `2px solid ${form.planType === 'collection' ? 'var(--orange)' : 'rgba(0,0,0,0.08)'}`, background: form.planType === 'collection' ? 'rgba(255,92,0,0.04)' : '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 900, fontSize: '18px' }}>모음컷</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, background: 'rgba(196,81,13,0.1)', color: 'var(--orange)', padding: '2px 8px', borderRadius: '100px' }}>HOT</span>
                    </div>
                    <span style={{ fontWeight: 900, fontSize: '22px', color: 'var(--orange)' }}>16,900~</span>
                  </div>
                  <p style={{ color: '#666', fontSize: '14px' }}>여러 메뉴를 한 장에 담는 구성컷</p>
                </button>

                {/* 모음컷 서브옵션 */}
                {form.planType === 'collection' && (
                  <div style={{ marginTop: '12px', padding: '20px', background: '#fff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.08)' }}>
                    <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px' }}>플랜 선택 <span style={{ color: 'var(--orange)' }}>*</span></p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                      {/* 일반 */}
                      <button
                        onClick={() => { update('collectionTier', 'standard'); update('angle', 'aerial'); update('collectionBg', '') }}
                        style={{ padding: '18px', borderRadius: '14px', border: `2px solid ${form.collectionTier === 'standard' ? 'var(--orange)' : 'rgba(0,0,0,0.08)'}`, background: form.collectionTier === 'standard' ? 'rgba(255,92,0,0.04)' : '#f8f8f8', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <span style={{ fontWeight: 800, fontSize: '16px' }}>모음컷 일반</span>
                          <span style={{ fontWeight: 900, fontSize: '16px', color: 'var(--orange)' }}>16,900원</span>
                        </div>
                        <ul style={{ color: '#666', fontSize: '13px', lineHeight: 1.9, margin: 0, paddingLeft: '16px' }}>
                          <li>항공뷰 고정</li>
                          <li>배경 3택1 (다크 / 라이트 / 우드)</li>
                          <li>음식사진 여러 장 업로드</li>
                          <li>모음컷 1장 제작</li>
                        </ul>
                      </button>

                      {/* 프리미엄 */}
                      <button
                        onClick={() => { update('collectionTier', 'premium'); update('collectionBg', ''); update('angle', ''); update('collectionOutputCount', 1) }}
                        style={{ padding: '18px', borderRadius: '14px', border: `2px solid ${form.collectionTier === 'premium' ? 'var(--orange)' : 'rgba(0,0,0,0.08)'}`, background: form.collectionTier === 'premium' ? 'rgba(255,92,0,0.04)' : '#f8f8f8', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <span style={{ fontWeight: 800, fontSize: '16px' }}>모음컷 프리미엄</span>
                          <span style={{ fontWeight: 900, fontSize: '16px', color: 'var(--orange)' }}>27,900원/장</span>
                        </div>
                        <ul style={{ color: '#666', fontSize: '13px', lineHeight: 1.9, margin: 0, paddingLeft: '16px' }}>
                          <li>구도 선택 (항공뷰 / 측면뷰)</li>
                          <li>레퍼런스 이미지 업로드 가능</li>
                          <li>음식사진 수량 제한 없음</li>
                          <li>여러 장 제작 가능</li>
                        </ul>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 4: 상세 옵션 ─── */}
        {!showLoginGate && step === 4 && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)', letterSpacing: '2px', marginBottom: '12px' }}>STEP 04</p>
            <SummaryBadges form={form} />

            {/* 모음컷 일반 — 추가 요청사항 */}
            {form.planType === 'collection' && form.collectionTier === 'standard' && (
              <>
                <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.5px' }}>추가 요청사항</h2>
                <p style={{ color: '#666', fontSize: '15px', marginBottom: '28px' }}>특별히 원하시는 내용이 있으면 알려주세요 (선택)</p>
                <textarea
                  value={form.freeRequest}
                  onChange={e => update('freeRequest', e.target.value)}
                  placeholder="예) 각 메뉴 이름을 이미지에 넣어주세요 / 색감은 따뜻하게 해주세요"
                  style={{ width: '100%', padding: '16px', borderRadius: '14px', border: '1.5px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '14px', lineHeight: 1.7, minHeight: '140px', resize: 'vertical', outline: 'none', fontFamily: 'inherit', color: 'var(--black)' }}
                />
              </>
            )}

            {/* 모음컷 프리미엄 — 브리핑 */}
            {form.planType === 'collection' && form.collectionTier === 'premium' && (
              <>
                <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.5px' }}>제작 브리핑</h2>
                <p style={{ color: '#666', fontSize: '15px', marginBottom: '24px' }}>원하시는 방향을 자유롭게 알려주세요 (선택)</p>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>레퍼런스 이미지 (선택)</label>
                  <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '10px' }}>원하는 분위기나 구도 참고 이미지를 여러 장 올려주세요</p>
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '24px', borderRadius: '14px', border: '2px dashed rgba(0,0,0,0.15)', background: '#fff', cursor: 'pointer' }}>
                    <span style={{ fontSize: '28px' }}>🖼️</span>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: '#555' }}>
                      {form.refFiles.length > 0 ? `${form.refFiles.length}장 선택됨 (클릭하여 변경)` : '참고 이미지 업로드'}
                    </span>
                    <span style={{ fontSize: '12px', color: '#aaa' }}>여러 장 한 번에 선택 가능</span>
                    <input ref={refInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { if (e.target.files) update('refFiles', Array.from(e.target.files)); e.target.value = '' }} />
                  </label>
                  {form.refFiles.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '10px' }}>
                      {form.refFiles.map((f, i) => (
                        <img key={i} src={URL.createObjectURL(f)} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '10px', display: 'block' }} />
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '15px', marginBottom: '10px' }}>추가 요청사항 (선택)</label>
                  <textarea
                    value={form.freeRequest}
                    onChange={e => update('freeRequest', e.target.value)}
                    placeholder="구도, 배경 분위기, 원하는 스타일 등 자유롭게 적어주세요"
                    style={{ width: '100%', padding: '16px', borderRadius: '14px', border: '1.5px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: '14px', lineHeight: 1.7, minHeight: '120px', resize: 'vertical', outline: 'none', fontFamily: 'inherit', color: 'var(--black)' }}
                  />
                </div>
              </>
            )}

            {/* 기본 / 체험 — 그릇 선택 */}
            {form.planType === 'basic' && (
              <>
                <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.5px' }}>그릇을 선택해주세요</h2>
                <p style={{ color: '#666', fontSize: '15px', marginBottom: '28px' }}>
                  {form.photos.length}장 전체에 동일하게 적용됩니다
                </p>

                {/* 원본 그대로 */}
                <button
                  onClick={() => { update('vesselChoice', 'original'); update('vesselId', ''); update('vesselLabel', '') }}
                  style={{ width: '100%', padding: '20px 24px', borderRadius: '16px', border: `2px solid ${form.vesselChoice === 'original' ? 'var(--orange)' : 'rgba(0,0,0,0.08)'}`, background: form.vesselChoice === 'original' ? 'rgba(255,92,0,0.04)' : '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}
                >
                  <span style={{ fontSize: '28px' }}>🍽️</span>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: '16px', marginBottom: '3px' }}>원본 그릇 그대로</p>
                    <p style={{ color: '#888', fontSize: '13px' }}>올려주신 사진의 그릇을 그대로 유지합니다</p>
                  </div>
                </button>

                {/* 그릇 카드 그리드 */}
                <p style={{ fontWeight: 700, fontSize: '14px', color: '#444', marginBottom: '12px' }}>또는 그릇을 직접 선택해주세요</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {VESSEL_CARDS.map(card => {
                    const selected = form.vesselChoice === 'recommended' && form.vesselId === card.id
                    return (
                      <button
                        key={card.id}
                        onClick={() => { update('vesselChoice', 'recommended'); update('vesselId', card.id); update('vesselLabel', card.label) }}
                        style={{ padding: '0', borderRadius: '16px', border: `2px solid ${selected ? 'var(--orange)' : 'rgba(0,0,0,0.08)'}`, background: selected ? 'rgba(255,92,0,0.04)' : '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', overflow: 'hidden' }}
                      >
                        {/* 이미지 */}
                        <div style={{ width: '100%', aspectRatio: '4/3', background: '#f0f0f0', overflow: 'hidden' }}>
                          <img
                            src={card.imgPath}
                            alt={card.label}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        </div>
                        {/* 텍스트 */}
                        <div style={{ padding: '12px 14px' }}>
                          <p style={{ fontWeight: 800, fontSize: '15px', marginBottom: '4px', color: selected ? 'var(--orange)' : 'var(--black)' }}>{card.label}</p>
                          <p style={{ color: '#999', fontSize: '12px', lineHeight: 1.4 }}>{card.hint}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {/* 프리미엄 — 브리핑 폼 */}
            {form.planType === 'premium' && (
              <>
                <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.5px' }}>제작 브리핑</h2>
                <p style={{ color: '#666', fontSize: '15px', marginBottom: '28px' }}>원하시는 방향을 알려주세요</p>

                {/* 원하는 느낌 */}
                <div style={{ marginBottom: '28px' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '15px', marginBottom: '12px' }}>
                    원하는 느낌 <span style={{ color: 'var(--orange)' }}>*</span>
                    <span style={{ color: '#aaa', fontSize: '13px', fontWeight: 400, marginLeft: '8px' }}>중복 선택 가능</span>
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {VIBE_OPTIONS.map(v => {
                      const active = form.vibes.includes(v.id)
                      return (
                        <button
                          key={v.id}
                          onClick={() => update('vibes', active ? form.vibes.filter(x => x !== v.id) : [...form.vibes, v.id])}
                          style={{ padding: '10px 20px', borderRadius: '100px', border: `1.5px solid ${active ? 'var(--orange)' : 'rgba(0,0,0,0.1)'}`, background: active ? 'var(--orange)' : '#fff', color: active ? '#fff' : '#555', fontWeight: 700, fontSize: '14px', cursor: 'pointer', transition: 'all 0.15s' }}
                        >
                          {v.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 그릇 희망 */}
                <div style={{ marginBottom: '28px' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '15px', marginBottom: '12px' }}>
                    그릇 희망 <span style={{ color: 'var(--orange)' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { id: 'recommend', label: '① 기본 그릇 추천 받기', desc: '음식에 맞는 그릇을 작업자가 선택합니다' },
                      { id: 'reference', label: '② 레퍼런스 이미지 업로드', desc: '원하는 그릇 사진이나 스타일 이미지를 첨부하세요' },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => update('vesselPref', opt.id as VesselPref)}
                        style={{ padding: '18px 20px', borderRadius: '14px', border: `2px solid ${form.vesselPref === opt.id ? 'var(--orange)' : 'rgba(0,0,0,0.08)'}`, background: form.vesselPref === opt.id ? 'rgba(255,92,0,0.04)' : '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                      >
                        <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>{opt.label}</p>
                        <p style={{ color: '#888', fontSize: '13px' }}>{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 레퍼런스 이미지 업로드 */}
                {form.vesselPref === 'reference' && (
                  <div style={{ marginBottom: '28px' }}>
                    <div style={{ background: 'rgba(255,92,0,0.06)', border: '1px solid rgba(255,92,0,0.15)', borderRadius: '12px', padding: '14px 16px', marginBottom: '14px' }}>
                      <p style={{ fontSize: '13px', color: '#666', lineHeight: 1.7, margin: 0 }}>
                        참고 이미지는 "이런 느낌으로 만들어 주세요" 하고 보여주는 용도예요.<br />
                        올려주신 느낌을 전체 메뉴에 통일감 있게 적용해 드립니다.<br />
                        <span style={{ color: '#aaa' }}>(메뉴마다 그릇을 다 다르게 지정하는 건 별도 작업이에요)</span>
                      </p>
                    </div>
                    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '24px', borderRadius: '14px', border: '2px dashed rgba(0,0,0,0.15)', background: '#fff', cursor: 'pointer' }}>
                      <span style={{ fontSize: '28px' }}>🖼️</span>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: '#555' }}>
                        {form.refFiles.length > 0 ? `${form.refFiles.length}장 선택됨 (클릭하여 변경)` : '레퍼런스 이미지 업로드 (선택)'}
                      </span>
                      <input ref={refInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { if (e.target.files) update('refFiles', Array.from(e.target.files)); e.target.value = '' }} />
                    </label>
                    {form.refFiles.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '10px' }}>
                        {form.refFiles.map((f, i) => (
                          <img key={i} src={URL.createObjectURL(f)} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '10px', display: 'block' }} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 수정 범위 안내 */}
                <div style={{ background: '#f7f7f7', borderRadius: '14px', padding: '18px 20px', marginBottom: '24px' }}>
                  <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '10px', color: 'var(--black)' }}>수정 범위 안내</p>
                  <p style={{ fontSize: '13px', color: '#555', lineHeight: 1.8, margin: 0 }}>
                    수정은 기본 2회 포함됩니다.<br />
                    <b>[무료 수정]</b> 밝기·색상 보정, 간단한 재료 정리(삭제)<br />
                    <b>[추가 비용]</b> 재료 추가<br />
                    <b>[새 주문]</b> 그릇 변경, 음식 위치·각도 변경, 배경·콘셉트 변경, 메뉴 교체
                  </p>
                </div>

                {/* 자유 요청 */}
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '15px', marginBottom: '10px' }}>
                    자유 요청 <span style={{ color: '#aaa', fontWeight: 400, fontSize: '13px' }}>(선택)</span>
                  </label>
                  <textarea
                    value={form.freeRequest}
                    onChange={e => update('freeRequest', e.target.value)}
                    placeholder="추가로 전달하고 싶은 내용이 있으면 자유롭게 적어주세요"
                    rows={4}
                    style={{ width: '100%', padding: '16px', borderRadius: '14px', border: '1.5px solid rgba(0,0,0,0.1)', fontSize: '15px', outline: 'none', resize: 'vertical', background: '#fff', lineHeight: 1.6, boxSizing: 'border-box' }}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── 카카오 로그인 게이트 (step 4 → 5 사이) ─── */}
        {showLoginGate && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)', letterSpacing: '2px', marginBottom: '12px' }}>STEP 05</p>
            <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.5px' }}>거의 다 왔어요!</h2>
            <p style={{ color: '#666', fontSize: '15px', marginBottom: '32px' }}>주문 확인 및 결과물 수령을 위해<br />카카오 로그인이 필요해요</p>
            <div style={{ background: '#fff', borderRadius: '24px', padding: '40px 32px', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍱</div>
              <h3 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '10px', letterSpacing: '-0.5px' }}>1초 간편 로그인하고<br />시작하기</h3>
              <p style={{ color: '#888', fontSize: '14px', lineHeight: 1.7, marginBottom: '28px' }}>
                작업 완료 시 카카오톡으로<br />결과물 링크를 바로 보내드립니다
              </p>
              <a
                href="/api/auth/kakao?returnTo=/v2/order"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: '#FEE500', color: '#000', padding: '16px 20px', borderRadius: '14px', fontWeight: 800, fontSize: '16px', textDecoration: 'none', boxShadow: '0 4px 16px rgba(254,229,0,0.5)' }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="black"><path fillRule="evenodd" clipRule="evenodd" d="M12 3C6.477 3 2 6.582 2 11.012c0 2.782 1.696 5.232 4.27 6.729l-1.088 3.98a.3.3 0 0 0 .46.325l4.603-3.05c.573.08 1.162.122 1.755.122 5.523 0 10-3.582 10-8.012S17.523 3 12 3Z"/></svg>
                카카오로 1초 로그인
              </a>
            </div>
          </div>
        )}

        {/* ─── STEP 5: 연락처 ─── */}
        {!showLoginGate && step === 5 && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)', letterSpacing: '2px', marginBottom: '12px' }}>STEP 05</p>
            <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.5px' }}>연락처를 알려주세요</h2>
            <p style={{ color: '#666', fontSize: '15px', marginBottom: '20px' }}>결과물은 카카오톡 채널로 전달해드립니다</p>
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '14px', padding: '16px 18px', marginBottom: '24px' }}>
              <p style={{ fontSize: '13px', color: '#555', lineHeight: 1.8, margin: 0 }}>
                💬 입금 확인 후 영업시간 내 카카오톡으로 담당자가 먼저 연락드려요<br />
                <span style={{ color: '#aaa' }}>영업시간 오전 10시 ~ 오후 6시 (주말·공휴일 제외)</span>
              </p>
            </div>
            <SummaryBadges form={form} />

            {session ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FEE500', borderRadius: '10px', padding: '10px 16px', marginBottom: '20px' }}>
                <span style={{ fontSize: '16px' }}>💬</span>
                <p style={{ color: '#000', fontSize: '14px', fontWeight: 700, margin: 0 }}>카카오 로그인 연동됨 — 마이페이지에서 결과물 확인 가능</p>
              </div>
            ) : (
              <button onClick={() => { saveOrderDraft(); window.location.href = '/api/auth/kakao?returnTo=/v2/order' }} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#FEE500', color: '#000', padding: '14px 18px', borderRadius: '12px', fontWeight: 700, fontSize: '15px', border: 'none', cursor: 'pointer', marginBottom: '20px', boxShadow: '0 2px 10px rgba(254,229,0,0.4)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="black"><path fillRule="evenodd" clipRule="evenodd" d="M12 3C6.477 3 2 6.582 2 11.012c0 2.782 1.696 5.232 4.27 6.729l-1.088 3.98a.3.3 0 0 0 .46.325l4.603-3.05c.573.08 1.162.122 1.755.122 5.523 0 10-3.582 10-8.012S17.523 3 12 3Z"/></svg>
                카카오로 로그인하고 결과물 받기 (선택)
              </button>
            )}

            {uploadProgress && (
              <div style={{ background: 'rgba(255,92,0,0.06)', border: '1px solid rgba(255,92,0,0.2)', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)' }}>사진 업로드 중...</span>
                  <span style={{ fontSize: '13px', color: '#888' }}>{uploadProgress.done} / {uploadProgress.total}</span>
                </div>
                <div style={{ height: '4px', background: 'rgba(0,0,0,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--orange)', borderRadius: '2px', width: `${(uploadProgress.done / uploadProgress.total) * 100}%`, transition: 'width 0.3s' }} />
                </div>
              </div>
            )}

            {[
              { key: 'customerName',  label: '이름 / 상호명', placeholder: '예: 홍길동 / 가게이름', type: 'text',  required: true  },
              { key: 'customerPhone', label: '전화번호',       placeholder: '예: 010-1234-5678',   type: 'tel',   required: true  },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '15px', marginBottom: '10px' }}>
                  {f.label}
                  {f.required ? <span style={{ color: 'var(--orange)' }}> *</span> : <span style={{ color: '#aaa', fontWeight: 400, fontSize: '13px' }}> (선택)</span>}
                </label>
                <input
                  type={f.type}
                  value={(form as any)[f.key]}
                  onChange={e => update(f.key as keyof V2Form, e.target.value as any)}
                  placeholder={f.placeholder}
                  style={{ width: '100%', padding: '16px 20px', borderRadius: '14px', border: `1.5px solid ${(form as any)[f.key] ? 'var(--orange)' : 'rgba(0,0,0,0.1)'}`, fontSize: '16px', outline: 'none', background: '#fff', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                />
              </div>
            ))}

            {/* 주문 요약 */}
            <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid rgba(0,0,0,0.08)' }}>
              <h3 style={{ fontWeight: 800, fontSize: '16px', marginBottom: '16px' }}>주문 요약</h3>
              {[
                { label: '플랜', value: form.planType === 'premium' ? '프리미엄' : '기본' },
                { label: '사진 수', value: `${photoCount}장` },
                { label: '구도', value: form.angle === 'aerial' ? '항공뷰' : '측면뷰' },
                { label: '분위기', value: form.mood === 'black' ? '어두운 (Black)' : '밝은 (White)' },
                ...(form.planType !== 'premium'
                  ? [{ label: '그릇', value: form.vesselChoice === 'original' ? '원본 그대로' : form.vesselLabel ? `추천: ${form.vesselLabel}` : '추천 그릇' }]
                  : [{ label: '원하는 느낌', value: form.vibes.map(id => VIBE_OPTIONS.find(v => v.id === id)?.label).join(', ') || '-' }]
                ),
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <span style={{ color: '#666', fontSize: '14px' }}>{row.label}</span>
                  <span style={{ fontWeight: 600, fontSize: '14px', textAlign: 'right', maxWidth: '60%' }}>{row.value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px', marginTop: '8px' }}>
                <span style={{ fontWeight: 700 }}>입금 금액</span>
                <span style={{ fontWeight: 900, fontSize: '22px', color: 'var(--orange)' }}>{displayAmount.toLocaleString()}원</span>
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 6: 접수 완료 & 계좌이체 ─── */}
        {step === 6 && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
              <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.5px' }}>접수가 완료됐어요!</h2>
              <p style={{ color: '#666', fontSize: '15px', lineHeight: 1.7 }}>
                아래 계좌로 입금해주시면<br />
                <b>입금 확인 후 3일 이내 제작 완료 예정입니다</b>
              </p>
            </div>

            {/* 계좌 정보 */}
            <div style={{ background: '#fff', borderRadius: '20px', padding: '28px', marginBottom: '20px', border: '2px solid var(--orange)', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '16px', fontWeight: 600, letterSpacing: '1px' }}>입금 계좌</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                <p style={{ fontSize: '14px', color: '#666' }}>{BANK_INFO.bankName}</p>
                <p style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '2px', color: 'var(--black)' }}>{BANK_INFO.accountNumber}</p>
                <p style={{ fontSize: '14px', color: '#666' }}>예금주: {BANK_INFO.accountHolder}</p>
              </div>
              <div style={{ background: 'rgba(255,92,0,0.08)', borderRadius: '12px', padding: '16px' }}>
                <p style={{ fontWeight: 900, fontSize: '22px', color: 'var(--orange)', margin: 0 }}>
                  {(completedOrder?.amount ?? displayAmount).toLocaleString()}원
                </p>
                <p style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>위 금액을 입금해주세요</p>
              </div>
            </div>

            {/* 안내사항 */}
            <div style={{ background: '#fff9', borderRadius: '16px', padding: '20px', marginBottom: '20px', border: '1px solid rgba(0,0,0,0.08)' }}>
              <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px' }}>안내사항</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  '입금 확인 후 작업이 시작됩니다.',
                  '작업 완료 후 카카오톡으로 결과물 링크를 보내드립니다.',
                  '문의사항은 카카오톡 채널 "메뉴랩"으로 연락해주세요.',
                ].map((txt, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--orange)', fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <p style={{ color: '#555', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{txt}</p>
                  </div>
                ))}
              </div>
            </div>

            <Link href="/v2" style={{ display: 'block', textAlign: 'center', padding: '16px', borderRadius: '100px', background: 'rgba(0,0,0,0.06)', color: 'var(--black)', fontWeight: 700, fontSize: '16px', textDecoration: 'none' }}>
              홈으로 돌아가기 →
            </Link>
          </div>
        )}

      </div>

      {/* 하단 버튼 */}
      {(step < 6 || showLoginGate) && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(250,247,242,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(0,0,0,0.08)', padding: '16px 5vw', display: 'flex', gap: '12px' }}>
          {(step > 1 || showLoginGate) && (
            <button onClick={goPrev} style={{ flex: 1, padding: '16px', borderRadius: '100px', border: '2px solid rgba(0,0,0,0.1)', background: '#fff', fontWeight: 700, fontSize: '16px', cursor: 'pointer', color: 'var(--black)' }}>← 이전</button>
          )}
          {!showLoginGate && (
            <button
              disabled={!canProceed() || submitting || savingLoginState}
              onClick={() => {
                if (step < 5) goNext()
                else if (step === 5) handleSubmit()
              }}
              style={{ flex: 2, padding: '16px', borderRadius: '100px', background: canProceed() && !submitting && !savingLoginState ? 'var(--orange)' : 'rgba(0,0,0,0.1)', color: canProceed() && !submitting && !savingLoginState ? '#fff' : '#aaa', border: 'none', fontWeight: 700, fontSize: '16px', cursor: canProceed() && !submitting && !savingLoginState ? 'pointer' : 'not-allowed', transition: 'all 0.2s', boxShadow: canProceed() && !submitting && !savingLoginState ? '0 4px 20px rgba(255,92,0,0.3)' : 'none' }}
            >
              {savingLoginState                    ? '업로드 완료 중...'
                : submitting                       ? '접수 중...'
                : step === 5                       ? '접수하기 →'
                : isCompressing && step === 2      ? '이미지 처리 중...'
                : step === 1 && !canProceed()      ? '제작 방식을 선택해주세요'
                : step === 2 && !canProceed()      ? '사진을 업로드해주세요'
                : '다음 단계 →'}
            </button>
          )}
        </div>
      )}
      {/* ─── 촬영 가이드 모달 ─── */}
      {showPhotoGuide && (
        <div
          onClick={() => setShowPhotoGuide(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '480px', maxHeight: '88vh', overflowY: 'auto', padding: '28px 20px 40px', animation: 'slideUp 0.3s ease' }}
          >
            {/* 핸들 */}
            <div style={{ width: '40px', height: '4px', background: '#e0e0e0', borderRadius: '2px', margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '-0.5px' }}>사진 업로드 가이드</h2>
              <button onClick={() => setShowPhotoGuide(false)} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#999', padding: '0 4px' }}>×</button>
            </div>
            <p style={{ color: '#888', fontSize: '13px', marginBottom: '20px' }}>메뉴사진의 에이스가 될 원본 사진 촬영방법입니다</p>

            {/* 좋아요 */}
            <div style={{ background: '#f2faf3', borderRadius: '16px', padding: '16px', marginBottom: '14px' }}>
              <p style={{ fontWeight: 800, fontSize: '15px', marginBottom: '12px', color: '#2e7d32' }}>✅ 좋아요</p>
              {/* 예시 이미지 */}
              <button onClick={() => setPreviewImage('/guide-good.png')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', width: '100%', position: 'relative', display: 'block', marginBottom: '14px' }}>
                <img src="/guide-good.png" alt="좋은 예시" style={{ width: '100%', height: '130px', objectFit: 'cover', borderRadius: '10px', border: '2px solid #a5d6a7', display: 'block' }} />
                <div style={{ position: 'absolute', inset: 0, borderRadius: '10px', background: 'rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '22px' }}>🔍</span>
                </div>
              </button>
              {/* 체크리스트 */}
              {[
                '자연광 또는 밝은 조명에서 찍은 사진',
                '음식을 담은 그릇 전체가 보이는 사진',
                '흔들리지 않고 선명하게 찍힌 사진',
                '토핑과 재료 구분이 잘 되는 사진',
                '스마트폰을 가로로 돌려서 촬영 (강력 권장)',
              ].map((text, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: i < 4 ? '8px' : 0 }}>
                  <span style={{ color: '#4caf50', fontWeight: 800, fontSize: '15px', lineHeight: '20px', flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: '13px', color: '#333', lineHeight: '20px' }}>{text}</span>
                </div>
              ))}
            </div>

            {/* 사용 불가 */}
            <div style={{ background: '#fff5f5', borderRadius: '16px', padding: '16px', marginBottom: '20px' }}>
              <p style={{ fontWeight: 800, fontSize: '15px', marginBottom: '12px', color: '#c62828' }}>❌ 사용 불가</p>
              {/* 예시 이미지 행 */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                {['/guide-bad-1.png', '/guide-bad-2.png', '/guide-bad-3.png'].map((src, i) => (
                  <button key={i} onClick={() => setPreviewImage(src)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', position: 'relative', flex: 1 }}>
                    <img src={src} alt={`사용불가 예시 ${i + 1}`} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: '10px', border: '2px solid #ef9a9a', display: 'block' }} />
                    {/* 빨간 원형 X — 우측 하단 */}
                    <div style={{ position: 'absolute', bottom: '6px', right: '6px', width: '22px', height: '22px', borderRadius: '50%', background: '#e53935', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: '#fff', fontSize: '11px', fontWeight: 900, lineHeight: 1 }}>✕</span>
                    </div>
                  </button>
                ))}
              </div>
              {/* 체크리스트 */}
              {[
                '어두운 곳에서 플래시 촬영한 사진',
                '어두워서 재료 구분이 어려운 사진',
                '심하게 흔들리거나 잘린 사진',
                'AI로 이미 제작한 사진',
                '세로 방향 사진 (상하가 잘릴 수 있어요)',
              ].map((text, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: i < 4 ? '8px' : 0 }}>
                  <span style={{ color: '#f44336', fontWeight: 800, fontSize: '15px', lineHeight: '20px', flexShrink: 0 }}>✗</span>
                  <span style={{ fontSize: '13px', color: '#333', lineHeight: '20px' }}>{text}</span>
                </div>
              ))}
            </div>

            {/* 주의 */}
            <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: '12px', padding: '12px 14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '18px' }}>⚠️</span>
              <p style={{ fontSize: '12px', color: '#7a5c00', lineHeight: 1.6 }}>
                가이드에 맞지 않는 사진을 전달하실 경우 작업이 거부될 수 있어요.<br />
                전달이 어려운 상황일 경우 별도 문의 부탁드립니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── 이미지 크게보기 ─── */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <img src={previewImage} alt="예시 크게보기" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '12px' }} />
          <button onClick={() => setPreviewImage(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: '22px', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
      )}

      {/* ─── 세로 사진 경고 모달 ─── */}
      {showPortraitModal && (
        <div
          onClick={() => setShowPortraitModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '480px', padding: '28px 20px 40px', animation: 'slideUp 0.3s ease' }}
          >
            <div style={{ width: '40px', height: '4px', background: '#e0e0e0', borderRadius: '2px', margin: '0 auto 20px' }} />
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚠️</div>
              <h3 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.5px' }}>가로 사진으로 올려주세요</h3>
              <p style={{ color: '#666', fontSize: '14px', lineHeight: 1.8 }}>
                가로 구도는 음식의 <b>풍성함과 질감</b>을 훨씬 잘 살려줘요.<br />
                세로 사진은 같은 음식도 <b>좁고 답답하게</b> 보일 수 있어요.<br />
                <span style={{ color: 'var(--orange)', fontWeight: 700 }}>지금 바꾸시면 훨씬 맛있는 결과물을 받아보실 수 있어요.</span>
              </p>
            </div>
            <div style={{ background: '#f5f5f5', borderRadius: '12px', padding: '12px 14px', marginBottom: '20px', display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', marginBottom: '4px' }}>✅</div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#4caf50' }}>가로 촬영</p>
              </div>
              <div style={{ fontSize: '24px', color: '#ccc', display: 'flex', alignItems: 'center' }}>→</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', marginBottom: '4px' }}>⚠️</div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#f5a623' }}>세로 촬영</p>
              </div>
            </div>
            <button
              onClick={() => setShowPortraitModal(false)}
              style={{ width: '100%', background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: '14px', padding: '16px', fontSize: '16px', fontWeight: 800, cursor: 'pointer' }}
            >
              알겠어요, 계속 진행할게요
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function V2OrderPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>로딩 중...</p></div>}>
      <OrderPageInner />
    </Suspense>
  )
}
