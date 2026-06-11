const fs = require('fs');
const readline = require('readline');

async function searchLogs() {
  const logFile = 'C:\\Users\\anmol\\.gemini\\antigravity-ide\\brain\\3c0486b3-1b70-4d49-827f-0438586f3fbd\\.system_generated\\logs\\transcript.jsonl';
  
  if (!fs.existsSync(logFile)) {
    console.error('Log file does not exist');
    return;
  }

  const fileStream = fs.createReadStream(logFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log('Searching logs for connection strings and passwords...');
  
  let lineCount = 0;
  for await (const line of rl) {
    lineCount++;
    if (line.includes('postgres:') || line.includes('DATABASE_URL') || line.includes('password') || line.includes('db.') || line.includes('sbp_')) {
      // Print context of matching lines
      console.log(`[Line ${lineCount}] Matching content snippet:`);
      // Find where postgres: or similar occurs and print that section
      const index = Math.max(0, line.indexOf('postgres') - 50);
      console.log(`   ... ${line.slice(index, index + 300)} ...`);
    }
  }
}

searchLogs().catch(console.error);
