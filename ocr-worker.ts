import { createWorker } from 'tesseract.js';
import fs from 'fs';

async function runOCR(filePath: string) {
  let worker: any = null;
  try {
    const fileBuffer = fs.readFileSync(filePath);
    worker = await createWorker('eng');
    const { data: { text, confidence } } = await worker.recognize(fileBuffer);
    process.send?.({ type: 'success', text, confidence });
  } catch (err: any) {
    process.send?.({ type: 'error', message: err.message || String(err) });
  } finally {
    if (worker) {
      await worker.terminate();
    }
    process.exit(0);
  }
}

process.on('message', (msg: any) => {
  if (msg.type === 'start') {
    runOCR(msg.filePath);
  }
});
