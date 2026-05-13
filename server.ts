import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import * as XLSX from "xlsx";
import * as mammoth from "mammoth";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import pLimit from "p-limit";
import fs from "fs";
import { fork } from "child_process";
import cors from "cors";

// Path resolution helper for ESM/CJS compatibility
const _dirname = (() => {
  try {
    // If we're in ESM
    if (import.meta.url) {
      return path.dirname(fileURLToPath(import.meta.url));
    }
  } catch (e) {
    // Fallback handled below
  }
  // If we're in CJS (or broken ESM)
  // @ts-ignore
  return typeof __dirname !== 'undefined' ? __dirname : process.cwd();
})();

const _require = (() => {
  try {
    return createRequire(import.meta.url);
  } catch (e) {
    // @ts-ignore - Fallback for environments where import.meta.url is missing (CJS)
    return typeof require !== 'undefined' ? require : createRequire(`file://${process.cwd()}/server.ts`);
  }
})();
const pdf = _require("pdf-parse");

// Strict Interfaces for Knowledge Portals
interface TableData {
  tableId: string;
  sheetName?: string;
  rowCount: number;
  colCount: number;
  data?: unknown[][];
  html?: string;
  provenance: string;
}

interface ParsedFile {
  fileId: string;
  fileName: string;
  fileType: string;
  sizeBytes: number;
  tables: TableData[];
  text: string;
  ocrConfidence?: number;
  needsReview?: boolean;
}

interface Job {
  id: string;
  status: "processing" | "completed" | "failed";
  progress: number;
  totalFiles: number;
  completedFiles: number;
  results: ParsedFile[];
  errors: string[];
  createdAt: number;
}

const jobs = new Map<string, Job>();

