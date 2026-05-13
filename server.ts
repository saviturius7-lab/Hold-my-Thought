import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import * as XLSX from "xlsx";
import * as mammoth from "mammoth";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import mime from "mime-types";
import { createWorker } from "tesseract.js";
import pLimit from "p-limit";
import fs from "fs";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory job storage (Map)
interface Job {
  id: string;
  status: "processing" | "completed" | "failed";
  progress: number;
  totalFiles: number;
  completedFiles: number;
  results: any[];
  errors: string[];
  createdAt: number;
}

const jobs = new Map<string, Job>();

// Clean up old jobs every hour
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    if (now - job.createdAt > 3600000) { // 1 hour
      jobs.delete(id);
    }
  }
}, 3600000);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Configure Multer for disk storage
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
  });

  app.use(express.json({ limit: '100mb' }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/job-status/:jobId", (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    res.json(job);
  });

  app.post("/api/process-files", upload.array("files"), async (req, res) => {
    console.log(`[Process] Received ${req.files ? (req.files as any).length : 0} files`);
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No readable files in folder" });
      }

      const jobId = Math.random().toString(36).substring(7);
      const job: Job = {
        id: jobId,
        status: "processing",
        progress: 0,
        totalFiles: files.length,
        completedFiles: 0,
        results: [],
        errors: [],
        createdAt: Date.now()
      };
      jobs.set(jobId, job);

      // Respond immediately
      res.json({ jobId, message: "Processing started" });

      // Start background processing
      processJobAsync(job, files);

    } catch (error) {
      console.error("Internal Server Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // API 404 handler to prevent HTML response for API failures
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route ${req.originalUrl} not found` });
  });

  async function processJobAsync(job: Job, files: Express.Multer.File[]) {
    const limit = pLimit(3); // Concurrency limit
    let tesseractWorker: any = null;

    try {
      // Lazy initialize Tesseract worker ONLY if there are images
      const imageFiles = files.filter(f => [".png", ".jpg", ".jpeg"].includes(path.extname(f.originalname).toLowerCase()));
      if (imageFiles.length > 0) {
        tesseractWorker = await createWorker('eng');
      }

      const tasks = files.map(file => limit(async () => {
        try {
          const fileId = Math.random().toString(36).substring(7);
          const extension = path.extname(file.originalname).toLowerCase();
          const mimeType = mime.lookup(extension);

          let parsedData: any = {
            fileId,
            fileName: file.originalname,
            fileType: extension,
            sizeBytes: file.size,
            tables: [],
            text: ""
          };

          const fileBuffer = fs.readFileSync(file.path);

          if (extension === ".xlsx" || extension === ".xls" || extension === ".csv" || extension === ".tsv" || extension === ".ods") {
            const workbook = XLSX.read(fileBuffer, { type: "buffer" });
            workbook.SheetNames.forEach(sheetName => {
              const sheet = workbook.Sheets[sheetName];
              const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
              if (rows.length >= 1) {
                 const colCount = rows[0]?.length || 0;
                 if (rows.length >= 2 && colCount >= 2) {
                    parsedData.tables.push({
                      tableId: `table_${fileId}_${sheetName}`,
                      sheetName,
                      rowCount: rows.length,
                      colCount,
                      data: rows,
                      provenance: `Source: ${file.originalname}, Sheet: ${sheetName}`
                    });
                 }
              }
            });
          } else if (extension === ".txt" || extension === ".pdf") {
            let content = "";
            if (extension === ".pdf") {
               const data = await pdf(fileBuffer);
               content = data.text;
            } else {
               content = fileBuffer.toString('utf-8');
            }
            parsedData.text = content;

            const lines = content.split('\n');
            const tableRows: any[][] = [];
            lines.forEach(line => {
              const cols = line.trim().split(/\s{2,}/); 
              if (cols.length >= 2) {
                tableRows.push(cols);
              }
            });

            if (tableRows.length >= 2) {
              parsedData.tables.push({
                tableId: `table_${fileId}_text`,
                rowCount: tableRows.length,
                colCount: Math.max(...tableRows.map(r => r.length)),
                data: tableRows,
                provenance: `Source: ${file.originalname}, Extracted via layout detection`
              });
            }
          } else if (extension === ".docx") {
            const result = await mammoth.convertToHtml({ buffer: fileBuffer });
            parsedData.text = (await mammoth.extractRawText({ buffer: fileBuffer })).value;
            const html = result.value;
            const tableMatches = html.match(/<table.*?>(.*?)<\/table>/g);
            if (tableMatches) {
               tableMatches.forEach((tableHtml, index) => {
                 parsedData.tables.push({
                   tableId: `table_${fileId}_docx_${index}`,
                   html: tableHtml,
                   provenance: `Source: ${file.originalname}, Word Table ${index + 1}`
                 });
               });
            }
          } else if ([".png", ".jpg", ".jpeg"].includes(extension)) {
            if (tesseractWorker) {
              const { data: { text, confidence } } = await tesseractWorker.recognize(fileBuffer);
              parsedData.text = text;
              parsedData.ocrConfidence = confidence;
              if (confidence < 70) {
                parsedData.needsReview = true;
              }
            }
          } else {
            job.errors.push(`Unsupported file type: ${extension} for file ${file.originalname}`);
            return;
          }

          job.results.push(parsedData);
        } catch (err) {
          console.error(`Error processing ${file.originalname}:`, err);
          job.errors.push(`Error processing ${file.originalname}: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
          // Clean up temp file
          try {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          } catch (e) {
            console.error("error deleting temp file", e);
          }
          
          job.completedFiles++;
          job.progress = Math.round((job.completedFiles / job.totalFiles) * 100);
        }
      }));

      await Promise.all(tasks);
      job.status = "completed";
      job.progress = 100;
    } catch (e) {
      console.error("Job processing failed", e);
      job.status = "failed";
    } finally {
      if (tesseractWorker) {
        await tesseractWorker.terminate();
      }
    }
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false // Explicitly disable HMR to avoid port 24678 conflicts
      },
      appType: "spa",
      root: process.cwd()
    });
    app.use(vite.middlewares);
  } else {
    // In production, server.cjs is in /dist, so static files are in the same directory
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
