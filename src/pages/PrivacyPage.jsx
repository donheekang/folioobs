import React from "react";
import { useTheme } from "../hooks/useTheme";
import { useLocale } from "../hooks/useLocale";
import { ArrowLeft, Shield } from "lucide-react";

// ──────────────────────────────────────────
// 한국어 개인정보처리방침
// ──────────────────────────────────────────
const PRIVACY_KO = {
  title: "개인정보처리방침",
  effectiveDate: "시행일: 2026년 3월 7일",
  sections: [
    {
      heading: "1. 개인정보의 처리 목적",
      body: `주식회사 플러스랩코리아(이하 "회사")는 FolioObs 서비스(이하 "서비스")와 관련하여 다음의 목적을 위해 개인정보를 처리합니다. 처리하는 개인정보는 다음 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.

• 회원 가입 및 관리: 회원제 서비스 이용에 따른 본인 확인, 개인 식별, 부정 이용 방지
• 서비스 제공: SEC 13F 공시 기반 포트폴리오 분석 서비스 제공, 워치리스트·알림 등 맞춤 기능 제공`,
    },
    {
      heading: "2. 처리하는 개인정보 항목 및 보유기간",
      body: `회사는 다음과 같은 개인정보를 수집·처리합니다.

• 필수 항목: 이메일 주소
• 자동 수집 항목: 접속 로그, 쿠키, IP 주소, 브라우저 유형
• 보유기간: 회원 탈퇴 시까지 (탈퇴 후 지체 없이 파기). 다만, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.`,
    },
    {
      heading: "3. 개인정보의 제3자 제공",
      body: `회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다.

• 이용자가 사전에 동의한 경우
• 법령의 규정에 의하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우`,
    },
    {
      heading: "4. 개인정보의 처리 위탁",
      body: `회사는 서비스 운영을 위해 다음과 같이 개인정보 처리를 위탁하고 있습니다.

• Supabase Inc.: 데이터베이스 호스팅 및 인증 서비스
• Vercel Inc.: 웹 호스팅 서비스

위탁계약 시 개인정보보호 관련 법규 준수, 개인정보 비밀유지, 제3자 제공 금지, 사고 시 손해배상 책임 등을 명확히 규정하고 있습니다.`,
    },
    {
      heading: "5. 정보주체의 권리·의무 및 행사 방법",
      body: `이용자는 개인정보 주체로서 다음과 같은 권리를 행사할 수 있습니다.

• 개인정보 열람 요구
• 오류 등이 있을 경우 정정 요구
• 삭제 요구
• 처리정지 요구

위 권리 행사는 support@pluslabkorea.com으로 이메일을 통해 하실 수 있으며, 회사는 이에 대해 지체 없이 조치하겠습니다.`,
    },
    {
      heading: "6. 개인정보의 파기 절차 및 방법",
      body: `회사는 개인정보 보유기간의 경과, 처리 목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.

• 전자적 파일 형태: 복구 및 재생이 불가능한 방법으로 영구 삭제
• 그 외 기록물: 파쇄 또는 소각`,
    },
    {
      heading: "7. 쿠키의 사용",
      body: `서비스는 이용자의 언어 설정, 테마 설정 등 사용자 환경 설정을 위해 쿠키(Cookie) 및 로컬 스토리지(Local Storage)를 사용합니다. 이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 일부 서비스 이용에 제한이 있을 수 있습니다.`,
    },
    {
      heading: "8. 개인정보 보호책임자",
      body: `회사는 이용자의 개인정보를 보호하고 개인정보와 관련한 불만을 처리하기 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.

• 개인정보 보호책임자: 강돈희 (대표이사)
• 이메일: support@pluslabkorea.com
• 회사명: 주식회사 플러스랩코리아
• 사업자등록번호: 143-87-03402`,
    },
    {
      heading: "9. 개인정보 처리방침의 변경",
      body: `이 개인정보 처리방침은 2026년 3월 7일부터 적용됩니다. 변경 사항이 있을 경우 서비스 내 공지사항을 통하여 고지할 것입니다.`,
    },
  ],
};

