export const maxDuration = 180
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import { notifyAiDone } from '../../../lib/solapi'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
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
  '아이보리 실크':        'warm ivory',
  '아이보리 페이퍼':      'warm ivory',
  '그레이 콘크리트':      'gray concrete',
  '거친 그레이 콘크리트': 'rough gray concrete',
  '화이트 터치드페인트':  'off-white paint',
  '화이트우드':           'white wood',
  '아이보리 우드':        'ivory wood',
  '베이지우드':           'beige wood',
  '브라운우드':           'brown wood',
  '다크브라운 우드':      'dark brown wood',
  '블랙 우드':            'black wood',
  '다크그레이':           'dark gray',
  '레몬':                 'lemon yellow',
  '베이비핑크':           'baby pink',
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
  'white-noodle-bowl': 'white ceramic noodle bowl',
  'black-noodle-bowl': 'dark matte black noodle bowl',
  'white-plate':       'round white ceramic plate',
  'black-plate':       'round black ceramic plate',
  'ttukbbaeki':        'Korean earthenware ttukbaegi pot',
  'black-pot':         'black cast iron hot pot',
  'cold-noodle-bowl':  'stainless steel cold noodle bowl',
  'pasta-bowl':        'wide rimmed white pasta bowl',
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
CAMERA: {ANGLE_INSTRUCTION} — do NOT change the viewpoint.
TASK: Place the food from Image 1 naturally onto the background surface from Image 2.
FRAMING: Dish occupies 50–60% of image height. Centered horizontally and vertically.
Show plenty of background — at least 15% margin on all sides.
Never crop the dish.
Match lighting direction from Image 1.
OUTPUT: Final composited image only.`

const PROMPT_COMPOSE_TEXT_BG = `Image 1: Food photo (already professionally shot)
CAMERA: {ANGLE_INSTRUCTION} — do NOT change the viewpoint.
TASK: Place the food from Image 1 onto a {BG_NAME} background.
FRAMING: Dish occupies 50–60% of image height. Centered horizontally and vertically.
Show plenty of background — at least 15% margin on all sides.
Never crop the dish.
Match lighting direction from Image 1.
OUTPUT: Final composited image only.`

const ANGLE_INSTRUCTIONS_CALL2: Record<string, string> = {
  original: 'Keep the EXACT same camera angle as Image 1',
  side45:   '45-degree side angle — dish rim visible as ellipse, side of dish clearly visible',
  topdown:  'Directly overhead (90-degree top-down view)',
}

// ── Watermark ─────────────────────────────────────────────────────────────────

// 로고를 읽어서 반투명 PNG로 리사이즈
async function buildLogoWm(targetW: number, targetH: number): Promise<Buffer | null> {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'menulab-logo.png')
    const logoBuffer = fs.readFileSync(logoPath)
    // 이미지 너비의 20% 크기로 로고 축소, 투명도 50%
    const logoW = Math.round(targetW * 0.20)
    const resizedLogo = await sharp(logoBuffer)
      .resize(logoW, undefined, { fit: 'inside' })
      .png()
      .toBuffer()
    // 50% 투명도 적용
    const meta = await sharp(resizedLogo).metadata()
    const lw = meta.width!, lh = meta.height!
    return await sharp({
      create: { width: lw, height: lh, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: resizedLogo, blend: 'over' }])
      .png()
      .toBuffer()
      .then(buf => sharp(buf).modulate({ brightness: 1 }).png().toBuffer())
      .then(buf => sharp(buf).ensureAlpha().linear(0.5, 0).png().toBuffer())
  } catch {
    return null
  }
}

// ── Platform → aspectRatio + final size mapping ───────────────────────────────

type PlatConfig = { aspectRatio: string; finalW: number; finalH: number }

const PLATFORM_CONFIG: Record<string, PlatConfig> = {
  '배달의민족': { aspectRatio: '4:3',  finalW: 1280, finalH: 960  },
  '쿠팡이츠':   { aspectRatio: '16:9', finalW: 1080, finalH: 660  },
  '요기요':     { aspectRatio: '16:9', finalW: 1080, finalH: 640  },
  '땡겨요':     { aspectRatio: '16:9', finalW: 1080, finalH: 660  },
  '먹깨비':     { aspectRatio: '3:2',  finalW: 800,  finalH: 533  },
  '기본':       { aspectRatio: '4:3',  finalW: 1280, finalH: 960  },
}

function getPlatConfig(platName: string, w: number, h: number): PlatConfig {
  return PLATFORM_CONFIG[platName] ?? { aspectRatio: '4:3', finalW: w, finalH: h }
}

async function resizeCrop(base64: string, w: number, h: number): Promise<Buffer> {
  return sharp(Buffer.from(base64, 'base64'))
    .resize(w, h, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 92 })
    .toBuffer()
}

// ── Gemini call with retry ────────────────────────────────────────────────────

// Gemini supports these aspectRatio values only
const GEMINI_ASPECT_RATIOS = new Set(['1:1', '3:4', '4:3', '9:16', '16:9'])

function toGeminiAspect(ratio: string): string {
  if (GEMINI_ASPECT_RATIOS.has(ratio)) return ratio
  // 3:2 → 4:3 (closest supported)
  return '4:3'
}

async function callGemini(
  parts: unknown[],
  modelName = 'gemini-3-pro-image-preview',
  dslr = false,
  aspectRatio = '1:1',
): Promise<{ data: string; mimeType: string }> {
  const contents = [{
    role: 'user',
    parts: parts.map(p => typeof p === 'string' ? { text: p } : p),
  }]

  const geminiAspect = toGeminiAspect(aspectRatio)

  const MAX_RETRIES = 3
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await ai.models.generateContent({
        model: modelName,
        contents: contents as never,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: dslr
            ? { aspectRatio: geminiAspect, imageSize: '2K' }
            : { aspectRatio: geminiAspect },
        } as never,
      })

      const resParts: unknown[] = (result as any).candidates?.[0]?.content?.parts ?? []
      for (const part of resParts) {
        const id = (part as any).inlineData
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
): Promise<{ wmUrl: string; origUrl: string; origPath: string; wmPath: string } | null> {
  try {
    const rawBuffer = Buffer.from(imageBase64, 'base64')
    const meta = await sharp(rawBuffer).metadata()
    const w = meta.width ?? 800
    const h = meta.height ?? 600

    // 로고 워터마크: 우하단 배치, 패딩 2%
    const logoWm = await buildLogoWm(w, h)
    let wmBuffer: Buffer
    if (logoWm) {
      const lMeta = await sharp(logoWm).metadata()
      const lw = lMeta.width!, lh = lMeta.height!
      const pad = Math.round(w * 0.02)
      wmBuffer = await sharp(rawBuffer)
        .composite([{ input: logoWm, left: w - lw - pad, top: h - lh - pad, blend: 'over' }])
        .jpeg({ quality: 92 })
        .toBuffer()
    } else {
      wmBuffer = rawBuffer
    }

    const uid      = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const origPath = `ai_results/orig/${uid}.jpg`
    const wmPath   = `ai_results/wm/${uid}.jpg`

    await supabase.storage.from('photos').upload(origPath, rawBuffer, { contentType: 'image/jpeg', upsert: false })
    const { error } = await supabase.storage.from('photos').upload(wmPath, wmBuffer, { contentType: 'image/jpeg', upsert: false })
    if (error) return null

    const { data: wmUrlData }   = supabase.storage.from('photos').getPublicUrl(wmPath)
    const { data: origUrlData } = supabase.storage.from('photos').getPublicUrl(origPath)
    return { wmUrl: wmUrlData.publicUrl, origUrl: origUrlData.publicUrl, origPath, wmPath }
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

    // ── 서비스 타입·구도·그릇·품질 파라미터 ─────────────────────────────────
    const serviceType = (body.serviceType as string | undefined) ?? 'retouch'  // 'retouch' | 'remake'
    const angle       = (body.angle       as string | undefined) ?? 'original' // 'original' | 'side45' | 'topdown'
    const vessel      = (body.vessel      as string | undefined) ?? 'original' // 'original' | 그릇 id
    const dslr        = !!(body.dslr)                                          // true → imageSize: '2K'

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
    console.log(`[generate] call 1/2 — food enhancement (surface: ${surfaceColor}, dslr: ${dslr})`)
    const enhanced = await callGemini([
      { inlineData: { data: foodBase64, mimeType: foodMime } },
      promptEnhance,
    ], 'gemini-3-pro-image-preview', dslr)
    console.log('[generate] call 1/2 done')

    // ── Call 2: composite onto background — one call per platform ─────────────
    const platResults = await Promise.all(
      platformList.map(async (plat) => {
        const platCfg = getPlatConfig(plat.name, plat.width, plat.height)
        console.log(`[generate] call 2/2 — compose platform: ${plat.name} (${platCfg.aspectRatio} → ${platCfg.finalW}x${platCfg.finalH})`)
        let parts: unknown[]
        let prompt: string

        if (hasBgImage) {
          parts = [
            { inlineData: { data: enhanced.data,  mimeType: enhanced.mimeType } },
            { inlineData: { data: bgImageBase64!, mimeType: bgImageMime!      } },
          ]
          const angleInstr = ANGLE_INSTRUCTIONS_CALL2[angle] ?? ANGLE_INSTRUCTIONS_CALL2.original
          prompt = (overrideComposeBg ?? PROMPT_COMPOSE_BG_IMAGE)
            .replace('{ANGLE_INSTRUCTION}', angleInstr)
        } else {
          parts = [
            { inlineData: { data: enhanced.data, mimeType: enhanced.mimeType } },
          ]
          const angleInstr = ANGLE_INSTRUCTIONS_CALL2[angle] ?? ANGLE_INSTRUCTIONS_CALL2.original
          prompt = (overrideComposeText ?? PROMPT_COMPOSE_TEXT_BG)
            .replace(/{BG_NAME}/g, bgName)
            .replace('{ANGLE_INSTRUCTION}', angleInstr)
        }

        try {
          const img = await callGemini([...parts, prompt], 'gemini-3-pro-image-preview', dslr, platCfg.aspectRatio)
          // Gemini가 이미 올바른 비율로 생성 → sharp는 크롭 없이 정확한 픽셀 크기로만 조정
          const resized = await sharp(Buffer.from(img.data, 'base64'))
            .resize(platCfg.finalW, platCfg.finalH, { fit: 'fill' })
            .jpeg({ quality: 92 })
            .toBuffer()
          const croppedB64 = resized.toString('base64')
          const upload = await uploadWithWatermark(croppedB64)
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
            imageBase64: croppedB64,
            imageMime:   'image/jpeg',
            wmUrl:       upload.wmUrl,
            origUrl:     upload.origUrl,
          }
        } catch (err: any) {
          console.error(`Platform ${plat.name} failed:`, err?.message ?? err)
          return null
        }
      }),
    )

    const successes = platResults.filter(Boolean) as {
      platform: string; imageBase64: string; imageMime: string; wmUrl: string; origUrl: string
    }[]

    if (successes.length === 0) {
      throw new Error('모든 플랫폼 생성에 실패했어요')
    }

    // AI 완료 알림톡
    if (userEmail) {
      try {
        const { data: tokenRows } = await supabase
          .from('kakao_tokens').select('phone, kakao_name').eq('kakao_email', userEmail).not('phone', 'is', null).limit(1)
        const tokenRow = tokenRows?.[0]
        if (tokenRow?.phone) {
          await notifyAiDone({ phone: tokenRow.phone, customerName: tokenRow.kakao_name ?? '' })
        }
      } catch (e) { console.warn('[generate] ai_done alimtalk failed:', e) }
    }

    const first = successes[0]
    return NextResponse.json({
      imageBase64: first.imageBase64,
      imageMime:   first.imageMime,
      wmUrl:       isAdmin ? first.origUrl : first.wmUrl,
    })

  } catch (e) {
    console.error('generate error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
