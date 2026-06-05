const fs = require("fs");
const path = require("path");

const HTML_SOURCE = path.join(__dirname, "../map-viewer/viewer.html");
const OUTPUT_FILE = path.join(__dirname, "../constants/mapHtml.ts");

if (!fs.existsSync(HTML_SOURCE)) {
  console.error(`Source HTML not found at ${HTML_SOURCE}`);
  process.exit(1);
}

let html = fs.readFileSync(HTML_SOURCE, "utf8");

// Escape backslashes, backticks and template literal placeholders
html = html
  .replace(/\\/g, "\\\\")
  .replace(/`/g, "\\`")
  .replace(/\$\{/g, "\\${");

const content = `// Auto-generated from map-viewer/viewer.html – do not edit manually.
export const MAP_HTML = \`${html}\`;
`;

// Ensure output directory exists
const outDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(OUTPUT_FILE, content);
console.log(`✅ Generated ${OUTPUT_FILE}`);
