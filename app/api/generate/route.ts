export const maxDuration = 300
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

// ── Background name → surface color ──────────────────────────────────────────
const BG_SURFACE: Record<string, string> = {
  '라이트그레이':        'light gray',
  '아이보리':            'warm ivory',
  '화이트 대리석타일':   'pure white marble',
  '블랙 콘크리트':       'dark charcoal concrete',
  '아이보리 실크':       'warm ivory',
  '아이보리 페이퍼':     'warm ivory',
  '그레이 콘크리트':     'gray concrete',
  '거친 그레이 콘크리트':'rough gray concrete',
  '화이트 터치드페인트': 'off-white paint',
  '화이트우드':          'white wood',
  '아이보리 우드':       'ivory wood',
  '베이지우드':          'beige wood',
  '브라운우드':          'brown wood',
  '다크브라운 우드':     'dark brown wood',
  '블랙 우드':           'black wood',
  '다크그레이':          'dark gray',
  '레몬':                'lemon yellow',
  '베이비핑크':          'baby pink',
}

function getSurfaceColor(backgroundName?: string, bgPrompt?: string): string {
  if (backgroundName && BG_SURFACE[backgroundName]) return BG_SURFACE[backgroundName]
  if (bgPrompt) {
    const p = bgPrompt.toLowerCase()
    if (p.includes('흰') || p.includes('화이트') || p.includes('white')) return 'pure white'
    if (p.includes('검') || p.includes('블랙') || p.includes('black')) return 'dark charcoal'
    if (p.includes('아이보리') || p.includes('ivory'))                   return 'warm ivory'
    if (p.includes('그레이') || p.includes('gray') || p.includes('회색'))return 'light gray'
    if (p.includes('콘크리트') || p.includes('concrete'))                return 'dark charcoal gray'
  }
  return 'neutral light gray'
}

// ── Prompt constants ──────────────────────────────────────────────────────────

const ANGLE_INSTRUCTIONS: Record<string, string> = {
  original: 'Keep the ORIGINAL camera angle and composition as close as possible to the input photo. Do NOT force 45-degree angle.',
  side45:   'Camera: 45-degree side angle, dish rim visible as ellipse, side of dish clearly visible.',
  topdown:  'Camera: directly overhead (90-degree top-down view), food fills frame naturally.',
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

function buildPrompt(params: {
  serviceType: string
  angle: string
  vessel: string
  surfaceColor: string
  bgName: string
  hasBgImage: boolean
}): string {
  const { serviceType, angle, vessel, surfaceColor, bgName, hasBgImage } = params
  const lines: string[] = []

  // 1. 카메라 각도
  if (serviceType === 'remake') {
    lines.push(ANGLE_INSTRUCTIONS[angle] ?? ANGLE_INSTRUCTIONS.original)
  } else {
    lines.push(ANGLE_INSTRUCTIONS.original)
  }

  // 2. 그릇 교체 (remake + 그릇 선택 시)
  if (serviceType === 'remake' && vessel && vessel !== 'original' && VESSEL_LABELS[vessel]) {
    lines.push(`Change the bowl/dish to ${VESSEL_LABELS[vessel]}. Keep ALL food ingredients exactly the same.`)
  }

  // 3. 음식 보정
  lines.push('Naturally enhance color, lighting, and food appearance while preserving the original viewpoint.')

  // 4. 배경
  if (hasBgImage) {
    lines.push('Image 2 is the background texture reference. Place the food naturally onto that background surface.')
  } else {
    lines.push(`배경: ${surfaceColor} 단색 스튜디오 배경`)
    if (bgName && bgName !== 'clean professional studio') {
      lines.push(`Background style: ${bgName}`)
    }
  }

  // 5. 프레이밍 (원본 Call 2 기준 복구)
  lines.push('FRAMING: Dish occupies 50% of image height. Centered.')
  lines.push('Show plenty of background — 20% margin top, 15% bottom, 15% each side.')
  lines.push('Never crop the dish.')
  lines.push('Match lighting naturally.')

  // 6. 소품 금지
  lines.push('소품 금지: 음식 외 젓가락·냅킨 등 추가 소품 넣지 말 것')

  // 7. 출력
  lines.push('OUTPUT: Final composited food photo only.')

  return lines.join('\n')
}

// ── Watermark ─────────────────────────────────────────────────────────────────

async function buildLogoWm(targetW: number, targetH: number): Promise<Buffer | null> {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'menulab-logo.png')
    const logoBuffer = fs.readFileSync(logoPath)
    const logoW = Math.round(targetW * 0.20)
    const resizedLogo = await sharp(logoBuffer)
      .resize(logoW, undefined, { fit: 'inside' })
      .png()
      .toBuffer()
    return await sharp(resizedLogo).ensureAlpha().linear(0.5, 0).png().toBuffer()
  } catch {
    return null
  }
}

