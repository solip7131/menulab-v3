export const maxDuration = 180
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { notifyAiDone } from '../../../lib/solapi'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// ── Background → neutral surface color mapping ────────────────────────────────
const BG_SURFACE: Record<string, string> = {
  '라이트그레이':       'light gray',
  '아이보리':           'warm ivory',
  '화이트 대리석타일':  'pure white marble',
  '블랙 콘크리트':      'dark charcoal concrete',
  '아이보리 실크':      'warm ivory',
  '아이보리 페이퍼':    'warm ivory',
  '그레이 콘크리트':    'gray concrete',
  '화이트 터치드페인트':'off-white paint',
  '화이트우드':         'white wood',
}

function getSurfaceColor(backgroundName?: string, bgPrompt?: string): string {
  if (backgroundName && BG_SURFACE[backgroundName]) return BG_SURFACE[backgroundName]
  if (bgPrompt) {
    const p = bgPrompt.toLowerCase()
    if (p.includes('흰') || p.includes('화이트') || p.includes('white')) return 'pure white'
    if (p.includes('검') || p.includes('블랙') || p.includes('black')) return 'dark charcoal'
    if (p.includes('아이보리') || p.includes('ivory'))                  return 'warm ivory'
    if (p.includes('그레이') || p.includes('gray') || p.includes('회색')) return 'light gray'
    if (p.includes('콘크리트') || p.includes('concrete'))               return 'dark charcoal gray'
  }
  return 'neutral light gray'
}

// ── Call 1: food-only enhancement ────────────────────────────────────────────

// 리터치: 원본 구도 최대한 유지
const PROMPT_RETOUCH_ENHANCE = `Keep the ORIGINAL camera angle and composition
as close as possible to the input photo.
Do NOT force 45-degree angle.
Naturally enhance color, lighting, and food appearance while preserving the original viewpoint.
배경: {SURFACE_COLOR} 단색 스튜디오 배경
소품 금지: 음식 외 젓가락·냅킨 등 추가 소품 넣지 말 것`

// 리메이크: 구도별 분기
const PROMPT_REMAKE_ANGLE: Record<string, string> = {
  original: `Keep the ORIGINAL camera angle and composition.`,
  side45:   `Camera: 45-degree side angle, dish rim visible as ellipse, side of dish clearly visible.`,
  topdown:  `Camera: directly overhead (90-degree top-down view), food fills frame naturally.`,
}

const VESSEL_LABELS: Record<string, string> = {
  round_ceramic: '둥근 도자기',
  black_iron:    '검은 무쇠',
  white_ceramic: '흰 세라믹',
  wood_tray:     '우드 트레이',
}

function buildRemakeEnhancePrompt(angle: string, vessel: string, surfaceColor: string): string {
  const angleInstruction = PROMPT_REMAKE_ANGLE[angle] ?? PROMPT_REMAKE_ANGLE.original
  const vesselLine = vessel && vessel !== 'original'
    ? `\nChange the bowl/dish to ${VESSEL_LABELS[vessel] ?? vessel}. Keep ALL food ingredients exactly the same.`
    : ''
  return `${angleInstruction}${vesselLine}
Naturally enhance color, lighting, and food appearance.
배경: ${surfaceColor} 단색 스튜디오 배경
소품 금지: 음식 외 젓가락·냅킨 등 추가 소품 넣지 말 것`
}

// 레거시 별칭 (어드민 오버라이드 기본값 노출용으로 유지)
const PROMPT_ENHANCE_TMPL = PROMPT_RETOUCH_ENHANCE

// ── Call 2: composite onto background ────────────────────────────────────────
const PROMPT_COMPOSE_BG_IMAGE = `Image 1: Food photo (already professionally shot)
Image 2: Background texture reference
TASK: Place the food from Image 1 naturally onto
the background surface from Image 2.
FRAMING: Dish occupies 50% of image height. Centered.
Show plenty of background — 20% margin top, 15% bottom, 15% each side.
Never crop the dish.
Match lighting direction from Image 1.
Output image size: exactly {WIDTH}x{HEIGHT} pixels.
OUTPUT: Final composited image only.`

const PROMPT_COMPOSE_TEXT_BG = `Image 1: Food photo (already professionally shot)
TASK: Place the food from Image 1 onto a {BG_NAME} background.
FRAMING: Dish occupies 50% of image height. Centered.
Show plenty of background — 20% margin top, 15% bottom, 15% each side.
Never crop the dish.
Match lighting direction from Image 1.
Output image size: exactly {WIDTH}x{HEIGHT} pixels.
OUTPUT: Final composited image only.`

