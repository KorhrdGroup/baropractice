import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// ─── 실습상담신청 접수 ────────────────────────────────────────────────────────
// baropractice 랜딩에서 들어온 신청을 그룹 DB(practice_consultations)에 쌓는다.
// 본사 오피스의 "실습사업부 > 실습상담신청" 화면에서 그대로 조회된다.

export const maxDuration = 30;

/** 거주지 10개 — 화면 선택지와 DB 제약이 동일해야 한다 */
const RESIDENCES = [
  '서울·경기',
  '인천',
  '부산·울산',
  '강원',
  '충청',
  '세종·대전',
  '광주',
  '경상도',
  '전라도',
  '제주도',
] as const;

/** 010-1234-5678 형태로 정규화 (숫자만 남기고 하이픈 삽입) */
function normalizePhone(raw: string): string {
  const d = String(raw ?? '').replace(/[^\d]/g, '');
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return String(raw ?? '').trim();
}

export async function POST(request: NextRequest) {
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        { error: 'Supabase 설정이 없습니다.' },
        { status: 500 },
      );
    }

    const body = await request.json();
    const name = String(body?.name ?? '').trim();
    const phone = normalizePhone(body?.contact ?? body?.phone ?? '');
    const residence = String(body?.residence ?? '').trim();
    const availableNow = body?.available_now === true;
    const hopeYear = body?.hope_year ? Number(body.hope_year) : null;
    const hopeMonth = body?.hope_month ? Number(body.hope_month) : null;
    // [선택] 광고성 정보 수신 동의 — true 일 때만 동의로 남긴다 (업셀링 문자 대상 판단, 2026-11-17)
    const marketingAgreed = body?.marketing_agreed === true;

    if (!name || !phone) {
      return NextResponse.json(
        { error: '이름과 연락처를 입력해주세요.' },
        { status: 400 },
      );
    }
    if (!(RESIDENCES as readonly string[]).includes(residence)) {
      return NextResponse.json(
        { error: '거주지를 선택해주세요.' },
        { status: 400 },
      );
    }
    if (hopeMonth != null && (hopeMonth < 1 || hopeMonth > 12)) {
      return NextResponse.json(
        { error: '희망 월이 올바르지 않습니다.' },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin.from('practice_consultations').insert({
      name,
      phone,
      residence,
      hope_year: Number.isFinite(hopeYear) ? hopeYear : null,
      hope_month: Number.isFinite(hopeMonth) ? hopeMonth : null,
      available_now: availableNow,
      click_source: body?.click_source ?? null,
      marketing_agreed: marketingAgreed,
      marketing_agreed_at: marketingAgreed ? new Date().toISOString() : null,
      memo: body?.memo ? String(body.memo).slice(0, 500) : null,
    });

    if (error) {
      console.error('[practice-consultations] insert error:', error);
      return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (e) {
    console.error('[practice-consultations] unexpected:', e);
    return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 });
  }
}