// ──────────────────────────────────────────
// English Privacy Policy
// ──────────────────────────────────────────
const PRIVACY_EN = {
  title: "Privacy Policy",
  effectiveDate: "Effective Date: March 7, 2026",
  sections: [
    {
      heading: "1. Information We Collect",
      body: `PLUSLAB KOREA Co., Ltd. ("Company", "we", "us") operates the FolioObs service ("Service"). We collect the following information when you use our Service:

• Account Information: Email address (required for account creation)
• Automatically Collected Information: Access logs, cookies, IP address, browser type

We collect this information to provide the Service, manage user accounts, and prevent unauthorized access.`,
    },
    {
      heading: "2. How We Use Your Information",
      body: `We use the information we collect to:

• Provide, operate, and maintain the Service (SEC 13F-based portfolio analysis, watchlists, alerts)
• Create and manage your account
• Communicate with you about the Service
• Detect and prevent fraud or unauthorized use
• Comply with legal obligations`,
    },
    {
      heading: "3. Data Sharing and Third Parties",
      body: `We do not sell your personal information to third parties. We may share your information with the following service providers who assist in operating our Service:

• Supabase Inc.: Database hosting and authentication services
• Vercel Inc.: Web hosting services

These providers are contractually obligated to protect your data and use it only for the purposes specified.`,
    },
    {
      heading: "4. Data Retention",
      body: `We retain your personal information only for as long as your account is active or as needed to provide the Service. Upon account deletion, we will promptly delete your personal data unless retention is required by applicable law.`,
    },
    {
      heading: "5. Your Rights",
      body: `Depending on your location, you may have the following rights regarding your personal data:

• Right to access your personal information
• Right to rectify inaccurate information
• Right to delete your personal information
• Right to restrict or object to processing
• Right to data portability (where applicable under GDPR)

To exercise any of these rights, please contact us at support@pluslabkorea.com.`,
    },
    {
      heading: "6. Cookies and Local Storage",
      body: `We use cookies and local storage to save your preferences (language, theme settings). You may configure your browser to reject cookies, but this may limit some features of the Service.`,
    },
    {
      heading: "7. International Data Transfers",
      body: `Your information may be transferred to, and maintained on, servers located outside of your country of residence. By using the Service, you consent to such transfers. We take appropriate measures to ensure your data is treated securely and in accordance with this Privacy Policy.`,
    },
    {
      heading: "8. Children's Privacy",
      body: `The Service is not directed to individuals under the age of 14. We do not knowingly collect personal information from children under 14. If we learn that we have collected personal data from a child under 14, we will take steps to delete such information promptly.`,
    },
    {
      heading: "9. Contact Us",
      body: `If you have any questions about this Privacy Policy, please contact us:

• Data Protection Officer: Donhee Kang (CEO)
• Email: support@pluslabkorea.com
• Company: PLUSLAB KOREA Co., Ltd.
• Business Registration No.: 143-87-03402`,
    },
    {
      heading: "10. Changes to This Policy",
      body: `This Privacy Policy is effective as of March 7, 2026. We may update this policy from time to time. Changes will be notified through the Service.`,
    },
  ],
};

export default function PrivacyPage({ onBack }) {
  const T = useTheme();
  const L = useLocale();
  const content = L.locale === "en" ? PRIVACY_EN : PRIVACY_KO;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm mb-6 opacity-70 hover:opacity-100 transition-opacity"
        style={{ color: T.text }}
      >
        <ArrowLeft size={16} />
        {L.t("common.back")}
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Shield size={28} style={{ color: T.accent }} />
        <h1 className="text-2xl font-bold" style={{ color: T.text }}>
          {content.title}
        </h1>
      </div>
      <p className="text-sm mb-8" style={{ color: T.textMuted }}>
        {content.effectiveDate}
      </p>

      {/* Sections */}
      <div className="space-y-8">
        {content.sections.map((sec, i) => (
          <section key={i}>
            <h2 className="text-lg font-semibold mb-3" style={{ color: T.text }}>
              {sec.heading}
            </h2>
            <div
              className="text-sm leading-relaxed whitespace-pre-line"
              style={{ color: T.textSecondary }}
            >
              {sec.body}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
