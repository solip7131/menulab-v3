import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import sharp from 'sharp'
import vesselMaster from '../../../lib/vessel-master.json'

export const maxDuration = 60

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || '',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const PORTRAIT_NOTE = `⚠️ INPUT IS A PORTRAIT PHOTO: The reference image is taller than it is wide. Use it as a food reference only — completely ignore its dimensions and aspect ratio. Your OUTPUT must be a 3:2 horizontal landscape (width > height). Do NOT reproduce the portrait format in your output. Do NOT add white borders, frames, letterboxing, or padding of any kind.\n\n`

const DRAMATIC_LIGHTING = `UNIFIED SCENE LIGHTING — PROFESSIONAL STUDIO STYLE. One key light illuminates the entire scene (food + dish + surface + background) as a single physical environment.
• KEY LIGHT: Large softbox from upper-left at 45°, 6500K daylight — clean, neutral, and directional, clearly dominant but not harsh
• Light-to-shadow ratio: 3:1 — shadows define shape and depth without being overly dark
• Shadow edges: soft and gradual — smoothly transitioning, never hard-edged
• FILL: Gentle reflector from right (ratio 1:3 to key) — lifts shadow areas to retain food detail and texture
• RIM LIGHT: Very subtle separation from behind — barely noticeable, just enough to distinguish dish edge from background
• BACKGROUND: Clean and simple — no strong vignette, no spotlight effect. Evenly lit with only the faintest natural falloff toward edges
• SPECULAR: Soft, natural catchlights on glossy surfaces — present but not blown-out
• Target look: clean daylight-balanced professional food photography — the dish sits solidly on a real surface
• Food and background share identical light direction and color temperature — fully integrated scene, not composited.`

const AERIAL_LIGHTING = `FLAT-LAY AERIAL STUDIO LIGHTING — PROFESSIONAL TOP-DOWN FOOD PHOTOGRAPHY.
• PRIMARY LIGHT: Large softbox from upper-left side — 6500K daylight, directional but soft. This light casts natural shadows on the background surface around and beneath the dish, which are clearly visible from the overhead camera. This is correct and expected in aerial food photography.
• Light-to-shadow ratio: 2:1 to 3:1 — gentle shadows, soft enough to remain non-harsh, defined enough to give depth
• Shadow edges: soft and gradual — never hard-edged
• FILL: Gentle reflector from right — lifts shadow areas so they are not too dark, ratio 1:2 to key
• BACKGROUND: Uniformly lit, perfectly even — absolutely NO vignette, NO gradient, NO falloff. Background color is consistent from center to edges.
• SPECULAR: Soft natural catchlights on the TOP surface of glossy sauces, broths, and oily food surfaces
• Color temperature: 6500K daylight — clean, neutral, and true-to-color
• Target look: professional Korean food delivery flat-lay — clean, well-lit, appetizing. NOT dramatic or moody. The camera is at 90° overhead; the directional shadow cast on the surface is natural and adds depth.`

function buildCollectionPrompt(background: string, brandColor: string, wasPortrait = false) {
  let bgInstruction: string
  if (background === 'wood') {
    bgInstruction = 'Background surface: warm natural wood grain texture, medium-toned oak or walnut board with horizontal planks visible.'
  } else if (background === 'white') {
    bgInstruction = 'Background: clean pure white matte surface (#f5f5f5), completely flat, no texture.'
  } else if (background === 'black') {
    bgInstruction = 'Background: dark matte black surface (#1a1a1a), smooth and sophisticated, subtle vignette at edges.'
  } else if (background === 'brand' && brandColor) {
    bgInstruction = `Background: solid flat matte color exactly ${brandColor}. No texture, no gradient.`
  } else {
    bgInstruction = 'Background: clean neutral light gray matte surface.'
  }

  return `${wasPortrait ? PORTRAIT_NOTE : ''}Create a professional Korean food collection photo using all the uploaded food images. Arrange them naturally on the surface like a studio food photography shoot. Studio quality lighting. Top-down aerial view. Keep all original dishes/bowls as-is. No steam, smoke or vapor. Output in 4:3 horizontal ratio.

${bgInstruction}

Arrangement rules:
- Place all dishes with natural spacing, no overlapping
- Use the rule of thirds — anchor the hero dish slightly off-center
- Leave breathing room between each dish (approximately 5-8% of image width)
- Every dish must be fully visible, not cropped by the frame edge

${DRAMATIC_LIGHTING}

Food enhancement:
- Increase color vibrancy/saturation by 15-20% on food only
- Subtle specular highlight on glossy surfaces (sauces, broths)`
}

