export function debugTextFormatting(text: string) {
  console.log('=== TEXT FORMATTING DEBUG ===');
  console.log('Original text:', text);
  console.log('Text length:', text.length);
  
  // Check for invisible characters
  const hasCarriageReturn = text.includes('\r');
  const hasNewline = text.includes('\n');
  const hasTab = text.includes('\t');
  
  console.log('Contains \\r (carriage return):', hasCarriageReturn);
  console.log('Contains \\n (newline):', hasNewline);
  console.log('Contains \\t (tab):', hasTab);
  
  // Show character codes for first 100 chars
  const first100 = text.substring(0, 100);
  console.log('First 100 chars with char codes:');
  for (let i = 0; i < first100.length; i++) {
    const char = first100[i];
    const code = char.charCodeAt(0);
    if (code < 32 || code > 126) {
      console.log(`  [${i}]: '${char}' (code: ${code})`);
    }
  }
  
  // Check line structure
  const lines = text.split('\n');
  console.log('Number of lines:', lines.length);
  console.log('Line lengths:', lines.map(l => l.length));
  
  // Show first few lines
  console.log('First 5 lines:');
  lines.slice(0, 5).forEach((line, i) => {
    console.log(`  Line ${i}: "${line}"`);
  });
  
  console.log('=== END DEBUG ===');
}