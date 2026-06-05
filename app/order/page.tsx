'use client'

import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'

type Step = 1 | 2 | 3 | 4 | 5 | 6

interface MenuItem {
  vessel: string
  photo: File
}

interface OrderForm {
  purpose: 'delivery' | 'promo' | ''
  orderType: 'full' | 'collection' | ''
  cutCount: string
  menuItems: MenuItem[]
  angle: 'aerial' | 'side' | ''
  background: 'bright' | 'dark' | 'wood' | 'white' | 'black' | 'brand' | ''
  brandColorCode: string
  customerName: string
  customerPhone: string
  customerEmail: string
}

const VESSEL_OPTIONS = [
  { id: '', label: '원본 그릇 그대로' },
  { id: 'white ceramic or porcelain — keep the exact same shape as the original vessel', label: '흰색 도자기' },
  { id: 'matte black ceramic — keep the exact same shape as the original vessel', label: '검정 세라믹' },
  { id: 'traditional Korean earthenware ttukbaegi (dark brown clay stone pot)', label: '뚝배기' },
  { id: 'black Korean jeongol hot pot (wide shallow black metal pot)', label: '검정색 전골 냄비' },
  { id: 'silver stainless steel — keep the exact same shape as the original vessel', label: '은색 스테인리스' },
]

const PRICE_TIERS = [
  { min: 1,  max: 4,  unitPrice: 9900, discount: 0  },
  { min: 5,  max: 9,  unitPrice: 9405, discount: 5  },
  { min: 10, max: 19, unitPrice: 8900, discount: 10 },
  { min: 20, max: 50, unitPrice: 7900, discount: 20 },
]

function calcPrice(count: number): number {
  const tier = PRICE_TIERS.find(t => count >= t.min && count <= t.max) || PRICE_TIERS[0]
  return count * tier.unitPrice
}

function getTier(count: number) {
  return PRICE_TIERS.find(t => count >= t.min && count <= t.max) || PRICE_TIERS[0]
}

const PURPOSE_LABELS: Record<string, string> = { delivery: '배달앱 & 네이버플레이스용', promo: '홍보용' }
const ANGLE_LABELS: Record<string, string> = { aerial: '항공뷰', side: '측면뷰' }
const BG_LABELS: Record<string, string> = { bright: '밝고 깔끔', dark: '어둡고 고급', wood: '우드', white: '화이트', black: '블랙', brand: '브랜드 컬러' }
const COLLECTION_PRICE = 19900

async function compressImage(file: File, maxSizeKB = 300): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file) }
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(file); return }
        const maxPx = 1024
        let w = img.width, h = img.height
        if (w > maxPx || h > maxPx) {
          if (w > h) { h = Math.round(h * maxPx / w); w = maxPx }
          else { w = Math.round(w * maxPx / h); h = maxPx }
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
    img.src = objectUrl
  })
}

function SelectionBadge({ form }: { form: OrderForm }) {
  const parts: string[] = []
  if (form.purpose) parts.push(PURPOSE_LABELS[form.purpose])
  if (form.orderType) parts.push(form.orderType === 'collection' ? '모음컷' : `본주문 ${form.cutCount}장`)
  if (form.angle) parts.push(ANGLE_LABELS[form.angle])
  if (form.background) parts.push(BG_LABELS[form.background])
  if (!parts.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '28px' }}>
      {parts.map(p => (
        <span key={p} style={{ padding: '4px 12px', borderRadius: '100px', background: 'rgba(255,92,0,0.1)', color: 'var(--orange)', fontSize: '12px', fontWeight: 600 }}>{p}</span>
      ))}
    </div>
  )
}