function buildPromoPrompt(vesselInfo: string, wasPortrait = false) {
  return `${wasPortrait ? PORTRAIT_NOTE : ''}You are a world-class commercial food photographer specializing in Korean cuisine for high-end SNS campaigns, promotional flyers, and menu boards. This is a COMPLETE CREATIVE RESHOOTING — not a filter, not an enhancement. Reconstruct the entire shot from scratch. The original photo is ONLY a reference for what food exists.

━━━ DIRECTIVE #1 — VESSEL SELECTION (MANDATORY) ━━━
Analyze the food in the photo and choose the most visually stunning and appropriate vessel/tableware for it.
• Korean soups/stews (국, 찌개, 탕) → elegant earthenware or premium stone pot with dramatic steam rising
• Noodle dishes (면류) → sleek modern black ceramic bowl or rustic wooden bowl
• Rice dishes (밥류) → traditional Korean lacquerware or modern matte ceramic
• Grilled/roasted meats → sophisticated dark slate plate or cast-iron skillet
• Street food / snacks → artisan ceramic dish with warm earth tones
• Seafood → white porcelain or light gray ceramic to highlight freshness
If a vessel change is requested below, apply ONLY the color/material change while keeping the original vessel shape intact.
${vesselInfo ? `VESSEL CHANGE: ${vesselInfo}. Study the original vessel's shape carefully and apply ONLY the specified color and material. The new vessel must have the IDENTICAL shape, depth, and proportions as the original — only color and material change.` : 'Choose the most visually stunning vessel that best complements this specific food.'}

━━━ DIRECTIVE #2 — COMPOSITION & ANGLE ━━━
Choose the most dramatic and appetizing camera angle for this specific food:
• If the food has beautiful layers, height, or texture → use 45-degree side angle
• If the food has intricate toppings or vibrant colors best seen from above → use 30-40° overhead angle
• DISH SIZE (MANDATORY): The dish must occupy approximately 70% of the image height. In a 3:2 image, the center 1:1 square (= full height × full height, centered) defines the safe zone — the dish must fit within it at 70% of its size, with visible breathing room around it inside the square.
• The dish must be horizontally centered. The left/right margins outside the center square are background and negative space only.
• Add elegant negative space for text overlay in the outer margin area.

━━━ DIRECTIVE #3 — STUDIO BACKGROUND ━━━
Create a premium lifestyle/studio background:
• Use a beautiful textured surface: dark walnut wood, aged concrete, black marble with subtle veining, or linen fabric — whichever best fits the food's personality.
• Add soft, natural-looking depth: very shallow depth-of-field blur on far background.
• Subtle complementary props are ENCOURAGED: rustic chopsticks, a small ceramic sauce dish, scattered sesame seeds, fresh garnish herbs, or a linen napkin — but keep it minimal (max 2-3 props).
• NO plastic, NO styrofoam, NO cluttered backgrounds.

━━━ DIRECTIVE #4 — LIGHTING ━━━
${DRAMATIC_LIGHTING}

━━━ DIRECTIVE #5 — FOOD ENHANCEMENT ━━━
Make the food look irresistibly delicious:
• Increase color vibrancy/saturation by 25-35%
• Reds more vibrant, greens more lush, yellows more golden, whites cleaner
• Add natural micro-steam or condensation where appropriate (soups, hot dishes)
• Enhance gloss on sauces, broths, and oily surfaces
• Sharpen food texture: crispy parts look crispier, soft parts look pillowy
• Slightly increase food contrast against background

━━━ DIRECTIVE #6 — OUTPUT FORMAT ━━━
Final image: 3:2 horizontal landscape ratio. Portrait = WRONG.
Quality level: magazine cover / Michelin restaurant promotional material.`
}

function buildPrompt(angle: string, background: string, vesselInfo: string, wasPortrait = false) {
  const anglePrompt = angle === 'aerial'
    ? `━━━ RULE #1 — CAMERA ANGLE: STRICT 90° TOP-DOWN FLAT LAY (HIGHEST PRIORITY — OVERRIDES ALL OTHER RULES) ━━━
THIS IS THE MOST IMPORTANT RULE. Violating this rule makes the entire image unacceptable.

REQUIRED: The camera must be positioned DIRECTLY ABOVE the dish, pointing STRAIGHT DOWN at exactly 90°. Zero tilt in any direction.

MANDATORY SYMMETRY CHECK — USE THIS AS YOUR PRIMARY VERIFICATION:
• If the dish has handles, ears, or side protrusions (e.g. ttukbaegi earthenware pot, frying pan, pot with handles): the left handle and right handle MUST appear at EXACTLY equal distances from the center and at IDENTICAL sizes. Perfect left-right mirror symmetry. If the handles are unequal in size or position → the camera is tilted → WRONG.
• If the dish is round (bowl, plate): the rim must form a PERFECT CIRCLE. If it looks like an ellipse → the camera is tilted → WRONG.
• The dish must be perfectly centered with equal margins on all four sides.

WHAT YOU MUST SEE:
• Only the top surface of the food — no side walls, no dish depth, no 3D perspective
• Complete left-right and front-back symmetry of the dish shape
• Flat 2D composition with zero perspective distortion

WHAT IS FORBIDDEN:
✗ Any side wall of the dish visible — even slightly
✗ Any tilt, angle, or perspective — even subtle
✗ Asymmetric handles or unequal margins
✗ Elliptical rim on a round dish

DO NOT change the camera angle based on food type. Soup, stew, rice, noodles, meat — always 90° straight down. Non-negotiable.

REGENERATION: Completely recreate from scratch with studio lighting and new composition. Input photo = food reference only.`
    : `━━━ RULE #1 — CAMERA ANGLE (ABSOLUTE, NON-NEGOTIABLE) ━━━
The output image MUST be a classic food photography HERO SHOT — camera elevated HIGH ABOVE the table, angled DOWN at 45 degrees toward the dish.
IMAGINE the camera is mounted on a tall tripod or boom arm well above the table surface, pointing diagonally downward at 45 degrees. The camera looks DOWN onto the dish from above — NOT from table level, NOT from eye level.
✗ NOT low angle (camera at table level looking toward the dish — this is WRONG)
✗ NOT eye-level shot
✗ NOT top-down / flat lay / bird's eye view (camera directly overhead — this is WRONG)
✓ CORRECT: Camera is ABOVE the table, tilted DOWN at 45°. You see roughly equal portions of the food's TOP SURFACE and the dish's SIDE WALL. The dish rim appears as a wide, natural ellipse — not a thin sliver (too low) and not a circle (too high).
✓ CORRECT visual check: the food toppings are clearly visible AND the side height of the bowl/plate is also visible. Equal emphasis on both.
The original photo angle is COMPLETELY IRRELEVANT — discard it entirely.
REPEAT: Camera HIGH above table → angled DOWN 45°. Hero shot. Wide ellipse dish. Top AND side visible equally. This overrides everything.`

  const bgPrompt = background === 'bright'
    ? 'The background MUST be exactly #f5f5f5 pure flat matte white. No shadows on background, no gradients, no texture.'
    : background === 'dark'
    ? 'The background MUST be uniformly dark charcoal gray #2a2a2a — perfectly even, no gradient, no vignette, no lighter areas. Smooth seamless backdrop, no texture.'
    : 'Background: clean neutral background.'

  return `${wasPortrait ? PORTRAIT_NOTE : ''}You are a professional Korean food delivery app photographer. This is a complete RESHOOTING task — not a filter, not an enhancement. Ignore the original photo's angle, zoom, lighting, and composition entirely. Rebuild the shot from scratch using ONLY the food and dish as reference.

${anglePrompt}

━━━ RULE #2 — DISH SIZE / ZOOM (ABSOLUTE, NON-NEGOTIABLE) ━━━
The dish (bowl/plate including rim) MUST occupy exactly 70% of the total image HEIGHT.
Visualize the center 1:1 square of the 3:2 image — a square as tall as the full image, centered horizontally (= 2/3 of image width wide). The dish must fit comfortably inside this square at 70% of its size.
Example: in a 1500×1000px image, image height = 1000px → dish diameter = 700px. The center square = 1000×1000px — the dish occupies 70% of it, with 150px breathing room on each side within the square.
This is a fixed zoom normalization rule. It applies regardless of how close or far the original photo was taken.
• Original was zoomed OUT (dish looks small) → zoom IN so the dish fills 70% of height.
• Original was zoomed IN (dish fills the frame) → zoom OUT so the dish fills exactly 70% of height.
• The dish MUST NOT exceed the center 1:1 square boundary — no rim or edge may touch the left/right sides of the image.
• The dish must be horizontally centered.
Measure: if the dish height in the output image ÷ total image height ≠ ~0.70 → the image is WRONG.
REPEAT: dish = 70% of image height. Always. Every single output image. Non-negotiable.

━━━ RULE #3 — 1:1 CROP SAFE ZONE (ABSOLUTE, NON-NEGOTIABLE) ━━━
The dish AND every part of the vessel (rim, handles, sides) must fit COMPLETELY within the center 1:1 square of the 3:2 image.
Visualize: divide the 3:2 image into three equal vertical columns. The dish must be fully contained within the MIDDLE column only.
✗ NO part of the dish, rim, or handle may cross into the left or right outer columns.
✗ If the dish is cropped to 1:1 from the center → zero parts of the dish should be cut off.
✓ The left and right outer columns contain ONLY background — no food, no dish, no vessel.

━━━ RULE #4 — OUTPUT FORMAT (ABSOLUTE, NON-NEGOTIABLE) ━━━
The output image MUST be generated NATIVELY as a 3:2 horizontal landscape (width > height).
✗ DO NOT generate a vertical/portrait image and rotate it 90°. Rotation is strictly forbidden.
✗ Portrait output (height > width) = completely wrong. Discard and regenerate.
✗ DO NOT letterbox: do NOT place the food in a center square/column and fill the sides with white or solid-color bars. The background surface MUST fill the ENTIRE 3:2 frame from left edge to right edge — no empty margins, no side bars, no borders.
✓ Width must be exactly 1.5× the height. Example: 1500×1000, 1200×800, 900×600.
✓ The background surface (table/backdrop) extends fully to all four edges of the frame.

━━━ RULE #5 — BACKGROUND ━━━
${bgPrompt}

━━━ RULE #6 — LIGHTING ━━━
${angle === 'aerial' ? AERIAL_LIGHTING : DRAMATIC_LIGHTING}

━━━ RULE #7 — FOOD FIDELITY & SCENE CLEANLINESS ━━━
Keep the food and dish EXACTLY as in the original photo. Do NOT change, add, or remove any food.
STRICTLY FORBIDDEN — do NOT add any of the following:
✗ Extra plates, bowls, dishes, or any tableware other than the main dish
✗ Steam, smoke, vapor, or fog
✗ Chopsticks, spoons, forks, or any utensils
✗ Napkins, linen, fabric
✗ Herbs, flowers, garnishes, or decorative elements
✗ Sauce dishes, small side bowls, condiment containers
✗ Any prop, object, or element not present in the original photo
The scene contains ONLY: the main dish, the surface/background. Nothing else.
${getVesselPrompt(vesselInfo) ? `VESSEL CHANGE: ${getVesselPrompt(vesselInfo)}` : 'Keep the original vessel exactly as-is.'}

━━━ RULE #8 — FOOD COLOR ENHANCEMENT ━━━
Apply ONLY to the food and dish — NOT the background:
- Increase food vibrancy/saturation by 20-30%
- Make reds more vibrant, greens more lush, yellows more golden
- Add subtle specular highlights on food surface
- Slightly increase food contrast to pop against background
- Background color: completely unchanged`
}

// 'vesselId:colorId' 키를 AI 프롬프트 지시어로 변환 (vessel-master.json 단일 소스)
// 구형 전체 문자열 형식도 그대로 통과 (하위 호환)
function getVesselPrompt(vesselKey: string): string {
  if (!vesselKey) return ''
  const [vesselId, colorId] = vesselKey.split(':')
  const vessel = vesselMaster.vessels.find(v => v.id === vesselId)
  if (!vessel) return vesselKey // 구형 형식: 전체 문자열 그대로 사용
  const color = vessel.colors.find(c => c.colorId === colorId)
  return color?.aiPrompt ?? ''
}

async function ensureMinResolution(buffer: Buffer, minWidth = 2048): Promise<Buffer> {
  const meta = await sharp(buffer).metadata()
  const { width = 0 } = meta
  if (width >= minWidth) return buffer
  return sharp(buffer)
    .resize(minWidth, null, { fit: 'inside', kernel: sharp.kernel.lanczos3 })
    .jpeg({ quality: 95 })
    .toBuffer()
}

function getBgPadColor(background: string): { r: number; g: number; b: number } {
  if (background === 'dark' || background === 'black') return { r: 26, g: 26, b: 26 }
  if (background === 'wood') return { r: 120, g: 80, b: 45 }
  return { r: 245, g: 245, b: 245 }
}

// 입력 이미지 전처리: 세로 사진을 3:2 가로 캔버스에 센터 배치
async function preprocessToLandscape(buffer: Buffer, _background: string = 'bright'): Promise<{ buffer: Buffer; wasPortrait: boolean }> {
  const meta = await sharp(buffer).metadata()
  const { width = 0, height = 0 } = meta
  if (width >= height) return { buffer, wasPortrait: false }

  // Portrait: center-crop to 3:2 landscape — no white bars, AI gets a proper landscape reference
  const targetH = Math.round(width / 1.5)
  const processed = await sharp(buffer)
    .extract({ left: 0, top: Math.floor((height - targetH) / 2), width, height: targetH })
    .jpeg({ quality: 92 })
    .toBuffer()
  return { buffer: processed, wasPortrait: false }
}

// 출력 이미지 후처리: AI가 그래도 세로로 생성했을 경우 중앙 크롭으로 3:2 변환
async function forceLandscape(buffer: Buffer): Promise<Buffer> {
  const meta = await sharp(buffer).metadata()
  const { width = 0, height = 0 } = meta
  if (width >= height) return buffer  // 이미 가로

  // 세로 출력: 중앙 크롭으로 3:2 landscape 확보
  const targetW = Math.round(height * 1.5)
  if (targetW <= width) {
    return sharp(buffer)
      .extract({ left: Math.floor((width - targetW) / 2), top: 0, width: targetW, height })
      .toBuffer()
  }
  // 가로가 부족한 경우: 높이 기준으로 2:3 크롭 후 회전 대신 width 기준 크롭
  const targetH = Math.round(width / 1.5)
  return sharp(buffer)
    .extract({ left: 0, top: Math.floor((height - targetH) / 2), width, height: targetH })
    .toBuffer()
}

// Gemini로 생성된 이미지에서 그릇/음식의 수직 위치와 크기 감지
async function detectDishBounds(buffer: Buffer): Promise<{ topPct: number; heightPct: number } | null> {
  try {
    const base64 = buffer.toString('base64')
    const visionModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await visionModel.generateContent([
      { inlineData: { data: base64, mimeType: 'image/jpeg' } },
      'This is a food photo. Find the main dish/bowl/plate containing food. Reply ONLY with a JSON object and nothing else: {"topPct": <top edge of dish as integer 0-100, % of image height>, "heightPct": <dish height as integer 0-100, % of image height>}'
    ])
    const text = result.response.text().trim()
    const match = text.match(/\{[^}]+\}/)
    if (!match) return null
    const parsed = JSON.parse(match[0])
    if (typeof parsed.topPct !== 'number' || typeof parsed.heightPct !== 'number') return null
    if (parsed.heightPct < 5 || parsed.heightPct > 100) return null
    return { topPct: Number(parsed.topPct), heightPct: Number(parsed.heightPct) }
  } catch {
    return null
  }
}

// 음식/그릇 크기 정규화: 감지된 그릇 크기를 이미지 높이의 70%로 자동 보정
// 감지 실패 시 5% 중앙 줌인 폴백
async function normalizeDishSize(buffer: Buffer, background = ''): Promise<Buffer> {
  const meta = await sharp(buffer).metadata()
  const { width = 0, height = 0 } = meta
  if (width <= height) return buffer

  const TARGET_PCT = 0.70
  const TOLERANCE = 0.06 // ±6% 허용

  const detection = await detectDishBounds(buffer)

  if (!detection) {
    // 폴백: 단순 5% 중앙 줌인
    const cropW = Math.round(width * 0.95)
    const cropH = Math.round(height * 0.95)
    return sharp(buffer)
      .extract({ left: Math.floor((width - cropW) / 2), top: Math.floor((height - cropH) / 2), width: cropW, height: cropH })
      .resize(width, height, { fit: 'fill' })
      .jpeg({ quality: 92 })
      .toBuffer()
  }

  const detectedDishH = Math.round(height * detection.heightPct / 100)
  const dishCenterY = Math.round(height * detection.topPct / 100) + detectedDishH / 2
  const targetDishH = Math.round(height * TARGET_PCT)

  if (Math.abs(detectedDishH - targetDishH) / height <= TOLERANCE) return buffer

  const bgColor = getBgPadColor(background)

  if (detectedDishH > targetDishH) {
    // 그릇이 너무 큼 → 패딩 추가 후 축소 (줌아웃 효과)
    const newH = Math.round(detectedDishH / TARGET_PCT)
    const newW = Math.round(newH * 1.5)
    const leftPad = Math.round((newW - width) / 2)
    const topPad = Math.round((newH - height) / 2)
    return sharp(buffer)
      .extend({
        left: leftPad,
        right: Math.max(0, newW - width - leftPad),
        top: topPad,
        bottom: Math.max(0, newH - height - topPad),
        background: bgColor,
      })
      .resize(width, height, { fit: 'fill' })
      .jpeg({ quality: 90 })
      .toBuffer()
  } else {
    // 그릇이 너무 작음 → 그릇 중심으로 크롭 (줌인 효과)
    const neededH = Math.round(detectedDishH / TARGET_PCT)
    const neededW = Math.round(neededH * 1.5)
    if (neededW > width || neededH > height) return buffer

    const cropLeft = Math.max(0, Math.min(Math.round(width / 2 - neededW / 2), width - neededW))
    const cropTop = Math.max(0, Math.min(Math.round(dishCenterY - neededH / 2), height - neededH))
    return sharp(buffer)
      .extract({ left: cropLeft, top: cropTop, width: neededW, height: neededH })
      .resize(width, height, { fit: 'fill' })
      .jpeg({ quality: 90 })
      .toBuffer()
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json()

    if (!orderId) {
      return NextResponse.json({ error: 'orderId가 없어요' }, { status: 400, headers: CORS_HEADERS })
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404, headers: CORS_HEADERS })
    }

    if (!['paid', 'ai_done', 'in_progress'].includes(order.status) && order.order_type !== 'sample') {
      return NextResponse.json({ error: '결제가 확인되지 않은 주문입니다' }, { status: 403, headers: CORS_HEADERS })
    }

    const photoUrls = order.photo_urls || []
    if (photoUrls.length === 0) {
      return NextResponse.json({ error: 'No photos' }, { status: 400, headers: CORS_HEADERS })
    }

    // vessel_info는 JSON 배열 문자열이거나 단순 문자열
    let vesselList: string[] = []
    try {
      const parsed = JSON.parse(order.vessel_info || '[]')
      vesselList = Array.isArray(parsed) ? parsed : [order.vessel_info || '']
    } catch {
      vesselList = order.vessel_info ? [order.vessel_info] : []
    }

    const aiPhotoUrls: string[] = []
    const errors: string[] = []
    const isCollection = order.order_type === 'collection'

    if (isCollection) {
      // 모음컷: 모든 사진을 단일 AI 호출로 처리
      try {
        const imageParts: any[] = []
        let anyPortrait = false
        for (const photoUrl of photoUrls) {
          const imageRes = await fetch(photoUrl)
          if (!imageRes.ok) throw new Error(`사진 다운로드 실패: ${imageRes.status}`)
          const imageBuffer = await imageRes.arrayBuffer()
          const { buffer: processedBuffer, wasPortrait } = await preprocessToLandscape(Buffer.from(imageBuffer), order.background)
          if (wasPortrait) anyPortrait = true
          imageParts.push({ inlineData: { data: processedBuffer.toString('base64'), mimeType: 'image/jpeg' } })
        }

        const collectionPrompt = buildCollectionPrompt(order.background, order.brand_color || '', anyPortrait)
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash-image',
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } as any,
        })

        const result = await model.generateContent([...imageParts, collectionPrompt])
        const parts = result.response.candidates?.[0]?.content?.parts || []
        if (parts.length === 0) throw new Error('AI가 이미지를 반환하지 않았어요')

        for (const part of parts) {
          if ((part as any).inlineData?.mimeType?.startsWith('image/')) {
            const rawBuffer = Buffer.from((part as any).inlineData.data, 'base64')
            const aiBuffer = await ensureMinResolution(await forceLandscape(rawBuffer))
            const aiFilename = `ai_results/${order.id}_collection_${Date.now()}.jpg`
            const { data: aiUpload, error: uploadError } = await supabaseAdmin.storage
              .from('photos')
              .upload(aiFilename, aiBuffer, { contentType: 'image/jpeg' })
            if (uploadError) throw new Error(`이미지 저장 실패: ${uploadError.message}`)
            if (aiUpload) {
              const { data: aiUrlData } = supabaseAdmin.storage.from('photos').getPublicUrl(aiFilename)
              aiPhotoUrls.push(aiUrlData.publicUrl)
            }
          }
        }
      } catch (collectionError) {
        const msg = `모음컷 처리 실패: ${collectionError instanceof Error ? collectionError.message : '알 수 없는 오류'}`
        console.error(msg)
        errors.push(msg)
      }
    } else {
      // 개별 사진 처리 (배달앱용 / 홍보용)
      for (const [index, photoUrl] of photoUrls.entries()) {
        try {
          const imageRes = await fetch(photoUrl)
          if (!imageRes.ok) throw new Error(`사진 다운로드 실패: ${imageRes.status}`)
          const imageBuffer = await imageRes.arrayBuffer()
          const { buffer: processedBuffer, wasPortrait } = await preprocessToLandscape(Buffer.from(imageBuffer), order.background)
          const base64 = processedBuffer.toString('base64')

          const vesselInfo = vesselList[index] ?? vesselList[0] ?? ''
          const isPromo = !order.angle && !order.background
          const prompt = isPromo
            ? buildPromoPrompt(vesselInfo, wasPortrait)
            : buildPrompt(order.angle, order.background, vesselInfo, wasPortrait)

          const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash-image',
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } as any,
          })

          const result = await model.generateContent([
            { inlineData: { data: base64, mimeType: 'image/jpeg' } },
            prompt
          ])

          const parts = result.response.candidates?.[0]?.content?.parts || []
          if (parts.length === 0) throw new Error('AI가 이미지를 반환하지 않았어요')

          for (const part of parts) {
            if ((part as any).inlineData?.mimeType?.startsWith('image/')) {
              const rawBuffer = Buffer.from((part as any).inlineData.data, 'base64')
              const landscapeBuffer = await forceLandscape(rawBuffer)
              const normalizedBuffer = await normalizeDishSize(landscapeBuffer, order.background || '')
              const aiBuffer = await ensureMinResolution(normalizedBuffer)
              const aiFilename = `ai_results/${order.id}_${index}_${Date.now()}.jpg`

              const { data: aiUpload, error: uploadError } = await supabaseAdmin.storage
                .from('photos')
                .upload(aiFilename, aiBuffer, { contentType: 'image/jpeg' })

              if (uploadError) throw new Error(`이미지 저장 실패: ${uploadError.message}`)

              if (aiUpload) {
                const { data: aiUrlData } = supabaseAdmin.storage
                  .from('photos')
                  .getPublicUrl(aiFilename)
                aiPhotoUrls.push(aiUrlData.publicUrl)
              }
            }
          }
        } catch (photoError) {
          const msg = `사진 ${index + 1} 처리 실패: ${photoError instanceof Error ? photoError.message : '알 수 없는 오류'}`
          console.error(msg)
          errors.push(msg)
        }
      }
    }

    if (aiPhotoUrls.length > 0) {
      await supabaseAdmin
        .from('orders')
        .update({ ai_photo_urls: aiPhotoUrls, status: 'ai_done' })
        .eq('id', orderId)

      // 카카오톡 알림 전송
      try {
        const { data: kakaoToken } = await supabaseAdmin
          .from('kakao_tokens')
          .select('access_token')
          .eq('kakao_email', order.customer_email)
          .single()

        if (kakaoToken?.access_token) {
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://menulab.vercel.app'
          const template = {
            object_type: 'feed',
            content: {
              title: '✨ 메뉴랩 AI 처리 완료!',
              description: `${order.cut_count}컷 메뉴사진이 완성됐어요. 지금 바로 확인하세요!`,
              image_url: aiPhotoUrls[0],
              link: {
                web_url: `${siteUrl}/mypage`,
                mobile_web_url: `${siteUrl}/mypage`,
              },
            },
            buttons: [{
              title: '결과물 확인하기',
              link: {
                web_url: `${siteUrl}/mypage`,
                mobile_web_url: `${siteUrl}/mypage`,
              },
            }],
          }

          await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${kakaoToken.access_token}`,
              'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
            },
            body: new URLSearchParams({ template_object: JSON.stringify(template) }),
          })
        }
      } catch (notifyErr) {
        console.error('카카오톡 알림 전송 실패:', notifyErr)
      }

      return NextResponse.json({
        success: true,
        aiPhotoUrls,
        ...(errors.length > 0 && { partialErrors: errors })
      }, { headers: CORS_HEADERS })
    }

    return NextResponse.json({
      error: '모든 사진 처리에 실패했어요',
      details: errors
    }, { status: 500, headers: CORS_HEADERS })

  } catch (error) {
    console.error('AI processing error:', error)
    return NextResponse.json({ error: 'AI processing failed' }, { status: 500, headers: CORS_HEADERS })
  }
}