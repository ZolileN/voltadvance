const fs = require('fs');

try {
  const fileContent = fs.readFileSync('/home/zolile/.gemini/antigravity/brain/5a799829-e887-4783-ac42-407ba2d15d02/.system_generated/logs/overview.txt', 'utf8');
  const lines = fileContent.trim().split('\n');
  if (lines.length > 0) {
    const firstLine = JSON.parse(lines[0]);
    fs.writeFileSync('/home/zolile/Documents/voltadvance/scratch/prd_extracted_session1.txt', firstLine.content);
    console.log("Extracted PRD Session 1 successfully! Written to scratch/prd_extracted_session1.txt");
  }
} catch (e) {
  console.error("Error parsing log file:", e);
}
