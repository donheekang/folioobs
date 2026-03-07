#!/usr/bin/env node
/**
 * Sync SECTOR_KEYWORDS, SEC_ABBREVS, MANUAL_OVERRIDES, and classifySector
 * from reclassify-sectors.mjs to edgar-to-supabase.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(__filename);
const sourceFile = path.join(scriptsDir, 'reclassify-sectors.mjs');
const targetFile = path.join(scriptsDir, 'edgar-to-supabase.mjs');

console.log('Reading source file:', sourceFile);
const sourceContent = fs.readFileSync(sourceFile, 'utf-8');

console.log('Reading target file:', targetFile);
let targetContent = fs.readFileSync(targetFile, 'utf-8');

// Helper function to extract a block starting from a pattern
function extractBlock(content, startIdx) {
  // Find the opening brace or bracket
  let braceIdx = content.indexOf('{', startIdx);
  let bracketIdx = content.indexOf('[', startIdx);

  if (braceIdx === -1 && bracketIdx === -1) {
    throw new Error('Could not find opening brace or bracket');
  }

  // Use whichever comes first
  let openIdx = braceIdx;
  let isArray = false;
  if (bracketIdx !== -1 && (braceIdx === -1 || bracketIdx < braceIdx)) {
    openIdx = bracketIdx;
    isArray = true;
  }

  let braceCount = isArray ? 0 : 1;
  let bracketCount = isArray ? 1 : 0;
  let inString = false;
  let stringChar = '';
  let endIdx = openIdx;

  for (let i = openIdx + 1; i < content.length; i++) {
    const char = content[i];
    const prevChar = i > 0 ? content[i - 1] : '';

    // Handle strings
    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
      continue;
    }

    if (inString) continue;

    // Count braces and brackets
    if (char === '{') braceCount++;
    if (char === '}') {
      braceCount--;
      if (braceCount === 0 && bracketCount === 0) {
        endIdx = i;
        break;
      }
    }
    if (char === '[') bracketCount++;
    if (char === ']') {
      bracketCount--;
      if (braceCount === 0 && bracketCount === 0) {
        endIdx = i;
        break;
      }
    }
  }

  return content.substring(startIdx, endIdx + 1);
}

// Extract blocks from source
console.log('\nExtracting blocks from source...');

console.log('- Extracting SECTOR_KEYWORDS');
const sectorKeywordsMatch = sourceContent.search(/^const SECTOR_KEYWORDS = \{/m);
if (sectorKeywordsMatch === -1) throw new Error('SECTOR_KEYWORDS not found');
const sectorKeywordsBlock = extractBlock(sourceContent, sectorKeywordsMatch);

console.log('- Extracting SEC_ABBREVS');
const secAbbrevMatch = sourceContent.search(/^const SEC_ABBREVS = \[/m);
if (secAbbrevMatch === -1) throw new Error('SEC_ABBREVS not found');
const secAbbrevBlock = extractBlock(sourceContent, secAbbrevMatch);

console.log('- Extracting MANUAL_OVERRIDES');
const manualOverridesMatch = sourceContent.search(/^const MANUAL_OVERRIDES = \{/m);
if (manualOverridesMatch === -1) throw new Error('MANUAL_OVERRIDES not found');
const manualOverridesBlock = extractBlock(sourceContent, manualOverridesMatch);

// Extract classifySector function
console.log('- Extracting classifySector function');
const classifyIdx = sourceContent.search(/^function classifySector\(/m);
if (classifyIdx === -1) {
  throw new Error('Could not find classifySector function');
}
let braceCount = 0;
let inString = false;
let stringChar = '';
let endIdx = classifyIdx;
let foundFirstBrace = false;

for (let i = classifyIdx; i < sourceContent.length; i++) {
  const char = sourceContent[i];
  const prevChar = i > 0 ? sourceContent[i - 1] : '';

  if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
    if (!inString) {
      inString = true;
      stringChar = char;
    } else if (char === stringChar) {
      inString = false;
    }
    continue;
  }

  if (inString) continue;

  if (char === '{') {
    braceCount++;
    foundFirstBrace = true;
  }
  if (char === '}') {
    braceCount--;
    if (foundFirstBrace && braceCount === 0) {
      endIdx = i;
      break;
    }
  }
}

const classifySectorBlock = sourceContent.substring(classifyIdx, endIdx + 1);

// Replace blocks in target
console.log('\nReplacing blocks in target...');

// Replace SECTOR_KEYWORDS
console.log('- Replacing SECTOR_KEYWORDS');
targetContent = targetContent.replace(
  /^const SECTOR_KEYWORDS = \{[\s\S]*?^\};/m,
  sectorKeywordsBlock
);

// Replace SEC_ABBREVS
console.log('- Replacing SEC_ABBREVS');
targetContent = targetContent.replace(
  /^const SEC_ABBREVS = \[[\s\S]*?^\];/m,
  secAbbrevBlock
);

// Check if MANUAL_OVERRIDES exists in target
console.log('- Checking for MANUAL_OVERRIDES in target');
if (!/^const MANUAL_OVERRIDES = \{/m.test(targetContent)) {
  console.log('  MANUAL_OVERRIDES not found, adding it...');
  // Find where to insert it (before classifySector)
  const insertIdx = targetContent.search(/^function classifySector\(/m);
  if (insertIdx === -1) {
    throw new Error('Could not find insertion point for MANUAL_OVERRIDES');
  }
  targetContent = targetContent.substring(0, insertIdx) +
    manualOverridesBlock + '\n\n' +
    targetContent.substring(insertIdx);
} else {
  console.log('  MANUAL_OVERRIDES found, replacing...');
  targetContent = targetContent.replace(
    /^const MANUAL_OVERRIDES = \{[\s\S]*?^\};/m,
    manualOverridesBlock
  );
}

// Replace classifySector
console.log('- Replacing classifySector function');
targetContent = targetContent.replace(
  /^function classifySector\([\s\S]*?^\n\}/m,
  classifySectorBlock
);

// Write the updated target file
console.log('\nWriting updated target file...');
fs.writeFileSync(targetFile, targetContent, 'utf-8');

console.log('✓ Successfully synced blocks!');
console.log('\nVerifying syntax with node -c...');

const { execSync } = await import('child_process');
try {
  execSync(`node -c "${targetFile}"`, { stdio: 'inherit' });
  console.log('✓ Syntax check passed!');
} catch (error) {
  console.error('✗ Syntax check failed!');
  process.exit(1);
}
