export const maxDuration = 60
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import { notifyOrderCreated } from '../../../../lib/solapi'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const withTimeout = <T>(promise: PromiseLike<T>, ms: number): Promise<T> =>
  Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ])

function calcAmount(planType: string, photoCount: number): number {
  if (planType === 'trial') return 5000
  if (planType === 'premium') return photoCount * 14900
  return photoCount * 7900 // basic
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const planType   = formData.get('planType')   as string // trial | basic | premium
    const mood       = formData.get('mood')        as string // black | white
    const angle      = formData.get('angle')       as string // aerial | side
    const vesselChoice    = formData.get('vesselChoice')    as string // original | recommended
    const vesselId        = formData.get('vesselId')        as string // e.g. plate:white
    const vesselLabel     = formData.get('vesselLabel')     as string
    const vibesRaw        = formData.get('vibes')           as string // JSON array
    const vesselPref      = formData.get('vesselPref')      as string // recommend | reference
    const freeRequest     = formData.get('freeRequest')     as string
    const customerName    = formData.get('customerName')    as string
    const customerPhone   = formData.get('customerPhone')   as string
    const customerEmail   = formData.get('customerEmail')   as string
    const preUploadedRaw  = formData.get('preUploadedUrls') as string | null
    const refUploadedRaw  = formData.get('referenceUrls')   as string | null
    const photos          = formData.getAll('photos')       as File[]

    // 사진 URL 확보
    let photoUrls: string[]
    if (preUploadedRaw) {
      try { photoUrls = JSON.parse(preUploadedRaw).filter(Boolean) } catch { photoUrls = [] }
    } else {
      photoUrls = (await Promise.all(
        photos.map(async (photo) => {
          const filename = `orders/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`
          const bytes    = await photo.arrayBuffer()
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

    // 체험 1회 제한 서버 검증
    if (planType === 'trial' && customerEmail) {
      const email = customerEmail.toLowerCase().trim()
      const query = supabaseAdmin
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('order_type', 'sample')
      const trialCheck = await (email.startsWith('kakao:')
        ? withTimeout(query.eq('customer_email', email), 8000)
        : withTimeout(query.ilike('customer_email', email), 8000)) as any
      if ((trialCheck?.count ?? 0) > 0) {
        return NextResponse.json(
          { error: '이미 체험을 사용하셨어요. 기본 또는 프리미엄 주문을 이용해주세요.' },
          { status: 400 }
        )
      }
    }

    // 체험은 첫 번째 사진 1장만 사용
    const finalPhotoUrls = planType === 'trial' ? photoUrls.slice(0, 1) : photoUrls
    const cutCount       = finalPhotoUrls.length
    const amount         = calcAmount(planType, cutCount)

    // 레퍼런스 이미지 URL (프리미엄)
    let referencePhotoUrls: string[] = []
    if (refUploadedRaw) {
      try { referencePhotoUrls = JSON.parse(refUploadedRaw).filter(Boolean) } catch {}
    }

    // v2_meta 구성
    let vibes: string[] = []
    try { vibes = JSON.parse(vibesRaw || '[]') } catch {}

    const v2Meta: Record<string, unknown> = {
      plan_type: planType,
      mood,
      amount,
      kakao_channel_sent: false,
    }
    if (planType === 'trial' || planType === 'basic') {
      v2Meta.vessel_choice           = vesselChoice
      v2Meta.recommended_vessel_id   = vesselId   || null
      v2Meta.recommended_vessel_label = vesselLabel || null
    }
    if (planType === 'premium') {
      v2Meta.briefing = {
        vibes,
        vessel_pref:          vesselPref,
        reference_photo_urls: referencePhotoUrls,
        free_request:         freeRequest || '',
      }
    }

    // Supabase DB 저장
    const insertResult = await withTimeout(
      supabaseAdmin
        .from('orders')
        .insert({
          order_type:      planType === 'trial' ? 'sample' : 'full',
          cut_count:       String(cutCount),
          menu_names:      `v2-${planType}`,
          angle:           angle || '',
          background:      mood,
          vessel_info:     vesselChoice === 'recommended' ? vesselId : '',
          customer_name:   customerName,
          customer_phone:  customerPhone,
          customer_email:  customerEmail,
          notes:           planType === 'premium' ? (freeRequest || '') : '',
          photo_urls:      finalPhotoUrls,
          status:          'pending_payment',
          v2_meta:         v2Meta,
        })
        .select()
        .single(),
      10000
    ) as any
    const { data: order, error: orderError } = insertResult
    if (orderError) {
      console.error('Supabase insert error:', orderError)
      return NextResponse.json({ error: `DB 오류: ${orderError.message}` }, { status: 500 })
    }

    // 알림톡 + 이메일 (백그라운드)
    const planLabel = planType === 'trial' ? '체험 1장 (5,000원)'
      : planType === 'premium' ? `프리미엄 ${cutCount}장 (${amount.toLocaleString()}원)`
      : `기본 ${cutCount}장 (${amount.toLocaleString()}원)`

    if (customerPhone) {
      await notifyOrderCreated({
        phone:        customerPhone,
        orderId:      order.id,
        customerName: customerName || '',
        planLabel,
        amount,
      }).catch(e => console.error('alimtalk error:', e))
    }

    if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
      })
      transporter.sendMail({
        from: process.env.GMAIL_USER,
        to:   process.env.GMAIL_USER,
        subject: `[메뉴랩 v2] 새 주문 — ${customerName} / ${planLabel}`,
        html: `
          <h2>새 v2 주문이 접수됐어요!</h2>
          <p><b>이름:</b> ${customerName}</p>
          <p><b>연락처:</b> ${customerPhone || '-'}</p>
          <p><b>이메일:</b> ${customerEmail || '-'}</p>
          <p><b>플랜:</b> ${planLabel}</p>
          <p><b>구도:</b> ${angle === 'aerial' ? '항공뷰' : angle === 'side' ? '측면뷰' : '-'}</p>
          <p><b>분위기:</b> ${mood === 'black' ? '어두운 (Black)' : '밝은 (White)'}</p>
          <p><b>사진 수:</b> ${finalPhotoUrls.length}장</p>
          <p><b>입금 금액:</b> ${amount.toLocaleString()}원</p>
          ${planType === 'premium' ? `<p><b>원하는 느낌:</b> ${vibes.join(', ')}</p>` : ''}
          ${planType === 'premium' && freeRequest ? `<p><b>자유 요청:</b> ${freeRequest}</p>` : ''}
          <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/v2/admin">👉 v2 어드민에서 확인하기</a></p>
        `,
      }).catch(console.error)
    }

    // 솔라피 알림톡 — 주문 완료 (백그라운드)
    if (customerPhone) {
      notifyOrderCreated({
        phone:     customerPhone,
        orderId:   order.id,
        planLabel,
        amount,
      }).catch(e => console.error('solapi order notify error:', e))
    }

    return NextResponse.json({ success: true, orderId: order.id, amount })
  } catch (error) {
    console.error('v2 order error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
