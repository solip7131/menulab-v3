import sharp from 'sharp'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const PORTRAIT_NOTE = `⚠️ INPUT IS A PORTRAIT PHOTO: The reference image is taller than it is wide. Use it as a food reference only — completely ignore its dimensions and aspect ratio. Your OUTPUT must be a 3:2 horizontal landscape (width > height). Do NOT reproduce the portrait format in your output. Do NOT add white borders, frames, letterboxing, or padding of any kind.\n\n`

export const DRAMATIC_LIGHTING = `UNIFIED SCENE LIGHTING — PROFESSIONAL STUDIO STYLE. One key light illuminates the entire scene (food + dish + surface + background) as a single physical environment.
• KEY LIGHT: Large softbox from upper-left at 45°, 6500K daylight — clean, neutral, and directional, clearly dominant but not harsh
• Light-to-shadow ratio: 3:1 — shadows define shape and depth without being overly dark
• Shadow edges: soft and gradual — smoothly transitioning, never hard-edged
• FILL: Gentle reflector from right (ratio 1:3 to key) — lifts shadow areas to retain food detail and texture
• RIM LIGHT: Very subtle separation from behind — barely noticeable, just enough to distinguish dish edge from background
• BACKGROUND: Clean and simple — no strong vignette, no spotlight effect. Evenly lit with only the faintest natural falloff toward edges
• SPECULAR: Soft, natural catchlights on glossy surfaces — present but not blown-out
• Target look: clean daylight-balanced professional food photography — the dish sits solidly on a real surface
• Food and background share identical light direction and color temperature — fully integrated scene, not composited.`

export const AERIAL_LIGHTING = `FLAT-LAY AERIAL STUDIO LIGHTING — PROFESSIONAL TOP-DOWN FOOD PHOTOGRAPHY.
• PRIMARY LIGHT: Large softbox from upper-left side — 6500K daylight, directional but soft. This light casts natural shadows on the background surface around and beneath the dish, which are clearly visible from the overhead camera. This is correct and expected in aerial food photography.
• Light-to-shadow ratio: 2:1 to 3:1 — gentle shadows, soft enough to remain non-harsh, defined enough to give depth
• Shadow edges: soft and gradual — never hard-edged
• FILL: Gentle reflector from right — lifts shadow areas so they are not too dark, ratio 1:2 to key
• BACKGROUND: Uniformly lit, perfectly even — absolutely NO vignette, NO gradient, NO falloff. Background color is consistent from center to edges.
• SPECULAR: Soft natural catchlights on the TOP surface of glossy sauces, broths, and oily food surfaces
• Color temperature: 6500K daylight — clean, neutral, and true-to-color
• Target look: professional Korean food delivery flat-lay — clean, well-lit, appetizing. NOT dramatic or moody. The camera is at 90° overhead; the directional shadow cast on the surface is natural and adds depth.`

export function getBgPadColor(background: string): { r: number; g: number; b: number } {
  if (background === 'dark' || background === 'black') return { r: 26, g: 26, b: 26 }
  if (background === 'wood') return { r: 120, g: 80, b: 45 }
  return { r: 245, g: 245, b: 245 }
}

