import { GoogleGenerativeAI } from '@google/generative-ai'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const prompt = `A warm, bright and cozy Korean or Japanese restaurant interior. NO food, NO people, NO text, NO watermark.
Scene: Elegant dining room with natural warm lighting. Beautiful wooden walls or panels on the sides. Clean white or light-colored dining tables with simple tableware (empty white plates, chopsticks). Large windows letting in soft natural daylight. Tatami-inspired or modern Korean restaurant aesthetic.
Lighting: Bright, natural, warm (5500K). Soft and inviting. No harsh shadows. The overall scene feels airy, premium, and welcoming.
Mood: Upscale casual dining, bright and clean. Similar to a high-end Korean or Japanese restaurant during daytime service. Think warm wood tones, clean whites, natural light.
Color palette: Warm beige, natural wood browns, soft whites, hints of warm gold.
No food on tables. No people. No text. No watermark. No borders.
Output: 16:9 landscape ratio. Wide shot showing the full dining room ambiance.`

async function generate() {
  console.log('Gemini로 배경 이미지 생성 중...')
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-image',
    generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
  })

  const result = await model.generateContent(prompt)
  const parts = result.response.candidates?.[0]?.content?.parts || []

  for (const part of parts) {
    if (part.inlineData?.mimeType?.startsWith('image/')) {
      const buffer = Buffer.from(part.inlineData.data, 'base64')
      const outPath = join(__dirname, '..', 'public', 'hero-bg.jpg')
      mkdirSync(join(__dirname, '..', 'public'), { recursive: true })
      writeFileSync(outPath, buffer)
      console.log(`저장 완료: public/hero-bg.jpg (${(buffer.length / 1024).toFixed(0)}KB)`)
      return
    }
  }
  console.error('이미지를 받지 못했어요')
}

generate().catch(console.error)
