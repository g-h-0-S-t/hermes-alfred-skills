// Run apply_one.cjs for specific job IDs (4456162193, 4453409651)
const { spawn } = require('child_process');
const path = require('path');

const JOB_IDS = process.argv.slice(2);
if (JOB_IDS.length === 0) {
  console.log('Usage: node ea_retry.cjs <jobId1> [jobId2] ...');
  process.exit(1);
}

async function runJob(jobId) {
  return new Promise((resolve) => {
    const url = `https://www.linkedin.com/jobs/view/${jobId}/`;
    console.log(`\n=== Processing job ${jobId} ===`);
    const start = Date.now();
    
    const proc = spawn('env', ['-u', 'PYTHONPATH', '-u', 'PYTHONHOME', 'node', 
      path.join(__dirname, 'apply_one.cjs'), url], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120000, // hard 120s per job
    });
    
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });
    
    proc.on('close', (code) => {
      const dur = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`[${jobId}] exit=${code} dur=${dur}s`);
      if (stdout) console.log(stdout.slice(-2000));
      if (stderr) console.log('STDERR:', stderr.slice(-1000));
      resolve({ jobId, code, stdout, stderr });
    });
    
    proc.on('error', (e) => {
      console.log(`[${jobId}] error: ${e.message}`);
      resolve({ jobId, code: -1, error: e.message });
    });
  });
}

(async () => {
  for (const id of JOB_IDS) {
    await runJob(id);
  }
  console.log('\n=== DONE ===');
})();
