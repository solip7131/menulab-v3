export const maxDuration = 300
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

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

const GEMINI_ASPECT_RATIOS = new Set(['1:1', '3:4', '4:3', '9:16', '16:9'])
function toGeminiAspect(ratio: string): string {
  return GEMINI_ASPECT_RATIOS.has(ratio) ? ratio : '4:3'
}

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

async function uploadBase64(imageBase64: string, folder: string): Promise<string | null> {
  try {
    const rawBuffer = Buffer.from(imageBase64, 'base64')
    const jpegBuffer = await sharp(rawBuffer).jpeg({ quality: 92 }).toBuffer()
    const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const filePath = `${folder}/${uid}.jpg`
    await supabase.storage.from('photos').upload(filePath, jpegBuffer, { contentType: 'image/jpeg', upsert: false })
    const { data } = supabase.storage.from('photos').getPublicUrl(filePath)
    return data.publicUrl
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminPassword = req.headers.get('x-admin-password')
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: '인증 실패' }, { status: 401 })
    }

    const formData = await req.formData()
    const photo = formData.get('photo') as File | null
    if (!photo) return NextResponse.json({ error: '사진 없음' }, { status: 400 })

    const bgImageBase64  = formData.get('bgImageBase64')  as string | undefined
    const bgImageMime    = formData.get('bgImageMime')    as string | undefined
    const backgroundName = formData.get('backgroundName') as string | undefined
    const bgPrompt       = formData.get('bgPrompt')       as string | undefined
    const targetRatio    = (formData.get('targetRatio') as string) || '4:3'
    const angle          = (formData.get('angle') as string) || 'original'
    const vessel         = (formData.get('vessel') as string) || 'original'

    const arrayBuffer = await photo.arrayBuffer()
    const foodBase64  = Buffer.from(arrayBuffer).toString('base64')
    const foodMime    = photo.type || 'image/jpeg'

    const hasBgImage   = !!(bgImageBase64 && bgImageMime)
    const surfaceColor = getSurfaceColor(backgroundName, bgPrompt)
    const bgName       = backgroundName?.trim() || bgPrompt?.trim() || ''
    const call1BgColor = getCall1BgTone(backgroundName, bgPrompt)

    const ANGLE_KO: Record<string, string> = {
      original:  '',
      side45:    'side 45 degree shot',
      heroshot:  '2/3 hero shot',
      topdown:   '구도는 top down view',
    }

    // ── Call 1: 음식 퀄리티 극대화 (최소 프롬프트, 3줄 고정) ────────────────────
    // 포맷: "음식사진 업그레이드 해줘\n구도는 top down view\nwhite surface"
    const angleKo    = ANGLE_KO[angle]
    const call1Lines = [
      '음식사진 업그레이드 해줘',
      angleKo,
      `${call1BgColor} surface`,
    ].filter(Boolean)

    const call1Parts: unknown[] = [
      { inlineData: { data: foodBase64, mimeType: foodMime } },
      call1Lines.join('\n'),
    ]

    const enc = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: object) =>
          controller.enqueue(enc.encode(JSON.stringify(obj) + '\n'))

        try {
          console.log(`[two-call-test] Call 1 시작 (1:1, ${call1BgColor} 배경)`)
          const call1 = await callGemini(call1Parts, '1:1')
          const call1Url = await uploadBase64(call1.data, 'ai_results/2call-test/call1')
          console.log('[two-call-test] Call 1 완료')
          send({ type: 'call1', url: call1Url })

          // ── Call 2: Sharp 캔버스 확장 → Gemini 배경 합성 ────────────────────────
          const isWide = !['9:16', '3:4'].includes(targetRatio)
          const directionHint = isWide ? 'left and right' : 'top and bottom'

          // 1. Call 1 이미지를 sharp로 타겟 비율 캔버스에 중앙 배치
          const call1Buffer = Buffer.from(call1.data, 'base64')
          const meta = await sharp(call1Buffer).metadata()
          const srcW = meta.width  ?? 1024
          const srcH = meta.height ?? 1024

          const RATIO_MUL: Record<string, [number, number]> = {
            '4:3': [4,3], '16:9': [16,9], '3:4': [3,4], '9:16': [9,16],
          }
          const [rw, rh] = RATIO_MUL[targetRatio] ?? [4, 3]
          let canvasW: number, canvasH: number, offsetL: number, offsetT: number
          if (isWide) {
            canvasH = srcH; canvasW = Math.round(srcH * rw / rh)
            offsetL = Math.round((canvasW - srcW) / 2); offsetT = 0
          } else {
            canvasW = srcW; canvasH = Math.round(srcW * rh / rw)
            offsetL = 0; offsetT = Math.round((canvasH - srcH) / 2)
          }

          // 2. 빈 영역을 배경 톤 단색으로 채운 캔버스 생성
          const BG_RGB: Record<string, {r:number;g:number;b:number}> = {
            'black':      {r:15,  g:15,  b:15 },
            'dark gray':  {r:50,  g:50,  b:50 },
            'dark brown': {r:40,  g:25,  b:15 },
            'gray':       {r:130, g:130, b:130},
            'light gray': {r:210, g:210, b:210},
            'white':      {r:245, g:245, b:245},
            'ivory':      {r:245, g:240, b:220},
            'beige':      {r:220, g:200, b:175},
            'brown':      {r:100, g:65,  b:40 },
            'yellow':     {r:240, g:230, b:100},
            'pink':       {r:255, g:200, b:210},
          }
          const fillRgb = BG_RGB[call1BgColor] ?? {r:200, g:200, b:200}

          const canvasBuffer = await sharp({
            create: { width: canvasW, height: canvasH, channels: 3, background: fillRgb },
          })
            .composite([{ input: call1Buffer, left: offsetL, top: offsetT }])
            .jpeg({ quality: 92 })
            .toBuffer()

          console.log(`[two-call-test] Call 2 캔버스: ${canvasW}x${canvasH}, food at left:${offsetL} top:${offsetT}, hasBgImage:${hasBgImage}`)

          // 3. Gemini: 빈 영역만 배경 텍스처로 채우기
          const call2Parts: unknown[] = [
            { inlineData: { data: canvasBuffer.toString('base64'), mimeType: 'image/jpeg' } },
          ]
          if (hasBgImage) {
            call2Parts.push({ inlineData: { data: bgImageBase64!, mimeType: bgImageMime! } })
          }

          const bgFillDesc = hasBgImage
            ? `Replace ALL solid ${call1BgColor} background areas (center AND the ${directionHint} extensions) with the Image 2 texture. The entire background must become the textured surface.`
            : `Replace ALL solid ${call1BgColor} background areas (center AND the ${directionHint} extensions) with ${surfaceColor}${bgName ? ` (${bgName})` : ''} texture. The entire background must become the textured surface.`

          const vesselLabel = VESSEL_LABELS[vessel]
          const vesselLine  = vesselLabel
            ? `Change the bowl/dish to ${vesselLabel}. Keep ALL food ingredients exactly the same.`
            : ''

          call2Parts.push([
            `This image has food centered on a solid ${call1BgColor} background, with extra solid ${call1BgColor} areas added on the ${directionHint}.`,
            bgFillDesc,
            vesselLine,
            'Remove any props, chopsticks, napkins, or accessories that do not belong to the dish.',
            'The food position and size are FIXED — do not move, resize, or alter the food in any way.',
            'Never crop the dish.',
            'OUTPUT: Food photo with the full background replaced by texture.',
          ].filter(Boolean).join('\n'))

          console.log(`[two-call-test] Call 2 시작 (${targetRatio})`)
          const call2 = await callGemini(call2Parts, targetRatio)
          const call2Url = await uploadBase64(call2.data, 'ai_results/2call-test/call2')
          console.log('[two-call-test] Call 2 완료')
          send({ type: 'call2', url: call2Url })
        } catch (e) {
          console.error('[two-call-test] stream error:', e)
          send({ type: 'error', message: String(e) })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (e) {
    console.error('[two-call-test] error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
