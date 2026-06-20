'use client'

import { useState, useRef, useCallback, useEffect, DragEvent } from 'react'
import CoinChargeModal from './CoinChargeModal'

interface FoodPhoto {
  id: string
  base64: string
  mime: string
  preview: string
}

interface BgPreset {
  id: string
  label: string
  category: 'solid' | 'tile' | 'fabric' | 'wood' | 'concrete'
  src: string
  promptSrc?: string
}

type BgCatTab = '전체' | '단색' | '타일' | '패브릭' | '우드' | '콘크리트'
type ModalView = 'step1' | 'step2' | 'step3' | 'confirm' | 'generating' | 'result'

interface Props {
  onClose: () => void
}

const BG_PRESETS: BgPreset[] = [
  { id: 'lightgray',          label: '라이트그레이',         category: 'solid',    src: '/backgrounds/lightgray.jpg'                                                    },
  { id: 'ivory',              label: '아이보리',             category: 'solid',    src: '/backgrounds/ivory.jpg'                                                        },
  { id: 'concrete',           label: '블랙 콘크리트',        category: 'concrete', src: '/backgrounds/concrete.jpg'                                                     },
  { id: 'marble',             label: '화이트 대리석타일',    category: 'tile',     src: '/backgrounds/marble.jpg'                                                       },
  { id: 'ivory-silk',          label: '아이보리 실크',       category: 'fabric',   src: '/backgrounds/ivory-silk.jpg',          promptSrc: '/backgrounds/prompt/ivory-silk.png'          },
  { id: 'ivory-paper',         label: '아이보리 페이퍼',     category: 'fabric',   src: '/backgrounds/ivory-paper.jpg',         promptSrc: '/backgrounds/prompt/ivory-paper.png'         },
  { id: 'gray-concrete',       label: '그레이 콘크리트',     category: 'concrete', src: '/backgrounds/gray-concrete.jpg',       promptSrc: '/backgrounds/prompt/gray-concrete.png'       },
  { id: 'rough-gray-concrete', label: '거친 그레이 콘크리트',category: 'concrete', src: '/backgrounds/rough-gray-concrete.jpg', promptSrc: '/backgrounds/prompt/rough-gray-concrete.png' },
  { id: 'white-touched-paint', label: '화이트 터치드페인트', category: 'concrete', src: '/backgrounds/white-touched-paint.jpg', promptSrc: '/backgrounds/prompt/white-touched-paint.png' },
  { id: 'white-wood',          label: '화이트우드',          category: 'wood',     src: '/backgrounds/white-wood.jpg',          promptSrc: '/backgrounds/prompt/white-wood.png'          },
  { id: 'ivory-wood',          label: '아이보리 우드',       category: 'wood',     src: '/backgrounds/ivory-wood.jpg',          promptSrc: '/backgrounds/prompt/ivory-wood.png'          },
  { id: 'beige-wood',          label: '베이지우드',          category: 'wood',     src: '/backgrounds/beige-wood.jpg',          promptSrc: '/backgrounds/prompt/beige-wood.png'          },
  { id: 'brown-wood',          label: '브라운우드',          category: 'wood',     src: '/backgrounds/brown-wood.jpg',          promptSrc: '/backgrounds/prompt/brown-wood.png'          },
  { id: 'dark-brown-wood',     label: '다크브라운 우드',     category: 'wood',     src: '/backgrounds/dark-brown-wood.jpg',     promptSrc: '/backgrounds/prompt/dark-brown-wood.png'     },
  { id: 'black-wood',          label: '블랙 우드',           category: 'wood',     src: '/backgrounds/black-wood.jpg',          promptSrc: '/backgrounds/prompt/black-wood.png'          },
  { id: 'dark-gray',           label: '다크그레이',          category: 'solid',    src: '/backgrounds/dark-gray.jpg',           promptSrc: '/backgrounds/prompt/dark-gray.png'           },
  { id: 'lemon',               label: '레몬',                category: 'solid',    src: '/backgrounds/lemon.jpg',               promptSrc: '/backgrounds/prompt/lemon.png'               },
  { id: 'baby-pink',           label: '베이비핑크',          category: 'solid',    src: '/backgrounds/baby-pink.jpg',           promptSrc: '/backgrounds/prompt/baby-pink.png'           },
]

