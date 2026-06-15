export const maxDuration = 60
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
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
import { notifyAiDone } from '../../../../lib/solapi'
import vesselMaster from '../../../../lib/vessel-master.json'

function getVesselPrompt(vesselKey: string): string {
  if (!vesselKey) return ''
  const [vesselId, colorId] = vesselKey.split(':')
  const vessel = vesselMaster.vessels.find((v: any) => v.id === vesselId)
  if (!vessel) return vesselKey
  const color = (vessel as any).colors.find((c: any) => c.colorId === colorId)
  return (color as any)?.aiPrompt ?? vesselKey
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { orderId, stage, photoIndex, stage1Urls, customPrompt } = await req.json()

    if (!orderId) return NextResponse.json({ error: 'orderId 필수' }, { status: 400 })
    if (stage !== 1 && stage !== 2) return NextResponse.json({ error: 'stage는 1 또는 2' }, { status: 400 })
    if (stage === 2 && (!stage1Urls?.length)) return NextResponse.json({ error: '2단계는 stage1Urls 필수' }, { status: 400 })

    const geminiKey = process.env.GEMINI_API_KEY!
    const genAI = new GoogleGenerativeAI(geminiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-image',
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } as any,
    })

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()
    if (orderError || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const angle = order.angle || 'aerial'
    const background = order.background || 'black'

    let vesselList: string[] = []
    try {
      const parsed = JSON.parse(order.vessel_info || '[]')
      vesselList = Array.isArray(parsed) ? parsed : [order.vessel_info || '']
    } catch {
      vesselList = order.vessel_info ? [order.vessel_info] : []
    }

    const sourceUrls: string[] = stage === 1 ? (order.photo_urls || []) : stage1Urls
    const indices: number[] = photoIndex !== undefined && photoIndex !== null
      ? [photoIndex]
      : sourceUrls.map((_: unknown, i: number) => i)

    const resultMap: Record<number, string> = {}
    const errors: string[] = []

    for (const i of indices) {
      const photoUrl = sourceUrls[i]
      if (!photoUrl) continue
      try {
        const imageRes = await fetch(photoUrl)
        if (!imageRes.ok) throw new Error(`사진 다운로드 실패: ${imageRes.status}`)
        const imageBuffer = await imageRes.arrayBuffer()
        const { buffer: processedBuffer, wasPortrait } = await preprocessToLandscape(
          Buffer.from(imageBuffer), background
        )
        const base64 = processedBuffer.toString('base64')

        let prompt: string
        if (customPrompt) {
          prompt = customPrompt
        } else if (stage === 1) {
          // angle이 비어있으면 리터치 → 원본 구도 유지, 설정돼 있으면 리메이크 → 구도 강제
          const preserveAngle = !order.angle
          prompt = buildPrompt(angle, background, '', wasPortrait, '', preserveAngle)
        } else {
          const rawVessel = vesselList[i] ?? vesselList[0] ?? ''
          const vesselInfo = getVesselPrompt(rawVessel)
          prompt = buildStage2Prompt(vesselInfo, wasPortrait)
        }

        const result = await model.generateContent([
          { inlineData: { data: base64, mimeType: 'image/jpeg' } },
          prompt,
        ])

        const parts = result.response.candidates?.[0]?.content?.parts || []
        if (!parts.length) throw new Error('AI가 이미지를 반환하지 않았어요')

        for (const part of parts) {
          if ((part as any).inlineData?.mimeType?.startsWith('image/')) {
            const rawBuffer = Buffer.from((part as any).inlineData.data, 'base64')
            const landscapeBuffer = await forceLandscape(rawBuffer)
            const processedBuffer = await normalizeDishSize(landscapeBuffer, background, geminiKey)
            const aiBuffer = await ensureMinResolution(await ensureThreeByTwo(processedBuffer))
            const suffix = stage === 1 ? 's1' : 's2'
            const filename = `ai_results/${orderId}_${i}_${suffix}_${Date.now()}.jpg`
            const { data: upload, error: uploadErr } = await supabaseAdmin.storage
              .from('photos')
              .upload(filename, aiBuffer, { contentType: 'image/jpeg' })
            if (uploadErr) throw new Error(`저장 실패: ${uploadErr.message}`)
            if (upload) {
              const { data: urlData } = supabaseAdmin.storage.from('photos').getPublicUrl(filename)
              resultMap[i] = urlData.publicUrl
            }
            break
          }
        }
      } catch (e) {
        const msg = `사진 ${i + 1} 실패: ${e instanceof Error ? e.message : String(e)}`
        console.error(msg)
        errors.push(msg)
      }
    }

    if (!Object.keys(resultMap).length) {
      return NextResponse.json({ error: '처리 실패', details: errors }, { status: 500 })
    }

    // Merge with existing saved URLs and persist
    if (stage === 1) {
      const currentMeta = order.v2_meta || {}
      const saved: string[] = currentMeta.stage1_urls
        ? [...currentMeta.stage1_urls]
        : new Array(sourceUrls.length).fill('')
      for (const [idx, url] of Object.entries(resultMap)) saved[Number(idx)] = url
      await supabaseAdmin.from('orders').update({
        v2_meta: { ...currentMeta, stage1_urls: saved },
      }).eq('id', orderId)

      const merged = saved.filter(Boolean)
      return NextResponse.json({ success: true, urls: merged, ...(errors.length && { partialErrors: errors }) })
    } else {
      const saved: string[] = order.ai_photo_urls?.length
        ? [...order.ai_photo_urls]
        : new Array(stage1Urls.length).fill('')
      for (const [idx, url] of Object.entries(resultMap)) saved[Number(idx)] = url
      const finalUrls = saved.filter(Boolean)
      await supabaseAdmin.from('orders').update({
        ai_photo_urls: finalUrls,
        status: 'ai_done',
      }).eq('id', orderId)

      // AI 완료 알림톡 발송
      try {
        let phone = order.customer_phone
        let customerName = order.customer_name ?? ''
        console.log('[ai_done] order.customer_phone:', phone, 'order.customer_email:', order.customer_email)
        if (!phone && order.customer_email) {
          const { data: tokenRow, error: tokenErr } = await supabaseAdmin
            .from('kakao_tokens').select('phone, kakao_name').eq('kakao_email', order.customer_email).single()
          console.log('[ai_done] kakao_tokens lookup:', { tokenRow, tokenErr })
          phone = tokenRow?.phone ?? null
          if (!customerName && tokenRow?.kakao_name) customerName = tokenRow.kakao_name
        }
        console.log('[ai_done] final phone:', phone, 'customerName:', customerName, 'templateId:', process.env.SOLAPI_TEMPLATE_COMPLETE)
        if (phone) {
          await notifyAiDone({ phone, customerName })
          console.log('[ai_done] alimtalk sent')
        } else {
          console.warn('[ai_done] no phone found, skipping alimtalk')
        }
      } catch (e) {
        console.warn('ai_done notify failed:', e)
      }

      return NextResponse.json({ success: true, urls: finalUrls, ...(errors.length && { partialErrors: errors }) })
    }
  } catch (e) {
    console.error('ai-stage error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
