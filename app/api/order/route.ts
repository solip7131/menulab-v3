export const maxDuration = 60
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import { notifyOrderCreated } from '../../../lib/solapi'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms))
  ])


export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const orderType = formData.get('orderType') as string
    const cutCount = formData.get('cutCount') as string
    const menuNames = formData.get('menuNames') as string
    const angle = formData.get('angle') as string
    const background = formData.get('background') as string
    const brandColor = formData.get('brandColor') as string
    const vesselInfo = formData.get('vesselInfo') as string
    const customerName = formData.get('customerName') as string
    const customerPhone = formData.get('customerPhone') as string
    const customerEmail = formData.get('customerEmail') as string
    const notes = formData.get('notes') as string
    const photos = formData.getAll('photos') as File[]
    const preUploadedRaw = formData.get('preUploadedUrls') as string | null

    // 1. 사진 URL 확보 — 미리 업로드된 URL이 있으면 재업로드 생략
    let photoUrls: string[]
    if (preUploadedRaw) {
      try {
        photoUrls = JSON.parse(preUploadedRaw).filter(Boolean)
      } catch {
        photoUrls = []
      }
    } else {
      photoUrls = (await Promise.all(
        photos.map(async (photo) => {
          const filename = `orders/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`
          const bytes = await photo.arrayBuffer()
          const { data, error } = await withTimeout(
            supabaseAdmin.storage.from('photos').upload(filename, Buffer.from(bytes), { contentType: 'image/jpeg' }),
            15000
          )
          if (error || !data) return null
          const { data: urlData } = supabaseAdmin.storage.from('photos').getPublicUrl(filename)
          return urlData.publicUrl
        })
      )).filter(Boolean) as string[]
    }

    // 2. 무료체험 1회 제한 서버 검증
    if (orderType === 'sample' && customerEmail) {
      const { count } = await withTimeout(
        supabaseAdmin
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .ilike('customer_email', customerEmail.toLowerCase().trim())
          .eq('order_type', 'sample'),
        8000
      )
      if ((count ?? 0) > 0) {
        return NextResponse.json({ error: '이미 무료체험을 사용하셨어요. 본 주문으로 진행해주세요.' }, { status: 400 })
      }
    }

    // 3. Supabase DB에 주문 저장
    const { data: order, error: orderError } = await withTimeout(
      supabaseAdmin
        .from('orders')
        .insert({
          order_type: orderType,
          cut_count: cutCount,
          menu_names: menuNames,
          angle,
          background,
          brand_color: brandColor,
          vessel_info: vesselInfo,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          notes,
          photo_urls: photoUrls,
          status: 'pending'
        })
        .select()
        .single(),
      10000
    )

    if (orderError) throw orderError

    // 3. 이메일 알림 (응답 블로킹 없이 백그라운드 전송)
    if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
      })

      transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: process.env.GMAIL_USER,
        subject: `[메뉴랩] 새 주문 - ${customerName} / ${orderType === 'sample' ? '샘플 체험' : `${cutCount}컷`}`,
        html: `
          <h2>새 주문이 접수됐어요!</h2>
          <p><b>이름:</b> ${customerName}</p>
          <p><b>연락처:</b> ${customerPhone}</p>
          <p><b>주문:</b> ${orderType === 'sample' ? '첫주문 체험 (1컷)' : `본 주문 ${cutCount}컷`}</p>
          <p><b>메뉴:</b> ${menuNames}</p>
          <p><b>구도:</b> ${angle === 'aerial' ? '항공뷰' : '측면뷰'}</p>
          <p><b>배경:</b> ${background}</p>
          <p><b>사진 수:</b> ${photoUrls.length}장</p>
          <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin">👉 대시보드에서 확인하기</a></p>
        `
      }).catch(console.error)
    }

    // 솔라피 알림톡 — 주문 완료 (백그라운드)
    if (customerPhone) {
      const planLabel = orderType === 'sample'
        ? '체험 1장 (5,000원)'
        : `기본 ${cutCount}컷`
      const amount = orderType === 'sample' ? 5000 : parseInt(cutCount) * 7900
      notifyOrderCreated({
        phone: customerPhone,
        orderId: order.id,
        planLabel,
        amount,
      }).catch(e => console.error('solapi order notify error:', e))
    }

    return NextResponse.json({ success: true, orderId: order.id })
  } catch (error) {
    console.error('Order error:', error)
    return NextResponse.json({ error: 'Failed to process order' }, { status: 500 })
  }
}
