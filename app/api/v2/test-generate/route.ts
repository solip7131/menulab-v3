export const maxDuration = 120
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  preprocessToLandscape,
  forceLandscape,
  ensureThreeByTwo,
  ensureMinResolution,
  normalizeDishSize,
  buildPrompt,
  buildStage2Prompt,
} from '../../../../lib/ai-generate'
import { getVesselConfig } from '../../../../lib/vessel-config'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData()
    const stage = parseInt((fd.get('stage') as string) || '1')
    const angle = (fd.get('angle') as string) || 'aerial'
    const bgRaw = (fd.get('background') as string) || 'black'
    const customPrompt = ((fd.get('customPrompt') as string) || '').trim()
    const vesselId = ((fd.get('vesselId') as string) || 'original').trim()

    const bgMapped = bgRaw === 'white' ? 'bright' : 'dark'
    const geminiKey = process.env.GEMINI_API_KEY!

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-image',
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } as any,
    })

    // ── Stage 1 ──
    if (stage === 1) {
      const photo = fd.get('photo') as File
      if (!photo) return NextResponse.json({ error: '사진이 없어요' }, { status: 400 })

      const bytes = await photo.arrayBuffer()
      const { buffer: processed, wasPortrait } = await preprocessToLandscape(Buffer.from(bytes), bgMapped)

      const prompt = customPrompt || buildPrompt(angle, bgMapped, '', wasPortrait)

      const result = await model.generateContent([
        { inlineData: { data: processed.toString('base64'), mimeType: 'image/jpeg' } },
        prompt,
      ])

      const parts = result.response.candidates?.[0]?.content?.parts || []
      for (const part of parts) {
        if ((part as any).inlineData?.mimeType?.startsWith('image/')) {
          const raw = Buffer.from((part as any).inlineData.data, 'base64')
          const landscape = await forceLandscape(raw)
          const normalized = await normalizeDishSize(landscape, bgMapped, geminiKey)
          const cropped = await ensureThreeByTwo(normalized)
          const upscaled = await ensureMinResolution(cropped)
          const base64 = `data:image/jpeg;base64,${upscaled.toString('base64')}`
          return NextResponse.json({ url: base64 })
        }
      }
      throw new Error('AI가 이미지를 반환하지 않았어요')
    }

    // ── Stage 2 ──
    if (stage === 2) {
      const stage1DataUrl = fd.get('stage1Url') as string
      if (!stage1DataUrl) return NextResponse.json({ error: 'stage1Url이 없어요' }, { status: 400 })
      if (vesselId === 'original') return NextResponse.json({ error: '그릇을 선택해주세요' }, { status: 400 })

      const vesselConfig = getVesselConfig(vesselId)
      if (!vesselConfig?.promptSpec) return NextResponse.json({ error: '지원하지 않는 그릇이에요' }, { status: 400 })

      // data URL → buffer
      const base64Data = stage1DataUrl.replace(/^data:image\/\w+;base64,/, '')
      const stage1Buffer = Buffer.from(base64Data, 'base64')

      const prompt = buildStage2Prompt(vesselConfig.promptSpec)

      const result = await model.generateContent([
        { inlineData: { data: stage1Buffer.toString('base64'), mimeType: 'image/jpeg' } },
        prompt,
      ])

      const parts = result.response.candidates?.[0]?.content?.parts || []
      for (const part of parts) {
        if ((part as any).inlineData?.mimeType?.startsWith('image/')) {
          const raw = Buffer.from((part as any).inlineData.data, 'base64')
          const landscape2 = await forceLandscape(raw)
          const normalized2 = await normalizeDishSize(landscape2, bgMapped, geminiKey)
          const finalBuffer = await ensureMinResolution(await ensureThreeByTwo(normalized2))
          const finalBase64 = `data:image/jpeg;base64,${finalBuffer.toString('base64')}`
          return NextResponse.json({ url: finalBase64 })
        }
      }
      throw new Error('AI가 이미지를 반환하지 않았어요')
    }

    return NextResponse.json({ error: 'stage는 1 또는 2' }, { status: 400 })

  } catch (e) {
    console.error('test-generate error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
