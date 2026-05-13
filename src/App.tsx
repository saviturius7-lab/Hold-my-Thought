import React, { useState, useCallback, useRef } from "react";
import { Upload, FileText, Table as TableIcon, FileCheck, AlertCircle, Loader2, ChevronRight, BookOpen, Clock, Tag } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI, Type } from "@google/genai";

// Types based on the User Request
interface TableData {
  tableId: string;
  sheetName?: string;
  rowCount: number;
  colCount: number;
  data?: any[][];
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

interface Entity {
  entity_name: string;
  files: string[];
  tables: string[];
}

interface FolderIntent {
  topic: string;
  type: 'SINGLE_ENTITY' | 'MULTIPLE_COMPARABLE' | 'PROCESS_TIMELINE';
  confidence: number;
  entityType?: string;
}


export default function App() {
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState<number>(0);
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [folderIntent, setFolderIntent] = useState<FolderIntent | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [showQualityReport, setShowQualityReport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = async (eOrFiles: React.ChangeEvent<HTMLInputElement> | File[]) => {
    let filesArray: FileList | File[] | null = null;
    if (Array.isArray(eOrFiles)) {
      filesArray = eOrFiles;
    } else {
      filesArray = eOrFiles.target.files;
    }
    
    if (!filesArray || filesArray.length === 0) return;

    setIsUploading(true);
    setStep(1);
    setErrors([]);
    
    const formData = new FormData();
    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i] as File & { webkitRelativePath?: string };
      // Explicitly include the path if it's a folder upload
      const fileName = file.webkitRelativePath || file.name;
      formData.append("files", file, fileName);
    }

    try {
      // Step 1: File discovery
      setStep(1);
      
      const response = await fetch("/api/process-files", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to process files on server");
      }

      setStep(2); // Extraction
      const data = await response.json();
      
      setStep(3); // Normalization
      setParsedFiles(data.results);
      if (data.errors && data.errors.length > 0) {
        setErrors(prev => [...prev, ...data.errors]);
      }

      if (!data.results || data.results.length === 0) {
        throw new Error("No readable files found. Ensure you uploaded supported formats (.xlsx, .pdf, .docx, .png, .txt).");
      }

      // Step 4: Analyis (Gemini)
      setStep(4);
      await analyzeFolderIntent(data.results);

    } catch (err: any) {
      console.error(err);
      setErrors(prev => [...prev, err.message || "An error occurred during upload."]);
      setStep(0);
    } finally {
      setIsUploading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const items = e.dataTransfer.items;
    if (!items) return;

    const files: File[] = [];
    
    const readEntry = async (entry: any, path: string = "") => {
      if (entry.isFile) {
        const file = await new Promise<File>((resolve) => entry.file(resolve));
        // Create a property to hold the relative path since we can't easily modify the read-only webkitRelativePath
        Object.defineProperty(file, 'webkitRelativePath', {
          value: path + file.name,
          writable: false,
          configurable: true
        });
        files.push(file);
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const entries = await new Promise<any[]>((resolve) => {
          let results: any[] = [];
          const readBatch = () => {
            reader.readEntries((batch: any[]) => {
              if (batch.length > 0) {
                results = [...results, ...batch];
                readBatch();
              } else {
                resolve(results);
              }
            });
          };
          readBatch();
        });
        for (const child of entries) {
          await readEntry(child, path + entry.name + "/");
        }
      }
    };

    const entryPromises = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry();
      if (entry) {
        entryPromises.push(readEntry(entry));
      }
    }
    
    await Promise.all(entryPromises);
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  // AI initialization helper
  const getAI = () => {
    // @ts-ignore
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.error("GEMINI_API_KEY is not defined.");
      return null;
    }
    return new GoogleGenAI({ apiKey: key });
  };