function OrderPageInner() {
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<OrderForm>({
    purpose: '', orderType: '', cutCount: '',
    menuItems: [],
    angle: '', background: '', brandColorCode: '',
    customerName: '', customerPhone: '', customerEmail: '',
  })
  const [sessionLoaded, setSessionLoaded] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      const raw = localStorage.getItem('menulab_session')
      if (raw) { const { email } = JSON.parse(raw); return !!email }
    } catch {}
    return false
  })

  const [submitting, setSubmitting] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [orderId, setOrderId] = useState('')
  const [payMethod, setPayMethod] = useState<'KCP' | 'INICIS' | 'KAKAOPAY' | ''>('')
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null)
  const uploadPromiseRef = useRef<Promise<string[]> | null>(null)
  const uploadedUrlsRef = useRef<string[] | null>(null)
  const photoUploadCache = useRef<Map<File, Promise<string>>>(new Map())
  const batchInputRef = useRef<HTMLInputElement>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const cut = searchParams.get('cut')
    if (cut) setForm(prev => ({ ...prev, orderType: 'full', cutCount: cut }))

    try {
      const raw = localStorage.getItem('menulab_session')
      if (raw) {
        const { email, name } = JSON.parse(raw)
        if (name) setForm(prev => ({ ...prev, customerName: name }))
        if (email) {
          setForm(prev => ({ ...prev, customerEmail: email }))
          setSessionLoaded(true)
        }
      }
    } catch {}
  }, [])

  // cutCount 변경 시 초과분 trim
  useEffect(() => {
    const max = form.orderType === 'collection' ? 5 : parseInt(form.cutCount) || 50
    if (form.menuItems.length > max) {
      setForm(prev => ({ ...prev, menuItems: prev.menuItems.slice(0, max) }))
    }
  }, [form.cutCount, form.orderType])

  const update = (key: keyof OrderForm, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const updateItemVessel = (idx: number, vessel: string) => {
    setForm(prev => {
      const items = [...prev.menuItems]
      items[idx] = { ...items[idx], vessel }
      return { ...prev, menuItems: items }
    })
  }

  const removeItem = (idx: number) =>
    update('menuItems', form.menuItems.filter((_, i) => i !== idx))

  const uploadSinglePhoto = (photo: File): Promise<string> => {
    if (photoUploadCache.current.has(photo)) return photoUploadCache.current.get(photo)!
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 20000)
    const promise = (async (): Promise<string> => {
      try {
        const fd = new FormData()
        fd.append('photo', photo)
        const res = await fetch('/api/upload', { method: 'POST', body: fd, signal: controller.signal })
        clearTimeout(tid)
        const data = await res.json()
        return data.url || ''
      } catch { clearTimeout(tid); return '' }
    })()
    photoUploadCache.current.set(photo, promise)
    return promise
  }

  const handleBatchFiles = async (files: FileList | null) => {
    if (!files) return
    const max = form.orderType === 'sample' ? 1 : form.orderType === 'collection' ? 5 : parseInt(form.cutCount) || 50
    const remaining = max - form.menuItems.length
    if (remaining <= 0) return
    const valid = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, remaining)
    if (!valid.length) return
    setIsCompressing(true)
    const compressed = await Promise.all(valid.map(f => compressImage(f)))
    const newItems: MenuItem[] = compressed.map(photo => ({ vessel: '', photo }))
    setForm(prev => ({ ...prev, menuItems: [...prev.menuItems, ...newItems] }))
    setIsCompressing(false)
    // 압축 완료 즉시 백그라운드 업로드 시작 — Step5 도달 전에 이미 완료됨
    compressed.forEach(photo => uploadSinglePhoto(photo))
  }

  const startBackgroundUpload = (items: MenuItem[]) => {
    uploadedUrlsRef.current = null
    setUploadProgress({ done: 0, total: items.length })
    let doneCount = 0
    const promise = Promise.all(
      items.map(async (item) => {
        const url = await uploadSinglePhoto(item.photo)
        doneCount++
        setUploadProgress({ done: doneCount, total: items.length })
        return url
      })
    ).then(urls => {
      setUploadProgress(null)
      uploadedUrlsRef.current = urls
      return urls
    })
    uploadPromiseRef.current = promise
    return promise
  }

  const goNext = () => {
    if (step === 4) {
      startBackgroundUpload(form.menuItems)
    }
    if (step === 2 && form.purpose === 'promo' && form.orderType !== 'collection') setStep(4)
    else if (step < 6) setStep((step + 1) as Step)
  }

  const goPrev = () => {
    if (step === 4 && form.purpose === 'promo' && form.orderType !== 'collection') setStep(2)
    else if (step > 1) setStep((step - 1) as Step)
  }

  const canProceed = (): boolean => {
    if (step === 1) return form.purpose !== ''
    if (step === 2) return form.orderType !== '' && (form.orderType === 'collection' || form.cutCount !== '')
    if (step === 3) {
      if (form.orderType === 'collection') {
        const validBgs = ['wood', 'white', 'black', 'brand']
        return validBgs.includes(form.background) && (form.background !== 'brand' || form.brandColorCode.trim().length > 0)
      }
      return form.angle !== '' && form.background !== ''
    }
    if (step === 4) return form.menuItems.length > 0
    if (step === 5) return form.customerName !== ''
    if (step === 6) return payMethod !== ''
    return false
  }

  // Step02 미리보기용 (cutCount 기준)
  const previewPrice = () => {
    if (form.orderType === 'collection') return { count: 1, price: COLLECTION_PRICE }
    const count = parseInt(form.cutCount) || 0
    return { count, price: count > 0 ? calcPrice(count) : 0 }
  }

  // 실제 결제용 (menuItems 실제 장수 기준)
  const getPriceInfo = () => {
    if (form.orderType === 'collection') return { label: '모음컷 1장', price: COLLECTION_PRICE, count: 1 }
    const count = form.menuItems.length
    return { label: `${count}장`, price: calcPrice(count), count }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      // 백그라운드 업로드 완료까지 대기
      let preUploadedUrls: string[] = []
      if (uploadPromiseRef.current) {
        preUploadedUrls = await uploadPromiseRef.current
      } else {
        preUploadedUrls = uploadedUrlsRef.current ?? []
      }

      const formData = new FormData()
      formData.append('orderType', form.orderType)
      formData.append('cutCount', form.menuItems.length.toString())
      formData.append('menuNames', form.menuItems.map((_, i) => `사진 ${i + 1}`).join(', '))
      formData.append('purpose', form.purpose)
      formData.append('angle', form.angle)
      formData.append('background', form.background)
      formData.append('vesselInfo', JSON.stringify(form.menuItems.map(item => item.vessel)))
      formData.append('customerName', form.customerName)
      formData.append('customerPhone', form.customerPhone)
      formData.append('customerEmail', form.customerEmail)
      formData.append('notes', '')
      formData.append('brandColor', form.orderType === 'collection' ? form.brandColorCode : '')

      if (preUploadedUrls.length === form.menuItems.length && preUploadedUrls.every(u => u)) {
        formData.append('preUploadedUrls', JSON.stringify(preUploadedUrls))
      } else {
        form.menuItems.forEach(item => formData.append('photos', item.photo))
      }
      const orderCtrl = new AbortController()
      const orderTid = setTimeout(() => orderCtrl.abort(), 55000)
      const res = await fetch('/api/order', { method: 'POST', body: formData, signal: orderCtrl.signal }).finally(() => clearTimeout(orderTid))
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `서버 오류 (${res.status})`)
      }
      const data = await res.json()
      setOrderId(data.orderId)
      setStep(6)
    } catch (e) {
      console.error('주문 전송 오류:', e)
      alert('전송 중 오류가 발생했습니다. 카카오톡으로 문의해주세요.')
    }
    setSubmitting(false)
  }

  const handlePayment = async () => {
    alert('주문 결제는 카카오톡으로 문의해주세요.')
  }

  const skipStep3 = form.purpose === 'promo' && form.orderType !== 'collection'
  const totalDots = skipStep3 ? 5 : 6
  const visualStep = (skipStep3 && step >= 4) ? step - 1 : step
  const info = form.orderType ? getPriceInfo() : null
  const maxCount = form.orderType === 'collection' ? 5 : parseInt(form.cutCount) || 50

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '0 5vw', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="https://i.ibb.co/YF3csF80/image.png" alt="메뉴랩" style={{ height: '54px', width: 'auto' }} />
        </Link>
        <div style={{ display: 'flex', gap: '6px' }}>
          {Array.from({ length: totalDots }, (_, i) => (
            <div key={i} style={{ width: '24px', height: '4px', borderRadius: '2px', background: i < visualStep ? 'var(--orange)' : 'rgba(0,0,0,0.1)', transition: 'background 0.3s' }} />
          ))}
        </div>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '48px 5vw 120px' }}>

        {/* ── STEP 1: 용도 ── */}
        {step === 1 && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)', letterSpacing: '2px', marginBottom: '12px' }}>STEP 01</p>
            <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.5px' }}>어떤 사진이 필요하세요?</h2>
            <p style={{ color: '#666', fontSize: '15px', marginBottom: '40px' }}>용도에 맞게 최적화된 결과물을 제공합니다</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { id: 'delivery', emoji: '🍱', title: '배달앱 & 네이버플레이스용', lines: ['배경 통일 · 소품 불가 (플랫폼 정책에 맞게)', '배민 3:2 + 네이버플레이스 1:1 두 가지 사이즈 제공'], highlight: true },
                { id: 'promo', emoji: '📢', title: '홍보용', sub: 'SNS · 전단지 · 메뉴판', lines: ['배경 자유 · 소품 가능 (창의적 연출)', '3:2 사이즈 1가지 제공'], highlight: false },
              ].map(opt => (
                <button key={opt.id} onClick={() => update('purpose', opt.id)} style={{ padding: '28px', borderRadius: '20px', border: `2px solid ${form.purpose === opt.id ? 'var(--orange)' : 'rgba(0,0,0,0.08)'}`, background: form.purpose === opt.id ? 'rgba(255,92,0,0.04)' : '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '30px' }}>{opt.emoji}</span>
                    <div>
                      <span style={{ fontWeight: 800, fontSize: '17px' }}>{opt.title}</span>
                      {opt.sub && <span style={{ color: '#888', fontWeight: 400, fontSize: '13px', marginLeft: '8px' }}>{opt.sub}</span>}
                    </div>
                  </div>
                  <div style={{ paddingLeft: '42px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {opt.lines.map((line, i) => (
                      <p key={i} style={{ color: i === 0 && opt.highlight ? 'var(--orange)' : '#666', fontSize: '13px', fontWeight: i === 0 && opt.highlight ? 600 : 400 }}>✓ {line}</p>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 2: 컷 수 ── */}
        {step === 2 && (() => {
          const pv = previewPrice()
          const fullCount = parseInt(form.cutCount) || 1
          const currentTier = getTier(fullCount)
          return (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)', letterSpacing: '2px', marginBottom: '12px' }}>STEP 02</p>
            <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.5px' }}>어떻게 시작할까요?</h2>
            <p style={{ color: '#666', fontSize: '15px', marginBottom: '20px' }}>원하는 주문 방식을 선택해주세요</p>
            <SelectionBadge form={form} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 본 주문 */}
              <div onClick={() => { if (form.orderType !== 'full') { update('orderType', 'full'); update('cutCount', '5') } }} style={{ padding: '28px', borderRadius: '20px', border: `2px solid ${form.orderType === 'full' ? 'var(--orange)' : 'rgba(0,0,0,0.08)'}`, background: form.orderType === 'full' ? 'rgba(255,92,0,0.04)' : '#fff', cursor: 'pointer', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 800, fontSize: '18px' }}>본 주문</span>
                  <span style={{ fontWeight: 900, fontSize: '16px', color: 'var(--orange)' }}>최저 7,900원!</span>
                </div>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: form.orderType === 'full' ? '24px' : '0' }}>여러 장 · AI 자동 처리 · 실제 업로드 장수만큼 결제</p>

                {form.orderType === 'full' && (
                  <>
                    {/* 수량 선택 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '20px' }}>
                      <button onClick={e => { e.stopPropagation(); update('cutCount', Math.max(1, fullCount - 1).toString()) }}
                        style={{ width: '44px', height: '44px', borderRadius: '50%', border: '2px solid rgba(0,0,0,0.12)', background: '#fff', fontSize: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#555' }}>−</button>
                      <input
                        type="number" min="1" max="50"
                        value={form.cutCount}
                        onClick={e => e.stopPropagation()}
                        onChange={e => {
                          const v = Math.min(50, Math.max(1, parseInt(e.target.value) || 1))
                          update('cutCount', v.toString())
                        }}
                        style={{ width: '80px', textAlign: 'center', fontSize: '32px', fontWeight: 900, border: 'none', outline: 'none', background: 'transparent', color: 'var(--orange)' }}
                      />
                      <span style={{ fontSize: '18px', fontWeight: 700, color: '#555', marginLeft: '-8px' }}>장</span>
                      <button onClick={e => { e.stopPropagation(); update('cutCount', Math.min(50, fullCount + 1).toString()) }}
                        style={{ width: '44px', height: '44px', borderRadius: '50%', border: '2px solid rgba(0,0,0,0.12)', background: '#fff', fontSize: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#555' }}>+</button>
                    </div>

                    {/* 할인 tier 표시 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(0,0,0,0.03)', borderRadius: '12px', padding: '14px 16px' }}>
                      {PRICE_TIERS.slice(1).map(tier => {
                        const isActive = fullCount >= tier.min
                        const isNext = !isActive && PRICE_TIERS.find(t => fullCount >= t.min && fullCount <= t.max)?.max === tier.min - 1
                        return (
                          <div key={tier.min} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                            <span>{isActive ? '✅' : '○'}</span>
                            <span style={{ color: isActive ? '#34C759' : isNext ? 'var(--orange)' : '#aaa', fontWeight: isActive || isNext ? 600 : 400 }}>
                              {isActive
                                ? `${tier.discount}% 할인 적용 중 (장당 ${tier.unitPrice.toLocaleString()}원)`
                                : `${tier.min}장부터 ${tier.discount}% 할인 (장당 ${tier.unitPrice.toLocaleString()}원)`}
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    {/* 예상 금액 */}
                    <div style={{ marginTop: '16px', background: 'var(--orange)', color: '#fff', borderRadius: '12px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>{fullCount}장 예상 금액</span>
                      <span style={{ fontWeight: 900, fontSize: '20px' }}>{calcPrice(fullCount).toLocaleString()}원</span>
                    </div>
                  </>
                )}
              </div>

              {/* 모음컷 - 공사중 */}
              <div style={{ position: 'relative' }}>
                <div style={{ padding: '28px', borderRadius: '20px', border: '2px solid rgba(0,0,0,0.08)', background: '#f5f5f5', textAlign: 'left', transition: 'all 0.2s', opacity: 0.55, userSelect: 'none', pointerEvents: 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 800, fontSize: '18px' }}>모음컷</span>
                    <span style={{ fontWeight: 900, fontSize: '22px', color: 'var(--orange)' }}>{COLLECTION_PRICE.toLocaleString()}원</span>
                  </div>
                  <p style={{ color: '#666', fontSize: '14px' }}>여러 음식 한 장에 · 최대 5장 업로드 · AI가 스튜디오 퀄리티로 배치</p>
                </div>
                {/* 픽셀 공사중 배지 */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', pointerEvents: 'none' }}>
                  <div style={{ background: '#FFD700', border: '3px solid #1a1a1a', borderRadius: '2px', padding: '10px 20px', boxShadow: '4px 4px 0px #1a1a1a', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: '"Courier New", Courier, monospace', fontWeight: 900, fontSize: '17px', letterSpacing: '2px', whiteSpace: 'nowrap', color: '#1a1a1a' }}>
                    <span style={{ fontSize: '22px', imageRendering: 'pixelated' }}>⚒️</span>
                    <span>공 사 중</span>
                    <span style={{ fontSize: '22px', imageRendering: 'pixelated' }}>⚒️</span>
                  </div>
                  <div style={{ background: '#1a1a1a', color: '#FFD700', fontFamily: '"Courier New", Courier, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', padding: '3px 10px', borderRadius: '2px', boxShadow: '2px 2px 0px #555' }}>UNDER CONSTRUCTION</div>
                </div>
              </div>
            </div>
          </div>
        )})()}

        {/* ── STEP 3: 스타일 ── */}
        {step === 3 && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)', letterSpacing: '2px', marginBottom: '12px' }}>STEP 03</p>
            <SelectionBadge form={form} />
            {form.orderType === 'collection' ? (
              <>
                <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.5px' }}>배경을 선택해주세요</h2>
                <p style={{ color: '#666', fontSize: '15px', marginBottom: '20px' }}>모음컷 배경 스타일을 골라주세요</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { id: 'wood', emoji: '🪵', label: '우드', desc: '따뜻한 원목 질감 — 자연스럽고 감성적인 분위기' },
                    { id: 'white', emoji: '⬜', label: '화이트', desc: '깔끔한 흰 배경 — 음식이 선명하게 돋보임' },
                    { id: 'black', emoji: '⬛', label: '블랙', desc: '고급스러운 다크 배경 — 프리미엄 느낌' },
                    { id: 'brand', emoji: '🎨', label: '브랜드 컬러', desc: '브랜드 컬러코드를 직접 입력' },
                  ].map(bg => (
                    <button key={bg.id} onClick={() => update('background', bg.id)} style={{ padding: '20px', borderRadius: '14px', border: `2px solid ${form.background === bg.id ? 'var(--orange)' : 'rgba(0,0,0,0.08)'}`, background: form.background === bg.id ? 'rgba(255,92,0,0.04)' : '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: '16px', transition: 'all 0.15s' }}>
                      <span style={{ fontSize: '28px', flexShrink: 0 }}>{bg.emoji}</span>
                      <div><p style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>{bg.label}</p><p style={{ color: '#888', fontSize: '13px' }}>{bg.desc}</p></div>
                    </button>
                  ))}
                </div>
                {form.background === 'brand' && (
                  <div style={{ marginTop: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>컬러 코드 <span style={{ color: 'var(--orange)' }}>*</span></label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="text"
                        placeholder="#FF5C00"
                        value={form.brandColorCode}
                        onChange={e => update('brandColorCode', e.target.value.replace(/[^#0-9A-Fa-f]/g, '').slice(0, 7))}
                        style={{ flex: 1, padding: '14px 18px', borderRadius: '12px', border: `1.5px solid ${form.brandColorCode.length >= 4 ? 'var(--orange)' : 'rgba(0,0,0,0.1)'}`, fontSize: '20px', fontWeight: 700, fontFamily: 'monospace', outline: 'none', letterSpacing: '2px', background: '#fff' }}
                      />
                      {form.brandColorCode.length >= 4 && (
                        <div style={{ width: '52px', height: '52px', borderRadius: '10px', background: form.brandColorCode, border: '2px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.5px' }}>촬영 스타일을 선택해주세요</h2>
                <p style={{ color: '#666', fontSize: '15px', marginBottom: '20px' }}>배달앱에 최적화된 구도와 배경을 선택해주세요</p>
                <div style={{ marginBottom: '32px' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '15px', marginBottom: '12px' }}>촬영 구도 <span style={{ color: 'var(--orange)' }}>*</span></label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { id: 'aerial', emoji: '🔭', label: '항공뷰', desc: '위에서 내려다보는 구도 — 깔끔하고 정돈된 느낌' },
                      { id: 'side', emoji: '📸', label: '측면뷰', desc: '45도 측면 구도 — 음식의 두께와 층이 보여 풍성한 느낌' },
                    ].map(a => (
                      <button key={a.id} onClick={() => update('angle', a.id)} style={{ padding: '20px', borderRadius: '14px', border: `2px solid ${form.angle === a.id ? 'var(--orange)' : 'rgba(0,0,0,0.08)'}`, background: form.angle === a.id ? 'rgba(255,92,0,0.04)' : '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: '16px', transition: 'all 0.15s' }}>
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
                      { id: 'bright', emoji: '☀️', label: '밝고 깔끔', desc: '흰/베이지 톤 — 배달앱에 최적, 음식이 선명하게 돋보임' },
                      { id: 'dark', emoji: '🌙', label: '어둡고 고급스럽게', desc: '다크 톤 — 프리미엄 느낌, 육류·주류에 잘 어울림' },
                    ].map(b => (
                      <button key={b.id} onClick={() => update('background', b.id)} style={{ padding: '20px', borderRadius: '14px', border: `2px solid ${form.background === b.id ? 'var(--orange)' : 'rgba(0,0,0,0.08)'}`, background: form.background === b.id ? 'rgba(255,92,0,0.04)' : '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: '16px', transition: 'all 0.15s' }}>
                        <span style={{ fontSize: '28px', flexShrink: 0 }}>{b.emoji}</span>
                        <div><p style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>{b.label}</p><p style={{ color: '#888', fontSize: '13px' }}>{b.desc}</p></div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── STEP 4: 사진 업로드 + 용기 선택 ── */}
        {step === 4 && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)', letterSpacing: '2px', marginBottom: '12px' }}>
              STEP {(form.purpose === 'promo' && form.orderType !== 'collection') ? '03' : '04'}
            </p>
            <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.5px' }}>사진을 올려주세요</h2>
            <p style={{ color: '#666', fontSize: '15px', marginBottom: '20px' }}>
              {form.purpose === 'delivery' ? '사진을 올리면 용기 선택 카드가 자동으로 생겨요' : '사진을 올리면 카드가 자동으로 생겨요'}
            </p>
            <SelectionBadge form={form} />

            {/* 카운터 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700 }}>
                총 <span style={{ color: 'var(--orange)', fontSize: '18px' }}>{form.menuItems.length}</span>장
                <span style={{ color: '#aaa', fontWeight: 400 }}> / 최대 {maxCount}장</span>
              </span>
              {form.menuItems.length > 0 && form.orderType === 'full' && (
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--orange)' }}>
                  {calcPrice(form.menuItems.length).toLocaleString()}원
                  {getTier(form.menuItems.length).discount > 0 && (
                    <span style={{ fontSize: '12px', marginLeft: '4px', color: '#34C759' }}>({getTier(form.menuItems.length).discount}% 할인)</span>
                  )}
                </span>
              )}
            </div>

            {/* 드래그앤드롭 업로드 영역 */}
            {form.menuItems.length < maxCount && (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleBatchFiles(e.dataTransfer.files) }}
                onClick={() => batchInputRef.current?.click()}
                style={{ border: `2px dashed ${dragOver ? 'var(--orange)' : 'rgba(0,0,0,0.15)'}`, borderRadius: '18px', padding: '40px 24px', textAlign: 'center', cursor: 'pointer', background: dragOver ? 'rgba(255,92,0,0.04)' : '#fff', transition: 'all 0.2s', marginBottom: '20px' }}
              >
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>{isCompressing ? '⏳' : '📤'}</div>
                <p style={{ fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>
                  {isCompressing ? '이미지 최적화 중...' : '여러 장 한 번에 드래그하거나 클릭해서 업로드'}
                </p>
                <p style={{ color: '#aaa', fontSize: '13px' }}>
                  {isCompressing ? '잠시만 기다려주세요' : `JPG, PNG · 최대 ${maxCount - form.menuItems.length}장 더 추가 가능`}
                </p>
                <input ref={batchInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { handleBatchFiles(e.target.files); e.target.value = '' }} />
              </div>
            )}

            {/* 사진 카드 목록 */}
            {form.menuItems.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {form.menuItems.map((item, idx) => (
                  <div key={idx} style={{ background: '#fff', borderRadius: '16px', padding: '16px', border: '1.5px solid rgba(0,0,0,0.07)', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    {/* 썸네일 */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <img src={URL.createObjectURL(item.photo)} alt="" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', display: 'block' }} />
                      <button
                        onClick={() => removeItem(idx)}
                        style={{ position: 'absolute', top: '-7px', right: '-7px', width: '22px', height: '22px', borderRadius: '50%', background: '#ff3b30', border: 'none', color: '#fff', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
                      >×</button>
                    </div>

                    {/* 용기 선택 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--orange)' }}>사진 {idx + 1}</span>
                      </div>
                      {form.purpose === 'delivery' && form.orderType !== 'collection' && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {VESSEL_OPTIONS.map(v => (
                            <button
                              key={v.id}
                              onClick={() => updateItemVessel(idx, v.id)}
                              style={{ padding: '6px 12px', borderRadius: '100px', border: `1.5px solid ${item.vessel === v.id ? 'var(--orange)' : 'rgba(0,0,0,0.1)'}`, background: item.vessel === v.id ? 'var(--orange)' : '#fff', color: item.vessel === v.id ? '#fff' : '#555', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.12s' }}
                            >
                              {v.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 결제 금액 요약 */}
            {form.orderType === 'full' && form.menuItems.length > 0 && (
              <div style={{ marginTop: '16px', background: 'rgba(255,92,0,0.06)', border: '1.5px solid rgba(255,92,0,0.15)', borderRadius: '12px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#888' }}>
                  {form.menuItems.length}장 × {getTier(form.menuItems.length).unitPrice.toLocaleString()}원
                  {getTier(form.menuItems.length).discount > 0 ? ` (${getTier(form.menuItems.length).discount}% 할인)` : ''}
                </span>
                <span style={{ fontWeight: 900, fontSize: '18px', color: 'var(--orange)' }}>{calcPrice(form.menuItems.length).toLocaleString()}원</span>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 5: 연락처 ── */}
        {step === 5 && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)', letterSpacing: '2px', marginBottom: '12px' }}>
              STEP {(form.purpose === 'promo' && form.orderType !== 'collection') ? '04' : '05'}
            </p>
            <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.5px' }}>연락처를 알려주세요</h2>
            {sessionLoaded ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FEE500', borderRadius: '10px', padding: '10px 16px', marginBottom: '20px' }}>
                <span style={{ fontSize: '16px' }}>💬</span>
                <p style={{ color: '#000', fontSize: '14px', fontWeight: 700, margin: 0 }}>카카오 로그인 연동됨 — 마이페이지에서 결과물을 확인할 수 있어요</p>
              </div>
            ) : (
              <p style={{ color: '#666', fontSize: '15px', marginBottom: '20px' }}>이메일로 마이페이지에 로그인해서 결과물을 확인할 수 있어요</p>
            )}
            {uploadProgress && (
              <div style={{ background: 'rgba(255,92,0,0.06)', border: '1px solid rgba(255,92,0,0.2)', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)' }}>사진 업로드 중...</span>
                  <span style={{ fontSize: '13px', color: '#888' }}>{uploadProgress.done} / {uploadProgress.total}</span>
                </div>
                <div style={{ height: '4px', background: 'rgba(0,0,0,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--orange)', borderRadius: '2px', width: `${(uploadProgress.done / uploadProgress.total) * 100}%`, transition: 'width 0.3s' }} />
                </div>
              </div>
            )}
            <SelectionBadge form={form} />
            {!sessionLoaded && (
              <a href="/api/auth/kakao" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#FEE500', color: '#000', padding: '14px 18px', borderRadius: '12px', fontWeight: 700, fontSize: '15px', textDecoration: 'none', marginBottom: '20px', boxShadow: '0 2px 10px rgba(254,229,0,0.4)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="black"><path fillRule="evenodd" clipRule="evenodd" d="M12 3C6.477 3 2 6.582 2 11.012c0 2.782 1.696 5.232 4.27 6.729l-1.088 3.98a.3.3 0 0 0 .46.325l4.603-3.05c.573.08 1.162.122 1.755.122 5.523 0 10-3.582 10-8.012S17.523 3 12 3Z"/></svg>
                카카오로 로그인하고 결과물 받기
              </a>
            )}
            {[
              { key: 'customerName',  label: '이름 / 상호명', placeholder: '예: 홍길동 / 가게이름', type: 'text', required: true },
              { key: 'customerPhone', label: '전화번호',       placeholder: '예: 010-1234-5678 (선택)', type: 'tel',  required: false },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '15px', marginBottom: '10px' }}>
                  {field.label} {field.required ? <span style={{ color: 'var(--orange)' }}>*</span> : <span style={{ color: '#aaa', fontWeight: 400, fontSize: '13px' }}>(선택)</span>}
                </label>
                <input type={field.type} value={(form as any)[field.key]} onChange={e => update(field.key as keyof OrderForm, e.target.value)} placeholder={field.placeholder} style={{ width: '100%', padding: '16px 20px', borderRadius: '14px', border: `1.5px solid ${(form as any)[field.key] ? 'var(--orange)' : 'rgba(0,0,0,0.1)'}`, fontSize: '16px', outline: 'none', background: '#fff', transition: 'border-color 0.2s' }} />
              </div>
            ))}
            {info && (
              <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid rgba(0,0,0,0.08)', marginTop: '8px' }}>
                <h3 style={{ fontWeight: 800, fontSize: '16px', marginBottom: '16px' }}>주문 요약</h3>
                {[
                  { label: '용도', value: PURPOSE_LABELS[form.purpose] || '' },
                  { label: '주문', value: info.label },
                  { label: '사진 수', value: `${form.menuItems.length}장` },
                  ...(form.orderType === 'collection'
                    ? [{ label: '배경', value: BG_LABELS[form.background] || '' }]
                    : form.purpose === 'delivery'
                    ? [{ label: '구도', value: ANGLE_LABELS[form.angle] || '' }, { label: '배경', value: BG_LABELS[form.background] || '' }]
                    : []),
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <span style={{ color: '#666', fontSize: '14px' }}>{row.label}</span>
                    <span style={{ fontWeight: 600, fontSize: '14px', textAlign: 'right', maxWidth: '60%' }}>{row.value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px', marginTop: '8px' }}>
                  <span style={{ fontWeight: 700 }}>결제 금액</span>
                  <span style={{ fontWeight: 900, fontSize: '22px', color: 'var(--orange)' }}>{info.price.toLocaleString()}원</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 6: 결제 ── */}
        {step === 6 && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)', letterSpacing: '2px', marginBottom: '12px' }}>
              STEP {(form.purpose === 'promo' && form.orderType !== 'collection') ? '05' : '06'}
            </p>
            <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.5px' }}>결제하기</h2>
            <p style={{ color: '#666', fontSize: '15px', marginBottom: '32px' }}>
              결제 완료 후 순서대로 처리해드립니다
            </p>
            {info && (
              <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', marginBottom: '24px', border: '1px solid rgba(0,0,0,0.08)' }}>
                {[
                  { label: '용도', value: PURPOSE_LABELS[form.purpose] || '' },
                  { label: '주문', value: info.label },
                  { label: '사진 수', value: `${form.menuItems.length}장` },
                  ...(form.orderType === 'collection'
                    ? [{ label: '배경', value: BG_LABELS[form.background] || '' }]
                    : form.purpose === 'delivery'
                    ? [{ label: '구도', value: ANGLE_LABELS[form.angle] || '' }, { label: '배경', value: BG_LABELS[form.background] || '' }]
                    : []),
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <span style={{ color: '#666', fontSize: '14px' }}>{row.label}</span>
                    <span style={{ fontWeight: 600, fontSize: '14px', textAlign: 'right', maxWidth: '60%' }}>{row.value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px', marginTop: '4px' }}>
                  <span style={{ fontWeight: 700 }}>결제 금액</span>
                  <span style={{ fontWeight: 900, fontSize: '22px', color: 'var(--orange)' }}>{info.price.toLocaleString()}원</span>
                </div>
              </div>
            )}
            {/* 결제 수단 선택 */}
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '12px' }}>결제 수단 선택</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { id: 'KCP',      icon: '💳', label: 'NHN KCP 카드결제',    desc: '신용/체크카드' },
                  { id: 'INICIS',   icon: '💳', label: 'KG이니시스 카드결제', desc: '신용/체크카드' },
                  { id: 'KAKAOPAY', icon: '💛', label: '카카오페이',           desc: '카카오페이 간편결제' },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setPayMethod(m.id as 'KCP' | 'INICIS' | 'KAKAOPAY')}
                    style={{ padding: '16px 20px', borderRadius: '14px', border: `2px solid ${payMethod === m.id ? 'var(--orange)' : 'rgba(0,0,0,0.08)'}`, background: payMethod === m.id ? 'rgba(255,92,0,0.04)' : '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.15s' }}
                  >
                    <span style={{ fontSize: '24px', flexShrink: 0 }}>{m.icon}</span>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '15px', margin: 0, marginBottom: '2px' }}>{m.label}</p>
                      <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>{m.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Nav Buttons */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(250,247,242,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(0,0,0,0.08)', padding: '16px 5vw', display: 'flex', gap: '12px' }}>
        {step > 1 && step < 6 && (
          <button onClick={goPrev} style={{ flex: 1, padding: '16px', borderRadius: '100px', border: '2px solid rgba(0,0,0,0.1)', background: '#fff', fontWeight: 700, fontSize: '16px', cursor: 'pointer', color: 'var(--black)' }}>← 이전</button>
        )}
        <button
          disabled={!canProceed() || submitting || isCompressing}
          onClick={() => {
            if (step < 5) goNext()
            else if (step === 5) handleSubmit()
            else handlePayment()
          }}
          style={{ flex: 2, padding: '16px', borderRadius: '100px', background: canProceed() && !isCompressing ? 'var(--orange)' : 'rgba(0,0,0,0.1)', color: canProceed() && !isCompressing ? '#fff' : '#aaa', border: 'none', fontWeight: 700, fontSize: '16px', cursor: canProceed() && !isCompressing ? 'pointer' : 'not-allowed', transition: 'all 0.2s', boxShadow: canProceed() && !isCompressing ? '0 4px 20px rgba(255,92,0,0.3)' : 'none' }}
        >
          {isCompressing ? '이미지 처리 중...'
            : submitting ? (step === 5 ? '업로드 중...' : '결제 진행 중...')
            : step === 4 && !canProceed() ? '사진을 업로드해주세요'
            : step === 5 ? '결제 단계로 →'
            : step === 6 ? '결제하기 →'
            : '다음 단계 →'}
        </button>
      </div>
    </div>
  )
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>로딩 중...</p></div>}>
      <OrderPageInner />
    </Suspense>
  )
}
