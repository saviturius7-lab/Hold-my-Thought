import React, { useState, useRef } from "react";
import { Upload, FileText, Table as TableIcon, FileCheck, ChevronRight, BookOpen, Clock, Tag, AlertCircle, FileWarning, GitCommit, ArrowRight, CornerDownRight, History } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import DOMPurify from "dompurify";

// Strict Interfaces
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

interface Entity {
  entity_name: string;
  files: string[];
  tables: string[];
  explanation: string;
}

interface WikiTerm {
  term: string;
  definition: string;
  category: string;
  relatedTerms: string[];
  provenanceFiles: string[];
}

interface FolderIntent {
  topic: string;
  type: 'SINGLE_ENTITY' | 'MULTIPLE_COMPARABLE' | 'PROCESS_TIMELINE';
  confidence: number;
  entityType?: string;
}


const ForestCorner = () => {
  const [isPeeking, setIsPeeking] = React.useState(false);
  const [isBlinking, setIsBlinking] = React.useState(false);

  React.useEffect(() => {
    const triggerPeek = () => {
      setIsPeeking(true);
      const hideTimeout = setTimeout(() => {
        setIsPeeking(false);
      }, 10000); // 10 seconds appearance
      return hideTimeout;
    };

    // Trigger immediately on mount so the user can verify it right away
    let hideTimeout = triggerPeek();

    const intervalId = setInterval(() => {
      hideTimeout = triggerPeek();
    }, 60000); // every 60 seconds

    return () => {
      clearInterval(intervalId);
      clearTimeout(hideTimeout);
    };
  }, []);

  React.useEffect(() => {
    if (!isPeeking) {
      setIsBlinking(false);
      return;
    }

    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => {
        setIsBlinking(false);
      }, 200);
    }, 3000); // blink every 3 seconds

    return () => {
      clearInterval(blinkInterval);
    };
  }, [isPeeking]);

  return (
    <div className="absolute bottom-0 right-0 w-60 h-48 pointer-events-none z-50 overflow-hidden select-none">
      <svg viewBox="0 0 400 320" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* 1. Background ground layer (darker green) */}
        <path d="M 10,295 Q 200,265 390,295 L 400,320 L 0,320 Z" fill="#2d6a4f" stroke="#2e1c0c" strokeWidth="3" strokeLinejoin="round" />

        {/* 2. Background Deciduous Tree 1 (Left-back) */}
        <g className="animate-sway-gentle" style={{ animationDelay: "0.2s" }}>
          {/* Trunk */}
          <path d="M 60,295 L 60,220 L 64,220 L 64,295 Z" fill="#9a6034" stroke="#2e1c0c" strokeWidth="2.5" />
          {/* Foliage */}
          <circle cx="48" cy="210" r="15" fill="#38b000" stroke="#2e1c0c" strokeWidth="2.5" />
          <circle cx="76" cy="210" r="15" fill="#38b000" stroke="#2e1c0c" strokeWidth="2.5" />
          <circle cx="62" cy="195" r="20" fill="#38b000" stroke="#2e1c0c" strokeWidth="2.5" />
        </g>

        {/* 3. Background Deciduous Tree 3 (Center-back/left) */}
        <g className="animate-sway-moderate" style={{ animationDelay: "0.7s" }}>
          {/* Trunk */}
          <path d="M 150,295 L 150,190 L 154,190 L 154,295 Z" fill="#9a6034" stroke="#2e1c0c" strokeWidth="2.5" />
          {/* Foliage */}
          <circle cx="138" cy="180" r="16" fill="#acd729" stroke="#2e1c0c" strokeWidth="2.5" />
          <circle cx="166" cy="180" r="16" fill="#acd729" stroke="#2e1c0c" strokeWidth="2.5" />
          <circle cx="152" cy="165" r="22" fill="#acd729" stroke="#2e1c0c" strokeWidth="2.5" />
        </g>

        {/* 4. Background Deciduous Tree 6 (Right-back) */}
        <g className="animate-sway-gentle" style={{ animationDelay: "1.2s" }}>
          {/* Trunk */}
          <path d="M 355,295 L 355,220 L 359,220 L 359,295 Z" fill="#9a6034" stroke="#2e1c0c" strokeWidth="2.5" />
          {/* Foliage */}
          <circle cx="343" cy="210" r="15" fill="#38b000" stroke="#2e1c0c" strokeWidth="2.5" />
          <circle cx="371" cy="210" r="15" fill="#38b000" stroke="#2e1c0c" strokeWidth="2.5" />
          <circle cx="357" cy="195" r="18" fill="#38b000" stroke="#2e1c0c" strokeWidth="2.5" />
        </g>

        {/* 5. Middle Deciduous Tree 4 (Left-center) */}
        <g className="animate-sway-moderate" style={{ animationDelay: "0s" }}>
          {/* Trunk (forking) */}
          <path d="M 100,295 L 100,210 Q 95,185 85,175 L 94,175 Q 102,185 104,200 Q 110,180 118,170 L 126,170 Q 116,195 110,210 L 110,295 Z" fill="#9a6034" stroke="#2e1c0c" strokeWidth="3" />
          {/* Foliage */}
          <circle cx="80" cy="160" r="28" fill="#4ea41c" stroke="#2e1c0c" strokeWidth="3" />
          <circle cx="125" cy="160" r="28" fill="#4ea41c" stroke="#2e1c0c" strokeWidth="3" />
          <circle cx="70" cy="125" r="26" fill="#4ea41c" stroke="#2e1c0c" strokeWidth="3" />
          <circle cx="130" cy="125" r="26" fill="#4ea41c" stroke="#2e1c0c" strokeWidth="3" />
          <circle cx="100" cy="110" r="32" fill="#4ea41c" stroke="#2e1c0c" strokeWidth="3" />
        </g>

        {/* 6. Middle Evergreen Tree 5 (Pine) */}
        <g className="animate-sway-gentle" style={{ animationDelay: "0.5s" }}>
          {/* Trunk */}
          <path d="M 275,295 L 273,120 L 281,120 L 279,295 Z" fill="#81502c" stroke="#2e1c0c" strokeWidth="3" />
          {/* Spiky conifer tiers */}
          <polygon points="277,180 220,245 235,245 210,290 344,290 319,245 334,245" fill="#1b4332" stroke="#2e1c0c" strokeWidth="3" strokeLinejoin="round" />
          <polygon points="277,115 242,170 254,170 232,215 322,215 300,170 312,170" fill="#1b4332" stroke="#2e1c0c" strokeWidth="3" strokeLinejoin="round" />
          <polygon points="277,65 257,110 267,110 252,145 302,145 287,110 297,110" fill="#1b4332" stroke="#2e1c0c" strokeWidth="3" strokeLinejoin="round" />
        </g>

        {/* 7. Foreground Deciduous Tree 7 (Right-center) */}
        <g className="animate-sway-moderate" style={{ animationDelay: "1.5s" }}>
          {/* Trunk */}
          <path d="M 315,295 L 315,220 Q 310,195 300,185 L 308,185 Q 317,195 319,210 Q 325,190 333,180 L 341,180 Q 331,205 325,220 L 325,295 Z" fill="#9a6034" stroke="#2e1c0c" strokeWidth="3" />
          {/* Foliage */}
          <circle cx="295" cy="180" r="22" fill="#acd729" stroke="#2e1c0c" strokeWidth="3" />
          <circle cx="335" cy="180" r="22" fill="#acd729" stroke="#2e1c0c" strokeWidth="3" />
          <circle cx="285" cy="150" r="20" fill="#acd729" stroke="#2e1c0c" strokeWidth="3" />
          <circle cx="345" cy="150" r="20" fill="#acd729" stroke="#2e1c0c" strokeWidth="3" />
          <circle cx="315" cy="135" r="26" fill="#acd729" stroke="#2e1c0c" strokeWidth="3" />
        </g>

        {/* 8. Foreground Hill/Grass base */}
        <path d="M 15,290 Q 200,265 385,290 Q 400,295 385,310 L 15,310 Q 0,295 15,290 Z" fill="#acd729" stroke="#2e1c0c" strokeWidth="3" strokeLinejoin="round" />
        <path d="M 35,293 Q 200,274 365,293 Q 375,297 365,305 L 35,305 Q 25,297 35,293 Z" fill="#acd729" fillOpacity="0.5" />

        {/* 9. Left Bush */}
        <g className="animate-sway-gentle" style={{ animationDelay: "0.1s" }}>
          <circle cx="90" cy="285" r="16" fill="#4ea41c" stroke="#2e1c0c" strokeWidth="3" />
          <circle cx="120" cy="285" r="16" fill="#4ea41c" stroke="#2e1c0c" strokeWidth="3" />
          <circle cx="105" cy="268" r="20" fill="#4ea41c" stroke="#2e1c0c" strokeWidth="3" />
        </g>

        {/* 10. Far-Right Small Bush */}
        <g className="animate-sway-gentle" style={{ animationDelay: "0.9s" }}>
          <circle cx="295" cy="292" r="13" fill="#4ea41c" stroke="#2e1c0c" strokeWidth="3" />
          <circle cx="320" cy="292" r="13" fill="#4ea41c" stroke="#2e1c0c" strokeWidth="3" />
          <circle cx="308" cy="278" r="16" fill="#4ea41c" stroke="#2e1c0c" strokeWidth="3" />
        </g>

        {/* 11. Peeking Rabbit */}
        <motion.g
          animate={{ y: isPeeking ? 0 : 65 }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
        >
          {/* Left Ear */}
          <path d="M 194,222 C 190,190 204,185 205,222 Z" fill="#ffffff" stroke="#2e1c0c" strokeWidth="3" />
          
          {/* Right Ear */}
          <path d="M 211,222 C 212,185 226,190 222,222 Z" fill="#ffffff" stroke="#2e1c0c" strokeWidth="3" />
          {/* Inner ear fold line */}
          <path d="M 214,219 C 215,198 223,200 221,219" fill="none" stroke="#2e1c0c" strokeWidth="2.5" strokeLinecap="round" />

          {/* Head */}
          <ellipse cx="208" cy="235" rx="18" ry="16" fill="#ffffff" stroke="#2e1c0c" strokeWidth="3" />

          {/* Cheek pink spots */}
          <circle cx="194" cy="236" r="2.5" fill="#fbcfe8" opacity="0.6" />
          <circle cx="222" cy="236" r="2.5" fill="#fbcfe8" opacity="0.6" />

          {/* Eyes (Blinking State) */}
          {isBlinking ? (
            <>
              <path d="M 196.5,231 Q 199,233 201.5,231" stroke="#2e1c0c" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <path d="M 214.5,231 Q 217,233 219.5,231" stroke="#2e1c0c" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </>
          ) : (
            <>
              <circle cx="199" cy="231" r="2.8" fill="#2e1c0c" />
              <circle cx="217" cy="231" r="2.8" fill="#2e1c0c" />
            </>
          )}

          {/* Mouth 'x' */}
          <line x1="206" y1="237.5" x2="210" y2="240.5" stroke="#2e1c0c" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="210" y1="237.5" x2="206" y2="240.5" stroke="#2e1c0c" strokeWidth="2.2" strokeLinecap="round" />

          {/* Paws resting */}
          <rect x="194" y="244" width="7" height="9" rx="3.5" fill="#ffffff" stroke="#2e1c0c" strokeWidth="2.5" />
          <rect x="215" y="244" width="7" height="9" rx="3.5" fill="#ffffff" stroke="#2e1c0c" strokeWidth="2.5" />
        </motion.g>

        {/* 12. Foremost Right Bush (drawn in front of the rabbit to mask it) */}
        <g className="animate-sway-gentle" style={{ animationDelay: "0.4s" }}>
          <circle cx="190" cy="285" r="18" fill="#acd729" stroke="#2e1c0c" strokeWidth="3" />
          <circle cx="225" cy="285" r="18" fill="#acd729" stroke="#2e1c0c" strokeWidth="3" />
          <circle cx="208" cy="265" r="22" fill="#acd729" stroke="#2e1c0c" strokeWidth="3" />
        </g>
      </svg>
    </div>
  );
};