// ── Platform config ───────────────────────────────────────────────────────────

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

const GEMINI_ASPECT_RATIOS = new Set(['1:1', '3:4', '4:3', '9:16', '16:9'])
function toGeminiAspect(ratio: string): string {
  return GEMINI_ASPECT_RATIOS.has(ratio) ? ratio : '4:3'
}

// ── Gemini single call with retry ─────────────────────────────────────────────

async function callGemini(
  parts: unknown[],
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
        model: 'gemini-3-pro-image-preview',
        contents: contents as never,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: { aspectRatio: geminiAspect, imageSize: '2K' },
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

// ── Upload with watermark ─────────────────────────────────────────────────────

async function uploadWithWatermark(
  imageBase64: string,
): Promise<{ wmUrl: string; origUrl: string } | null> {
  try {
    const rawBuffer = Buffer.from(imageBase64, 'base64')
    const meta = await sharp(rawBuffer).metadata()
    const w = meta.width ?? 800
    const h = meta.height ?? 600

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
    return { wmUrl: wmUrlData.publicUrl, origUrl: origUrlData.publicUrl }
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

    const adminToken = body.adminToken as string | undefined
    const isAdmin    = adminToken && adminToken === process.env.ADMIN_PASSWORD
    const overridePrompt = isAdmin ? (body.overridePrompt as string | undefined) : undefined

    const serviceType = (body.serviceType as string | undefined) ?? 'retouch'
    const angle       = (body.angle       as string | undefined) ?? 'original'
    const vessel      = (body.vessel      as string | undefined) ?? 'original'

    const hasBgImage   = !!(bgImageBase64 && bgImageMime)
    const bgName       = backgroundName?.trim() || bgPrompt?.trim() || 'clean professional studio'
    const surfaceColor = getSurfaceColor(backgroundName, bgPrompt)

    // ── Single Gemini call per platform ───────────────────────────────────────
    const platResults = await Promise.all(
      platformList.map(async (plat) => {
        const platCfg = getPlatConfig(plat.name, plat.width, plat.height)
        console.log(`[generate] ${plat.name} — aspect:${platCfg.aspectRatio} ${platCfg.finalW}x${platCfg.finalH}`)

        const parts: unknown[] = [
          { inlineData: { data: foodBase64, mimeType: foodMime } },
        ]
        if (hasBgImage) {
          parts.push({ inlineData: { data: bgImageBase64!, mimeType: bgImageMime! } })
        }
        const prompt = overridePrompt ?? buildPrompt({ serviceType, angle, vessel, surfaceColor, bgName, hasBgImage })
        parts.push(prompt)

        try {
          const img = await callGemini(parts, platCfg.aspectRatio)

          const resized = await sharp(Buffer.from(img.data, 'base64'))
            .resize(platCfg.finalW, platCfg.finalH, { fit: 'fill' })
            .jpeg({ quality: 92 })
            .toBuffer()
          const resizedB64 = resized.toString('base64')

          const upload = await uploadWithWatermark(resizedB64)
          if (!upload) return null

          try {
            await supabase.from('generated_images').insert({
              user_email:      userEmail      ?? null,
              image_url:       upload.wmUrl,
              category:        '배달앱',
              platform:        plat.name,
              background_name: backgroundName ?? null,
            })
          } catch { /* DB 실패는 응답 실패로 연결 안 함 */ }

          console.log(`[generate] ${plat.name} done`)
          return {
            platform:    plat.name,
            imageBase64: resizedB64,
            imageMime:   'image/jpeg',
            wmUrl:       upload.wmUrl,
            origUrl:     upload.origUrl,
          }
        } catch (err: any) {
          console.error(`[generate] ${plat.name} failed:`, err?.message ?? err)
          return null
        }
      }),
    )

    const successes = platResults.filter(Boolean) as {
      platform: string; imageBase64: string; imageMime: string; wmUrl: string; origUrl: string
    }[]

    if (successes.length === 0) throw new Error('모든 플랫폼 생성에 실패했어요')

    if (userEmail) {
      try {
        const { data: tokenRows } = await supabase
          .from('kakao_tokens').select('phone, kakao_name').eq('kakao_email', userEmail).not('phone', 'is', null).limit(1)
        const tokenRow = tokenRows?.[0]
        if (tokenRow?.phone) {
          await notifyAiDone({ phone: tokenRow.phone, customerName: tokenRow.kakao_name ?? '' })
        }
      } catch (e) { console.warn('[generate] alimtalk failed:', e) }
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
