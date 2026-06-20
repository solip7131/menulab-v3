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

// ── Call 1 배경 톤 (색상만, 텍스처 없음) ─────────────────────────────────────────
const BG_TONE: Record<string, string> = {
  '라이트그레이':         'light gray',
  '아이보리':             'ivory',
  '화이트 대리석타일':    'white',
  '블랙 콘크리트':        'black',
  '아이보리 실크':        'ivory',
  '아이보리 페이퍼':      'ivory',
  '그레이 콘크리트':      'gray',
  '거친 그레이 콘크리트': 'gray',
  '화이트 터치드페인트':  'white',
  '화이트우드':           'white',
  '아이보리 우드':        'ivory',
  '베이지우드':           'beige',
  '브라운우드':           'brown',
  '다크브라운 우드':      'dark brown',
  '블랙 우드':            'black',
  '다크그레이':           'dark gray',
  '레몬':                 'yellow',
  '베이비핑크':           'pink',
}

function getCall1BgTone(backgroundName?: string, bgPrompt?: string): string {
  if (backgroundName && BG_TONE[backgroundName]) return BG_TONE[backgroundName]
  if (bgPrompt) {
    const p = bgPrompt.toLowerCase()
    if (p.includes('블랙') || p.includes('black') || p.includes('검')) return 'black'
    if (p.includes('다크브라운') || p.includes('dark brown'))           return 'dark brown'
    if (p.includes('다크') || p.includes('dark'))                       return 'dark gray'
    if (p.includes('화이트') || p.includes('white') || p.includes('흰')) return 'white'
    if (p.includes('아이보리') || p.includes('ivory'))                   return 'ivory'
    if (p.includes('그레이') || p.includes('gray') || p.includes('회색'))return 'gray'
    if (p.includes('브라운') || p.includes('brown'))                     return 'brown'
    if (p.includes('베이지') || p.includes('beige'))                     return 'beige'
    if (p.includes('핑크') || p.includes('pink'))                        return 'pink'
  }
  return 'white'
}

// ── Call 2 배경 설명 (텍스처 합성용) ─────────────────────────────────────────────
const BG_SURFACE: Record<string, string> = {
  '라이트그레이':         'light gray',
  '아이보리':             'warm ivory',
  '화이트 대리석타일':    'pure white marble',
  '블랙 콘크리트':        'dark charcoal concrete',
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
    if (p.includes('검') || p.includes('블랙') || p.includes('black'))   return 'dark charcoal'
    if (p.includes('아이보리') || p.includes('ivory'))                   return 'warm ivory'
    if (p.includes('그레이') || p.includes('gray') || p.includes('회색'))return 'light gray'
    if (p.includes('콘크리트') || p.includes('concrete'))                return 'dark charcoal gray'
  }
  return 'neutral light gray'
}

// ── Sharp 캔버스 확장용 RGB ───────────────────────────────────────────────────────
const BG_RGB: Record<string, { r: number; g: number; b: number }> = {
  'black':      { r: 15,  g: 15,  b: 15  },
  'dark gray':  { r: 50,  g: 50,  b: 50  },
  'dark brown': { r: 40,  g: 25,  b: 15  },
  'gray':       { r: 130, g: 130, b: 130 },
  'light gray': { r: 210, g: 210, b: 210 },
  'white':      { r: 245, g: 245, b: 245 },
  'ivory':      { r: 245, g: 240, b: 220 },
  'beige':      { r: 220, g: 200, b: 175 },
  'brown':      { r: 100, g: 65,  b: 40  },
  'yellow':     { r: 240, g: 230, b: 100 },
  'pink':       { r: 255, g: 200, b: 210 },
}

// ── 각도 (Call 1용) ───────────────────────────────────────────────────────────────
const ANGLE_KO: Record<string, string> = {
  original: '',
  side45:   'side 45 degree shot',
  topdown:  '구도는 top down view',
}

// ── 그릇 ─────────────────────────────────────────────────────────────────────────
const VESSEL_LABELS: Record<string, string> = {
  'white-noodle-bowl': 'white ceramic noodle bowl',
  'black-noodle-bowl': 'dark matte black noodle bowl',
  'white-plate':       'round white ceramic plate',
  'black-plate':       'round black ceramic plate',
  'ttukbbaeki':        'Korean earthenware ttukbaegi pot',
  'black-pot':         'black cast iron hot pot',
  'cold-noodle-bowl':  'stainless steel cold noodle bowl',
  'pasta-bowl':        'wide rimmed white pasta bowl',
  'wood-bowl':         'round wooden salad bowl',
}

// ── Watermark ─────────────────────────────────────────────────────────────────────
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

// ── Platform config ───────────────────────────────────────────────────────────────
type PlatConfig = { aspectRatio: string }

const PLATFORM_CONFIG: Record<string, PlatConfig> = {
  '배달의민족': { aspectRatio: '4:3'  },
  '쿠팡이츠':   { aspectRatio: '16:9' },
  '요기요':     { aspectRatio: '16:9' },
  '땡겨요':     { aspectRatio: '16:9' },
  '먹깨비':     { aspectRatio: '3:2'  },
  '기본':       { aspectRatio: '4:3'  },
}

function getPlatConfig(platName: string): PlatConfig {
  return PLATFORM_CONFIG[platName] ?? { aspectRatio: '4:3' }
}

const GEMINI_ASPECT_RATIOS = new Set(['1:1', '3:4', '4:3', '9:16', '16:9'])
function toGeminiAspect(ratio: string): string {
  return GEMINI_ASPECT_RATIOS.has(ratio) ? ratio : '4:3'
}

