#!/usr/bin/env node
/**
 * FolioObs 뉴스 기사 AI 이미지 생성 스크립트 v2
 * — 투자자 카툰 캐릭터 + 금융 데이터 배경
 *
 * 사용법:
 *   OPENAI_API_KEY=sk-xxx node scripts/generate-news-images.cjs
 *
 * 이미 있는 이미지는 스킵합니다. 재생성하려면 public/news/ 파일을 삭제 후 실행.
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error("❌ OPENAI_API_KEY 환경변수를 설정해주세요!");
  console.error("   사용법: OPENAI_API_KEY=sk-xxx node scripts/generate-news-images.cjs");
  process.exit(1);
}

const OUTPUT_DIR = path.join(__dirname, "..", "public", "news");
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ====== 스타일 공통 프리픽스 ======
const STYLE = "Modern flat cartoon illustration style, clean vector art, dark navy (#0a1628) background with subtle grid lines, cinematic lighting, professional financial magazine cover quality. ";
const SUFFIX = " No text or typography in the image. Wide 16:9 composition. High detail, polished illustration.";

// ====== 기사별 이미지 프롬프트 ======
const IMAGE_PROMPTS = [
  {
    id: "buffett-q4-2025-new-buys",
    filename: "buffett-q4.png",
    prompt: STYLE +
      "A wise elderly man in his 90s with round glasses and a warm knowing smile, wearing a navy suit. " +
      "He is sitting confidently with arms crossed. Behind him is a massive glowing green stock chart going upward, " +
      "with floating stock ticker symbols (LLYVK, FWONK, NYT) in amber/gold holographic text. " +
      "The scene has a dark blue financial terminal aesthetic with green and amber accent lighting. " +
      "The character has a cartoon/editorial illustration feel — NOT photorealistic." +
      SUFFIX,
  },
  {
    id: "cathie-wood-march-19-trades",
    filename: "cathie-wood-daily.png",
    prompt: STYLE +
      "A confident woman in her late 60s with short blonde-silver hair and bold glasses, wearing a sleek black turtleneck. " +
      "She is pointing forward with energy and conviction. Behind her is a futuristic DNA double helix glowing in emerald green and blue, " +
      "with floating biotech molecule structures and stock data streams. The background has a sci-fi genomics lab meets Bloomberg terminal feel. " +
      "Ticker symbols TXG and ARCT float nearby in green holographic boxes marked 'BUY'. " +
      "The character has a cartoon/editorial illustration feel — NOT photorealistic." +
      SUFFIX,
  },
  {
    id: "top5-most-bought-q4-2025",
    filename: "top5-consensus.png",
    prompt: STYLE +
      "Five distinct cartoon investor silhouettes standing together like a team lineup, seen from behind, " +
      "facing a massive glowing wall of financial data screens. Each screen shows different stock charts going up. " +
      "The screens display amber/gold horizontal bar charts. The investors are in varying heights and builds, " +
      "wearing different suits, suggesting diversity. Golden light emanates from the screens onto them. " +
      "Dark navy environment with amber and gold accent colors. Wall Street meets sci-fi command center aesthetic." +
      SUFFIX,
  },
  {
    id: "druckenmiller-q4-major-changes",
    filename: "druckenmiller-rebalance.png",
    prompt: STYLE +
      "A tall, sharp-featured man in his 70s with receding grey hair and an intense focused expression, wearing an expensive dark suit. " +
      "He stands in the center of a dramatic circular holographic display showing flows of data — red streams flowing out to the left (exits) " +
      "and green streams flowing in from the right (new positions). The number 79 glows large in amber/gold behind him. " +
      "The scene feels like a financial war room with dramatic blue and amber lighting. " +
      "The character has a cartoon/editorial illustration feel — NOT photorealistic." +
      SUFFIX,
  },
  {
    id: "what-is-13f-guide",
    filename: "sec-13f-guide.png",
    prompt: STYLE +
      "An educational scene showing a large glowing SEC document floating in the center of a dark room, " +
      "with a timeline below it showing four quarterly markers (Q1, Q2, Q3, Q4) connected by a glowing amber line. " +
      "Around the document, small cartoon figures of diverse investors are examining it with magnifying glasses and tablets. " +
      "The atmosphere is a mix of a library and a tech lab — bookshelves on one side, holographic data on the other. " +
      "Dark navy blue environment with warm amber accent lighting on the document." +
      SUFFIX,
  },
  // ====== v3 — 나머지 8명 투자자 ======
  {
    id: "dalio-q4-all-weather",
    filename: "dalio-all-weather.png",
    prompt: STYLE +
      "A calm, meditative man in his mid-70s with short grey hair and a serene expression, wearing a casual but expensive sweater. " +
      "He sits in a zen-like pose surrounded by four floating holographic circles representing his All Weather strategy: " +
      "a golden circle (gold), green circle (stocks), blue circle (bonds), orange circle (commodities). " +
      "Behind him, a balanced scale glows in amber, perfectly level. A map of the world is faintly visible in the background. " +
      "Dark navy environment with green and amber accent lighting. " +
      "The character has a cartoon/editorial illustration feel — NOT photorealistic." +
      SUFFIX,
  },
  {
    id: "ackman-q4-concentrated",
    filename: "ackman-concentrated.png",
    prompt: STYLE +
      "A tall, intense man in his late 50s with dark hair and a commanding presence, wearing a sharp navy suit with no tie. " +
      "He stands confidently pointing at a glowing holographic display showing exactly 8 tall bar charts, each very prominent. " +
      "The bars are in purple and violet shades, towering high. A large '8' glows in the background. " +
      "The scene feels like a minimalist boardroom with dramatic purple lighting. " +
      "The character has a cartoon/editorial illustration feel — NOT photorealistic." +
      SUFFIX,
  },
  {
    id: "soros-q4-macro-bets",
    filename: "soros-macro.png",
    prompt: STYLE +
      "An elderly man in his 90s with distinctive features, wearing a dark suit, looking contemplative while observing a massive globe hologram. " +
      "The globe shows glowing trade routes and currency symbols (dollar, euro, yuan) floating around it. " +
      "Red and green arrows crisscross the globe showing capital flows. Stock tickers (AMZN, CPNG, INTC) float in amber. " +
      "The scene has a global macro command center feel with dramatic red and amber lighting. " +
      "The character has a cartoon/editorial illustration feel — NOT photorealistic." +
      SUFFIX,
  },
  {
    id: "tepper-q4-financials",
    filename: "tepper-financials.png",
    prompt: STYLE +
      "A confident man in his late 60s with a stocky build and a bold grin, wearing a casual blazer. " +
      "Behind him is a dramatic V-shaped recovery chart glowing in bright orange, representing a market rebound. " +
      "On the left side, red falling arrows represent panic; on the right, green rising arrows represent recovery. " +
      "Chinese dragon motifs and tech icons float alongside. The word-free scene conveys courage in crisis. " +
      "Dark navy environment with orange and gold accent lighting. " +
      "The character has a cartoon/editorial illustration feel — NOT photorealistic." +
      SUFFIX,
  },
  {
    id: "coleman-q4-tech-growth",
    filename: "coleman-tech.png",
    prompt: STYLE +
      "A young, polished man in his late 40s with neat dark hair and sharp features, wearing a modern slim-fit suit. " +
      "He is surrounded by floating holographic logos of tech companies — social media icons, cloud symbols, AI neural network patterns. " +
      "A glowing blue tiger silhouette is subtly visible in the background. Multiple screens show upward trending tech stock charts. " +
      "The scene has a Silicon Valley meets Wall Street aesthetic with blue and cyan accent lighting. " +
      "The character has a cartoon/editorial illustration feel — NOT photorealistic." +
      SUFFIX,
  },
  {
    id: "loeb-q4-activist",
    filename: "loeb-activist.png",
    prompt: STYLE +
      "A sharp, intellectual man in his early 60s with light hair and rimless glasses, holding a glowing letter/document in his hand. " +
      "The letter emits a powerful beam of light that illuminates corporate buildings in the background. " +
      "Purple shock waves emanate from the letter. Floating text snippets (blurred, illegible) swirl around him like a storm. " +
      "The scene conveys power through words and ideas. Dark navy environment with purple and violet accent lighting. " +
      "The character has a cartoon/editorial illustration feel — NOT photorealistic." +
      SUFFIX,
  },
  {
    id: "klarman-q4-value-plays",
    filename: "klarman-value.png",
    prompt: STYLE +
      "A quiet, thoughtful man in his late 60s with glasses and a modest appearance, sitting patiently in front of a massive vault door. " +
      "He holds a book titled with no readable text. Around him, piles of golden coins and cash represent his famous high cash allocation. " +
      "A gap between two price lines (one higher 'price', one lower 'value') glows in teal, representing the margin of safety concept. " +
      "The scene is calm and patient, contrasting with the chaos of markets visible through a window. Dark navy with teal accents. " +
      "The character has a cartoon/editorial illustration feel — NOT photorealistic." +
      SUFFIX,
  },
  {
    id: "nps-q4-pension-moves",
    filename: "nps-pension.png",
    prompt: STYLE +
      "A massive institutional building with Korean flag elements, viewed from below looking up. " +
      "From the building, hundreds of thin golden lines stream out to a grid of 561 tiny glowing stock dots arranged in a hemisphere. " +
      "The dots vary in size (larger for top holdings like AAPL, MSFT) and glow in different colors by sector. " +
      "Small Korean won (₩) and dollar ($) symbols float between the building and the stocks. " +
      "The scene conveys massive scale and diversification. Dark navy environment with red and gold accent lighting." +
      SUFFIX,
  },
];

// DALL-E API 호출
async function generateImage(prompt, filename) {
  console.log(`\n🎨 생성 중: ${filename}...`);
  console.log(`   프롬프트: ${prompt.substring(0, 100)}...`);

  const body = JSON.stringify({
    model: "dall-e-3",
    prompt: prompt,
    n: 1,
    size: "1792x1024",
    quality: "hd",
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.openai.com",
        path: "/v1/images/generations",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (json.error) {
              console.error(`   ❌ ${json.error.message}`);
              reject(new Error(json.error.message));
              return;
            }
            const imageUrl = json.data[0].url;
            const revisedPrompt = json.data[0].revised_prompt;
            if (revisedPrompt) {
              console.log(`   📝 수정된 프롬프트: ${revisedPrompt.substring(0, 80)}...`);
            }
            console.log(`   ✅ URL 받음, 다운로드 중...`);
            downloadImage(imageUrl, filename).then(resolve).catch(reject);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// 이미지 다운로드 (리다이렉트 처리)
function downloadImage(url, filename) {
  const filePath = path.join(OUTPUT_DIR, filename);
  return new Promise((resolve, reject) => {
    const download = (downloadUrl) => {
      https.get(downloadUrl, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          download(res.headers.location);
          return;
        }
        const stream = fs.createWriteStream(filePath);
        res.pipe(stream);
        stream.on("finish", () => {
          stream.close();
          const size = fs.statSync(filePath).size;
          console.log(`   💾 저장 완료: public/news/${filename} (${(size/1024).toFixed(0)}KB)`);
          resolve(filePath);
        });
      }).on("error", reject);
    };
    download(url);
  });
}

// 메인 실행
async function main() {
  console.log("🚀 FolioObs 뉴스 이미지 생성 v2 — 카툰 캐릭터 + 금융 데이터\n");
  console.log(`📁 저장 경로: ${OUTPUT_DIR}`);
  console.log(`📊 총 ${IMAGE_PROMPTS.length}개 이미지\n`);

  let generated = 0;
  let skipped = 0;

  for (const item of IMAGE_PROMPTS) {
    const filePath = path.join(OUTPUT_DIR, item.filename);
    if (fs.existsSync(filePath)) {
      console.log(`⏭️  ${item.filename} 이미 존재, 스킵`);
      skipped++;
      continue;
    }
    try {
      await generateImage(item.prompt, item.filename);
      generated++;
    } catch (err) {
      console.error(`   ❌ ${item.filename} 실패:`, err.message);
    }
    // Rate limit 대기
    if (IMAGE_PROMPTS.indexOf(item) < IMAGE_PROMPTS.length - 1) {
      console.log(`   ⏳ 2초 대기...`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`🎉 완료! 생성: ${generated}개 / 스킵: ${skipped}개`);
  console.log(`\n💡 이미지가 마음에 안 들면:`);
  console.log(`   1. public/news/해당파일.png 삭제`);
  console.log(`   2. 스크립트 다시 실행`);
  console.log(`\n📌 NewsPage.jsx에서 AI 이미지가 자동으로 표시됩니다.`);
}

main();
