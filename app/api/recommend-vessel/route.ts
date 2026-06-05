import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import vesselMaster from '../../../lib/vessel-master.json'
import vesselMapping from '../../../lib/vessel-mapping.json'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// 이 값 미만이면 isFood 여부와 관계없이 인식 실패로 처리 (테스트하며 조정)
const CONFIDENCE_THRESHOLD = 0.5

export type RecommendStatus = 'no_food' | 'success' | 'no_mapping'

export interface RecommendResult {
  status: RecommendStatus
  vesselId?: string    // e.g. 'ttukbaegi:default'
  vesselLabel?: string // e.g. '뚝배기'
  foodName?: string
}

function buildVesselLabel(vesselId: string, colorId: string): string {
  const vessel = vesselMaster.vessels.find(v => v.id === vesselId)
  if (!vessel) return ''
  const color = vessel.colors.find(c => c.colorId === colorId)
  if (!color) return vessel.label
  return color.colorLabel ? `${vessel.label} · ${color.colorLabel}` : vessel.label
}

const CATEGORY_IDS = vesselMapping.categories.map(c => c.id).join(', ')

const PROMPT_SUFFIX = `아래 JSON만 반환해. 다른 텍스트는 절대 포함하지 마.
{
  "isFood": true 또는 false,
  "foodName": "음식 이름(한국어), 없으면 null",
  "category": "${CATEGORY_IDS}" 중 정확히 하나, 해당 없으면 null,
  "confidence": 0.0~1.0 숫자
}
category는 반드시 위 목록 중 정확히 하나만. 확실하지 않으면 null.`

// 텍스트 경로: 카테고리 ID 하나만 반환받음 (JSON 파싱 없이)
async function classifyFromText(foodName: string): Promise<string | null> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
  const result = await model.generateContent(
    `음식 "${foodName}"에 가장 잘 어울리는 그릇 카테고리 ID를 아래 목록에서 정확히 하나만 골라 ID 그대로 출력해. 다른 텍스트는 일절 출력하지 마. 해당 없으면 "none"이라고만 써.\n목록: ${CATEGORY_IDS}`
  )
  const text = result.response.text().trim().toLowerCase().replace(/[^a-z_]/g, '')
  return text || null
}

function resolveResult(parsed: { isFood: boolean; foodName: string | null; category: string | null; confidence: number }): NextResponse<RecommendResult> {
  const { isFood, foodName, category, confidence } = parsed

  if (typeof confidence !== 'number' || confidence < CONFIDENCE_THRESHOLD || !isFood) {
    return NextResponse.json<RecommendResult>({ status: 'no_food' })
  }

  const mapping = vesselMapping.categories.find(c => c.id === category)

  if (!mapping || !mapping.vessel) {
    const { vessel, defaultColor } = vesselMapping.fallback
    return NextResponse.json<RecommendResult>({
      status: 'no_mapping',
      vesselId: `${vessel}:${defaultColor}`,
      vesselLabel: buildVesselLabel(vessel, defaultColor),
      foodName: foodName ?? undefined,
    })
  }

  return NextResponse.json<RecommendResult>({
    status: 'success',
    vesselId: `${mapping.vessel}:${mapping.defaultColor}`,
    vesselLabel: buildVesselLabel(mapping.vessel, mapping.defaultColor),
    foodName: foodName ?? undefined,
  })
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const foodNameInput = (formData.get('foodName') as string | null)?.trim()

    // 텍스트 기반 경로
    if (foodNameInput) {
      let categoryId: string | null
      try {
        categoryId = await classifyFromText(foodNameInput)
      } catch {
        return NextResponse.json<RecommendResult>({ status: 'no_food' })
      }

      if (!categoryId || categoryId === 'none') {
        const { vessel, defaultColor } = vesselMapping.fallback
        return NextResponse.json<RecommendResult>({
          status: 'no_mapping',
          vesselId: `${vessel}:${defaultColor}`,
          vesselLabel: buildVesselLabel(vessel, defaultColor),
          foodName: foodNameInput,
        })
      }

      const mapping = vesselMapping.categories.find(c => c.id === categoryId)
      if (!mapping || !mapping.vessel) {
        const { vessel, defaultColor } = vesselMapping.fallback
        return NextResponse.json<RecommendResult>({
          status: 'no_mapping',
          vesselId: `${vessel}:${defaultColor}`,
          vesselLabel: buildVesselLabel(vessel, defaultColor),
          foodName: foodNameInput,
        })
      }

      return NextResponse.json<RecommendResult>({
        status: 'success',
        vesselId: `${mapping.vessel}:${mapping.defaultColor}`,
        vesselLabel: buildVesselLabel(mapping.vessel, mapping.defaultColor),
        foodName: foodNameInput,
      })
    }

    // 이미지 기반 경로 (레거시)
    const photo = formData.get('photo') as File | null
    if (!photo) return NextResponse.json<RecommendResult>({ status: 'no_food' })

    const bytes = await photo.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mimeType = (photo.type && photo.type.startsWith('image/')) ? photo.type : 'image/jpeg'

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent([
      { inlineData: { data: base64, mimeType } },
      `이 사진을 분석하고 ${PROMPT_SUFFIX}\nisFood = false 조건: 음식이 없는 사진, 심하게 흐리거나 어두운 사진, 음식 아닌 물체.`,
    ])

    const text = result.response.text().trim()
    const jsonMatch = text.match(/\{[\s\S]*?\}/)
    if (!jsonMatch) return NextResponse.json<RecommendResult>({ status: 'no_food' })

    let parsed: { isFood: boolean; foodName: string | null; category: string | null; confidence: number }
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json<RecommendResult>({ status: 'no_food' })
    }

    return resolveResult(parsed)
  } catch (e) {
    console.error('recommend-vessel error:', e)
    return NextResponse.json<RecommendResult>({ status: 'no_food' })
  }
}