// ── Gemini call with retry ────────────────────────────────────────────────────────
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
          imageConfig: { aspectRatio: geminiAspect },
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

// ── Upload with watermark ─────────────────────────────────────────────────────────
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

// ── Route ─────────────────────────────────────────────────────────────────────────
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

    const adminToken     = body.adminToken as string | undefined
    const isAdmin        = adminToken && adminToken === process.env.ADMIN_PASSWORD
    const overridePrompt = isAdmin ? (body.overridePrompt as string | undefined) : undefined

    const serviceType = (body.serviceType as string | undefined) ?? 'retouch'
    const angle       = (body.angle       as string | undefined) ?? 'original'
    const vessel      = (body.vessel      as string | undefined) ?? 'original'

    const hasBgImage   = !!(bgImageBase64 && bgImageMime)
    const bgName       = backgroundName?.trim() || bgPrompt?.trim() || ''
    const surfaceColor = getSurfaceColor(backgroundName, bgPrompt)
    const call1BgColor = getCall1BgTone(backgroundName, bgPrompt)
    const fillRgb      = BG_RGB[call1BgColor] ?? { r: 200, g: 200, b: 200 }

    // ── Call 1: 음식 퀄리티 극대화 (1:1, 한 번만) ────────────────────────────────
    const angleKo    = (serviceType === 'remake' ? ANGLE_KO[angle] : '') ?? ''
    const call1Lines = [
      '음식사진 업그레이드 해줘',
      angleKo,
      `${call1BgColor} surface`,
    ].filter(Boolean)

    const call1Parts: unknown[] = [
      { inlineData: { data: foodBase64, mimeType: foodMime } },
      overridePrompt ?? call1Lines.join('\n'),
    ]

    console.log(`[generate] Call 1 시작 — angle:${angle}, bg:${call1BgColor}`)
    const call1Img = await callGemini(call1Parts, '1:1')
    console.log('[generate] Call 1 완료')

    // ── Call 2: 플랫폼별 Sharp 캔버스 확장 + Gemini 배경 합성 ─────────────────────
    const vesselLabel = serviceType === 'remake' ? (VESSEL_LABELS[vessel] ?? '') : ''
    const vesselLine  = vesselLabel
      ? `Replace the existing bowl/dish with a ${vesselLabel}. The bowl shape and style MUST completely change. Keep ALL food ingredients exactly the same.`
      : ''

    const platResults = await Promise.all(
      platformList.map(async (plat) => {
        const platCfg     = getPlatConfig(plat.name)
        const geminiRatio = toGeminiAspect(platCfg.aspectRatio)
        console.log(`[generate] ${plat.name} Call 2 시작 — ratio:${geminiRatio}`)

        try {
          // Sharp 캔버스 확장
          const call1Buffer = Buffer.from(call1Img.data, 'base64')
          const meta  = await sharp(call1Buffer).metadata()
          const srcW  = meta.width  ?? 1024
          const srcH  = meta.height ?? 1024

          const RATIO_MUL: Record<string, [number, number]> = {
            '4:3': [4,3], '16:9': [16,9], '3:4': [3,4], '9:16': [9,16], '1:1': [1,1],
          }
          const [rw, rh]  = RATIO_MUL[geminiRatio] ?? [4, 3]
          const isWide    = rw >= rh
          let canvasW: number, canvasH: number, offsetL: number, offsetT: number
          if (isWide) {
            canvasH = srcH; canvasW = Math.round(srcH * rw / rh)
            offsetL = Math.round((canvasW - srcW) / 2); offsetT = 0
          } else {
            canvasW = srcW; canvasH = Math.round(srcW * rh / rw)
            offsetL = 0; offsetT = Math.round((canvasH - srcH) / 2)
          }

          const canvasBuffer = await sharp({
            create: { width: canvasW, height: canvasH, channels: 3, background: fillRgb },
          })
            .composite([{ input: call1Buffer, left: offsetL, top: offsetT }])
            .jpeg({ quality: 92 })
            .toBuffer()

          // Call 2 Gemini
          const directionHint = isWide ? 'left and right' : 'top and bottom'
          const call2Parts: unknown[] = [
            { inlineData: { data: canvasBuffer.toString('base64'), mimeType: 'image/jpeg' } },
          ]
          if (hasBgImage) {
            call2Parts.push({ inlineData: { data: bgImageBase64!, mimeType: bgImageMime! } })
          }

          const bgFillDesc = hasBgImage
            ? `Replace ALL solid ${call1BgColor} background areas (center AND the ${directionHint} extensions) with the Image 2 texture. The entire background must become the textured surface.`
            : `Replace ALL solid ${call1BgColor} background areas with: ${surfaceColor}${bgName ? ` (${bgName})` : ''} texture.`

          call2Parts.push([
            `This image has food centered on a solid ${call1BgColor} background, with extra solid ${call1BgColor} areas on the ${directionHint}.`,
            bgFillDesc,
            vesselLine,
            'Remove any props, chopsticks, napkins, or accessories that do not belong to the dish.',
            'The food position and size are FIXED — do not move, resize, or alter the food in any way.',
            'Never crop the dish.',
            'OUTPUT: Food photo with the full background replaced by texture.',
          ].filter(Boolean).join('\n'))

          const call2Img = await callGemini(call2Parts, geminiRatio)

          const jpegBuffer = await sharp(Buffer.from(call2Img.data, 'base64'))
            .jpeg({ quality: 92 })
            .toBuffer()
          const jpegB64 = jpegBuffer.toString('base64')

          const upload = await uploadWithWatermark(jpegB64)
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

          console.log(`[generate] ${plat.name} 완료`)
          return {
            platform:    plat.name,
            imageBase64: jpegB64,
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