// ── Watermark ─────────────────────────────────────────────────────────────────

function buildWmSvg(w: number, h: number): Buffer {
  const tileW = 150, tileH = 90
  let t = ''
  for (let r = -1; r <= Math.ceil(h / tileH) + 1; r++)
    for (let c = -1; c <= Math.ceil(w / tileW) + 1; c++) {
      const cx = c * tileW + tileW / 2, cy = r * tileH + tileH / 2
      t += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" transform="rotate(-35,${cx},${cy})" font-family="Arial,sans-serif" font-size="20" font-weight="bold" fill="rgba(255,255,255,0.4)" stroke="rgba(0,0,0,0.1)" stroke-width="0.5">Menulab</text>`
    }
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${t}</svg>`)
}

// ── Gemini call with retry ────────────────────────────────────────────────────

async function callGemini(parts: unknown[]): Promise<{ data: string; mimeType: string }> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-image',
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } as never,
  })

  const MAX_RETRIES = 3
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(parts as never)
      const candidates = result.response.candidates?.[0]?.content?.parts ?? []
      for (const part of candidates) {
        const id = (part as { inlineData?: { mimeType: string; data: string } }).inlineData
        if (id?.mimeType?.startsWith('image/')) return { data: id.data, mimeType: id.mimeType }
      }
      throw new Error('AI가 이미지를 반환하지 않았어요')
    } catch (err: any) {
      const is503 = err?.message?.includes('503')
      console.error(`Gemini attempt ${attempt}/${MAX_RETRIES}:`, err?.message ?? err)
      if (attempt < MAX_RETRIES && is503) {
        await new Promise(r => setTimeout(r, 3000 * attempt))
        continue
      }
      throw err
    }
  }
  throw new Error('Gemini max retries exceeded')
}

// ── Upload helper ─────────────────────────────────────────────────────────────

async function uploadWithWatermark(
  imageBase64: string,
): Promise<{ wmUrl: string; origPath: string; wmPath: string } | null> {
  try {
    const rawBuffer = Buffer.from(imageBase64, 'base64')
    const meta = await sharp(rawBuffer).metadata()
    const w = meta.width ?? 800
    const h = meta.height ?? 600

    const wmBuffer = await sharp(rawBuffer)
      .composite([{ input: buildWmSvg(w, h), top: 0, left: 0 }])
      .jpeg({ quality: 92 })
      .toBuffer()

    const uid      = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const origPath = `ai_results/orig/${uid}.jpg`
    const wmPath   = `ai_results/wm/${uid}.jpg`

    await supabase.storage.from('photos').upload(origPath, rawBuffer,  { contentType: 'image/jpeg', upsert: false })
    const { error } = await supabase.storage.from('photos').upload(wmPath, wmBuffer, { contentType: 'image/jpeg', upsert: false })
    if (error) return null

    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(wmPath)
    return { wmUrl: urlData.publicUrl, origPath, wmPath }
  } catch {
    return null
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    let foodBase64: string
    let foodMime: string

    if (Array.isArray(body.foodImages) && body.foodImages.length > 0) {
      foodBase64 = body.foodImages[0].base64
      foodMime   = body.foodImages[0].mime
    } else if (body.foodImageBase64) {
      foodBase64 = body.foodImageBase64
      foodMime   = body.foodImageMime
    } else {
      return NextResponse.json({ error: '이미지 데이터가 없어요' }, { status: 400 })
    }

    const bgImageBase64  = body.bgImageBase64  as string | undefined
    const bgImageMime    = body.bgImageMime    as string | undefined
    const bgPrompt       = body.bgPrompt       as string | undefined
    const userEmail      = body.userEmail      as string | undefined
    const backgroundName = body.backgroundName as string | undefined

    type Plat = { name: string; width: number; height: number }
    const platforms = (body.platforms as Plat[] | undefined) ?? []
    const platformList: Plat[] = platforms.length > 0
      ? platforms
      : [{ name: '기본', width: 1280, height: 960 }]

    // ── Admin prompt override (어드민 토큰 검증 후 커스텀 프롬프트 적용) ────────
    const adminToken = body.adminToken as string | undefined
    const isAdmin    = adminToken && adminToken === process.env.ADMIN_PASSWORD
    const overrideEnhance     = isAdmin ? (body.overridePromptEnhance     as string | undefined) : undefined
    const overrideComposeBg   = isAdmin ? (body.overridePromptComposeBg   as string | undefined) : undefined
    const overrideComposeText = isAdmin ? (body.overridePromptComposeText as string | undefined) : undefined

    // ── 서비스 타입·구도·그릇 파라미터 ──────────────────────────────────────
    const serviceType = (body.serviceType as string | undefined) ?? 'retouch'  // 'retouch' | 'remake'
    const angle       = (body.angle       as string | undefined) ?? 'original' // 'original' | 'side45' | 'topdown'
    const vessel      = (body.vessel      as string | undefined) ?? 'original' // 'original' | 그릇 id

    const hasBgImage = !!(bgImageBase64 && bgImageMime)
    const bgName = backgroundName?.trim() || bgPrompt?.trim() || 'clean professional studio'
    const surfaceColor = getSurfaceColor(backgroundName, bgPrompt)

    // 서비스별 1차 프롬프트 선택
    let baseEnhancePrompt: string
    if (serviceType === 'remake') {
      baseEnhancePrompt = buildRemakeEnhancePrompt(angle, vessel, surfaceColor)
    } else {
      baseEnhancePrompt = PROMPT_RETOUCH_ENHANCE.replace('{SURFACE_COLOR}', surfaceColor)
    }
    const promptEnhance = overrideEnhance ?? baseEnhancePrompt

    // ── Call 1: enhance food only (shared across all platforms) ──────────────
    console.log(`[generate] call 1/2 — food enhancement (surface: ${surfaceColor})`)
    const enhanced = await callGemini([
      { inlineData: { data: foodBase64, mimeType: foodMime } },
      promptEnhance,
    ])
    console.log('[generate] call 1/2 done')

    // ── Call 2: composite onto background — one call per platform ─────────────
    const platResults = await Promise.all(
      platformList.map(async (plat) => {
        console.log(`[generate] call 2/2 — compose platform: ${plat.name}`)
        let parts: unknown[]
        let prompt: string

        if (hasBgImage) {
          parts = [
            { inlineData: { data: enhanced.data,  mimeType: enhanced.mimeType } },
            { inlineData: { data: bgImageBase64!, mimeType: bgImageMime!      } },
          ]
          prompt = (overrideComposeBg ?? PROMPT_COMPOSE_BG_IMAGE)
            .replace('{WIDTH}',  String(plat.width))
            .replace('{HEIGHT}', String(plat.height))
        } else {
          parts = [
            { inlineData: { data: enhanced.data, mimeType: enhanced.mimeType } },
          ]
          prompt = (overrideComposeText ?? PROMPT_COMPOSE_TEXT_BG)
            .replace(/{BG_NAME}/g, bgName)
            .replace('{WIDTH}',    String(plat.width))
            .replace('{HEIGHT}',   String(plat.height))
        }

        try {
          const img    = await callGemini([...parts, prompt])
          const upload = await uploadWithWatermark(img.data)
          if (!upload) return null

          // Insert immediately so mypage polling picks it up as soon as it's ready
          try {
            await supabase.from('generated_images').insert({
              user_email:      userEmail      ?? null,
              image_url:       upload.wmUrl,
              category:        '배달앱',
              platform:        plat.name,
              background_name: backgroundName ?? null,
            })
          } catch { /* DB failure does not fail the response */ }

          console.log(`[generate] platform ${plat.name} saved to DB`)
          return {
            platform:    plat.name,
            imageBase64: img.data,
            imageMime:   img.mimeType,
            wmUrl:       upload.wmUrl,
          }
        } catch (err: any) {
          console.error(`Platform ${plat.name} failed:`, err?.message ?? err)
          return null
        }
      }),
    )

    const successes = platResults.filter(Boolean) as {
      platform: string; imageBase64: string; imageMime: string; wmUrl: string
    }[]

    if (successes.length === 0) {
      throw new Error('모든 플랫폼 생성에 실패했어요')
    }

    // AI 완료 알림톡
    if (userEmail) {
      try {
        const { data: tokenRow } = await supabase
          .from('kakao_tokens').select('phone, kakao_name').eq('kakao_email', userEmail).single()
        if (tokenRow?.phone) {
          await notifyAiDone({ phone: tokenRow.phone, customerName: tokenRow.kakao_name ?? '' })
        }
      } catch (e) { console.warn('[generate] ai_done alimtalk failed:', e) }
    }

    const first = successes[0]
    return NextResponse.json({ imageBase64: first.imageBase64, imageMime: first.imageMime })

  } catch (e) {
    console.error('generate error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