// Clean up old jobs after 1 hour
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    if (now - job.createdAt > 3600000) {
      jobs.delete(id);
    }
  }
}, 3600000);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '100mb' }));

  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  });

  const upload = multer({ 
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }
  });

  app.use((req, _res, next) => {
    console.log(`[Express Incoming] [${new Date().toISOString()}] ${req.method} ${req.originalUrl || req.url}`);
    next();
  });

  const globalLimit = pLimit(2);

  async function performOCR(filePath: string): Promise<{ text: string; confidence: number }> {
    return new Promise((resolve, reject) => {
      const isProd = process.env.NODE_ENV === 'production';
      const workerPath = path.join(_dirname, isProd ? 'dist/ocr-worker.cjs' : 'ocr-worker.ts');
      
      const child = fork(workerPath, [], {
        execArgv: isProd ? [] : ['--loader', 'tsx']
      });

      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error("OCR processing timed out (60s)"));
      }, 60000);

      child.on('message', (msg: { type: string; text?: string; confidence?: number; message?: string }) => {
        clearTimeout(timeout);
        if (msg.type === 'success') {
          resolve({ text: msg.text || "", confidence: msg.confidence || 0 });
        } else if (msg.type === 'error') {
          reject(new Error(msg.message || "OCR worker internal error"));
        }
      });

      child.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      child.on('exit', (code) => {
        clearTimeout(timeout);
        if (code !== 0 && code !== null) reject(new Error(`OCR worker terminated with exit code ${code}`));
      });

      child.send({ type: 'start', filePath });
    });
  }

  const apiRouter = express.Router();

  apiRouter.get("/health", (_req, res) => {
    console.log("[API] Health check requested");
    res.json({ 
      status: "ok", 
      activeJobs: Array.from(jobs.values()).filter(j => j.status === "processing").length 
    });
  });

  apiRouter.get("/job-status/:jobId", (req, res) => {
    const { jobId } = req.params;
    console.log(`[API] Job status requested for ${jobId}`);
    const job = jobs.get(jobId);
    if (!job) {
      console.warn(`[API] Job not found: ${jobId}`);
      return res.status(404).json({ error: "Job ID not found" });
    }
    res.json(job);
  });

  apiRouter.post("/create-job", (req, res) => {
    const { totalFiles } = req.body;
    console.log("[API] /create-job requested with:", req.body);
    
    if (!totalFiles || typeof totalFiles !== 'number' || totalFiles <= 0) {
      console.warn("[API] Invalid totalFiles in /create-job");
      return res.status(400).json({ error: "Invalid totalFiles count. Must be greater than 0." });
    }

    const jobId = Math.random().toString(36).substring(7);
    const job: Job = {
      id: jobId,
      status: "processing",
      progress: 0,
      totalFiles: totalFiles || 0,
      completedFiles: 0,
      results: [],
      errors: [],
      createdAt: Date.now()
    };
    jobs.set(jobId, job);
    console.log(`[API] Job created: ${jobId}`);
    res.json({ jobId });
  });

  apiRouter.post("/upload-batch/:jobId", upload.array("files"), (req, res) => {
    const { jobId } = req.params;
    console.log(`[API] /upload-batch/${jobId} requested`);
    const job = jobs.get(jobId);
    const files = req.files as Express.Multer.File[];

    if (!job) {
      console.warn(`[API] Job NOT FOUND for upload: ${jobId}`);
      if (files) files.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
      return res.status(404).json({ error: "Job context lost" });
    }

    if (files?.length) {
      console.log(`[API] Queuing ${files.length} files for job ${jobId}`);
      processFilesAsync(job, files);
    }
    res.json({ status: "queued" });
  });

  apiRouter.get("/job-export/:jobId", (req, res) => {
    console.log(`[API] /job-export/${req.params.jobId} requested`);
    const job = jobs.get(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job context or data expired" });
    
    const exportData = {
      jobId: job.id,
      timestamp: job.createdAt,
      summary: {
        totalFiles: job.totalFiles,
        completed: job.completedFiles,
        errorCount: job.errors.length
      },
      results: job.results
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=wiki_export_${job.id}.json`);
    res.send(JSON.stringify(exportData, null, 2));
  });

  apiRouter.all("*", (req, res) => {
    console.log(`[API 404] No Route for ${req.method} ${req.originalUrl || req.url}`);
    res.status(404).json({ error: `API route ${req.originalUrl || req.url} not found` });
  });

  // Mount API Router after all its routes are defined
  app.use("/api", apiRouter);

  // Root health check
  app.get("/health", (_req, res) => {
    console.log("[Root] Health check");
    res.json({ ok: true });
  });

  async function processFilesAsync(job: Job, files: Express.Multer.File[]) {
    // Process files in parallel batches using globalLimit
    const promises = files.map(file => 
      globalLimit(async () => {
        try {
          const fileId = Math.random().toString(36).substring(7);
          const extension = path.extname(file.originalname).toLowerCase();
          const fileBuffer = fs.readFileSync(file.path);
          
          const result: ParsedFile = {
            fileId,
            fileName: file.originalname,
            fileType: extension,
            sizeBytes: file.size,
            tables: [],
            text: ""
          };

          if (['.xlsx', '.xls', '.csv', '.tsv', '.ods'].includes(extension)) {
            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            workbook.SheetNames.forEach(sheetName => {
              const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 }) as unknown[][];
              if (rows.length >= 2 && rows[0]?.length >= 2) {
                result.tables.push({
                  tableId: `table_${fileId}_${sheetName}`,
                  sheetName,
                  rowCount: rows.length,
                  colCount: rows[0].length,
                  data: rows,
                  provenance: `Extracted from: ${file.originalname} (Sheet: ${sheetName})`
                });
              }
            });
          } else if (['.txt', '.pdf'].includes(extension)) {
            const content = extension === '.pdf' ? (await pdf(fileBuffer)).text : fileBuffer.toString('utf-8');
            result.text = content;
            
            // Robust multi-pass table detection
            const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            const tableRows: unknown[][] = [];
            
            for (const line of lines) {
              // Try tab-separation first, then double-space, then pipe
              let cols = line.split('\t');
              if (cols.length < 2) cols = line.split(/\s{2,}/);
              if (cols.length < 2) cols = line.split('|').map(c => c.trim()).filter(c => c.length > 0);
              
              if (cols.length >= 2) {
                tableRows.push(cols);
              } else if (tableRows.length > 0) {
                // If we've started a table but current line isn't a row, check if we should save it
                if (tableRows.length >= 3) {
                  result.tables.push({
                    tableId: `table_${fileId}_text_${result.tables.length}`,
                    rowCount: tableRows.length,
                    colCount: Math.max(...tableRows.map(r => r.length)),
                    data: [...tableRows],
                    provenance: `Analyzed from: ${file.originalname}`
                  });
                }
                tableRows.length = 0; // Reset for next potential table
              }
            }
            
            // Final check for the last table in file
            if (tableRows.length >= 3) {
              result.tables.push({
                tableId: `table_${fileId}_text_${result.tables.length}`,
                rowCount: tableRows.length,
                colCount: Math.max(...tableRows.map(r => r.length)),
                data: tableRows,
                provenance: `Analyzed from: ${file.originalname}`
              });
            }
          } else if (extension === '.docx') {
            const htmlRes = await mammoth.convertToHtml({ buffer: fileBuffer });
            result.text = (await mammoth.extractRawText({ buffer: fileBuffer })).value;
            const tables = htmlRes.value.match(/<table.*?>(.*?)<\/table>/g);
            if (tables) {
              tables.forEach((t, i) => result.tables.push({
                tableId: `table_${fileId}_docx_${i}`,
                html: t,
                rowCount: 0, colCount: 0, // Metadata placeholder for HTML tables
                provenance: `Retrieved from: ${file.originalname}`
              }));
            }
          } else if (['.png', '.jpg', '.jpeg'].includes(extension)) {
            const { text, confidence } = await performOCR(file.path).catch(e => {
              throw new Error(`OCR Failed: ${e.message}`);
            });
            result.text = text;
            result.ocrConfidence = confidence;
            if (confidence < 75) result.needsReview = true;
          } else {
            throw new Error(`Unsupported file type: ${extension}`);
          }

          job.results.push(result);
        } catch (err: any) {
          console.error(`[Extraction Fail] ${file.originalname}:`, err);
          job.errors.push(`${file.originalname}: ${err.message || 'Unknown processing error'}`);
        } finally {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          job.completedFiles++;
          const safeTotal = job.totalFiles || 1;
          job.progress = Math.round((job.completedFiles / safeTotal) * 100);
          if (job.completedFiles >= job.totalFiles) job.status = "completed";
        }
      })
    );
    await Promise.allSettled(promises);
  }

  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[System Error]", err);
    if (!res.headersSent) {
      res.status(err.status || 500).json({
        error: err.message || "Deep architecture error",
        path: req.url
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
      root: process.cwd()
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Hold my Thought Backend running on port ${PORT}`);
    console.log(`[Server] Registry: distPath=${path.join(process.cwd(), 'dist')}`);
  });
}

startServer().catch(err => {
  console.error("[Server] Boot Failure:", err);
  process.exit(1);
});

