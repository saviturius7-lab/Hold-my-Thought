import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import * as XLSX from "xlsx";
import * as mammoth from "mammoth";
// @ts-ignore
import pdf from "pdf-parse/lib/pdf-parse.js";
import { createWorker } from "tesseract.js";
import mime from "mime-types";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Configure Multer for multi-file upload
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
  });

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/process-files", upload.array("files"), async (req, res) => {
    console.log(`[Process] Received ${req.files ? (req.files as any).length : 0} files`);
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No readable files in folder" });
      }

      const results = [];
      const errors = [];

      for (const file of files) {
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

          if (extension === ".xlsx" || extension === ".xls" || extension === ".csv" || extension === ".tsv" || extension === ".ods") {
            const workbook = XLSX.read(file.buffer, { type: "buffer" });
            workbook.SheetNames.forEach(sheetName => {
              const sheet = workbook.Sheets[sheetName];
              const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
              if (rows.length >= 1) {
                 // Step 3 logic: check if it's a table (2x2 or header)
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
               const data = await pdf(file.buffer);
               content = data.text;
            } else {
               content = file.buffer.toString('utf-8');
            }
            parsedData.text = content;

            // Step 3 logic for text files: detect aligned columns
            const lines = content.split('\n');
            const tableRows: any[][] = [];
            lines.forEach(line => {
              const cols = line.trim().split(/\s{2,}/); // Look for 2+ spaces
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
            const result = await mammoth.convertToHtml({ buffer: file.buffer });
            parsedData.text = (await mammoth.extractRawText({ buffer: file.buffer })).value;
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
            const worker = await createWorker('eng');
            const { data: { text, confidence } } = await worker.recognize(file.buffer);
            await worker.terminate();
            parsedData.text = text;
            parsedData.ocrConfidence = confidence;
            if (confidence < 70) {
              parsedData.needsReview = true;
            }
          } else {
            errors.push(`Unsupported file type: ${extension} for file ${file.originalname}`);
            continue;
          }

          results.push(parsedData);
        } catch (err) {
          console.error(`Error processing ${file.originalname}:`, err);
          errors.push(`Error processing ${file.originalname}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      res.json({ results, errors });
    } catch (error) {
      console.error("Internal Server Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      root: process.cwd()
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
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
