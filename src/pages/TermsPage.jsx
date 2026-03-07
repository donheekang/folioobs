import React from "react";
import { useTheme } from "../hooks/useTheme";
import { useLocale } from "../hooks/useLocale";
import { ArrowLeft, FileText } from "lucide-react";

// ──────────────────────────────────────────
// 한국어 이용약관
// ──────────────────────────────────────────
const TERMS_KO = {
  title: "이용약관",
  effectiveDate: "시행일: 2026년 3월 7일",
  sections: [
    {
      heading: "제1조 (목적)",
      body: `이 약관은 주식회사 플러스랩코리아(이하 "회사")가 운영하는 FolioObs 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임 사항, 기타 필요한 사항을 규정함을 목적으로 합니다.`,
    },
    {
      heading: "제2조 (정의)",
      body: `① "서비스"란 회사가 제공하는 SEC 13F 공시 기반 포트폴리오 분석 웹 서비스를 말합니다.
② "이용자"란 이 약관에 따라 서비스를 이용하는 회원 및 비회원을 말합니다.
③ "회원"이란 서비스에 가입하여 이메일 인증을 완료한 이용자를 말합니다.`,
    },
    {
      heading: "제3조 (약관의 효력 및 변경)",
      body: `① 이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력을 발생합니다.
② 회사는 관련 법령에 위배되지 않는 범위에서 이 약관을 개정할 수 있으며, 약관이 변경되는 경우 변경 내용을 시행일 7일 전부터 서비스 내에 공지합니다.`,
    },
    {
      heading: "제4조 (서비스의 제공)",
      body: `회사는 다음과 같은 서비스를 제공합니다.

• SEC 13F 공시 기반 기관투자자 포트폴리오 분석
• 종목 스크리너 및 투자자 비교
• 워치리스트 및 알림 기능
• AI 기반 투자 인사이트 제공

서비스는 무료로 제공되며, 회사는 서비스의 일부 또는 전부를 사전 공지 후 변경하거나 중단할 수 있습니다.`,
    },
    {
      heading: "제5조 (투자 관련 면책)",
      body: `① 서비스에서 제공하는 모든 정보는 투자 권유가 아닌 참고용 정보입니다.
② 서비스에서 제공하는 데이터, 분석, AI 인사이트는 SEC 공시 자료 등 공개 정보를 기반으로 하며, 그 정확성, 완전성, 적시성을 보장하지 않습니다.
③ 이용자의 투자 판단에 대한 책임은 전적으로 이용자 본인에게 있으며, 회사는 서비스 이용으로 인한 투자 손실에 대해 어떠한 책임도 지지 않습니다.
④ AI 인사이트는 인공지능이 자동 생성한 것으로 오류가 포함될 수 있으며, 투자 조언으로 간주되어서는 안 됩니다.`,
    },
    {
      heading: "제6조 (이용자의 의무)",
      body: `이용자는 다음 행위를 하여서는 안 됩니다.

• 서비스를 이용한 자동화된 데이터 수집(스크래핑)
• 서비스의 안정적 운영을 방해하는 행위
• 타인의 개인정보를 도용하는 행위
• 서비스를 이용하여 법령에 위반되는 행위를 하는 것
• 서비스에서 제공하는 정보를 회사의 사전 동의 없이 상업적으로 이용하는 행위`,
    },
    {
      heading: "제7조 (지적재산권)",
      body: `① 서비스의 디자인, 소프트웨어, 텍스트, 그래픽, 로고 등에 대한 지적재산권은 회사에 귀속됩니다.
② SEC 공시 데이터는 공개 정보이며, 회사가 이에 대한 독점적 권리를 주장하지 않습니다.
③ 이용자는 서비스를 통해 제공받은 콘텐츠를 개인적·비상업적 목적으로만 이용할 수 있습니다.`,
    },
    {
      heading: "제8조 (서비스 이용의 제한 및 중지)",
      body: `회사는 다음 각 호에 해당하는 경우 서비스 이용을 제한하거나 중지할 수 있습니다.

• 서비스용 설비의 보수 등 공사로 부득이한 경우
• 이용자가 제6조의 의무를 위반한 경우
• 기타 천재지변, 국가비상사태 등 불가항력적 사유가 있는 경우`,
    },
    {
      heading: "제9조 (면책조항)",
      body: `① 회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력적인 사유로 서비스를 제공할 수 없는 경우에는 책임이 면제됩니다.
② 회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.
③ 회사는 무료로 제공하는 서비스의 이용과 관련하여 관련 법령에 특별한 규정이 없는 한 책임을 지지 않습니다.`,
    },
    {
      heading: "제10조 (분쟁 해결)",
      body: `① 이 약관에 명시되지 않은 사항은 대한민국 관련 법령에 따릅니다.
② 서비스 이용으로 발생한 분쟁에 대해서는 회사의 본점 소재지를 관할하는 법원을 전속적 합의관할 법원으로 합니다.`,
    },
    {
      heading: "부칙",
      body: `이 약관은 2026년 3월 7일부터 시행합니다.

주식회사 플러스랩코리아
대표이사 강돈희
문의: support@pluslabkorea.com`,
    },
  ],
};