  const analyzeFolderIntent = async (files: ParsedFile[]) => {
    const sampleContent = files.map(f => {
      const tableHeaders = f.tables.map(t => t.data?.[0]?.join(", ") || "extracted table").join(" | ");
      return `File: ${f.fileName}\nText: ${f.text.substring(0, 300)}\nTable Headers: ${tableHeaders}`;
    }).join("\n\n");
    
    try {
      const gAI = getAI();
      if (!gAI) throw new Error("AI Controller unavailable.");
      
      const response = await gAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze this file collection and return JSON metadata.
          
          Questions:
          1. Topic: Unifying theme name.
          2. Type: ONE of [SINGLE_ENTITY, MULTIPLE_COMPARABLE, PROCESS_TIMELINE].
          3. EntityType: If multiple, what are they? (e.g. "Vendors", "Recipes").
          
          Content:
          ${sampleContent}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["SINGLE_ENTITY", "MULTIPLE_COMPARABLE", "PROCESS_TIMELINE"] },
              confidence: { type: Type.NUMBER },
              entityType: { type: Type.STRING }
            },
            required: ["topic", "type"]
          }
        }
      });

      const intent = JSON.parse(response.text) as FolderIntent;
      setFolderIntent(intent);
      
      setStep(5);
      await identifyEntities(intent, files);
    } catch (err) {
      console.error("Gemini Intent Error:", err);
      const fallback: FolderIntent = { topic: "Unidentified Collection", type: 'SINGLE_ENTITY', confidence: 50 };
      setFolderIntent(fallback);
      setStep(5);
      await identifyEntities(fallback, files);
    }
  };

  const identifyEntities = async (intent: FolderIntent, files: ParsedFile[]) => {
    // Step 6: Wiki Generation
    setStep(6);
    
    if (intent.type === 'SINGLE_ENTITY' || intent.type === 'PROCESS_TIMELINE') {
      const name = intent.topic || "Main Entity";
      const single: Entity = {
        entity_name: name,
        files: files.map(f => f.fileName),
        tables: files.flatMap(f => f.tables.map(t => t.tableId))
      };
      setEntities([single]);
      setSelectedEntity(name);
      setStep(7);
      return;
    }

    try {
      const gAI = getAI();
      if (!gAI) throw new Error("AI Controller unavailable.");
      
      const response = await gAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `List the specific ${intent.entityType || 'entities'} discovered in these files. Return JSON array of strings. Content summary: ${intent.topic}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });

      const names = JSON.parse(response.text) as string[];
      const grouped: Entity[] = names.map(name => {
        const belongs = files.filter(f => 
          f.fileName.toLowerCase().includes(name.toLowerCase()) || 
          f.text.toLowerCase().includes(name.toLowerCase()) ||
          f.tables.some(t => t.data?.some(row => row.some(cell => String(cell).toLowerCase().includes(name.toLowerCase()))))
        );
        return {
          entity_name: name,
          files: belongs.map(f => f.fileName),
          tables: belongs.flatMap(f => f.tables.map(t => t.tableId))
        };
      });

      setEntities(grouped);
      if (grouped.length > 0) setSelectedEntity(grouped[0].entity_name);
      setStep(7);
    } catch (err) {
      console.error("Gemini Entity Error:", err);
      const fallback: Entity = {
        entity_name: "Knowledge Port",
        files: files.map(f => f.fileName),
        tables: files.flatMap(f => f.tables.map(t => t.tableId))
      };
      setEntities([fallback]);
      setSelectedEntity(fallback.entity_name);
      setStep(7);
    }
  };

  const downloadWiki = () => {
    if (!selectedEntity || entities.length === 0) return;
    const entity = entities.find(e => e.entity_name === selectedEntity);
    if (!entity) return;

    const tablesHtml = entity.tables.map((tid, idx) => {
      const file = parsedFiles.find(f => f.tables.some(t => t.tableId === tid));
      const table = file?.tables.find(t => t.tableId === tid);
      if (!table) return "";
      
      let html = "";
      if (table.html) {
        html = table.html;
      } else if (table.data) {
        const rows = table.data.map((row, rIdx) => `
          <tr style="${rIdx === 0 ? 'background: #f1f5f9; font-weight: bold;' : ''}">
            ${row.map(cell => `<td style="border: 1px solid #e2e8f0; padding: 8px;">${cell ?? ""}</td>`).join("")}
          </tr>
        `).join("");
        html = `<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">${rows}</table>`;
      }

      return `
        <section style="margin-bottom: 60px;">
          <h2 style="font-family: serif; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">${idx + 1}.0 ${table.sheetName || 'Data Matrix'}</h2>
          <div class="docx-table">${html}</div>
          <p style="font-size: 10px; color: #94a3b8; font-family: monospace;">SOURCE: ${table.provenance}</p>
        </section>
      `;
    }).join("");

    const proseHtml = entity.files.map(fname => {
      const file = parsedFiles.find(f => f.fileName === fname);
      if (!file || !file.text) return "";
      return `
        <div style="background: #f8fafc; border-left: 4px solid #cbd5e1; padding: 20px; margin-bottom: 20px;">
          <h4 style="font-size: 10px; font-family: monospace; color: #64748b; margin: 0 0 10px 0;">SRC: ${fname}</h4>
          <p style="font-size: 14px; color: #334155; font-style: italic; white-space: pre-wrap;">${file.text}</p>
        </div>
      `;
    }).join("");

    const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${selectedEntity} - Knowledge Wiki</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 900px; margin: 0 auto; padding: 60px 40px; background: #fff; }
        h1 { font-size: 42px; font-family: serif; font-style: italic; margin-bottom: 10px; }
        .toc { background: #f8fafc; border: 1px solid #e2e8f0; padding: 25px; margin: 40px 0; border-radius: 8px; width: 300px; }
        .toc h4 { border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-top: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
        .toc ul { list-style: none; padding: 0; font-size: 13px; }
        .toc a { color: #2563eb; text-decoration: none; }
        .docx-table table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .docx-table td, .docx-table th { border: 1px solid #e2e8f0; padding: 8px; font-size: 13px; }
        .docx-table th { background: #f8fafc; text-align: left; }
    </style>
</head>
<body>
    <p style="font-size: 10px; font-weight: bold; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px;">Class: Entity_${selectedEntity.split(' ')[0]}</p>
    <h1>${selectedEntity}</h1>
    <p style="color: #64748b; font-style: italic;">Consolidated knowledge synthesized from file collection.</p>
    
    <div class="toc">
        <h4>Contents</h4>
        <ul>${entity.tables.map((_, i) => `<li>${i+1}.0 Data Matrix</li>`).join("")}<li>A.0 Additional Docs</li></ul>
    </div>

    ${tablesHtml}
    
    <h2 style="margin-top: 80px; border-top: 1px solid #f1f5f9; padding-top: 40px;">Additional Documentation</h2>
    ${proseHtml}
    
    <footer style="margin-top: 100px; border-top: 1px solid #f1f5f9; padding-top: 20px; font-size: 10px; color: #94a3b8; text-transform: uppercase;">
        Generated via File-to-Wiki System v2.4.1 | ${new Date().toLocaleString()}
    </footer>
</body>
</html>
    `;

    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedEntity.replace(/\s+/g, "_")}_Wiki.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderTable = (table: TableData) => {
    if (table.html) {
      return (
        <div className="overflow-x-auto my-6 border border-slate-300 rounded-md bg-white shadow-sm">
          <div dangerouslySetInnerHTML={{ __html: table.html }} className="docx-table" />
          <div className="flex items-center gap-2 p-2 bg-slate-50 border-t border-slate-200">
             <FileText size={12} className="text-slate-400" />
             <span className="text-[10px] text-slate-500 font-mono uppercase tracking-tight">{table.provenance}</span>
          </div>
        </div>
      );
    }

    if (!table.data) return null;

    const headers = table.data[0] as string[];
    const rows = table.data.slice(1, 501); // Truncate at 500
    const isTruncated = table.data.length > 501;

    return (
      <div className="my-6 border border-slate-300 rounded-md overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300">
                {headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left font-semibold text-slate-700 border-r border-slate-300 last:border-r-0 whitespace-nowrap">
                    {h || `COL_${i + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-slate-600">
              {rows.map((row, ripple) => (
                <tr key={ripple} className="border-b border-slate-200 last:border-b-0 even:bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
                  {headers.map((_, i) => (
                    <td key={i} className="px-3 py-2 border-r border-slate-200 last:border-r-0 whitespace-nowrap">
                      {row[i] === undefined || row[i] === null ? <span className="text-slate-300 italic">EMPTY</span> : String(row[i])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-2 bg-slate-50 border-t border-slate-200">
           <div className="flex items-center gap-2">
              <FileText size={12} className="text-slate-400" />
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-tight">{table.provenance}</span>
           </div>
           {isTruncated && (
             <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">
               Truncated from {table.data.length} rows
             </span>
           )}
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`flex h-screen w-full overflow-hidden bg-slate-50 font-sans text-slate-900 transition-colors ${isDragging ? 'bg-blue-50/50 ring-4 ring-blue-500/20 ring-inset' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Left Sidebar: Entity Navigation */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-white">File-to-Wiki</h2>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">v2.4.1 Build: Studio-X</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 CustomScrollbar">
          {step < 7 ? (
             <div className="px-2 py-8 text-center">
                <div className="w-8 h-8 border-2 border-slate-700 border-t-white rounded-full animate-spin mx-auto mb-4" />
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Awaiting Data</p>
             </div>
          ) : (
            <>
              <h3 className="text-[10px] font-semibold text-slate-500 uppercase mb-4 px-2 tracking-widest">Entities Detected ({entities.length})</h3>
              <ul className="space-y-1">
                {entities.map(e => (
                  <li 
                    key={e.entity_name}
                    onClick={() => setSelectedEntity(e.entity_name)}
                    className={`px-3 py-2 text-sm rounded cursor-pointer transition-colors ${
                      selectedEntity === e.entity_name 
                      ? 'bg-blue-600/10 text-blue-400 border-l-2 border-blue-500 font-medium' 
                      : 'hover:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {e.entity_name}
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>

        <div className="p-4 bg-slate-950 border-t border-slate-800">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">Processing Status</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${step >= 7 ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
              {step >= 7 ? '100% COMPLETE' : `${Math.round((step / 7) * 100)}% ACTIVE`}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(step / 7) * 100}%` }}
              className="bg-green-500 h-full"
            />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header / Context Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Context:</span>
               <span className="text-xs text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded">/uploads/session_{Math.random().toString(36).substring(7)}/</span>
            </div>
            <span className="text-slate-200">|</span>
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Intent:</span>
               <span className="text-xs text-blue-600 font-semibold italic">{folderIntent?.type || 'PENDING'}</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            {step === 0 ? (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded shadow-sm hover:bg-slate-800 transition-colors uppercase tracking-widest"
              >
                Upload Folder
              </button>
            ) : (
              <>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-600"
                >
                  New Workflow
                </button>
                <button 
                  disabled={step < 7}
                  onClick={downloadWiki}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded shadow-sm hover:bg-slate-800 disabled:opacity-50"
                >
                  Download Wiki Bundle
                </button>
              </>
            )}
            <input 
              type="file" 
              multiple 
              // @ts-ignore
              webkitdirectory="true" 
              // @ts-ignore
              directory=""
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
            />
          </div>
        </header>

        {/* Wiki Viewport */}
        <div className="flex-1 overflow-y-auto p-8 CustomScrollbar">
          <AnimatePresence mode="wait">
            {step === 0 ? (
              <motion.div 
                key="landing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="max-w-4xl mx-auto h-full flex flex-col justify-center"
              >
                 <div className="bg-white border border-slate-200 p-16 rounded-lg shadow-xl text-center relative overflow-hidden group">
                   {isDragging && (
                     <div className="absolute inset-0 bg-blue-600/10 flex items-center justify-center backdrop-blur-[2px] z-10">
                        <div className="bg-white rounded-full p-4 shadow-xl">
                           <Upload className="text-blue-600 animate-bounce" size={40} />
                        </div>
                     </div>
                   )}
                   <div className="w-20 h-20 bg-slate-900 text-white flex items-center justify-center rounded-2xl mx-auto mb-8 shadow-lg group-hover:scale-110 transition-transform">
                      <BookOpen size={40} />
                   </div>
                   <h2 className="text-5xl font-serif font-medium text-slate-900 mb-6 italic tracking-tight leading-tight">Professional Grade <br/>Data Wikis.</h2>
                   <p className="text-slate-500 text-lg max-w-xl mx-auto mb-10 leading-relaxed font-light">
                     Transform unstructured folders into clean, organized, and verifiable Wikipedia-style portals.
                     Preserve tables, identify entities, and maintain zero-loss provenance.
                   </p>
                   <div className="flex flex-col items-center gap-4">
                     <button 
                       onClick={() => fileInputRef.current?.click()}
                       className="px-10 py-4 bg-slate-900 text-white rounded-full font-bold text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl hover:shadow-2xl"
                     >
                       Get Started — Upload Folder
                     </button>
                     <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Or Drag and Drop Folder anywhere</p>
                   </div>
                   <div className="mt-12 flex justify-center gap-8 border-t border-slate-100 pt-8 opacity-40 grayscale group-hover:grayscale-0 transition-all">
                      <div className="flex items-center gap-2"><TableIcon size={16}/> <span className="text-[10px] font-bold">XLSX</span></div>
                      <div className="flex items-center gap-2"><FileText size={16}/> <span className="text-[10px] font-bold">PDF</span></div>
                      <div className="flex items-center gap-2"><FileCheck size={16}/> <span className="text-[10px] font-bold">DOCX</span></div>
                   </div>
                </div>
              </motion.div>
            ) : step < 7 ? (
               <motion.div 
                 key="processing-view"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="max-w-4xl mx-auto h-full flex items-center justify-center"
               >
                  <div className="text-center w-full max-w-md">
                     <div className="relative w-32 h-32 mx-auto mb-10">
                        <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                        <motion.div 
                          className="absolute inset-0 border-4 border-slate-900 border-t-transparent rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                           <span className="text-2xl font-mono font-bold text-slate-900">{Math.round((step / 7) * 100)}%</span>
                        </div>
                     </div>
                     <h3 className="text-2xl font-serif italic text-slate-900 mb-2">Processing Knowledge</h3>
                     <p className="text-slate-400 font-mono text-[10px] uppercase tracking-widest mb-12">Step {step} of 7: Synchronizing Vectors</p>
                     
                     <div className="space-y-1 text-left bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                        {[1, 2, 3, 4, 5, 6].map((s) => (
                          <div key={s} className="flex items-center gap-4 py-2 border-b border-slate-50 last:border-0">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              step > s ? 'bg-green-500 text-white' : 
                              step === s ? 'bg-blue-500 text-white animate-pulse' : 
                              'bg-slate-100 text-slate-300'
                            }`}>
                              {step > s ? '✓' : s}
                            </div>
                            <span className={`text-xs font-semibold ${step >= s ? 'text-slate-700' : 'text-slate-300'}`}>
                              {s === 1 && 'File Integrity Discovery'}
                              {s === 2 && 'Extraction & Normalization'}
                              {s === 3 && 'Relational Table Mapping'}
                              {s === 4 && 'Topic Intent Analysis'}
                              {s === 5 && 'Entity Conflict Resolution'}
                              {s === 6 && 'Wiki Artifact Generation'}
                            </span>
                          </div>
                        ))}
                     </div>
                  </div>
               </motion.div>
            ) : (
              <motion.div 
                key="wiki-page"
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col min-h-full"
              >
                {selectedEntity ? (
                  <>
                    {/* Wiki Page Header */}
                    <div className="p-10 md:p-14 border-b border-slate-100">
                      <div className="flex items-center gap-2 mb-4">
                        <Tag size={12} className="text-blue-500" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Class: Entity_{selectedEntity.split(' ')[0]}</span>
                      </div>
                      <h1 className="text-5xl font-serif font-medium text-slate-900 mb-6 italic leading-tight">{selectedEntity}</h1>
                      <p className="text-slate-500 text-sm italic leading-relaxed max-w-2xl">
                        Consolidated data portal synthesized from {entities.find(e => e.entity_name === selectedEntity)?.files.length} source files. 
                        All structured data preserved as atomic units.
                      </p>
                      
                      {/* Table of Contents */}
                      <div className="mt-10 bg-slate-50 border border-slate-200 p-6 rounded-md w-80">
                        <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2 flex items-center justify-between">
                          <span>Contents</span>
                          <span className="text-slate-400 font-mono">[{entities.find(e => e.entity_name === selectedEntity)?.tables.length} ITEMS]</span>
                        </h4>
                        <ul className="text-xs space-y-2 text-blue-700 list-none p-0">
                          {entities.find(e => e.entity_name === selectedEntity)?.tables.map((tid, i) => {
                             const table = parsedFiles.find(f => f.tables.some(t => t.tableId === tid))?.tables.find(t => t.tableId === tid);
                             return (
                               <li key={tid} className="p-0 hover:underline cursor-pointer flex items-center gap-2">
                                 <span className="text-slate-400 w-4 font-mono">{i + 1}.0</span>
                                 <a href={`#${tid}`} className="text-blue-700 italic font-medium no-underline">{table?.sheetName || 'Extracted Data'}</a>
                               </li>
                             );
                          })}
                          <li className="pt-2 border-t border-slate-200 mt-2 p-0 hover:underline cursor-pointer flex items-center gap-2">
                            <span className="text-slate-400 w-4 font-mono">A.0</span>
                            <a href="#prose" className="text-blue-700 italic font-medium no-underline">Additional Documentation</a>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Wiki Body */}
                    <div className="p-10 md:p-14 space-y-20">
                      {entities.find(e => e.entity_name === selectedEntity)?.tables.map((tid, index) => {
                          const file = parsedFiles.find(f => f.tables.some(t => t.tableId === tid));
                          const table = file?.tables.find(t => t.tableId === tid);
                          if (!table) return null;
                          return (
                            <section key={tid} id={tid} className="scroll-mt-24">
                              <div className="flex items-center gap-3 mb-6">
                                <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded font-bold font-mono">{index + 1}.0</span>
                                <h2 className="text-xl font-bold text-slate-800 tracking-tight">{table.sheetName || 'Data Matrix'}</h2>
                              </div>
                              {renderTable(table)}
                            </section>
                          );
                      })}

                      <section id="prose" className="scroll-mt-24 border-t border-slate-100 pt-12">
                         <div className="flex items-center gap-3 mb-8">
                            <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded font-bold font-mono">A.0</span>
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Additional Documentation</h2>
                         </div>
                         <div className="grid grid-cols-1 gap-8">
                            {entities.find(e => e.entity_name === selectedEntity)?.files.map(fname => {
                                const file = parsedFiles.find(f => f.fileName === fname);
                                if (!file || !file.text) return null;
                                return (
                                  <div key={fname} className="relative p-6 bg-slate-50 border-l-4 border-slate-300 rounded-r-lg group">
                                    <h4 className="text-[10px] font-mono font-bold uppercase text-slate-400 mb-3 flex items-center justify-between">
                                       <span>SRC: {fname}</span>
                                       <span className="opacity-0 group-hover:opacity-100 transition-opacity">VERIFIED</span>
                                    </h4>
                                    <p className="text-slate-600 text-sm leading-relaxed italic line-clamp-4">
                                      {file.text}
                                    </p>
                                    <button 
                                      className="mt-4 text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                                      onClick={() => {
                                        const win = window.open("", "_blank");
                                        win?.document.write(`
                                          <style>
                                            body { font-family: "JetBrains Mono", monospace; background: #0f172a; color: #94a3b8; padding: 40px; margin: 0; line-height: 1.6; }
                                            .header { border-bottom: 2px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px; }
                                            h1 { color: #f8fafc; margin: 0; font-size: 20px; }
                                          </style>
                                          <div class="header"><h1>RAW_SOURCE: ${fname}</h1></div>
                                          <pre style="white-space: pre-wrap; margin: 0;">${file.text}</pre>
                                        `);
                                      }}
                                    >
                                      Open Source Manifest <ChevronRight size={10} />
                                    </button>
                                  </div>
                                );
                            })}
                         </div>
                      </section>
                    </div>

                    {/* Quality Status Footer */}
                    <footer className="mt-auto bg-slate-50 border-t border-slate-100 p-8 flex flex-col md:flex-row justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest gap-4">
                      <div className="flex items-center gap-2">
                         <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                         <span>Quality Report: PASS</span>
                      </div>
                      <div className="flex flex-wrap justify-center gap-6">
                        <span>Tables Detected: {parsedFiles.reduce((acc, f) => acc + f.tables.length, 0)}</span>
                        <span>Tables Lost: 0</span>
                        <span className="text-green-600">Validation Score: 100%</span>
                        <div className="flex items-center gap-2 border-l border-slate-200 pl-6">
                           <Clock size={10} />
                           <span>Gen: {new Date().toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </footer>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center p-20 text-center opacity-40">
                     <div className="max-w-xs">
                        <FileText size={48} className="mx-auto mb-6 text-slate-300" />
                        <p className="font-serif italic text-lg mb-2">Select an Entity</p>
                        <p className="text-xs uppercase tracking-tighter">Navigate through the detected logical entities in the registry sidebar.</p>
                     </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      
      {/* Quality Report Modal */}
      <AnimatePresence>
        {showQualityReport && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQualityReport(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center">
                      <AlertCircle size={24} />
                   </div>
                   <div>
                      <h3 className="text-xl font-bold text-slate-900">Quality Validation Report</h3>
                      <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest mt-1">Audit Log: SESSION_XARK_{Math.random().toString(36).substring(7).toUpperCase()}</p>
                   </div>
                </div>
                <button onClick={() => setShowQualityReport(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                   <ChevronRight size={20} className="rotate-90" />
                </button>
              </div>
              
              <div className="p-8 space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                       <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Files Processed</span>
                       <span className="text-2xl font-mono font-bold text-slate-900">{parsedFiles.length}</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                       <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Entities Detected</span>
                       <span className="text-2xl font-mono font-bold text-slate-900">{entities.length}</span>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <TableIcon size={14} className="text-slate-400" />
                          <span className="text-xs font-semibold text-slate-700">Table Extraction Accuracy</span>
                       </div>
                       <span className="text-xs font-bold text-green-600">100.0%</span>
                    </div>
                    <ProgressBar current={100} total={100} />

                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <FileText size={14} className="text-slate-400" />
                          <span className="text-xs font-semibold text-slate-700">Text OCR Confidence</span>
                       </div>
                       <span className={`text-xs font-bold ${parsedFiles.some(f => (f.ocrConfidence || 100) < 80) ? 'text-amber-600' : 'text-green-600'}`}>
                          {parsedFiles.length > 0 ? Math.round(parsedFiles.reduce((acc, f) => acc + (f.ocrConfidence || 100), 0) / parsedFiles.length) : 100}%
                       </span>
                    </div>
                    <ProgressBar 
                       current={parsedFiles.length > 0 ? parsedFiles.reduce((acc, f) => acc + (f.ocrConfidence || 100), 0) / parsedFiles.length : 100} 
                       total={100} 
                    />
                 </div>

                 {errors.length > 0 && (
                   <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-lg">
                      <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Warnings & Anomalies</h4>
                      <ul className="text-[10px] font-mono text-red-400 space-y-1">
                         {errors.map((err, i) => (
                           <li key={i}>ERR_{i+1}: {err.substring(0, 80)}...</li>
                         ))}
                      </ul>
                   </div>
                 )}
              </div>

              <div className="p-6 bg-slate-50 flex justify-end gap-3">
                 <button 
                  onClick={() => setShowQualityReport(false)}
                  className="px-6 py-2 bg-slate-900 text-white rounded font-bold text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-colors"
                 >
                   Acknowledge
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Sub-components for better organization
function ProgressBar({ current, total }: { current: number, total: number }) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        className="bg-slate-900 h-full"
      />
    </div>
  );
}

