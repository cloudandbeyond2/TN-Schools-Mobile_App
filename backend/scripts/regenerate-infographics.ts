import { PrismaClient } from '@prisma/client';
import { Buffer } from 'buffer';

const prisma = new PrismaClient();

// Escape text for safe embedding inside SVG/XML.
function svgEscape(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Word-wrap helper
function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = String(text || '').trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length <= maxChars) {
      current = (current + ' ' + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines) {
    const consumed = lines.join(' ').split(/\s+/).length;
    if (consumed < words.length) lines[maxLines - 1] = lines[maxLines - 1].replace(/[.,;]?$/, '…');
  }
  return lines;
}

// Build compact SVG
function buildInfographicSVG(opts: {
  unitNumber: number;
  primaryTitle: string;
  secondaryTitle: string;
  description: string;
  tip: string;
  emoji: string;
  color: string;
}): string {
  const { unitNumber, primaryTitle, secondaryTitle, description, tip, emoji, color } = opts;
  const c = /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#6366f1';

  const descLines = wrapText(description, 44, 3);
  const descTspans = descLines
    .map((ln, i) => `<tspan x="24" dy="${i === 0 ? 0 : 15}">${svgEscape(ln)}</tspan>`)
    .join('');

  const tipLines = wrapText('Tip: ' + tip, 46, 2);
  const tipTspans = tipLines
    .map((ln, i) => `<tspan x="52" dy="${i === 0 ? 0 : 14}">${svgEscape(ln)}</tspan>`)
    .join('');

  const titleText = svgEscape(primaryTitle.length > 32 ? primaryTitle.slice(0, 31) + '…' : primaryTitle);
  const subText = svgEscape(secondaryTitle.length > 50 ? secondaryTitle.slice(0, 49) + '…' : secondaryTitle);

  return `<svg viewBox="0 0 420 270" xmlns="http://www.w3.org/2000/svg" font-family="'Segoe UI', 'Nirmala UI', 'Latha', Arial, sans-serif">
  <defs>
    <linearGradient id="badgeGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c}"/>
      <stop offset="100%" stop-color="${c}cc"/>
    </linearGradient>
  </defs>
  <rect x="1.5" y="1.5" width="417" height="267" rx="18" fill="#ffffff" stroke="${c}" stroke-width="2"/>
  <rect x="1.5" y="1.5" width="417" height="6" rx="3" fill="${c}"/>
  <circle cx="40" cy="46" r="20" fill="url(#badgeGrad)"/>
  <text x="40" y="52" font-size="18" font-weight="800" fill="#ffffff" text-anchor="middle">${unitNumber}</text>
  <rect x="352" y="26" width="44" height="44" rx="12" fill="${c}1a"/>
  <text x="374" y="55" font-size="24" text-anchor="middle">${svgEscape(emoji || '📘')}</text>
  <text x="24" y="92" font-size="18" font-weight="800" fill="#0f172a"><tspan x="24" dy="0">${titleText}</tspan></text>
  <text x="24" y="110" font-size="12" fill="#64748b" font-style="italic">${subText}</text>
  <text x="24" y="134" font-size="12.5" fill="#334155">${descTspans}</text>
  <rect x="24" y="195" width="372" height="54" rx="10" fill="${c}12" stroke="${c}33" stroke-width="1"/>
  <text x="34" y="217" font-size="16">💡</text>
  <text x="52" y="216" font-size="11" font-weight="600" fill="${c}">${tipTspans}</text>
</svg>`;
}

function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}

async function run() {
  console.log("Starting regeneration of SVG infographics...");
  const contents = await prisma.centralContent.findMany({
    where: { contentType: "INFOGRAPHIC" },
    include: {
      topic: {
        include: {
          unit: {
            include: {
              subject: true
            }
          }
        }
      }
    }
  });

  console.log(`Found ${contents.length} infographic content items to regenerate.`);

  let updatedCount = 0;
  for (const item of contents) {
    if (!item.fileUrl || !item.fileUrl.startsWith('data:image/svg+xml;base64,')) {
      console.log(`Skipping content ID ${item.id} - no valid base64 SVG.`);
      continue;
    }

    try {
      const base64 = item.fileUrl.replace('data:image/svg+xml;base64,', '');
      const svgString = Buffer.from(base64, 'base64').toString('utf8');

      // Extract emoji and color
      const emojiMatch = svgString.match(/<text x="334" y="55"[^>]*>(.*?)<\/text>/);
      const emoji = emojiMatch ? emojiMatch[1] : '📘';

      const strokeMatch = svgString.match(/stroke="([^"]+)"/);
      const color = strokeMatch ? strokeMatch[1] : (item.topic?.unit?.subject?.color || '#6366f1');

      // Extract details from fileContent
      const lines = (item.fileContent || '').split('\n');
      const firstLine = lines[0] || '';
      let primaryTitle = item.topic?.unit?.name || 'Unit';
      let secondaryTitle = '';
      const match = firstLine.match(/^(.*?)\s*\((.*?)\)$/);
      if (match) {
        primaryTitle = match[1];
        secondaryTitle = match[2];
      } else if (firstLine) {
        primaryTitle = firstLine;
      }

      const description = lines[1] || '';
      let tip = '';
      const tipLine = lines[2] || '';
      if (tipLine && tipLine.startsWith('Tip: ')) {
        tip = tipLine.replace('Tip: ', '');
      }

      const unitNumber = item.topic?.unit?.unitNumber || 1;

      console.log(`Regenerating: Unit ${unitNumber}: ${primaryTitle} | color: ${color} | emoji: ${emoji}`);

      const svg = buildInfographicSVG({
        unitNumber,
        primaryTitle,
        secondaryTitle,
        description,
        tip,
        emoji,
        color
      });

      const newFileUrl = svgToDataUri(svg);

      await prisma.centralContent.update({
        where: { id: item.id },
        data: { fileUrl: newFileUrl }
      });

      updatedCount++;
    } catch (err: any) {
      console.error(`Failed to update content ID ${item.id}:`, err.message || err);
    }
  }

  console.log(`Successfully regenerated ${updatedCount} SVG infographics.`);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