// ──────────────────────────────────────────
// English Terms of Service
// ──────────────────────────────────────────
const TERMS_EN = {
  title: "Terms of Service",
  effectiveDate: "Effective Date: March 7, 2026",
  sections: [
    {
      heading: "1. Acceptance of Terms",
      body: `By accessing or using the FolioObs service ("Service") operated by PLUSLAB KOREA Co., Ltd. ("Company", "we", "us"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Service.`,
    },
    {
      heading: "2. Description of Service",
      body: `FolioObs provides portfolio analysis based on SEC 13F filings. The Service includes:

• Institutional investor portfolio analysis based on SEC 13F filings
• Stock screener and investor comparison tools
• Watchlist and alert features
• AI-generated investment insights

The Service is provided free of charge. We reserve the right to modify or discontinue any part of the Service with prior notice.`,
    },
    {
      heading: "3. User Accounts",
      body: `To access certain features, you may need to create an account using your email address. You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account.`,
    },
    {
      heading: "4. Investment Disclaimer",
      body: `THE SERVICE IS FOR INFORMATIONAL PURPOSES ONLY AND DOES NOT CONSTITUTE INVESTMENT ADVICE.

• All data, analysis, and AI-generated insights are based on publicly available SEC filings and other public sources.
• We do not guarantee the accuracy, completeness, or timeliness of any information provided.
• All investment decisions are solely the responsibility of the user.
• The Company shall not be liable for any investment losses resulting from the use of the Service.
• AI-generated insights may contain errors and should not be considered as financial advice.`,
    },
    {
      heading: "5. Prohibited Conduct",
      body: `You agree not to:

• Use automated tools to scrape or collect data from the Service
• Interfere with or disrupt the operation of the Service
• Use another person's account or personal information
• Use the Service for any unlawful purpose
• Commercially exploit information from the Service without prior written consent`,
    },
    {
      heading: "6. Intellectual Property",
      body: `The design, software, text, graphics, logos, and other content of the Service are the property of the Company and are protected by applicable intellectual property laws. SEC filing data is public information and the Company does not claim exclusive rights to such data. You may use content from the Service for personal, non-commercial purposes only.`,
    },
    {
      heading: "7. Limitation of Liability",
      body: `TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE COMPANY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATING TO YOUR USE OF THE SERVICE.

The Service is provided on an "AS IS" and "AS AVAILABLE" basis, without warranties of any kind, either express or implied.`,
    },
    {
      heading: "8. Termination",
      body: `We may suspend or terminate your access to the Service at any time, with or without cause, with or without notice. Upon termination, your right to use the Service will immediately cease.`,
    },
    {
      heading: "9. Governing Law",
      body: `These Terms shall be governed by and construed in accordance with the laws of the Republic of Korea. Any disputes arising from the use of the Service shall be subject to the exclusive jurisdiction of the courts located in the Company's principal place of business.`,
    },
    {
      heading: "10. Contact Information",
      body: `If you have any questions about these Terms, please contact us:

• Company: PLUSLAB KOREA Co., Ltd.
• CEO: Donhee Kang
• Email: support@pluslabkorea.com`,
    },
    {
      heading: "11. Changes to These Terms",
      body: `We may update these Terms from time to time. We will notify you of any changes by posting the new Terms within the Service at least 7 days before they take effect. Your continued use of the Service after the effective date constitutes acceptance of the revised Terms.

These Terms are effective as of March 7, 2026.`,
    },
  ],
};

export default function TermsPage({ onBack }) {
  const T = useTheme();
  const L = useLocale();
  const content = L.locale === "en" ? TERMS_EN : TERMS_KO;

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
        <FileText size={28} style={{ color: T.accent }} />
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