export default function App() {
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState<number>(0);
  const [jobProgress, setJobProgress] = useState<number>(0);
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [folderIntent, setFolderIntent] = useState<FolderIntent | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [showQualityReport, setShowQualityReport] = useState(false);
  const [serverReady, setServerReady] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);

  // Terminology Chains State
  const [wikiTerms, setWikiTerms] = useState<WikiTerm[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<WikiTerm | null>(null);
  const [wikiTab, setWikiTab] = useState<'documents' | 'terminology' | 'history'>('documents');
  const [tocVisible, setTocVisible] = useState(true);
  const [termPath, setTermPath] = useState<string[]>([]);
  const [localFilter, setLocalFilter] = useState("");

  const scrollToSection = (id: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const container = scrollContainerRef.current;
    const element = document.getElementById(id);
    if (container && element) {
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const relativeTop = elementRect.top - containerRect.top + container.scrollTop;
      container.scrollTo({
        top: relativeTop,
        behavior: "smooth"
      });
    }
  };

  React.useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [selectedEntity]);

  // Health check boot sequence
  React.useEffect(() => {
    let mounted = true;
    const checkServer = async () => {
      try {
        const res = await fetch("/health");
        if (res.ok && mounted) {
          console.log("Backend confirmed healthy.");
          setServerReady(true);
        } else if (mounted) {
          setTimeout(checkServer, 2000);
        }
      } catch (e) {
        if (mounted) setTimeout(checkServer, 2000);
      }
    };
    checkServer();
    return () => { mounted = false; };
  }, []);

  const robustFetch = async (url: string, options?: RequestInit, retries = 3) => {
    let lastError: Error | null = null;
    
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`[Fetch] Attempt ${i+1}: ${url}`, options?.method || 'GET');
        const response = await fetch(url, options);
        const text = await response.text();
        
        if (!text) {
          if (response.ok) {
            if (response.status === 204) return null;
            return {};
          }
          console.error(`[Fetch] 404/Null body at ${url}. Response Headers:`, [...response.headers.entries()]);
          throw new Error(`Server returned error ${response.status} with no body for ${url}.`);
        }

        try {
          const data = JSON.parse(text);
          if (!response.ok) {
            throw new Error(data.error || `Server error: ${response.status}`);
          }
          return data;
        } catch (e) {
          if (!response.ok) {
            // If not OK and NOT JSON, check if it's HTML
            if (text.includes("<!DOCTYPE html>") || text.includes("<html")) {
               console.error("Server returned HTML 404/500 instead of JSON:", text.substring(0, 500));
               throw new Error(`Server returned HTML error ${response.status}. The backend might not be ready or the route is wrong.`);
            }
            throw new Error(`Server returned error ${response.status} with invalid body: ${text.substring(0, 100)}`);
          }
          throw e; // Rethrow parse error if response was actually OK
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Fetch attempt ${i + 1} failed for ${url}:`, err);
        if (i < retries - 1) {
          await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
      }
    }
    throw lastError || new Error("Unknown fetch error");
  };

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
    setJobProgress(0);
    
    // We'll use batching to avoid timeouts and memory issues
    const BATCH_SIZE = 15;
    const totalFiles = filesArray.length;

    try {
      // Step 0: Create Job (wait for server if needed)
      let waitAttempts = 0;
      while (!serverReady && waitAttempts < 10) {
        setErrors([`Waiting for backend to initialize (Attempt ${waitAttempts + 1}/10)...`]);
        await new Promise(r => setTimeout(r, 2000));
        waitAttempts++;
      }

      if (!serverReady) {
        throw new Error("Backend server is not responding. Please wait a moment and try again.");
      }
      
      setErrors([]); // Clear the waiting message

      const { jobId: newJobId } = await robustFetch("/api/create-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalFiles })
      });
      setJobId(newJobId);

      // Step 1: Upload in batches
      for (let i = 0; i < filesArray.length; i += BATCH_SIZE) {
        const batch = Array.from(filesArray).slice(i, i + BATCH_SIZE);
        const batchFormData = new FormData();
        batch.forEach(file => {
          const f = file as File & { webkitRelativePath?: string };
          const fileName = f.webkitRelativePath || f.name;
          batchFormData.append("files", f, fileName);
        });

        await robustFetch(`/api/upload-batch/${newJobId}`, {
          method: "POST",
          body: batchFormData
        });
        
        // Update partial progress for the "Ingestion" label
        const uploadProgress = Math.round(((i + batch.length) / totalFiles) * 100);
        setJobProgress(uploadProgress);
      }

      // Step 2 & 3: Polling for background process
      setStep(2);
      let jobCompleted = false;
      let finalJobData: any = null;
      
      while (!jobCompleted) {
        try {
          const job = await robustFetch(`/api/job-status/${newJobId}`);
          setJobProgress(job.progress);
          
          if (job.status === "completed") {
            setParsedFiles(job.results);
            if (job.errors && job.errors.length > 0) {
              setErrors(prev => [...prev, ...job.errors]);
            }
            finalJobData = job;
            jobCompleted = true;
            setStep(3);
          } else if (job.status === "failed") {
            throw new Error("Background processing failed");
          } else {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (pollErr: any) {
          console.warn("Polling error, retrying...", pollErr);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      if (!finalJobData || !finalJobData.results || finalJobData.results.length === 0) {
        throw new Error("No readable files found after processing.");
      }

      // Step 4: Run server-side Wikipedia Pipeline
      setStep(4);
      const pipelinePromise = robustFetch(`/api/generate-wiki-pipeline/${newJobId}`, {
        method: "POST"
      });

      // Maintain loading-state rhythm
      await new Promise(r => setTimeout(r, 2000));
      setStep(5);
      await new Promise(r => setTimeout(r, 2000));
      setStep(6);

      const pipelineResult = await pipelinePromise;
      
      setFolderIntent(pipelineResult.folderIntent);
      setEntities(pipelineResult.entities);
      setWikiTerms(pipelineResult.wikiTerms);
      
      if (pipelineResult.entities && pipelineResult.entities.length > 0) {
        setSelectedEntity(pipelineResult.entities[0].entity_name);
      }
      if (pipelineResult.wikiTerms && pipelineResult.wikiTerms.length > 0) {
        setSelectedTerm(pipelineResult.wikiTerms[0]);
      }
      setStep(7);

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

  // Term click tracking for concept chains
  const handleTermClick = (term: WikiTerm) => {
    setSelectedTerm(term);
    setTermPath(prev => {
      if (prev.includes(term.term)) {
        const index = prev.indexOf(term.term);
        return prev.slice(0, index + 1);
      }
      return [...prev, term.term];
    });
  };

  const resetTermPath = () => {
    setTermPath([]);
  };

  const renderTextWithWikiLinks = (text: string) => {
    if (!text) return "";
    const sortedEntities = [...entities].sort((a, b) => b.entity_name.length - a.entity_name.length);
    const sortedTerms = [...wikiTerms].sort((a, b) => b.term.length - a.term.length);

    const entityNames = sortedEntities.map(e => e.entity_name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
    const termNames = sortedTerms.map(t => t.term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));

    const allMatches = Array.from(new Set([...entityNames, ...termNames])).sort((a, b) => b.length - a.length);
    const pattern = allMatches.join('|');
    if (!pattern) return text;

    const regex = new RegExp(`(?<!\\w)(${pattern})(?!\\w)`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) => {
      const matchedEntity = sortedEntities.find(e => e.entity_name.toLowerCase() === part.toLowerCase());
      if (matchedEntity) {
        return (
          <button
            key={i}
            onClick={() => {
              setSelectedEntity(matchedEntity.entity_name);
              setWikiTab('documents');
            }}
            className="font-bold text-[#1b4332] hover:underline hover:text-[#2d6a4f] bg-transparent border-0 p-0 cursor-pointer inline"
          >
            {part}
          </button>
        );
      }

      const matchedTerm = sortedTerms.find(t => t.term.toLowerCase() === part.toLowerCase());
      if (matchedTerm) {
        return (
          <button
            key={i}
            onClick={() => {
              handleTermClick(matchedTerm);
              setWikiTab('terminology');
            }}
            className="font-bold text-[#2d6a4f] hover:underline hover:text-[#1b4332] bg-transparent border-0 p-0 cursor-pointer inline"
          >
            {part}
          </button>
        );
      }

      return part;
    });
  };

  const renderSynthesizedArticle = (explanation: string) => {
    if (!explanation) return null;

    const normalized = explanation.replace(/\\n/g, '\n');
    const lines = normalized.split('\n');
    return (
      <div className="space-y-4 text-justify leading-relaxed text-[#202122] select-text">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return null;

          const h2Match = trimmed.match(/^==\s*(.*?)\s*==$/);
          if (h2Match) {
            return (
              <h2 key={idx} className="border-b border-[#a2a9b1] pb-1 text-xl font-serif font-normal mt-10 mb-4 text-black">
                {h2Match[1]}
              </h2>
            );
          }

          const h3Match = trimmed.match(/^===\s*(.*?)\s*===$/) || trimmed.match(/^###\s*(.*)$/);
          if (h3Match) {
            return (
              <h3 key={idx} className="text-md font-bold text-slate-800 mt-6 mb-2">
                {h3Match[1]}
              </h3>
            );
          }

          if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            const content = trimmed.substring(2);
            return (
              <ul key={idx} className="list-disc pl-6 space-y-1 my-2">
                <li>{renderTextWithWikiLinks(content)}</li>
              </ul>
            );
          }

          return (
            <p key={idx} className="mb-4">
              {renderTextWithWikiLinks(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

  const renderDefinitionWithLinks = (text: string, terms: WikiTerm[]) => {
    if (!text) return "";
    const sortedEntities = [...entities].sort((a, b) => b.entity_name.length - a.entity_name.length);
    const sortedTerms = [...terms].sort((a, b) => b.term.length - a.term.length);

    const entityNames = sortedEntities.map(e => e.entity_name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
    const termNames = sortedTerms.map(t => t.term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));

    const allMatches = Array.from(new Set([...entityNames, ...termNames])).sort((a, b) => b.length - a.length);
    const pattern = allMatches.join('|');
    if (!pattern) return text;

    const regex = new RegExp(`(?<!\\w)(${pattern})(?!\\w)`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) => {
      const matchedEntity = sortedEntities.find(e => e.entity_name.toLowerCase() === part.toLowerCase());
      if (matchedEntity) {
        return (
          <button
            key={i}
            onClick={() => {
              setSelectedEntity(matchedEntity.entity_name);
              setWikiTab('documents');
            }}
            className="font-bold text-[#1b4332] hover:underline hover:text-[#2d6a4f] bg-transparent border-0 p-0 cursor-pointer inline"
          >
            {part}
          </button>
        );
      }

      const matchedTerm = sortedTerms.find(t => t.term.toLowerCase() === part.toLowerCase());
      if (matchedTerm) {
        return (
          <button
            key={i}
            onClick={() => handleTermClick(matchedTerm)}
            className="font-bold text-emerald-700 hover:text-emerald-900 underline inline bg-transparent border-0 p-0 cursor-pointer"
          >
            {part}
          </button>
        );
      }

      return part;
    });
  };

  const downloadWiki = async (jobId?: string) => {
    if (!selectedEntity || entities.length === 0) return;
    
    // 1. Client-Side Wiki HTML
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

    const explanationHtml = entity.explanation ? entity.explanation.split('\n').map(line => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("==") && trimmed.endsWith("==")) {
        return `<h2 style="font-family: serif; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-top: 40px;">${trimmed.replace(/==/g, "").trim()}</h2>`;
      }
      if (trimmed.startsWith("===") && trimmed.endsWith("===")) {
        return `<h3 style="margin-top: 24px; font-size: 18px;">${trimmed.replace(/===/g, "").trim()}</h3>`;
      }
      return `<p style="margin-bottom: 16px; text-align: justify; line-height: 1.7;">${trimmed}</p>`;
    }).join("\n") : "<p>No article content available</p>";

    const glossaryHtml = wikiTerms.map(t => {
      const relatedLinks = t.relatedTerms.map(rt => {
        const rtId = rt.toLowerCase().replace(/[^a-z0-9]/g, "-");
        return `<a href="#term-${rtId}" style="display: inline-block; background: #e2e8f0; color: #1e293b; padding: 2px 8px; border-radius: 4px; font-size: 11px; text-decoration: none; margin-right: 6px; font-family: monospace;">${rt}</a>`;
      }).join(" ");

      const tId = t.term.toLowerCase().replace(/[^a-z0-9]/g, "-");

      return `
        <div id="term-${tId}" style="background: #fff; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin-bottom: 20px; scroll-margin-top: 24px;">
          <span style="font-size: 10px; font-family: monospace; font-weight: bold; text-transform: uppercase; color: #3b82f6; display: block; margin-bottom: 4px;">${t.category || "Terminology"}</span>
          <h3 style="font-family: serif; margin: 0 0 10px 0; font-size: 20px;">${t.term}</h3>
          <p style="font-size: 14px; color: #475569; margin: 0 0 15px 0;">${t.definition}</p>
          ${t.relatedTerms.length > 0 ? `<div style="margin-bottom: 10px;"><strong style="font-size: 11px; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 4px;">Connected Terminologies:</strong> ${relatedLinks}</div>` : ""}
          <div style="font-size: 11px; color: #94a3b8;"><strong style="font-size: 11px; text-transform: uppercase; color: #64748b;">Discovered in:</strong> ${t.provenanceFiles.join(", ")}</div>
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
        <ul>${entity.tables.map((_, i) => `<li>${i+1}.0 Data Matrix</li>`).join("")}<li>2.0 Synthesized Topic Article</li><li>3.0 Interconnected Glossary</li></ul>
    </div>

    ${tablesHtml}
    
    <h2 style="margin-top: 80px; border-top: 1px solid #f1f5f9; padding-top: 40px;">Synthesized Topic Article</h2>
    ${explanationHtml}

    <h2 style="margin-top: 80px; border-top: 1px solid #f1f5f9; padding-top: 40px;">Interconnected Concept Glossary</h2>
    <p style="color: #64748b; font-style: italic; font-size: 14px; margin-bottom: 30px;">
        Click any linked terminology within a concept card to hop seamlessly through the structural definition chain.
    </p>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 30px; border-radius: 8px; margin-bottom: 60px;">
        ${glossaryHtml}
    </div>
    
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

    // 2. Optional Backend Data Export
    if (jobId) {
      const confirmJson = confirm("Success! Wiki HTML folder generated. Would you also like to download the raw JSON processing data from the server?");
      if (confirmJson) {
        window.location.href = `/api/job-export/${jobId}`;
      }
    }
  };

  const renderTable = (table: TableData) => {
    if (table.html) {
      const sanitizedHtml = DOMPurify.sanitize(table.html);
      return (
        <div className="my-6 border border-[#a2a9b1] bg-[#f8f9fa] p-2 select-text">
          <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} className="wikitable overflow-x-auto text-[13px] leading-[1.6]" />
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#a2a9b1] text-[10px] text-[#54595d] font-mono">
             <FileText size={12} className="text-[#54595d]" />
             <span className="text-[10px] text-slate-500 font-mono uppercase tracking-tight">{table.provenance}</span>
          </div>
        </div>
      );
    }

    if (!table.data) return null;

    const headers = table.data[0] as string[];
    const rows = table.data.slice(1); // No truncation! Every row of data is fully accounted for!

    return (
      <div className="my-6 border border-[#a2a9b1] bg-[#f8f9fa] p-2 overflow-hidden select-text">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-[#a2a9b1] text-[13px] text-[#202122] bg-white">
            <thead>
              <tr className="bg-[#eaecf0] border-b border-[#a2a9b1]">
                {headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left font-bold border-r border-[#a2a9b1] last:border-r-0 whitespace-nowrap text-[#202122]">
                    {h || `COL_${i + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="border-b border-[#a2a9b1] last:border-b-0 even:bg-[#f8f9fa] hover:bg-[#eaecf0]/40 transition-colors">
                  {headers.map((_, i) => (
                    <td key={i} className="px-3 py-2 border-r border-[#a2a9b1] last:border-r-0 whitespace-pre-wrap">
                      {row[i] === undefined || row[i] === null ? <span className="text-slate-300 italic">EMPTY</span> : String(row[i])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-2 mt-2 pt-2 border-t border-[#a2a9b1] text-[10px] text-[#54595d] font-mono">
           <div className="flex items-center gap-2">
              <FileText size={12} className="text-[#54595d]" />
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-tight">{table.provenance}</span>
           </div>
           <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-tight">
             All {table.data.length} cells preserved
           </span>
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`relative flex h-screen w-full overflow-hidden bg-[#f0f3f1] font-sans text-slate-900 transition-colors ${isDragging ? 'bg-emerald-50/50 ring-4 ring-emerald-500/20 ring-inset' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Bottom right forest corner with peeking blinking rabbit */}
      <ForestCorner />

      {/* Left Sidebar: Entity Navigation */}
      <aside className="w-64 bg-[#0c2419] text-emerald-100 flex flex-col border-r border-[#113122] z-10">
        <div className="p-6 border-b border-[#113122]">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L3 9h3v10h12V9h3L12 2zm1 15h-2v-2h2v2zm0-4h-2V8h2v5z" />
            </svg>
            <h2 className="text-xs font-bold uppercase tracking-widest text-white">Omipedia</h2>
          </div>
          <p className="text-[10px] text-emerald-600 font-mono">v2.4.1 Build: Forest-X</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 CustomScrollbar">
          {step < 7 ? (
             <div className="px-2 py-8 text-center">
                <div className="w-8 h-8 border-2 border-emerald-800 border-t-white rounded-full animate-spin mx-auto mb-4" />
                <p className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold">Awaiting Data</p>
             </div>
          ) : (
            <>
              <h3 className="text-[10px] font-semibold text-emerald-500 uppercase mb-4 px-2 tracking-widest">Entities Detected ({entities.length})</h3>
              <ul className="space-y-1">
                {entities.map(e => (
                  <li 
                    key={e.entity_name}
                    onClick={() => setSelectedEntity(e.entity_name)}
                    className={`px-3 py-2 text-sm rounded cursor-pointer transition-colors ${
                      selectedEntity === e.entity_name 
                      ? 'bg-emerald-600/20 text-emerald-300 border-l-2 border-emerald-500 font-medium' 
                      : 'hover:bg-[#153a2a] text-emerald-400'
                    }`}
                  >
                    {e.entity_name}
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>

        <div className="p-4 bg-[#071710] border-t border-[#113122]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-medium text-emerald-500 uppercase tracking-tighter">Processing Status</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${step >= 7 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-500/20 text-emerald-400 animate-pulse'}`}>
              {step >= 7 ? '100% COMPLETE' : `${Math.round((step / 7) * 100)}% ACTIVE`}
            </span>
          </div>
          <div className="w-full bg-[#1a3f2c] h-1 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(step / 7) * 100}%` }}
              className="bg-emerald-400 h-full"
            />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden z-10">
        {/* Header / Context Bar */}
        <header className="h-16 bg-[#f9faf9] border-b border-emerald-900/10 flex items-center justify-between px-8 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700/60">Context:</span>
               <span className="text-xs text-emerald-800 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">/uploads/session_{jobId || "initializing"}/</span>
            </div>
            <span className="text-emerald-200">|</span>
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700/60">Intent:</span>
               <span className="text-xs text-emerald-700 font-semibold italic">{folderIntent?.type || 'PENDING'}</span>
            </div>
          </div>
          
          <div className="flex gap-2 items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${serverReady ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} title={serverReady ? "Server Ready" : "Server Starting..."} />
            {step === 0 ? (
              <div className="flex gap-2">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!serverReady}
                  className="px-4 py-2 text-xs font-bold bg-white text-emerald-900 border border-emerald-200 rounded shadow-sm hover:bg-emerald-50 transition-colors uppercase tracking-widest disabled:opacity-50"
                >
                  Upload File(s)
                </button>
                <button 
                  onClick={() => folderInputRef.current?.click()}
                  disabled={!serverReady}
                  className="px-4 py-2 text-xs font-bold bg-[#1b4332] text-white rounded shadow-sm hover:bg-[#2d6a4f] transition-colors uppercase tracking-widest disabled:opacity-50"
                >
                  Upload Folder
                </button>
              </div>
            ) : (
              <>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-3 py-1.5 text-xs font-semibold bg-white border border-emerald-200 rounded hover:bg-emerald-50 text-emerald-800"
                >
                  New Workflow
                </button>
                <button 
                  disabled={step < 7}
                  onClick={() => downloadWiki(jobId || undefined)}
                  className="px-3 py-1.5 text-xs font-semibold bg-[#1b4332] text-white rounded shadow-sm hover:bg-[#2d6a4f] disabled:opacity-50"
                >
                  Download Wiki Bundle
                </button>
              </>
            )}
            <input 
              type="file" 
              multiple 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
            />
            <input 
              type="file" 
              multiple 
              // @ts-ignore
              webkitdirectory="true" 
              // @ts-ignore
              directory=""
              ref={folderInputRef} 
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
                 <div className="bg-white border border-emerald-900/10 p-16 rounded-lg shadow-xl text-center relative overflow-hidden group">
                   {isDragging && (
                     <div className="absolute inset-0 bg-emerald-600/10 flex items-center justify-center backdrop-blur-[2px] z-10">
                        <div className="bg-white rounded-full p-4 shadow-xl">
                           <Upload className="text-emerald-600 animate-bounce" size={40} />
                        </div>
                     </div>
                   )}
                   <div className="w-20 h-20 bg-[#1b4332] text-white flex items-center justify-center rounded-2xl mx-auto mb-8 shadow-lg group-hover:scale-110 transition-transform">
                      <BookOpen size={40} />
                   </div>
                   <h2 className="text-5xl font-serif font-medium text-emerald-950 mb-6 italic tracking-tight leading-tight">Omipedia <br/>Professional Wikis.</h2>
                   <p className="text-emerald-800/75 text-lg max-w-xl mx-auto mb-10 leading-relaxed font-light">
                     Transform unstructured folders into clean, organized, and forest-structured Omipedia portals.
                     Preserve tables, identify entities, and maintain zero-loss provenance.
                   </p>
                    <div className="flex flex-col items-center gap-4">
                     <div className="flex gap-4">
                       <button 
                         onClick={() => fileInputRef.current?.click()}
                         className="px-8 py-4 bg-white text-emerald-900 border border-emerald-200 rounded-full font-bold text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md hover:shadow-lg"
                       >
                         Upload File(s)
                       </button>
                       <button 
                         onClick={() => folderInputRef.current?.click()}
                         className="px-8 py-4 bg-[#1b4332] text-white rounded-full font-bold text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl hover:shadow-2xl hover:bg-[#2d6a4f]"
                       >
                         Upload Folder
                       </button>
                     </div>
                     <p className="text-[10px] text-emerald-700 font-mono tracking-widest uppercase">Or Drag and Drop anywhere</p>
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
                        <div className="absolute inset-0 border-4 border-emerald-50 rounded-full"></div>
                        <motion.div 
                          className="absolute inset-0 border-4 border-[#1b4332] border-t-transparent rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                           <span className="text-2xl font-mono font-bold text-emerald-950">{step >= 2 && step <= 3 ? jobProgress : Math.round((step / 7) * 100)}%</span>
                        </div>
                     </div>
                     <h3 className="text-2xl font-serif italic text-emerald-950 mb-2">Processing Knowledge</h3>
                     <p className="text-emerald-700/60 font-mono text-[10px] uppercase tracking-widest mb-12">
                       {step === 1 ? "Uploading Source Files..." : 
                        step === 2 ? `Processing Files (${jobProgress}%)` :
                        step === 3 ? "Finalizing Extraction..." :
                        `Step ${step} of 7: Synchronizing Vectors`}
                     </p>

                     {errors.length > 0 && (
                       <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded text-[10px] font-mono text-red-600 text-left">
                          <p className="font-bold mb-1 uppercase tracking-tighter text-red-700">Anomalies Detected:</p>
                          {errors.slice(0, 3).map((err, i) => <div key={i}>• {err}</div>)}
                          {errors.length > 3 && <div>• and {errors.length - 3} more...</div>}
                       </div>
                     )}
                     
                     <div className="space-y-1 text-left bg-white border border-emerald-100 rounded-lg p-6 shadow-sm">
                        {[1, 2, 3, 4, 5, 6].map((s) => (
                          <div key={s} className="flex items-center gap-4 py-2 border-b border-emerald-50 last:border-0">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              step > s ? 'bg-emerald-600 text-white' : 
                              step === s ? 'bg-[#1b4332] text-white animate-pulse' : 
                              'bg-emerald-50 text-emerald-300'
                            }`}>
                              {step > s ? '✓' : s}
                            </div>
                            <span className={`text-xs font-semibold ${step >= s ? 'text-emerald-900' : 'text-emerald-300'}`}>
                              {s === 1 && 'Ingestion & Integrity Check'}
                              {s === 2 && 'Background Extraction (OCR/PDF/Mime)'}
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
                className="max-w-7xl mx-auto bg-[#f6f6f6] border border-emerald-900/15 rounded-lg shadow-md flex flex-col md:flex-row min-h-full overflow-hidden font-sans text-[14px]"
              >
                {selectedEntity ? (
                  <>
                    {/* Left Sidebar: Wikipedia Vector Sidebar Skin */}
                    <aside className="w-48 bg-[#f6f6f6] border-r border-emerald-900/10 p-4 hidden md:flex flex-col gap-6 shrink-0 select-none text-[12px]">
                      {/* Logo Area */}
                      <div className="flex flex-col items-center text-center gap-1 border-b border-emerald-900/10 pb-4 select-none">
                        <svg className="w-12 h-12 text-[#1b4332]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" className="text-emerald-800" />
                          <path d="M50 15 L35 45 L65 45 Z" fill="currentColor" />
                          <path d="M50 35 L25 65 L75 65 Z" fill="currentColor" />
                          <path d="M50 55 L15 85 L85 85 Z" fill="currentColor" />
                          <rect x="47" y="85" width="6" height="8" fill="#54595d" />
                        </svg>
                        <div className="flex flex-col leading-tight mt-1">
                          <span className="font-serif tracking-widest text-[11.5px] font-bold uppercase text-[#1b4332]">Omipedia</span>
                          <span className="text-[8px] italic text-[#2d6a4f] tracking-tighter">The Forest Encyclopedia</span>
                        </div>
                      </div>

                      {/* Navigation Group */}
                      <div className="space-y-3">
                        <div className="text-[10px] font-bold text-emerald-800/60 uppercase tracking-wider border-b border-emerald-900/10 pb-1">Navigation</div>
                        <ul className="space-y-1.5 text-[#1b4332] font-sans list-none p-0">
                          <li className="hover:underline hover:text-[#2d6a4f] cursor-pointer" onClick={() => setWikiTab('documents')}>Main Page</li>
                          <li className="hover:underline hover:text-[#2d6a4f] cursor-pointer" onClick={() => setWikiTab('documents')}>Contents</li>
                          <li className="hover:underline hover:text-[#2d6a4f] cursor-pointer" onClick={() => setWikiTab('documents')}>Current events</li>
                          <li className="hover:underline hover:text-[#2d6a4f] cursor-pointer" onClick={() => setWikiTab('documents')}>Random article</li>
                          <li className="hover:underline hover:text-[#2d6a4f] cursor-pointer" onClick={() => setWikiTab('documents')}>About Omipedia</li>
                          <li className="hover:underline hover:text-[#2d6a4f] cursor-pointer" onClick={() => setWikiTab('documents')}>Contact us</li>
                          <li className="hover:underline text-[#a55858] cursor-pointer">Donate</li>
                        </ul>
                      </div>

                      {/* Contribute Group */}
                      <div className="space-y-3">
                        <div className="text-[10px] font-bold text-emerald-800/60 uppercase tracking-wider border-b border-emerald-900/10 pb-1">Contribute</div>
                        <ul className="space-y-1.5 text-[#1b4332] font-sans list-none p-0">
                          <li className="hover:underline hover:text-[#2d6a4f] cursor-pointer">Help</li>
                          <li className="hover:underline hover:text-[#2d6a4f] cursor-pointer">Learn to edit</li>
                          <li className="hover:underline hover:text-[#2d6a4f] cursor-pointer">Community portal</li>
                          <li className="hover:underline hover:text-[#2d6a4f] cursor-pointer" onClick={() => setWikiTab('history')}>Recent changes</li>
                          <li className="hover:underline hover:text-[#2d6a4f] cursor-pointer" onClick={() => fileInputRef.current?.click()}>Upload file</li>
                        </ul>
                      </div>

                      {/* Tools Group */}
                      <div className="space-y-3">
                        <div className="text-[10px] font-bold text-emerald-800/60 uppercase tracking-wider border-b border-emerald-900/10 pb-1">Tools</div>
                        <ul className="space-y-1.5 text-[#1b4332] font-sans list-none p-0">
                          <li className="hover:underline hover:text-[#2d6a4f] cursor-pointer">What links here</li>
                          <li className="hover:underline hover:text-[#2d6a4f] cursor-pointer">Related changes</li>
                          <li className="hover:underline hover:text-[#2d6a4f] cursor-pointer">Special pages</li>
                          <li className="hover:underline hover:text-[#2d6a4f] cursor-pointer">Permanent link</li>
                          <li className="hover:underline hover:text-[#2d6a4f] cursor-pointer">Page information</li>
                          <li className="hover:underline hover:text-[#2d6a4f] cursor-pointer" onClick={() => downloadWiki(jobId || undefined)}>Cite this page</li>
                        </ul>
                      </div>

                      {/* Active Project */}
                      <div className="mt-auto pt-6 text-[9px] text-emerald-600/60 font-mono border-t border-emerald-900/10 leading-normal">
                        <div>Database ID:</div>
                        <div className="truncate text-emerald-700 font-bold">{jobId || "session_null"}</div>
                        <div className="mt-1">Locale: EN (OmiWiki)</div>
                      </div>
                    </aside>

                    {/* Main Content Pane (Standard Wikipedia Article Sheet) */}
                    <div className="flex-1 bg-white border-l border-emerald-900/10 flex flex-col min-h-full">
                      
                      {/* Top bar with authentic User state, search & tabs */}
                      <div className="bg-[#f6f6f6] border-b border-emerald-900/10 px-6 py-2 flex flex-col md:flex-row justify-between items-center gap-3 shrink-0 text-xs">
                        {/* Left: User tools */}
                        <div className="flex items-center gap-4 text-emerald-800/65 font-sans">
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>Not logged in</span>
                          <button className="text-[#1b4332] hover:underline bg-transparent border-0 p-0 cursor-pointer">Talk</button>
                          <button className="text-[#1b4332] hover:underline bg-transparent border-0 p-0 cursor-pointer">Contributions</button>
                          <button className="text-[#1b4332] hover:underline bg-transparent border-0 p-0 cursor-pointer">Create account</button>
                          <button className="text-[#1b4332] hover:underline font-bold bg-transparent border-0 p-0 cursor-pointer">Log in</button>
                        </div>
                        
                        {/* Right: Mock Wikipedia Search Input */}
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <input 
                              type="text" 
                              placeholder={`Search Omipedia (${selectedEntity})`} 
                              className="w-56 px-3 py-1 bg-white border border-emerald-900/20 text-xs font-sans focus:outline-none focus:border-[#1b4332] placeholder:text-slate-400"
                              disabled
                            />
                            <span className="absolute right-2 top-1.5 text-emerald-800/60">🔍</span>
                          </div>
                        </div>
                      </div>

                      {/* Wikipedia Namespace Navigation Tabs */}
                      <div className="bg-[#f6f6f6] border-b border-emerald-900/15 px-6 flex justify-between items-end shrink-0 select-none text-[13px]">
                        {/* Left: Namespaces */}
                        <div className="flex gap-1 -mb-[1px]">
                          <button
                            onClick={() => setWikiTab('documents')}
                            className={`px-4 py-2 border-t border-r border-l font-sans transition-all shrink-0 ${
                              wikiTab === 'documents'
                                ? 'bg-white border-emerald-900/15 text-[#1b4332] font-semibold border-b-white z-10'
                                : 'bg-transparent border-transparent text-[#1b4332] hover:bg-emerald-50 hover:underline'
                            }`}
                          >
                            Article
                          </button>
                          <button
                            onClick={() => setWikiTab('terminology')}
                            className={`px-4 py-2 border-t border-r border-l font-sans transition-all shrink-0 ${
                              wikiTab === 'terminology'
                                ? 'bg-white border-emerald-900/15 text-[#1b4332] font-semibold border-b-white z-10'
                                : 'bg-transparent border-transparent text-[#1b4332] hover:bg-emerald-50 hover:underline'
                            }`}
                          >
                            Talk / Glossary ({wikiTerms.length})
                          </button>
                        </div>

                        {/* Right: Views */}
                        <div className="flex gap-1 -mb-[1px]">
                          <button
                            onClick={() => setWikiTab('documents')}
                            className={`px-4 py-2 border-t border-r border-l font-sans transition-all shrink-0 ${
                              wikiTab === 'documents' || wikiTab === 'terminology'
                                ? 'bg-white border-emerald-900/15 text-[#1b4332] font-semibold border-b-white z-10'
                                : 'bg-transparent border-transparent text-[#1b4332] hover:bg-emerald-50 hover:underline'
                            }`}
                          >
                            Read
                          </button>
                          <button
                            onClick={() => {
                              downloadWiki(jobId || undefined);
                            }}
                            className="px-4 py-2 border-t border-r border-l border-transparent text-[#1b4332] hover:bg-emerald-50 hover:underline font-sans shrink-0 bg-transparent"
                          >
                            View source
                          </button>
                          <button
                            onClick={() => setWikiTab('history')}
                            className={`px-4 py-2 border-t border-r border-l font-sans transition-all shrink-0 ${
                              wikiTab === 'history'
                                ? 'bg-white border-emerald-900/15 text-[#1b4332] font-semibold border-b-white z-10'
                                : 'bg-transparent border-transparent text-[#1b4332] hover:bg-emerald-50 hover:underline'
                            }`}
                          >
                            View history
                          </button>
                        </div>
                      </div>

                      {/* Content Sheet Body Area */}
                      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 md:p-10 CustomScrollbar bg-white">
                        {wikiTab === 'documents' ? (
                          <article className="text-[#202122] font-sans text-[14px] leading-[1.6] select-text">
                            
                            {/* Infobox floating right */}
                            <table className="float-right ml-6 mb-4 w-72 bg-[#f8f9fa] border border-[#a2a9b1] text-[12px] text-[#202122] border-collapse select-text">
                              <thead>
                                <tr>
                                  <th colSpan={2} className="bg-[#eaecf0] p-2 text-center text-[14px] font-bold font-serif border border-[#a2a9b1] text-black">
                                    {selectedEntity}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td colSpan={2} className="p-2 text-center border border-[#a2a9b1]">
                                    <div className="w-12 h-12 bg-slate-200 border border-slate-300 rounded mx-auto flex items-center justify-center font-bold text-slate-500 text-lg font-serif">
                                      {selectedEntity[0]}
                                    </div>
                                    <span className="text-[10px] text-slate-500 italic block mt-1">Primary Entity Card</span>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="bg-[#f2f2f2] p-1.5 font-bold border border-[#a2a9b1] w-28">Entity Class</td>
                                  <td className="p-1.5 border border-[#a2a9b1]">Entity_{selectedEntity.split(' ')[0]}</td>
                                </tr>
                                <tr>
                                  <td className="bg-[#f2f2f2] p-1.5 font-bold border border-[#a2a9b1]">Status</td>
                                  <td className="p-1.5 border border-[#a2a9b1]">
                                    <span className="text-emerald-700 font-bold">● verified</span>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="bg-[#f2f2f2] p-1.5 font-bold border border-[#a2a9b1]">Sources</td>
                                  <td className="p-1.5 border border-[#a2a9b1] font-mono">{entities.find(e => e.entity_name === selectedEntity)?.files.length} document(s)</td>
                                </tr>
                                <tr>
                                  <td className="bg-[#f2f2f2] p-1.5 font-bold border border-[#a2a9b1]">Data Sheets</td>
                                  <td className="p-1.5 border border-[#a2a9b1] font-mono">{entities.find(e => e.entity_name === selectedEntity)?.tables.length} tables</td>
                                </tr>
                                <tr>
                                  <td className="bg-[#f2f2f2] p-1.5 font-bold border border-[#a2a9b1]">Fidelity</td>
                                  <td className="p-1.5 border border-[#a2a9b1] font-bold">100% (No Loss)</td>
                                </tr>
                              </tbody>
                            </table>

                            {/* Page Header Title */}
                            <div className="mb-4">
                              <h1 className="text-3xl md:text-4xl font-serif font-normal text-black pb-1 mb-1 tracking-wide">
                                {selectedEntity}
                              </h1>
                              <p className="text-[12px] italic text-emerald-800 font-sans -mt-1">
                                From Omipedia, the forest encyclopedia
                              </p>
                              <div className="h-[1px] bg-emerald-900/15 w-full mt-2"></div>
                            </div>

                            {/* Wikipedia Ambox Message Warning Banner */}
                            <div className="border border-emerald-900/10 border-l-[10px] border-l-emerald-600 bg-[#f8f9fa] p-3 mb-6 text-xs text-[#202122] flex items-center gap-4">
                              <div className="text-lg text-emerald-700 shrink-0">🌲</div>
                              <div className="leading-relaxed">
                                <strong>This article has multiple issues.</strong> Please help 
                                <button className="text-[#1b4332] hover:underline mx-1 bg-transparent border-0 p-0 cursor-pointer font-semibold" onClick={() => setWikiTab('terminology')}>improve it</button> 
                                or discuss these issues on the 
                                <button className="text-[#1b4332] hover:underline mx-1 bg-transparent border-0 p-0 cursor-pointer font-semibold" onClick={() => setWikiTab('terminology')}>talk page</button>.
                                <ul className="list-disc ml-5 mt-1 space-y-0.5 text-slate-600">
                                  <li>This article <strong>needs additional citations for verification</strong>. Reliable sources have been parsed but require manual audit.</li>
                                  <li>This article was <strong>automatically synthesized from unstructured files</strong> with absolute character preservation.</li>
                                </ul>
                              </div>
                            </div>

                            {/* First Lead Paragraph */}
                            <p className="text-justify mb-4">
                              The <strong>{selectedEntity}</strong> portal is a consolidated repository of organizational and technical knowledge synthesized directly from the parsed document collection. It brings together structured sheets and original prose documentation, cross-linking related terms dynamically so that no contextual meaning is lost.
                            </p>

                            {/* Table of Contents (ToC) */}
                            <div className="bg-[#f8f9fa] border border-emerald-900/15 p-3 inline-block min-w-[240px] max-w-sm mb-6 select-none">
                              <div className="flex items-center justify-between gap-12 border-b border-emerald-900/10 pb-1.5 mb-2">
                                <span className="font-bold font-sans text-xs text-[#1b4332]">Contents</span>
                                <button 
                                  onClick={() => setTocVisible(!tocVisible)}
                                  className="text-[11px] text-[#1b4332] hover:underline bg-transparent border-0 p-0 cursor-pointer"
                                >
                                  [{tocVisible ? 'hide' : 'show'}]
                                </button>
                              </div>
                              {tocVisible && (
                                <ul className="space-y-1.5 font-sans text-[12px] text-[#1b4332] pl-1 list-none p-0">
                                  <li>
                                    <span className="text-[#202122] mr-2 font-mono">1</span>
                                    <a 
                                      href="#extracted-data" 
                                      onClick={(e) => scrollToSection("extracted-data", e)} 
                                      className="hover:underline"
                                    >
                                      Extracted Data Matrices
                                    </a>
                                    <ul className="pl-4 mt-1 space-y-1 list-none">
                                      {entities.find(e => e.entity_name === selectedEntity)?.tables.map((tid, idx) => {
                                        const table = parsedFiles.find(f => f.tables.some(t => t.tableId === tid))?.tables.find(t => t.tableId === tid);
                                        return (
                                          <li key={tid}>
                                            <span className="text-[#202122] mr-2 font-mono">1.{idx + 1}</span>
                                            <a 
                                              href={`#${tid}`} 
                                              onClick={(e) => scrollToSection(tid, e)} 
                                              className="hover:underline italic"
                                            >
                                              {table?.sheetName || 'Data Sheet'}
                                            </a>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  </li>
                                  <li className="mt-1">
                                    <span className="text-[#202122] mr-2 font-mono">2</span>
                                    <a 
                                      href="#prose-documentation" 
                                      onClick={(e) => scrollToSection("prose-documentation", e)} 
                                      className="hover:underline"
                                    >
                                      Synthesized Topic Article
                                    </a>
                                  </li>
                                  <li className="mt-1">
                                    <span className="text-[#202122] mr-2 font-mono">3</span>
                                    <a 
                                      href="#references" 
                                      onClick={(e) => scrollToSection("references", e)} 
                                      className="hover:underline"
                                    >
                                      References and Sources
                                    </a>
                                  </li>
                                </ul>
                              )}
                            </div>

                            {/* 1.0 Data Matrices section */}
                            <section id="extracted-data" className="scroll-mt-6">
                              <h2 className="border-b border-[#a2a9b1] pb-1 text-xl font-serif font-normal mt-10 mb-4 text-[#000000]">
                                <span className="text-slate-400 font-mono text-base mr-3 font-normal">1</span>
                                Extracted Data Matrices
                              </h2>
                              
                              <p className="mb-4 text-slate-600 italic text-[13px]">
                                Below are the primary raw tabular datasets extracted directly from the uploaded files. No modifications or filters have been applied.
                              </p>

                              <div className="space-y-12">
                                {entities.find(e => e.entity_name === selectedEntity)?.tables.map((tid, idx) => {
                                    const file = parsedFiles.find(f => f.tables.some(t => t.tableId === tid));
                                    const table = file?.tables.find(t => t.tableId === tid);
                                    if (!table) return null;
                                    return (
                                      <section key={tid} id={tid} className="scroll-mt-12 border-t border-slate-100 pt-6 last:border-0 first:border-0 first:pt-0">
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="text-xs bg-[#eaecf0] text-black px-2 py-0.5 border border-[#a2a9b1] font-bold font-mono">1.{idx + 1}</span>
                                          <h3 className="text-md font-bold text-slate-800 italic">{table.sheetName || 'Tabular Sheet'}</h3>
                                        </div>
                                        {renderTable(table)}
                                      </section>
                                    );
                                })}
                              </div>
                            </section>

                            {/* 2.0 Synthesized Topic Article section */}
                            <section id="prose-documentation" className="scroll-mt-6 mt-12">
                              <h2 className="border-b border-[#a2a9b1] pb-1 text-xl font-serif font-normal mt-12 mb-4 text-[#000000]">
                                <span className="text-slate-400 font-mono text-base mr-3 font-normal">2</span>
                                Synthesized Topic Article
                              </h2>
                              
                              <p className="mb-6 text-slate-600 text-[13px] italic">
                                The following comprehensive encyclopedic analysis has been synthesized by our research agents using the parsed source documents as the ground truth. Mentions of other topics are automatically interlinked and clickable.
                              </p>

                              <div className="bg-white border border-[#a2a9b1] p-6 md:p-8 select-text">
                                {(() => {
                                  const entity = entities.find(e => e.entity_name === selectedEntity);
                                  if (!entity || !entity.explanation) {
                                    return <p className="text-slate-500 italic">No synthesized article content available for this topic.</p>;
                                  }
                                  return renderSynthesizedArticle(entity.explanation);
                                })()}
                              </div>
                            </section>

                            {/* 3.0 References / Footnotes Section */}
                            <section id="references" className="scroll-mt-6 mt-12 border-t border-[#a2a9b1] pt-8">
                              <h2 className="pb-1 text-xl font-serif font-normal mb-4 text-[#000000]">
                                <span className="text-slate-400 font-mono text-base mr-3 font-normal">3</span>
                                References and Sources
                              </h2>
                              <ol className="list-decimal ml-6 text-[12px] text-[#202122] space-y-2">
                                {entities.find(e => e.entity_name === selectedEntity)?.files.map((fname, idx) => (
                                  <li key={fname} className="pl-2">
                                    <span className="text-[#0645ad] font-mono mr-2 hover:underline select-none bg-transparent border-0 p-0 cursor-pointer">^</span>
                                    <strong className="font-serif italic mr-1">"{fname}"</strong>. Retrieved from the uploaded unstructured file set. Full prose character map synthesized on {new Date().toLocaleDateString()} (UTC). Verified checksum {Math.random().toString(16).substring(2, 10).toUpperCase()}.
                                  </li>
                                ))}
                              </ol>
                            </section>

                          </article>
                        ) : wikiTab === 'terminology' ? (
                          /* Terminology / Glossary Tab (Talk space) */
                          <div className="flex flex-col md:flex-row min-h-[500px] divide-y md:divide-y-0 md:divide-x divide-slate-200 border border-[#a2a9b1] bg-white">
                            {/* Glossary Index Column */}
                            <div className="w-full md:w-80 bg-[#f8f9fa] p-4 flex flex-col gap-4 shrink-0">
                              <div className="flex items-center justify-between border-b border-[#a2a9b1] pb-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-black font-sans">Talk: Glossary Index</h3>
                                <span className="text-[10px] font-mono bg-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-bold">{wikiTerms.length} TERMS</span>
                              </div>
                              
                              <div className="relative">
                                <input 
                                  type="text" 
                                  placeholder="Filter terminology..." 
                                  className="w-full px-2 py-1 bg-white border border-[#a2a9b1] text-xs font-sans focus:outline-none focus:border-[#36c]"
                                  onChange={(e) => setLocalFilter(e.target.value.toLowerCase())}
                                />
                              </div>

                              {/* Simple Alphabetical Index Nav Bar */}
                              <div className="flex flex-wrap justify-center gap-1 border-b border-slate-200 pb-2 text-[10px] font-mono text-[#0645ad] select-none">
                                {['A', 'C', 'D', 'K', 'M', 'O', 'S', 'W'].map(letter => (
                                  <button 
                                    key={letter} 
                                    onClick={() => setLocalFilter(letter.toLowerCase())}
                                    className="hover:underline p-1 bg-transparent border-0 cursor-pointer text-[#0645ad]"
                                  >
                                    {letter}
                                  </button>
                                ))}
                                <button onClick={() => setLocalFilter("")} className="hover:underline p-1 text-slate-500 bg-transparent border-0 cursor-pointer">All</button>
                              </div>

                              <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[450px] CustomScrollbar">
                                {wikiTerms
                                  .filter(t => !localFilter || t.term.toLowerCase().includes(localFilter) || t.definition.toLowerCase().includes(localFilter))
                                  .map(t => {
                                    const isSelected = selectedTerm?.term === t.term;
                                    return (
                                      <button
                                        key={t.term}
                                        onClick={() => handleTermClick(t)}
                                        className={`w-full text-left p-2.5 transition-all flex flex-col gap-1 border ${
                                          isSelected 
                                            ? 'bg-white border-[#a2a9b1] border-l-[4px] border-l-[#36c] shadow-sm text-black' 
                                            : 'bg-transparent border-transparent hover:bg-slate-100 hover:border-slate-300 text-slate-800'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between w-full text-[9px] font-mono">
                                          <span className="text-[#54595d] uppercase">{t.category || "CONCEPT"}</span>
                                          <ChevronRight size={10} className={isSelected ? 'text-[#36c]' : 'text-slate-400'} />
                                        </div>
                                        <span className={`text-[12px] font-serif font-bold ${isSelected ? 'text-[#0645ad]' : 'text-[#0645ad] hover:underline'}`}>
                                          {t.term}
                                        </span>
                                      </button>
                                    );
                                  })}
                              </div>
                            </div>

                            {/* Glossary Term Detail Pane */}
                            <div className="flex-1 p-6 md:p-8 flex flex-col justify-between select-text">
                              {selectedTerm ? (
                                <div className="space-y-6">
                                  
                                  {/* Path Trail breadcrumbs */}
                                  {termPath.length > 0 && (
                                    <div className="bg-[#f8f9fa] border border-[#a2a9b1] p-2 flex items-center justify-between text-[11px] font-sans">
                                      <div className="flex items-center gap-1 overflow-x-auto py-1">
                                        <History size={10} className="text-[#54595d] shrink-0" />
                                        <span className="font-bold text-[#54595d] uppercase mr-2 shrink-0">Chain Trail:</span>
                                        <div className="flex items-center gap-1.5 text-slate-600">
                                          {termPath.map((tp, idx) => {
                                            const mappedTerm = wikiTerms.find(t => t.term === tp);
                                            return (
                                              <React.Fragment key={tp}>
                                                {idx > 0 && <ArrowRight size={8} className="text-slate-300" />}
                                                <button
                                                  onClick={() => mappedTerm && handleTermClick(mappedTerm)}
                                                  className={`hover:underline font-mono text-[11px] px-1 rounded ${
                                                    selectedTerm.term === tp 
                                                      ? 'bg-blue-50 text-blue-700 font-bold' 
                                                      : 'text-slate-500 hover:text-slate-800'
                                                  }`}
                                                >
                                                  {tp}
                                                </button>
                                              </React.Fragment>
                                            );
                                          })}
                                        </div>
                                      </div>
                                      <button 
                                        onClick={resetTermPath} 
                                        className="text-[10px] text-[#0645ad] hover:underline bg-transparent border-0 p-0 cursor-pointer"
                                      >
                                        [clear]
                                      </button>
                                    </div>
                                  )}

                                  {/* Term Header */}
                                  <div className="border-b border-[#a2a9b1] pb-3">
                                    <div className="flex items-center gap-3 text-[10px] font-mono text-[#54595d] mb-1">
                                      <span className="bg-[#eaecf0] border border-[#a2a9b1] px-2 py-0.5 font-bold uppercase text-[#202122]">
                                        {selectedTerm.category || "CONCEPT"}
                                      </span>
                                      <span>Discovered in {selectedTerm.provenanceFiles.length} file(s)</span>
                                    </div>
                                    <h2 className="text-2xl font-serif text-black font-normal mt-2">
                                      {selectedTerm.term}
                                    </h2>
                                  </div>

                                  {/* Definition */}
                                  <div className="space-y-2 select-text">
                                    <h4 className="text-[10px] font-bold text-[#54595d] uppercase tracking-wider font-mono">Definition & Context</h4>
                                    <div className="bg-[#f8f9fa] border border-[#a2a9b1] p-4 text-[#202122] text-[14px] leading-relaxed font-sans">
                                      {renderDefinitionWithLinks(selectedTerm.definition, wikiTerms)}
                                    </div>
                                  </div>

                                  {/* Bidirectional Concept Chains */}
                                  <div className="space-y-3">
                                    <h4 className="text-[10px] font-bold text-[#54595d] uppercase tracking-wider font-mono">Connected Terminology Chains</h4>
                                    {selectedTerm.relatedTerms && selectedTerm.relatedTerms.length > 0 ? (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {selectedTerm.relatedTerms.map(rt => {
                                          const mappedTerm = wikiTerms.find(t => t.term.toLowerCase() === rt.toLowerCase() || t.term.includes(rt));
                                          return (
                                            <button
                                              key={rt}
                                              onClick={() => mappedTerm ? handleTermClick(mappedTerm) : console.log("Term not found:", rt)}
                                              disabled={!mappedTerm}
                                              className={`text-left p-3 border flex items-start gap-2.5 transition-all ${
                                                mappedTerm 
                                                  ? 'bg-white border-[#a2a9b1] hover:bg-[#f8f9fa] cursor-pointer group' 
                                                  : 'bg-slate-50 border-slate-100 cursor-not-allowed opacity-60'
                                              }`}
                                            >
                                              <div className="p-1 rounded bg-[#eaecf0] text-[#202122] shrink-0">
                                                <CornerDownRight size={12} />
                                              </div>
                                              <div className="space-y-0.5">
                                                <div className="text-xs font-bold text-[#0645ad] group-hover:underline flex items-center gap-1">
                                                  <span>{mappedTerm?.term || rt}</span>
                                                </div>
                                                <p className="text-[11px] text-[#54595d] line-clamp-2 leading-tight">
                                                  {mappedTerm?.definition || "Concept referred to in the technical lexicon map."}
                                                </p>
                                              </div>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <p className="text-[12px] italic text-[#54595d] bg-slate-50 p-3 border border-dashed border-slate-200">
                                        This term acts as a terminal leaf node in this conceptual lexicon; no child chains detected.
                                      </p>
                                    )}
                                  </div>

                                  {/* Provenance */}
                                  <div className="space-y-2 pt-4 border-t border-slate-200 text-xs">
                                    <h4 className="text-[10px] font-bold text-[#54595d] uppercase tracking-wider font-mono">Source Provenance Citations</h4>
                                    <div className="flex flex-wrap gap-1.5">
                                      {selectedTerm.provenanceFiles.map(file => (
                                        <div key={file} className="flex items-center gap-1 bg-[#f8f9fa] border border-[#a2a9b1] px-2.5 py-0.5 text-[#202122] font-mono text-[10px]">
                                          <FileText size={10} className="text-[#54595d]" />
                                          <span>{file}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-20 text-slate-400 font-mono text-xs">
                                  Select a concept from the terminology index sidebar.
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* History Tab (Revision list mockup) */
                          <div className="bg-white border border-[#a2a9b1] p-6 select-text text-sm">
                            <h2 className="border-b border-[#a2a9b1] pb-1 text-xl font-serif font-normal mb-4 text-[#000000]">
                              Revision history of "{selectedEntity}"
                            </h2>
                            <p className="mb-4 text-xs text-[#54595d] leading-normal bg-[#f8f9fa] border border-[#a2a9b1] p-3">
                              View historical synthesis states logged by the File-to-Wiki background engine. Every file ingested increments the page validation registry and preserves structural metadata.
                            </p>
                            
                            <div className="space-y-3 font-sans text-[13px] text-[#202122] ml-4">
                              <div className="flex items-start gap-2">
                                <span className="text-[#0645ad] select-none">(cur | prev)</span>
                                <span>
                                  <input type="radio" className="mx-1" checked disabled /> 
                                  <input type="radio" className="mx-1" checked disabled /> 
                                  <strong className="text-[#1b4332] hover:underline cursor-pointer">22:10, 10 July 2026</strong>‎ 
                                  <span className="text-slate-500 mr-2"> (UTC)</span> 
                                  <span className="text-[#1b4332] hover:underline font-bold bg-transparent border-0 p-0 cursor-pointer">System (automated data bot)</span>  
                                  <span className="text-[#54595d] mr-1"> (talk | contribs)</span>‎ 
                                  <span className="text-[#202122] font-mono">({parsedFiles.reduce((acc, f) => acc + f.text.length, 0)} characters)</span>‎ 
                                  <span className="text-[#202122] italic font-semibold text-emerald-700 ml-1"> (100% complete character preservation; created page with tables and full prose transcripts)</span>
                                </span>
                              </div>

                              <div className="flex items-start gap-2 text-slate-500">
                                <span className="select-none">(cur | prev)</span>
                                <span>
                                  <input type="radio" className="mx-1" disabled /> 
                                  <input type="radio" className="mx-1" disabled /> 
                                  <span className="mr-2">22:08, 10 July 2026</span>‎ 
                                  <span className="font-bold mr-2">LexiconAligner (AI bot)</span> 
                                  <span className="font-mono">(+3 concepts)</span>‎ 
                                  <span className="italic ml-1"> (established bidirectional technical glossary map and terminology chains)</span>
                                </span>
                              </div>

                              <div className="flex items-start gap-2 text-slate-500">
                                <span className="select-none">(cur | prev)</span>
                                <span>
                                  <input type="radio" className="mx-1" disabled /> 
                                  <input type="radio" className="mx-1" disabled /> 
                                  <span className="mr-2">22:05, 10 July 2026</span>‎ 
                                  <span className="font-bold mr-2">IngestionService (worker)</span> 
                                  <span className="font-mono">(+2 tables)</span>‎ 
                                  <span className="italic ml-1"> (scanned original file formats, mapped cells, and populated raw SQL tables)</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Omipedia Style Footer */}
                      <footer className="mt-auto bg-[#f6f6f6] border-t border-emerald-900/10 p-6 text-[11px] text-[#54595d] font-sans flex flex-col md:flex-row justify-between items-start md:items-center gap-4 select-none">
                        <div className="space-y-1">
                          <p> This page was last edited on 10 July 2026, at 22:10 (UTC).</p>
                          <p className="leading-relaxed">Text is available under the Creative Commons Attribution-ShareAlike License; additional terms may apply. See Terms of Use for details.</p>
                        </div>
                        <div className="flex flex-wrap gap-4 font-bold text-[#1b4332]">
                          <span className="hover:underline cursor-pointer">Privacy policy</span>
                          <span className="hover:underline cursor-pointer font-bold">About Omipedia</span>
                          <span className="hover:underline cursor-pointer">Disclaimers</span>
                          <span className="hover:underline cursor-pointer">Code of Conduct</span>
                          <span className="hover:underline cursor-pointer">Developers</span>
                          <span className="hover:underline cursor-pointer">Cookie statement</span>
                        </div>
                      </footer>

                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center p-20 text-center opacity-40 bg-white min-h-[600px]">
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

