import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import JSZip from 'jszip'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST /api/mypage/download-image
// body: { urls: string[], type: 'delivery' | 'naver', prefix?: string }
// returns: ZIP file
export async function POST(req: NextRequest) {
  const { urls, type, prefix = 'menulab' } = await req.json()

  if (!urls?.length) return NextResponse.json({ error: 'urls required' }, { status: 400 })

  const zip = new JSZip()

  await Promise.all(
    urls.map(async (url: string, i: number) => {
      const res = await fetch(url)
      if (!res.ok) return
      const buffer = Buffer.from(await res.arrayBuffer())

      let finalBuffer = buffer

      if (type === 'naver') {
        const meta = await sharp(buffer).metadata()
        const { width = 0, height = 0 } = meta
        const cropSize = Math.min(width, height)
        const left = Math.floor((width - cropSize) / 2)
        const top  = Math.floor((height - cropSize) / 2)
        const outSize = Math.min(cropSize, 2000)

        finalBuffer = await sharp(buffer)
          .extract({ left, top, width: cropSize, height: cropSize })
          .resize(outSize, outSize, { kernel: sharp.kernel.lanczos3 })
          .jpeg({ quality: 92 })
          .toBuffer()
      }

      const filename = `${prefix}_${type === 'naver' ? 'place' : 'delivery'}_${i + 1}.jpg`
      zip.file(filename, finalBuffer)
    })
  )

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  const zipName = `${prefix}_${type === 'naver' ? 'place' : 'delivery'}.zip`

  return new NextResponse(zipBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipName}"`,
      'Cache-Control': 'no-store',
    },
  })
}
