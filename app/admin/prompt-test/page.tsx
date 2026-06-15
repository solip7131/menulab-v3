'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'

// ── 현재 프로덕션 기본 프롬프트 ─────────────────────────────────────────────
const DEFAULT_ENHANCE = `음식사진 업그레이드해줘
구도:
- 카메라 45도 3/4 side angle
- 그릇 옆면이 선명하게 보여야 함 (타원형으로 보임)
- 위에서 내려다보이면 WRONG
- 그릇 75% + 중앙 1:1 safe zone 적용
배경: {SURFACE_COLOR} 단색 스튜디오 배경
소품 금지: 음식 외 젓가락·냅킨 등 추가 소품 넣지 말 것`

const DEFAULT_COMPOSE_TEXT = `Image 1: Food photo (already professionally shot)
TASK: Place the food from Image 1 onto a {BG_NAME} background.
FRAMING: Dish occupies 50% of image height. Centered.
Show plenty of background — 20% margin top, 15% bottom, 15% each side.
Never crop the dish.
Match lighting direction from Image 1.
Output image size: exactly {WIDTH}x{HEIGHT} pixels.
OUTPUT: Final composited image only.`

const DEFAULT_COMPOSE_BG = `Image 1: Food photo (already professionally shot)
Image 2: Background texture reference
TASK: Place the food from Image 1 naturally onto
the background surface from Image 2.
FRAMING: Dish occupies 50% of image height. Centered.
Show plenty of background — 20% margin top, 15% bottom, 15% each side.
Never crop the dish.
Match lighting direction from Image 1.
Output image size: exactly {WIDTH}x{HEIGHT} pixels.
OUTPUT: Final composited image only.`

const BG_OPTIONS = [
  { label: '라이트그레이', value: '라이트그레이' },
  { label: '실키 페브릭 아이보리', value: '실키 페브릭 아이보리' },
  { label: '콘크리트', value: '콘크리트' },
  { label: '마블', value: '마블' },
  { label: '직접 입력', value: '__custom__' },
]

