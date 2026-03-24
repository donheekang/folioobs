#!/usr/bin/env node
/**
 * Migrate hardcoded NEWS_ARTICLES from NewsPage.jsx to Supabase news_articles table.
 * Run: node scripts/migrate-news-to-supabase.mjs
 */
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://mghfgcjcbpizjmfrtozi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1naGZnY2pjYnBpemptZnJ0b3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NjQ3NzIsImV4cCI6MjA4ODI0MDc3Mn0.GlpiV6vgDmpitprIZpMBvDcD-8ZvnnYZuTo3VqdUDvQ';

// Read the JSX file
const jsxPath = path.resolve('src/pages/NewsPage.jsx');
const content = fs.readFileSync(jsxPath, 'utf8');

// Extract each article object manually by finding id patterns
const startIdx = content.indexOf('const NEWS_ARTICLES = [');
const endIdx = content.indexOf('\n];', startIdx) + 3;
const arraySection = content.substring(startIdx, endIdx);

// Parse articles by splitting on object boundaries
function extractArticles(text) {
  const articles = [];
  // Find each article block starting with { and id:
  const regex = /\{\s*\n\s*id:\s*"([^"]+)"/g;
  let match;
  const positions = [];

  while ((match = regex.exec(text)) !== null) {
    positions.push({ id: match[1], start: match.index });
  }

  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].start;
    const end = i < positions.length - 1 ? positions[i + 1].start : text.length;
    const block = text.substring(start, end);

    const article = {
      id: positions[i].id,
      date: extractField(block, 'date'),
      category: extractField(block, 'category'),
      category_en: extractField(block, 'categoryEn'),
      category_color: extractField(block, 'categoryColor'),
      title: extractField(block, 'title'),
      title_en: extractField(block, 'titleEn'),
      summary: extractField(block, 'summary'),
      summary_en: extractField(block, 'summaryEn'),
      tickers: extractTickers(block),
      read_time: extractField(block, 'readTime'),
      content: extractContent(block, 'content'),
      content_en: extractContent(block, 'contentEn'),
    };

    articles.push(article);
  }

  return articles;
}

function extractField(block, fieldName) {
  // Match: fieldName: "value" or fieldName: 'value'
  const regex = new RegExp(`${fieldName}:\\s*["']([^"']*?)["']`);
  const match = block.match(regex);
  return match ? match[1] : '';
}

function extractTickers(block) {
  const match = block.match(/tickers:\s*\[([^\]]*)\]/);
  if (!match) return [];
  return match[1].match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, '')) || [];
}

function extractContent(block, fieldName) {
  // Content uses template literals: `...`
  const startMarker = `${fieldName}: \``;
  const idx = block.indexOf(startMarker);
  if (idx === -1) return '';

  const contentStart = idx + startMarker.length;
  // Find matching closing backtick (not escaped)
  let depth = 0;
  let i = contentStart;
  while (i < block.length) {
    if (block[i] === '\\' && block[i+1] === '`') {
      i += 2;
      continue;
    }
    if (block[i] === '`') {
      return block.substring(contentStart, i);
    }
    i++;
  }
  return block.substring(contentStart);
}

async function insertArticles(articles) {
  console.log(`Inserting ${articles.length} articles into Supabase...`);

  for (const article of articles) {
    console.log(`  Inserting: ${article.id} (${article.date})`);

    const response = await fetch(`${SUPABASE_URL}/rest/v1/news_articles`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(article),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`  ERROR: ${response.status} - ${err}`);
    } else {
      console.log(`  ✓ Done`);
    }
  }
}

// Main
const articles = extractArticles(arraySection);
console.log(`Parsed ${articles.length} articles from NewsPage.jsx`);

// Debug: show first article
if (articles.length > 0) {
  const first = articles[0];
  console.log(`\nFirst article preview:`);
  console.log(`  ID: ${first.id}`);
  console.log(`  Date: ${first.date}`);
  console.log(`  Title: ${first.title.substring(0, 50)}...`);
  console.log(`  Content length: ${first.content.length} chars`);
  console.log(`  Tickers: ${first.tickers.join(', ')}`);
}

await insertArticles(articles);
console.log('\nMigration complete!');
