const fs = require('fs');

try {
  const fileContent = fs.readFileSync('/home/zolile/.gemini/antigravity/brain/91daec1e-14f5-4be8-b551-7eaad6921465/.system_generated/logs/overview.txt', 'utf8');
  const lines = fileContent.trim().split('\n');
  if (lines.length > 0) {
    const firstLine = JSON.parse(lines[0]);
    fs.writeFileSync('/home/zolile/Documents/voltadvance/scratch/prd_extracted.txt', firstLine.content);
    console.log("Extracted PRD successfully! Written to scratch/prd_extracted.txt");
  }
} catch (e) {
  console.error("Error parsing log file:", e);
}
