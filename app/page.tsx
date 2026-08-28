"use client";

import { Suspense, useMemo, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import styles from "./stepflow.module.css";

// ─── 실습상담신청 랜딩 (barosocial 과 동일한 디자인 시스템) ──────────────────
// 이름 · 연락처 · 거주지(10개 중 택1) · 실습 희망 시기(연/월 + 바로 가능)
// 제출하면 /api/consultations 를 통해 그룹 DB(practice_consultations)에 쌓인다.

const RESIDENCES = [
  "서울·경기",
  "인천",
  "부산·울산",
  "강원",
  "충청",
  "세종·대전",
  "광주",
  "경상도",
  "전라도",
  "제주도",
] as const;

/** utm_source → 유입 채널명 (그룹 DB 채널 표기와 맞춘다) */
const UTM_CHANNEL: Record<string, string> = {
  daangn: "당근",
  karrot: "당근",
  facebook: "인스타·페이스북",
  instagram: "인스타·페이스북",
  meta: "인스타·페이스북",
  kakao: "카카오",
  naver: "네이버",
  google: "구글",
  tiktok: "틱톡",
  mamcafe: "맘카페",
  youtube: "유튜브",
};

function PracticeForm() {
  const searchParams = useSearchParams();

  const clickSource = useMemo(() => {
    const src = (searchParams.get("utm_source") ?? "").toLowerCase();
    const channel = UTM_CHANNEL[src] ?? (src || "직접유입");
    const material =
      searchParams.get("utm_campaign") ?? searchParams.get("blog_id");
    return material ? `${channel}_${material}` : channel;
  }, [searchParams]);

  const [step, setStep] = useState(2); // 2 = 입력, 3 = 완료
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [residence, setResidence] = useState("");
  const [availableNow, setAvailableNow] = useState(false);
  const [hopeYear, setHopeYear] = useState("");
  const [hopeMonth, setHopeMonth] = useState("");
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 올해부터 3년치 — 실습은 보통 1년 안에 시작한다
  const thisYear = new Date().getFullYear();
  const years = [thisYear, thisYear + 1, thisYear + 2];

  const phoneValid = contact.replace(/[^\d]/g, "").length >= 10;

  /** 숫자만 남기고 010-1234-5678 형태로 하이픈을 넣는다 (최대 11자리) */
  const formatPhone = (raw: string): string => {
    const d = raw.replace(/[^\d]/g, "").slice(0, 11);
    if (d.length < 4) return d;
    if (d.length < 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
    if (d.length < 11)
      return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  };
  const canSubmit =
    name.trim().length > 0 &&
    phoneValid &&
    residence.length > 0 &&
    privacyAgreed;

  const handleSubmit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          contact,
          residence,
          available_now: availableNow,
          hope_year: hopeYear || null,
          hope_month: hopeMonth || null,
          click_source: clickSource,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "저장에 실패했습니다.");
      }
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="한평생그룹"
            style={{ height: "auto", width: "148px" }}
          />
        </div>
      </header>

      <AnimatePresence mode="wait">
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`${styles.stepWrapper} ${styles.formBody}`}
          >
            <h1 className={styles.title}>
              실습 상담을 위해{"\n"}간단한 정보를 남겨주세요.
            </h1>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>
                이름
                <span style={{ color: "#f04452", marginLeft: 4 }}>*</span>
              </label>
              <input
                className={styles.inputField}
                value={name}
                placeholder="홍길동"
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>
                연락처
                <span style={{ color: "#f04452", marginLeft: 4 }}>*</span>
              </label>
              <input
                className={styles.inputField}
                value={contact}
                inputMode="numeric"
                placeholder="010-1234-1234"
                maxLength={13}
                onChange={(e) => setContact(formatPhone(e.target.value))}
              />
              {contact.length > 0 && !phoneValid && (
                <p className={styles.errorMessage}>
                  연락처를 정확히 입력해주세요.
                </p>
              )}
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>
                거주지
                <span style={{ color: "#f04452", marginLeft: 4 }}>*</span>
              </label>
              <div className={styles.reasonCheckGroup}>
                {RESIDENCES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`${styles.reasonCheckItem} ${
                      residence === r ? styles.reasonCheckItemSelected : ""
                    }`}
                    onClick={() => setResidence(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>
                실습 희망 시기
                <span style={{ color: "#f04452", marginLeft: 4 }}>*</span>
                <span
                  className={styles.privacyRequired}
                  style={{ marginLeft: 6 }}
                >
                  (연도·월 또는 바로 가능 중 택 1)
                </span>
              </label>
              <div style={{ display: "flex", gap: 8, width: "100%" }}>
                <div className={styles.selectBox} style={{ flex: 1 }}>
                  <select
                    className={styles.selectBoxSelect}
                    style={{ color: hopeYear ? "#1d1d1d" : "#919191" }}
                    value={hopeYear}
                    onChange={(e) => setHopeYear(e.target.value)}
                  >
                    <option value="">연도 선택</option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}년
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.selectBox} style={{ flex: 1 }}>
                  <select
                    className={styles.selectBoxSelect}
                    style={{ color: hopeMonth ? "#1d1d1d" : "#919191" }}
                    value={hopeMonth}
                    onChange={(e) => setHopeMonth(e.target.value)}
                  >
                    <option value="">월 선택</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {m}월
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 바로 가능 — 아래에 체크 표시로 */}
              <div className={styles.privacyRow} style={{ marginTop: 8 }}>
                <div className={styles.privacyText}>
                  <span
                    className={styles.privacyAgree}
                    style={{ fontSize: 16 }}
                  >
                    바로 가능
                  </span>
                  <span style={{ color: "#f04452" }}>*</span>
                </div>
                <button
                  type="button"
                  aria-label="바로 가능"
                  className={`${styles.quickConsultCheck} ${
                    availableNow ? styles.quickConsultCheckOn : ""
                  }`}
                  onClick={() => setAvailableNow((v) => !v)}
                >
                  {availableNow && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 13l4 4L19 7"
                        stroke="#fff"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className={styles.privacyRow}>
              <div className={styles.privacyText}>
                <button
                  type="button"
                  className={styles.privacyLink}
                  onClick={() => setShowPrivacyModal(true)}
                >
                  개인정보 수집·이용 동의
                </button>
                <span className={styles.privacyRequired}>(필수)</span>
              </div>
              <button
                type="button"
                aria-label="개인정보 동의"
                className={`${styles.quickConsultCheck} ${
                  privacyAgreed ? styles.quickConsultCheckOn : ""
                }`}
                onClick={() => setPrivacyAgreed((v) => !v)}
              >
                {privacyAgreed && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="#fff"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </div>

            {error && <p className={styles.errorMessage}>{error}</p>}

            <button
              type="button"
              className={styles.bottomButton}
              disabled={!canSubmit || loading}
              onClick={() => void handleSubmit()}
            >
              {loading ? "접수 중…" : "상담 신청하기"}
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={styles.stepWrapper}
            style={{ textAlign: "center", justifyContent: "center" }}
          >
            <Image
              src="/complete-check.png"
              alt="Done"
              width={300}
              height={300}
              priority
              style={{ margin: "0 auto 24px" }}
            />
            <h1 className={styles.title}>
              신청이 완료되었습니다.{"\n"}곧 연락드리겠습니다.
            </h1>
          </motion.div>
        )}
      </AnimatePresence>

      {showPrivacyModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowPrivacyModal(false)}
        >
          <div
            className={styles.modalPrivacy}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalPrivacyHeader}>
              <h3 className={styles.modalPrivacyTitle}>개인정보처리방침</h3>
              <button
                type="button"
                className={styles.modalCloseButton}
                onClick={() => setShowPrivacyModal(false)}
                aria-label="닫기"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <div className={styles.modalPrivacyContent}>
              <div className={styles.modalPrivacyScroll}>
                <p className={styles.modalPrivacyItem}>
                  <strong>1. 개인정보 수집 및 이용 목적</strong>
                  <br />
                  실습 상담 진행, 문의사항 응대
                  <br />
                  개인정보는 상담 서비스 제공을 위한 목적으로만 수집 및
                  이용되며, 동의 없이 제3자에게 제공되지 않습니다
                </p>
                <p className={styles.modalPrivacyItem}>
                  <strong>2. 수집 및 이용하는 개인정보 항목</strong>
                  <br />
                  필수 - 이름, 연락처(휴대전화번호), 거주지
                  <br />
                  선택 - 실습 희망 시기
                </p>
                <p className={styles.modalPrivacyItem}>
                  <strong>3. 보유 및 이용 기간</strong>
                  <br />
                  법령이 정하는 경우를 제외하고는 수집일로부터 1년 또는 동의
                  철회 시까지 보유 및 이용합니다.
                </p>
                <p className={styles.modalPrivacyItem}>
                  <strong>4. 동의 거부 권리</strong>
                  <br />
                  신청자는 동의를 거부할 권리가 있습니다. 단, 동의를 거부하는
                  경우 상담 서비스 이용이 제한됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PracticeForm />
    </Suspense>
  );
}