const BG_CAT_TABS: BgCatTab[] = ['전체', '단색', '타일', '패브릭', '우드', '콘크리트']

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
        if (!blob) { resolve({ id: `photo-${Date.now()}`, base64: '', mime: 'image/jpeg', preview: '' }); return }
        const reader = new FileReader()
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string
          resolve({ id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, base64: dataUrl.split(',')[1], mime: 'image/jpeg', preview: dataUrl })
        }
        reader.readAsDataURL(blob)
      }, 'image/jpeg', 0.85)
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        resolve({ id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, base64: dataUrl.split(',')[1], mime: file.type, preview: dataUrl })
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

export default function CollageModal({ onClose }: Props) {
  const [view, setView] = useState<ModalView>('step1')

  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)
  const [gemBalance, setGemBalance]     = useState(0)

  const [photos, setPhotos]             = useState<FoodPhoto[]>([])
  const [selectedBgId, setSelectedBgId] = useState<string | null>(null)
  const [bgData, setBgData]             = useState<{ base64: string; mime: string } | null>(null)
  const [bgCatTab, setBgCatTab]         = useState<BgCatTab>('전체')
  const [angle, setAngle]               = useState<'topdown' | 'side45' | null>(null)

  const [resultImage, setResultImage]   = useState<string | null>(null)
  const [resultMime, setResultMime]     = useState<string>('image/jpeg')
  const [resultWmUrl, setResultWmUrl]   = useState<string | null>(null)

  const [showChargeModal, setShowChargeModal] = useState(false)
  const [creditShortfall, setCreditShortfall] = useState(0)
  const [error, setError]               = useState<string | null>(null)
  const [dragOver, setDragOver]         = useState(false)

  const fileInputRef    = useRef<HTMLInputElement>(null)
  const addFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('menulab_session')
      if (raw) {
        const { token, email } = JSON.parse(raw)
        setSessionToken(token ?? null)
        setSessionEmail(email ?? null)
        if (token) {
          fetch('/api/credits/balance', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => { if (typeof d.balance === 'number') setGemBalance(d.balance) })
            .catch(() => {})
        }
      }
    } catch {}
  }, [])

  const selectedBgPreset = BG_PRESETS.find(b => b.id === selectedBgId) ?? null

  const filteredBgs = bgCatTab === '전체'     ? BG_PRESETS
    : bgCatTab === '단색'                     ? BG_PRESETS.filter(b => b.category === 'solid')
    : bgCatTab === '타일'                     ? BG_PRESETS.filter(b => b.category === 'tile')
    : bgCatTab === '패브릭'                   ? BG_PRESETS.filter(b => b.category === 'fabric')
    : bgCatTab === '우드'                     ? BG_PRESETS.filter(b => b.category === 'wood')
    : bgCatTab === '콘크리트'                 ? BG_PRESETS.filter(b => b.category === 'concrete')
    : BG_PRESETS

  const addPhotos = useCallback(async (files: FileList | null) => {
    if (!files) return
    const valid = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 5 - photos.length)
    if (valid.length === 0) return
    const newPhotos = await Promise.all(valid.map(fileToPhoto))
    setPhotos(prev => [...prev, ...newPhotos].slice(0, 5))
  }, [photos.length])

  const removePhoto = useCallback((id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id))
  }, [])

  const selectBgPreset = useCallback(async (bg: BgPreset) => {
    setSelectedBgId(bg.id)
    setBgData(null)
    try {
      const data = await urlToBase64(bg.promptSrc ?? bg.src)
      setBgData(data)
    } catch {}
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!sessionToken) return
    if (gemBalance < 40) {
      setCreditShortfall(40 - gemBalance)
      setShowChargeModal(true)
      return
    }
    setError(null)
    setView('generating')

    try {
      let bgImageBase64: string | undefined
      let bgImageMime: string | undefined

      if (selectedBgPreset) {
        const src = selectedBgPreset.promptSrc ?? selectedBgPreset.src
        try {
          const loaded = bgData ?? await urlToBase64(src)
          bgImageBase64 = loaded.base64
          bgImageMime = loaded.mime
        } catch {}
      }

      const res = await fetch('/api/collage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({
          foodImages: photos.map(p => ({ base64: p.base64, mime: p.mime })),
          backgroundName: selectedBgPreset?.label,
          bgImageBase64,
          bgImageMime,
          angle: angle ?? 'topdown',
        }),
      })

      const data = await res.json()

      if (res.status === 402) {
        setView('confirm')
        setCreditShortfall(40 - (data.balance ?? 0))
        setShowChargeModal(true)
        return
      }

      if (!res.ok) {
        setView('confirm')
        setError(data.error || '생성 중 오류가 발생했어요')
        return
      }

      setResultImage(data.imageBase64)
      setResultMime(data.imageMime ?? 'image/jpeg')
      setResultWmUrl(data.wmUrl ?? null)
      if (typeof data.newBalance === 'number') setGemBalance(data.newBalance)
      setView('result')
    } catch (e: unknown) {
      setView('confirm')
      setError(e instanceof Error ? e.message : '네트워크 오류가 발생했어요')
    }
  }, [sessionToken, gemBalance, photos, selectedBgPreset, bgData, angle])

  const handleDownload = useCallback(() => {
    if (!resultImage) return
    const a = document.createElement('a')
    a.href = `data:${resultMime};base64,${resultImage}`
    a.download = `menulab_collage_${Date.now()}.jpg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [resultImage, resultMime])

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOver(true) }
  const handleDragLeave = () => setDragOver(false)
  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    await addPhotos(e.dataTransfer.files)
  }

  const stepTitles: Record<string, string> = {
    step1: '사진 업로드',
    step2: '배경 선택',
    step3: '구도 선택',
    confirm: '생성 확인',
  }
  const stepNums: Record<string, string> = {
    step1: 'STEP 1 / 3',
    step2: 'STEP 2 / 3',
    step3: 'STEP 3 / 3',
  }

  const goBack = () => {
    if (view === 'step2') setView('step1')
    else if (view === 'step3') setView('step2')
    else if (view === 'confirm') setView('step3')
    else onClose()
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', padding: '16px' }}
    >
      <div style={{ background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '560px', maxHeight: '94vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.35)' }}>
      <style>{`@keyframes collage-spin { to { transform: rotate(360deg) } }`}</style>

      {/* Header */}
      {view !== 'generating' && view !== 'result' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.07)', flexShrink: 0 }}>
          <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#888', padding: '4px', lineHeight: 1 }}>←</button>
          <div style={{ flex: 1 }}>
            {stepNums[view] && (
              <p style={{ fontSize: '10px', color: '#FF5722', fontWeight: 700, letterSpacing: '2px', marginBottom: '1px' }}>모음컷 · {stepNums[view]}</p>
            )}
            <h2 style={{ fontSize: '17px', fontWeight: 900, color: '#111' }}>{stepTitles[view] ?? ''}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: '#aaa', padding: '4px', lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* ── STEP 1: 사진 업로드 ── */}
      {view === 'step1' && (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
            {photos.length === 0 && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: dragOver ? '2px solid #FF5722' : '2px dashed rgba(0,0,0,0.18)',
                  borderRadius: '16px', padding: '48px 20px',
                  textAlign: 'center', cursor: 'pointer',
                  background: dragOver ? 'rgba(255,87,34,0.04)' : '#fff',
                  marginBottom: '16px', transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>📸</div>
                <p style={{ fontWeight: 700, fontSize: '15px', color: '#333', marginBottom: '6px' }}>음식 사진을 드래그하거나 클릭해서 선택하세요</p>
                <p style={{ fontSize: '12px', color: '#aaa' }}>최대 5장 · JPG, PNG, WEBP</p>
              </div>
            )}

            {photos.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '12px' }}>
                {photos.map(photo => (
                  <div key={photo.id} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', aspectRatio: '4/3', background: '#f0f0f0' }}>
                    <img src={photo.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <button
                      onClick={() => removePhoto(photo.id)}
                      style={{ position: 'absolute', top: '6px', right: '6px', width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >×</button>
                  </div>
                ))}
                {photos.length < 5 && (
                  <button
                    onClick={() => addFileInputRef.current?.click()}
                    style={{ borderRadius: '12px', border: '2px dashed rgba(0,0,0,0.18)', background: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', aspectRatio: '4/3' }}
                  >
                    <span style={{ fontSize: '24px' }}>+</span>
                    <span style={{ fontSize: '12px', color: '#aaa', fontWeight: 600 }}>추가</span>
                  </button>
                )}
              </div>
            )}

            <p style={{ fontSize: '12px', color: '#aaa', textAlign: 'center' }}>{photos.length}장 선택됨 (최소 2장)</p>

            <input ref={fileInputRef}    type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { addPhotos(e.target.files); e.target.value = '' }} />
            <input ref={addFileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { addPhotos(e.target.files); e.target.value = '' }} />
          </div>
          <div style={{ padding: '12px 16px 24px', background: '#fff', borderTop: '1px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
            <button
              onClick={() => setView('step2')}
              disabled={photos.length < 2}
              style={{ width: '100%', padding: '15px', borderRadius: '100px', background: photos.length >= 2 ? '#FF5722' : '#eee', color: photos.length >= 2 ? '#fff' : '#bbb', fontWeight: 800, fontSize: '16px', border: 'none', cursor: photos.length >= 2 ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
            >다음 → 배경 선택</button>
          </div>
        </>
      )}

      {/* ── STEP 2: 배경 선택 ── */}
      {view === 'step2' && (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {BG_CAT_TABS.map(cat => (
                <button
                  key={cat}
                  onClick={() => setBgCatTab(cat)}
                  style={{ padding: '5px 12px', borderRadius: '100px', border: 'none', flexShrink: 0, background: bgCatTab === cat ? '#111' : 'rgba(0,0,0,0.06)', color: bgCatTab === cat ? '#fff' : '#888', fontWeight: 700, fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s' }}
                >{cat}</button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {filteredBgs.map(bg => {
                const sel = selectedBgId === bg.id
                return (
                  <button
                    key={bg.id}
                    onClick={() => selectBgPreset(bg)}
                    style={{ padding: 0, border: `2px solid ${sel ? '#FF5722' : 'transparent'}`, borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', background: 'none', boxShadow: sel ? '0 0 0 3px rgba(255,87,34,0.15)' : '0 2px 8px rgba(0,0,0,0.08)', transition: 'all 0.2s', position: 'relative' }}
                  >
                    <img src={bg.src} alt={bg.label} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
                    <div style={{ padding: '7px 10px', background: '#fff', textAlign: 'left' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: sel ? '#FF5722' : '#111' }}>{bg.label}</span>
                    </div>
                    {sel && (
                      <div style={{ position: 'absolute', top: '6px', right: '6px', width: '20px', height: '20px', borderRadius: '50%', background: '#FF5722', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px' }}>✓</div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          <div style={{ padding: '12px 16px 24px', background: '#fff', borderTop: '1px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
            <button
              onClick={() => setView('step3')}
              disabled={!selectedBgId}
              style={{ width: '100%', padding: '15px', borderRadius: '100px', background: selectedBgId ? '#FF5722' : '#eee', color: selectedBgId ? '#fff' : '#bbb', fontWeight: 800, fontSize: '16px', border: 'none', cursor: selectedBgId ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
            >다음 → 구도 선택</button>
          </div>
        </>
      )}

      {/* ── STEP 3: 구도 선택 ── */}
      {view === 'step3' && (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {([
                { id: 'topdown', icon: '🔭', label: '항공뷰', desc: '위에서 내려다보는 플랫 레이 구도' },
                { id: 'side45',  icon: '👁',  label: '측면뷰', desc: '45도 측면에서 담은 자연스러운 구도' },
              ] as { id: 'topdown' | 'side45'; icon: string; label: string; desc: string }[]).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setAngle(opt.id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', borderRadius: '16px', border: `2px solid ${angle === opt.id ? '#FF5722' : 'rgba(0,0,0,0.08)'}`, background: angle === opt.id ? 'rgba(255,87,34,0.04)' : '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                >
                  <span style={{ fontSize: '28px', flexShrink: 0 }}>{opt.icon}</span>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '16px', color: '#111', marginBottom: '4px' }}>{opt.label}</p>
                    <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.5 }}>{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: '12px 16px 24px', background: '#fff', borderTop: '1px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
            <button
              onClick={() => setView('confirm')}
              disabled={!angle}
              style={{ width: '100%', padding: '15px', borderRadius: '100px', background: angle ? '#FF5722' : '#eee', color: angle ? '#fff' : '#bbb', fontWeight: 800, fontSize: '16px', border: 'none', cursor: angle ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
            >확인 → 생성하기</button>
          </div>
        </>
      )}

      {/* ── CONFIRM ── */}
      {view === 'confirm' && (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
            <div style={{ background: '#fff', borderRadius: '16px', padding: '4px 0', marginBottom: '16px' }}>
              {[
                { label: '업로드 사진', value: `${photos.length}장` },
                { label: '배경',        value: selectedBgPreset?.label ?? '-' },
                { label: '구도',        value: angle === 'topdown' ? '항공뷰' : angle === 'side45' ? '측면뷰' : '-' },
                { label: '차감 젬',     value: '💎 40젬' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <span style={{ fontSize: '14px', color: '#888', fontWeight: 600 }}>{row.label}</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#111' }}>{row.value}</span>
                </div>
              ))}
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '12px 16px' }}>
                <p style={{ color: '#dc2626', fontSize: '13px', fontWeight: 600 }}>{error}</p>
              </div>
            )}
          </div>
          <div style={{ padding: '12px 16px 24px', background: '#fff', borderTop: '1px solid rgba(0,0,0,0.06)', flexShrink: 0, display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setView('step3')}
              style={{ flex: 1, padding: '14px', borderRadius: '100px', background: '#fff', border: '1.5px solid rgba(0,0,0,0.1)', color: '#555', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
            >← 다시 설정</button>
            <button
              onClick={handleGenerate}
              style={{ flex: 2, padding: '14px', borderRadius: '100px', background: '#FF5722', color: '#fff', fontWeight: 800, fontSize: '15px', border: 'none', cursor: 'pointer' }}
            >이대로 만들기 →</button>
          </div>
        </>
      )}

      {/* ── GENERATING ── */}
      {view === 'generating' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '4px solid rgba(255,87,34,0.2)', borderTopColor: '#FF5722', animation: 'collage-spin 0.9s linear infinite', margin: '0 auto 20px' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#111', marginBottom: '8px' }}>AI가 모음컷을 만들고 있어요...</h2>
            <p style={{ color: '#888', fontSize: '14px', lineHeight: 1.7 }}>잠시만 기다려주세요 (약 1~2분)</p>
          </div>
        </div>
      )}

      {/* ── RESULT ── */}
      {view === 'result' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.07)', flexShrink: 0 }}>
            <span style={{ fontSize: '22px' }}>🎉</span>
            <h2 style={{ flex: 1, fontSize: '17px', fontWeight: 900, color: '#111' }}>모음컷 완성!</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: '#aaa', padding: '4px', lineHeight: 1 }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {resultWmUrl ? (
              <img src={resultWmUrl} alt="모음컷 결과" style={{ width: '100%', borderRadius: '16px', display: 'block', marginBottom: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
            ) : resultImage ? (
              <img src={`data:${resultMime};base64,${resultImage}`} alt="모음컷 결과" style={{ width: '100%', borderRadius: '16px', display: 'block', marginBottom: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
            ) : null}
            <p style={{ textAlign: 'center', fontSize: '13px', color: '#aaa' }}>남은 젬: 💎 {gemBalance}젬</p>
          </div>
          <div style={{ padding: '12px 16px 24px', background: '#fff', borderTop: '1px solid rgba(0,0,0,0.06)', flexShrink: 0, display: 'flex', gap: '10px' }}>
            <button
              onClick={handleDownload}
              style={{ flex: 1, padding: '14px', borderRadius: '100px', background: '#FF5722', color: '#fff', fontWeight: 800, fontSize: '15px', border: 'none', cursor: 'pointer' }}
            >다운로드</button>
            <button
              onClick={() => { setPhotos([]); setResultImage(null); setResultWmUrl(null); setAngle(null); setSelectedBgId(null); setBgData(null); setView('step1') }}
              style={{ flex: 1, padding: '14px', borderRadius: '100px', background: '#fff', border: '1.5px solid rgba(0,0,0,0.1)', color: '#555', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
            >다시 만들기</button>
          </div>
        </>
      )}

      {showChargeModal && sessionEmail && (
        <CoinChargeModal
          shortfall={creditShortfall}
          userEmail={sessionEmail}
          onClose={() => setShowChargeModal(false)}
        />
      )}
      </div>
    </div>
  )
}