export default function PromptTestPage() {
  const [password, setPassword]       = useState('')
  const [authed, setAuthed]           = useState(false)
  const [authError, setAuthError]     = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [promptEnhance,     setPromptEnhance]     = useState(DEFAULT_ENHANCE)
  const [promptComposeText, setPromptComposeText] = useState(DEFAULT_COMPOSE_TEXT)
  const [promptComposeBg,   setPromptComposeBg]   = useState(DEFAULT_COMPOSE_BG)

  const [foodFile,   setFoodFile]   = useState<File | null>(null)
  const [bgFile,     setBgFile]     = useState<File | null>(null)
  const [bgOption,   setBgOption]   = useState('라이트그레이')
  const [bgCustom,   setBgCustom]   = useState('')
  const [running,    setRunning]    = useState(false)
  const [error,      setError]      = useState('')

  // 단계별 결과
  const [step1Img,   setStep1Img]   = useState<string | null>(null)  // enhanced food (base64)
  const [step2Imgs,  setStep2Imgs]  = useState<string[]>([])         // final results (URL)
  const [logs,       setLogs]       = useState<string[]>([])

  const foodInputRef = useRef<HTMLInputElement>(null)
  const bgInputRef   = useRef<HTMLInputElement>(null)

  const log = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])

  // ── 인증 ─────────────────────────────────────────────────────────────────────
  const handleAuth = async () => {
    setAuthLoading(true); setAuthError('')
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) setAuthed(true)
    else setAuthError('비밀번호가 틀렸어요')
    setAuthLoading(false)
  }

  // ── 파일 → base64 ────────────────────────────────────────────────────────────
  const toBase64 = (file: File): Promise<{ base64: string; mime: string }> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const [header, base64] = result.split(',')
        const mime = header.match(/data:(.*);/)?.[1] ?? 'image/jpeg'
        resolve({ base64, mime })
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  // ── 테스트 실행 ───────────────────────────────────────────────────────────────
  const runTest = async () => {
    if (!foodFile) { setError('음식 사진을 업로드해주세요'); return }
    setRunning(true); setError(''); setStep1Img(null); setStep2Imgs([]); setLogs([])

    try {
      const food = await toBase64(foodFile)
      log('음식 이미지 변환 완료')

      let bgImageBase64: string | undefined
      let bgImageMime:   string | undefined
      if (bgFile) {
        const bg = await toBase64(bgFile)
        bgImageBase64 = bg.base64
        bgImageMime   = bg.mime
        log('배경 이미지 변환 완료')
      }

      const backgroundName = bgOption === '__custom__' ? bgCustom : bgOption
      log(`Call 1 시작 — 음식 강화 (배경 컬러 기준: ${backgroundName})`)

      const body: Record<string, unknown> = {
        foodImageBase64: food.base64,
        foodImageMime:   food.mime,
        backgroundName,
        bgImageBase64,
        bgImageMime,
        adminToken:              password,
        overridePromptEnhance:   promptEnhance,
        overridePromptComposeText: promptComposeText,
        overridePromptComposeBg:   promptComposeBg,
        // 워터마크/DB 저장 건너뜀 (어드민 테스트)
        skipSave: true,
      }

      log('API 호출 중...')
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `서버 오류 ${res.status}`)
      }

      const data = await res.json()
      log(`완료 — 결과 ${data.results?.length ?? 0}장`)

      // enhanced food 미리보기 (API가 반환하면)
      if (data.enhancedBase64) {
        setStep1Img(`data:image/jpeg;base64,${data.enhancedBase64}`)
      }

      const urls: string[] = (data.results ?? [])
        .map((r: { wmUrl?: string }) => r?.wmUrl)
        .filter(Boolean)
      setStep2Imgs(urls)

      if (urls.length === 0 && !data.enhancedBase64) {
        setError('결과 이미지가 없어요. 로그를 확인해주세요.')
      }
    } catch (e: any) {
      log(`에러: ${e.message}`)
      setError(e.message)
    } finally {
      setRunning(false)
    }
  }

  // ── 로그인 화면 ──────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#1a1a1a', borderRadius: '16px', padding: '36px 32px', width: '320px' }}>
          <p style={{ color: '#fff', fontWeight: 800, fontSize: '18px', marginBottom: '6px' }}>Prompt Test Lab</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '24px' }}>어드민 비밀번호 입력</p>
          <input
            type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAuth()}
            placeholder="비밀번호"
            style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: '#222', color: '#fff', fontSize: '15px', marginBottom: '12px', boxSizing: 'border-box' }}
          />
          {authError && <p style={{ color: '#ff5b5b', fontSize: '13px', marginBottom: '10px' }}>{authError}</p>}
          <button
            onClick={handleAuth} disabled={authLoading}
            style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'var(--orange)', color: '#fff', fontWeight: 700, fontSize: '15px', border: 'none', cursor: 'pointer' }}
          >{authLoading ? '확인 중...' : '입장'}</button>
        </div>
      </div>
    )
  }

  // ── 메인 화면 ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#eee', fontFamily: 'monospace' }}>
      {/* 헤더 */}
      <div style={{ background: '#1a1a1a', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/admin" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', textDecoration: 'none' }}>← 어드민</Link>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>🧪 Prompt Test Lab</span>
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>커스텀 프롬프트로 AI 생성 테스트</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', height: 'calc(100vh - 53px)' }}>

        {/* ── 좌측: 설정 + 실행 ── */}
        <div style={{ borderRight: '1px solid rgba(255,255,255,0.08)', overflowY: 'auto', padding: '24px' }}>

          {/* 이미지 업로드 */}
          <section style={{ marginBottom: '28px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--orange)', letterSpacing: '2px', marginBottom: '14px' }}>INPUT</p>

            {/* 음식 사진 */}
            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>음식 사진 *</p>
              <div
                onClick={() => foodInputRef.current?.click()}
                style={{ border: '1.5px dashed rgba(255,255,255,0.15)', borderRadius: '12px', padding: '16px', cursor: 'pointer', textAlign: 'center', background: foodFile ? 'rgba(196,81,13,0.08)' : 'transparent', transition: 'all 0.2s' }}
              >
                {foodFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                    <img src={URL.createObjectURL(foodFile)} alt="" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontSize: '13px', color: '#fff', fontWeight: 600 }}>{foodFile.name}</p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{(foodFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>클릭해서 업로드</p>
                )}
              </div>
              <input ref={foodInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { setFoodFile(e.target.files?.[0] ?? null); e.target.value = '' }} />
            </div>

            {/* 배경 옵션 */}
            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>배경 선택</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {BG_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setBgOption(opt.value)}
                    style={{ padding: '5px 12px', borderRadius: '100px', border: `1px solid ${bgOption === opt.value ? 'var(--orange)' : 'rgba(255,255,255,0.12)'}`, background: bgOption === opt.value ? 'rgba(196,81,13,0.2)' : 'transparent', color: bgOption === opt.value ? 'var(--orange)' : 'rgba(255,255,255,0.5)', fontSize: '12px', cursor: 'pointer', fontFamily: 'monospace' }}
                  >{opt.label}</button>
                ))}
              </div>
              {bgOption === '__custom__' && (
                <input
                  type="text" value={bgCustom} onChange={e => setBgCustom(e.target.value)}
                  placeholder="배경 설명 직접 입력 (예: dark oak wood)"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: '#222', color: '#fff', fontSize: '13px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              )}
            </div>

            {/* 배경 이미지 (선택) */}
            <div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>배경 이미지 (선택 — 업로드 시 텍스트 배경 무시)</p>
              <div
                onClick={() => bgInputRef.current?.click()}
                style={{ border: '1.5px dashed rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', background: bgFile ? 'rgba(196,81,13,0.05)' : 'transparent' }}
              >
                {bgFile ? (
                  <>
                    <img src={URL.createObjectURL(bgFile)} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} />
                    <span style={{ fontSize: '12px', color: '#fff' }}>{bgFile.name}</span>
                    <button onClick={e => { e.stopPropagation(); setBgFile(null) }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '16px' }}>×</button>
                  </>
                ) : (
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>배경 이미지 없음 (텍스트 프롬프트 사용)</span>
                )}
              </div>
              <input ref={bgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { setBgFile(e.target.files?.[0] ?? null); e.target.value = '' }} />
            </div>
          </section>

          {/* 실행 버튼 */}
          <button
            onClick={runTest} disabled={running || !foodFile}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', background: running ? '#333' : 'var(--orange)', color: running ? 'rgba(255,255,255,0.4)' : '#fff', fontWeight: 800, fontSize: '15px', border: 'none', cursor: running || !foodFile ? 'not-allowed' : 'pointer', marginBottom: '20px', transition: 'all 0.2s', fontFamily: 'monospace', letterSpacing: '1px' }}
          >{running ? '⏳ 생성 중...' : '▶ 테스트 실행'}</button>

          {error && (
            <div style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.3)', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
              <p style={{ color: '#ff5b5b', fontSize: '13px' }}>⚠ {error}</p>
            </div>
          )}

          {/* 로그 */}
          {logs.length > 0 && (
            <section>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', marginBottom: '8px' }}>LOG</p>
              <div style={{ background: '#111', borderRadius: '10px', padding: '12px 14px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, maxHeight: '180px', overflowY: 'auto' }}>
                {logs.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            </section>
          )}

          {/* 결과 이미지 */}
          {(step1Img || step2Imgs.length > 0) && (
            <section style={{ marginTop: '24px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', marginBottom: '12px' }}>RESULT</p>
              {step1Img && (
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '6px' }}>Call 1 — 음식 강화</p>
                  <img src={step1Img} alt="enhanced" style={{ width: '100%', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
              )}
              {step2Imgs.map((url, i) => (
                <div key={i} style={{ marginBottom: '12px' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '6px' }}>Call 2 — 최종 결과 {i + 1}</p>
                  <img src={url} alt={`result-${i}`} style={{ width: '100%', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: '6px', fontSize: '11px', color: 'var(--orange)', textDecoration: 'none' }}>↗ 원본 열기</a>
                </div>
              ))}
            </section>
          )}
        </div>

        {/* ── 우측: 프롬프트 편집기 ── */}
        <div style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--orange)', letterSpacing: '2px', margin: 0 }}>PROMPTS</p>

          {/* Call 1 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>Call 1 — 음식 강화 (Enhance)</p>
              <button onClick={() => setPromptEnhance(DEFAULT_ENHANCE)} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', fontFamily: 'monospace' }}>기본값 복원</button>
            </div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}><code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '4px' }}>{'{SURFACE_COLOR}'}</code> — 배경 컬러가 자동 치환됨</p>
            <textarea
              value={promptEnhance}
              onChange={e => setPromptEnhance(e.target.value)}
              rows={12}
              style={{ width: '100%', background: '#161616', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#cef', fontSize: '13px', fontFamily: 'monospace', lineHeight: 1.7, padding: '14px', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>

          {/* Call 2 — 텍스트 배경 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>Call 2 — 텍스트 배경 합성 (배경 이미지 없을 때)</p>
              <button onClick={() => setPromptComposeText(DEFAULT_COMPOSE_TEXT)} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', fontFamily: 'monospace' }}>기본값 복원</button>
            </div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>
              <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '4px' }}>{'{BG_NAME}'}</code>{' '}
              <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '4px' }}>{'{WIDTH}'}</code>{' '}
              <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '4px' }}>{'{HEIGHT}'}</code> 자동 치환
            </p>
            <textarea
              value={promptComposeText}
              onChange={e => setPromptComposeText(e.target.value)}
              rows={12}
              style={{ width: '100%', background: '#161616', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#cef', fontSize: '13px', fontFamily: 'monospace', lineHeight: 1.7, padding: '14px', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>

          {/* Call 2 — 이미지 배경 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>Call 2 — 이미지 배경 합성 (배경 이미지 있을 때)</p>
              <button onClick={() => setPromptComposeBg(DEFAULT_COMPOSE_BG)} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', fontFamily: 'monospace' }}>기본값 복원</button>
            </div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>
              <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '4px' }}>{'{WIDTH}'}</code>{' '}
              <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '4px' }}>{'{HEIGHT}'}</code> 자동 치환
            </p>
            <textarea
              value={promptComposeBg}
              onChange={e => setPromptComposeBg(e.target.value)}
              rows={12}
              style={{ width: '100%', background: '#161616', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#cef', fontSize: '13px', fontFamily: 'monospace', lineHeight: 1.7, padding: '14px', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