export async function preprocessToLandscape(
  buffer: Buffer,
  _background = 'bright'
): Promise<{ buffer: Buffer; wasPortrait: boolean }> {
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

export async function forceLandscape(buffer: Buffer): Promise<Buffer> {
  const meta = await sharp(buffer).metadata()
  const { width = 0, height = 0 } = meta
  if (width >= height) return buffer

  const targetW = Math.round(height * 1.5)
  if (targetW <= width) {
    return sharp(buffer)
      .extract({ left: Math.floor((width - targetW) / 2), top: 0, width: targetW, height })
      .toBuffer()
  }
  const targetH = Math.round(width / 1.5)
  return sharp(buffer)
    .extract({ left: 0, top: Math.floor((height - targetH) / 2), width, height: targetH })
    .toBuffer()
}

export async function ensureMinResolution(buffer: Buffer, minWidth = 2048): Promise<Buffer> {
  const meta = await sharp(buffer).metadata()
  const { width = 0 } = meta
  if (width >= minWidth) return buffer
  return sharp(buffer)
    .resize(minWidth, null, { fit: 'inside', kernel: sharp.kernel.lanczos3 })
    .jpeg({ quality: 95 })
    .toBuffer()
}

// 출력 이미지를 정확히 3:2로 크롭 (AI가 다른 비율로 생성했을 때 보정)
export async function ensureThreeByTwo(buffer: Buffer): Promise<Buffer> {
  const meta = await sharp(buffer).metadata()
  const { width = 0, height = 0 } = meta
  const currentRatio = width / height
  const targetRatio = 3 / 2

  if (Math.abs(currentRatio - targetRatio) < 0.01) return buffer

  if (currentRatio > targetRatio) {
    // 너무 넓음 → 좌우 크롭
    const newW = Math.round(height * targetRatio)
    return sharp(buffer)
      .extract({ left: Math.floor((width - newW) / 2), top: 0, width: newW, height })
      .jpeg({ quality: 92 })
      .toBuffer()
  } else {
    // 너무 높음 → 상하 크롭
    const newH = Math.round(width / targetRatio)
    return sharp(buffer)
      .extract({ left: 0, top: Math.floor((height - newH) / 2), width, height: newH })
      .jpeg({ quality: 92 })
      .toBuffer()
  }
}

export async function detectDishBounds(
  buffer: Buffer,
  geminiApiKey: string
): Promise<{ topPct: number; heightPct: number } | null> {
  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey)
    const base64 = buffer.toString('base64')
    const visionModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await visionModel.generateContent([
      { inlineData: { data: base64, mimeType: 'image/jpeg' } },
      'This is a food photo. Find the main dish/bowl/plate containing food. Reply ONLY with a JSON object and nothing else: {"topPct": <top edge of dish as integer 0-100, % of image height>, "heightPct": <dish height as integer 0-100, % of image height>}',
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

export async function normalizeDishSize(
  buffer: Buffer,
  background = '',
  geminiApiKey = ''
): Promise<Buffer> {
  const meta = await sharp(buffer).metadata()
  const { width = 0, height = 0 } = meta
  if (width <= height) return buffer

  const TARGET_PCT = 0.70
  const TOLERANCE = 0.03

  const detection = geminiApiKey ? await detectDishBounds(buffer, geminiApiKey) : null

  if (!detection) {
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

export function buildPrompt(
  angle: string,
  background: string,
  vesselInfo: string,
  wasPortrait = false,
  extraInstructions = '',
  preserveAngle = false
): string {
  const bg = background === 'white' ? 'bright' : background === 'black' ? 'dark' : background

  const anglePrompt = preserveAngle
    ? `━━━ RULE #1 — CAMERA ANGLE: PRESERVE ORIGINAL COMPOSITION ━━━
Maintain the EXACT same camera angle, framing, and composition as the input photo.
• Do NOT change the viewpoint, tilt, or zoom level
• If the original is aerial (top-down), keep it aerial
• If the original is angled (hero shot), keep the same angle
• The dish position, size within the frame, and perspective must match the original`
    : angle === 'aerial'
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

  const bgPrompt = bg === 'bright'
    ? 'The background MUST be exactly #f5f5f5 pure flat matte white. No shadows on background, no gradients, no texture.'
    : bg === 'dark'
    ? 'The background MUST be uniformly dark charcoal gray #2a2a2a — perfectly even, no gradient, no vignette, no lighter areas. Smooth seamless backdrop, no texture.'
    : 'Background: clean neutral background.'

  const taskDesc = preserveAngle
    ? `You are a professional Korean food photography retoucher. Your task is BACKGROUND REPLACEMENT only — keep the food, dish, lighting direction, and composition IDENTICAL to the original. Only change the background surface.`
    : `You are a professional Korean food delivery app photographer. This is a complete RESHOOTING task — not a filter, not an enhancement. Ignore the original photo's angle, zoom, lighting, and composition entirely. Rebuild the shot from scratch using ONLY the food and dish as reference.`

  return `${wasPortrait ? PORTRAIT_NOTE : ''}${taskDesc}

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
${vesselInfo ? `VESSEL CHANGE: ${vesselInfo}. Study the original vessel's shape carefully (flat plate / deep bowl / wide noodle bowl / etc.) and apply ONLY the specified color and material change. The new vessel must have the IDENTICAL shape, depth, and proportions as the original. Only color and material change — shape never changes.` : 'Keep the original vessel exactly as-is.'}

━━━ RULE #8 — FOOD COLOR ENHANCEMENT ━━━
Apply ONLY to the food and dish — NOT the background:
- Increase food vibrancy/saturation by 20-30%
- Make reds more vibrant, greens more lush, yellows more golden
- Add subtle specular highlights on food surface
- Slightly increase food contrast to pop against background
- Background color: completely unchanged${extraInstructions ? `\n\n━━━ ADDITIONAL INSTRUCTIONS ━━━\n${extraInstructions}` : ''}`
}

export function buildStage2Prompt(
  vesselInfo: string,
  wasPortrait = false,
  extraInstructions = ''
): string {
  return `${wasPortrait ? PORTRAIT_NOTE : ''}This is an already-processed professional food photography image. Your ONLY task is to change the vessel/tableware.

VESSEL CHANGE (MANDATORY): ${vesselInfo}
- Study the original vessel's exact shape (flat plate / deep bowl / noodle bowl / etc.)
- Apply ONLY the specified material/color to the vessel — shape, depth, and proportions must be IDENTICAL
- The food inside stays EXACTLY as-is — no changes to food content, arrangement, or quality
- Background, lighting, camera angle, and composition stay EXACTLY as-is
- No other part of the image changes

━━━ OUTPUT FORMAT ━━━
Final image MUST be 3:2 horizontal landscape ratio (width > height).
Maintain the same composition, framing, and field-of-view as the input.${extraInstructions ? `\n\n━━━ ADDITIONAL INSTRUCTIONS ━━━\n${extraInstructions}` : ''}`
}
