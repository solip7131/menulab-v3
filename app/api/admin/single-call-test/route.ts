export const maxDuration = 180
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@supabase/supabase-js'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

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

const BG_COLORS: Record<string, string> = {
  black: 'dark charcoal concrete',
  white: 'pure white',
  ivory: 'warm ivory',
  gray:  'light gray',
}

export async function POST(req: NextRequest) {
  try {
    const adminPassword = req.headers.get('x-admin-password')
    if (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: '인증 실패' }, { status: 401 })
    }

    const formData = await req.formData()
    const photo = formData.get('photo') as File | null
    if (!photo) return NextResponse.json({ error: '사진이 없어요' }, { status: 400 })

    const angle      = (formData.get('angle')        as string) || 'original'
    const background = (formData.get('background')   as string) || 'black'
    const vesselId   = (formData.get('vesselId')     as string) || 'original'
    const customPrompt = (formData.get('customPrompt') as string) || ''

    const arrayBuffer = await photo.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = photo.type || 'image/jpeg'

    const angleInstruction = ANGLE_INSTRUCTIONS[angle] ?? ANGLE_INSTRUCTIONS.original
    const vesselInstruction = vesselId !== 'original' && VESSEL_LABELS[vesselId]
      ? `Change the bowl/dish to ${VESSEL_LABELS[vesselId]}. Keep ALL food ingredients exactly the same.`
      : ''
    const bgColor = BG_COLORS[background] ?? 'neutral light gray'

    const prompt = customPrompt || [
      angleInstruction,
      vesselInstruction,
      'Naturally enhance color, lighting, and food appearance while preserving original content.',
      `배경: ${bgColor} 단색 스튜디오 배경`,
      '소품 금지: 음식 외 젓가락·냅킨 등 추가 소품 넣지 말 것',
    ].filter(Boolean).join('\n')

    const result = await ai.interactions.create({
      api_version: 'v1alpha',
      model: 'gemini-3-pro-image-preview',
      input: [{
        role: 'user',
        parts: [
          { inlineData: { data: base64, mimeType } },
          { text: prompt },
        ],
      }] as never,
      response_modalities: ['IMAGE', 'TEXT'] as never,
      response_format: { mime_type: 'image/jpeg', delivery: 'inline', image_size: '4K' } as never,
    })

    let imageData: string | null = null
    let imageMime = 'image/jpeg'

    const steps: unknown[] = (result as any)?.steps ?? []
    outer: for (const step of steps) {
      if ((step as any).type === 'model_output') {
        for (const content of (step as any).content ?? []) {
          for (const part of content.parts ?? []) {
            const id = part.inlineData ?? part.inline_data
            if (id && (id.mimeType ?? id.mime_type)?.startsWith('image/')) {
              imageData = id.data
              imageMime = id.mimeType ?? id.mime_type
              break outer
            }
          }
        }
      }
    }

    console.log('[single-call-test] steps:', JSON.stringify(steps.map((s: any) => ({ type: s.type, contentCount: s.content?.length }))));

    if (!imageData) return NextResponse.json({ error: 'AI가 이미지를 반환하지 않았어요' }, { status: 500 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const path = `ai_results/test/${uid}.jpg`
    const rawBuffer = Buffer.from(imageData, 'base64')

    await supabase.storage.from('photos').upload(path, rawBuffer, { contentType: 'image/jpeg', upsert: false })
    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path)

    return NextResponse.json({ url: urlData.publicUrl })
  } catch (e) {
    console.error('[single-call-test] error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
