"use client";

import React, { useState, useEffect, useRef, ReactNode } from "react";
import axios from "axios";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PredictionResult {
  class_name: string;
  confidence: number;
  heatmap_base64: string;
}

interface ClassInfo {
  name: string;
  status: string;
  description: string;
  color: string;
  bg: string;
  border: string;
  badge: string;
  badgeText: string;
  risk: number;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const classificationMap: Record<string, ClassInfo> = {
  "benign_keratosis-like_lesions": {
    name: "Benign Keratosis-like Lesion",
    status: "Benign",
    description: "A typically non-cancerous skin growth. Seborrheic or solar keratoses often fall into this category and are considered low-risk, though professional monitoring is always advisable.",
    color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", badge: "#dcfce7", badgeText: "#15803d", risk: 1,
  },
  "basal_cell_carcinoma": {
    name: "Basal Cell Carcinoma",
    status: "Concerning",
    description: "The most common form of skin cancer, originating in basal cells. While rarely life-threatening, it requires prompt medical review and dermatological intervention.",
    color: "#d97706", bg: "#fffbeb", border: "#fde68a", badge: "#fef3c7", badgeText: "#92400e", risk: 3,
  },
  "actinic_keratoses": {
    name: "Actinic Keratosis",
    status: "Pre-cancerous",
    description: "A rough, scaly patch caused by years of UV exposure. Classified as pre-cancerous — prompt consultation with a dermatologist is strongly recommended.",
    color: "#ea580c", bg: "#fff7ed", border: "#fed7aa", badge: "#ffedd5", badgeText: "#9a3412", risk: 3,
  },
  "vascular_lesions": {
    name: "Vascular Lesion",
    status: "Monitor",
    description: "An abnormality involving blood vessels in or beneath the skin. Most are benign, but professional evaluation is recommended to rule out underlying conditions.",
    color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", badge: "#dbeafe", badgeText: "#1e40af", risk: 2,
  },
  "melanocytic_Nevi": {
    name: "Melanocytic Nevus",
    status: "Benign",
    description: "A common mole formed by clustered melanocytes. Typically harmless, but any changes in size, shape, or colour should be promptly reviewed by a medical professional.",
    color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", badge: "#dcfce7", badgeText: "#15803d", risk: 1,
  },
  "melanoma": {
    name: "Melanoma",
    status: "High Risk",
    description: "A serious form of skin cancer arising from melanocytes. Early detection is critical. This classification requires immediate consultation with a board-certified dermatologist or oncologist.",
    color: "#dc2626", bg: "#fef2f2", border: "#fecaca", badge: "#fee2e2", badgeText: "#991b1b", risk: 5,
  },
  "dermatofibroma": {
    name: "Dermatofibroma",
    status: "Benign",
    description: "A small, firm, benign fibrous nodule most commonly found on the legs. Typically harmless and requires no treatment, though any growth changes warrant review.",
    color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", badge: "#dcfce7", badgeText: "#15803d", risk: 1,
  },
};

const riskLabels: string[] = ["", "Low", "Low-Moderate", "Moderate", "Moderate-High", "High"];

// ─── Sub-components ───────────────────────────────────────────────────────────

interface RiskMeterProps {
  risk: number;
}

function RiskMeter({ risk }: RiskMeterProps) {
  const riskColor =
    risk >= 4 ? "#dc2626" :
    risk >= 3 ? "#ea580c" :
    risk >= 2 ? "#2563eb" : "#16a34a";

  const barColor =
    risk >= 5 ? "#dc2626" :
    risk >= 4 ? "#f97316" :
    risk >= 3 ? "#f59e0b" :
    risk >= 2 ? "#3b82f6" : "#22c55e";

  return (
    <div style={{ marginTop: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#6b7280", fontWeight: 600 }}>
          Risk Level
        </span>
        <span style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, color: riskColor }}>
          {riskLabels[risk]}
        </span>
      </div>
      <div style={{ display: "flex", gap: "4px" }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              flex: 1, height: "6px", borderRadius: "99px",
              background: i <= risk ? barColor : "#e5e7eb",
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface ConfidenceRingProps {
  confidence: number;
  color: string;
}

function ConfidenceRing({ confidence, color }: ConfidenceRingProps) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const dash = (confidence / 100) * circ;
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" style={{ display: "block" }}>
      <circle cx="48" cy="48" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
      <circle
        cx="48" cy="48" r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)" }}
      />
      <text x="48" y="44" textAnchor="middle" fontSize="15" fontWeight="700" fill={color}>
        {confidence}%
      </text>
      <text x="48" y="58" textAnchor="middle" fontSize="9" fill="#9ca3af" fontWeight="600" letterSpacing="0.05em">
        CONFIDENCE
      </text>
    </svg>
  );
}

interface AccordionPanelProps {
  title: string;
  children: ReactNode;
}

function AccordionPanel({ title, children }: AccordionPanelProps) {
  const [open, setOpen] = useState<boolean>(false);
  return (
    <div>
      <button className="accordion-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>{title}</span>
        <svg
          style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", flexShrink: 0 }}
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && children}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState<boolean>(false);
  const [revealed, setRevealed] = useState<boolean>(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (result) {
      setTimeout(() => setRevealed(true), 80);
    } else {
      setRevealed(false);
    }
  }, [result]);

  const handleFile = (file: File | null | undefined): void => {
    if (!file || !file.type.startsWith("image/")) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleAnalyze = async (): Promise<void> => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", selectedFile);
    try {
      const response = await axios.post<PredictionResult>(
        "https://skin-cancer-api-da8x.onrender.com/predict",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setResult(response.data);
    } catch {
      setError("Unable to connect to the AI backend. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = (): void => {
    setPreviewUrl(null);
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setRevealed(false);
  };

  const info: ClassInfo | null = result
    ? classificationMap[result.class_name] ?? {
        name: result.class_name,
        status: "Unknown",
        description: "Classification not in current map.",
        color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb",
        badge: "#f3f4f6", badgeText: "#374151", risk: 0,
      }
    : null;

  const confNum: number = result ? Number((result.confidence * 100).toFixed(1)) : 0;

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", minHeight: "100vh", background: "#f8fafc", color: "#111827" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Serif+Display:ital@0;1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f8fafc; }
        .drop-zone { border: 1.5px dashed #cbd5e1; border-radius: 20px; background: #fff; transition: all 0.2s; }
        .drop-zone:hover, .drop-zone.active { border-color: #6366f1; background: #f5f3ff; }
        .btn-primary { background: #1e1b4b; color: #fff; border: none; border-radius: 12px; padding: 13px 28px; font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; letter-spacing: 0.01em; transition: background 0.2s, transform 0.1s; }
        .btn-primary:hover { background: #312e81; }
        .btn-primary:active { transform: scale(0.98); }
        .btn-primary:disabled { background: #a5b4fc; cursor: not-allowed; }
        .btn-secondary { background: transparent; color: #4b5563; border: 1.5px solid #e5e7eb; border-radius: 12px; padding: 12px 24px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .btn-secondary:hover { border-color: #9ca3af; background: #f9fafb; }
        .result-card { opacity: 0; transform: translateY(16px); transition: opacity 0.5s ease, transform 0.5s ease; }
        .result-card.visible { opacity: 1; transform: translateY(0); }
        .spinner { width: 20px; height: 20px; border: 2.5px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; vertical-align: middle; margin-right: 8px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .section-label { font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #9ca3af; margin-bottom: 10px; }
        .disclaimer-block { background: #fffbeb; border: 1px solid #fde68a; border-radius: 16px; padding: 20px 24px; }
        .disclaimer-block.red { background: #fef2f2; border-color: #fecaca; }
        .accordion-btn { width: 100%; background: none; border: none; padding: 14px 18px; text-align: left; cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 600; color: #374151; display: flex; justify-content: space-between; align-items: center; }
        .accordion-btn:hover { background: #f9fafb; }
        .badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
        .tag-chip { display: inline-block; padding: 3px 9px; background: #f1f5f9; color: #475569; border-radius: 999px; font-size: 11px; font-weight: 500; margin: 2px; }
        .how-body { padding: 4px 18px 16px; font-size: 13.5px; color: #6b7280; line-height: 1.75; }
        .how-body strong { color: #374151; font-weight: 600; }
        .accordion-wrap { border: 1.5px solid #e5e7eb; border-radius: 14px; overflow: hidden; margin-bottom: 16px; }
      `}</style>

      {/* Top bar */}
      <div style={{ background: "#1e1b4b", color: "#fff", padding: "0 24px" }}>
        <div style={{ maxWidth: 740, margin: "0 auto", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
            </svg>
            <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: "15px", letterSpacing: "0.01em" }}>Derma Scope Guard</span>
          </div>
          <span style={{ fontSize: "11px", color: "#a5b4fc", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Scan Your Mole
          </span>
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4f46e5 100%)", padding: "48px 24px 52px", color: "#fff" }}>
        <div style={{ maxWidth: 740, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(165,180,252,0.15)", border: "1px solid rgba(165,180,252,0.3)", borderRadius: "999px", padding: "5px 12px", marginBottom: "20px" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a5b4fc" }} />
            <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c7d2fe" }}>
              AI-Assisted Dermatology Triage
            </span>
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 400, lineHeight: 1.15, marginBottom: 14, color: "#fff" }}>
            Skin Lesion<br /><em style={{ color: "#a5b4fc" }}>Analysis Tool</em>
          </h1>
          <p style={{ fontSize: "15px", color: "#c7d2fe", lineHeight: 1.7, maxWidth: 480, marginBottom: 24 }}>
            Upload a dermoscopic or clinical image and receive a classification powered by a Vision Transformer model trained on the HAM10000 dataset.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["Vision Transformer (ViT)", "Grad-CAM Heatmap", "7 Lesion Classes", "HAM10000 Dataset"].map((t) => (
              <span key={t} className="tag-chip" style={{ background: "rgba(255,255,255,0.1)", color: "#e0e7ff", borderRadius: "999px" }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 740, margin: "0 auto", padding: "32px 24px 64px" }}>

        {/* Critical disclaimer */}
        <div className="disclaimer-block red" style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <svg style={{ flexShrink: 0, marginTop: 2 }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#991b1b", marginBottom: 5 }}>⚕ Medical Disclaimer — Read Before Use</p>
              <p style={{ fontSize: "12.5px", color: "#7f1d1d", lineHeight: 1.7 }}>
                This tool is <strong>strictly for educational and research purposes only</strong>. It is <strong>not a medical device</strong>, does not constitute a medical diagnosis, and must never be used as a substitute for professional medical advice, diagnosis, or treatment. AI model outputs can be inaccurate, biased, or misleading. <strong>Always consult a board-certified dermatologist or qualified medical professional</strong> for any skin concern. Do not delay seeking professional medical advice based on results from this tool. In the event of a medical emergency, contact your local emergency services immediately.
              </p>
            </div>
          </div>
        </div>

        {/* How it works accordion */}
        <div className="accordion-wrap">
          <AccordionPanel title="How does this analysis work?">
            <div className="how-body">
              <p style={{ marginBottom: 10 }}><strong>1. Upload</strong> — You provide a clear, well-lit image of a skin lesion. Best results come from dermoscopic images or close-up clinical photos taken under good lighting.</p>
              <p style={{ marginBottom: 10 }}><strong>2. Model Inference</strong> — The image is sent to a backend server running a fine-tuned <strong>Vision Transformer (ViT)</strong> model. ViTs divide the image into patches and apply self-attention to identify diagnostic patterns across the full image context.</p>
              <p style={{ marginBottom: 10 }}><strong>3. Grad-CAM Heatmap</strong> — Gradient-weighted Class Activation Mapping highlights the <strong>exact regions of the image</strong> that most strongly influenced the model's classification. Warmer colours indicate higher influence.</p>
              <p><strong>4. Limitations</strong> — This model was trained on the publicly available HAM10000 dataset and may not generalise to all image conditions, skin tones, or lesion presentations. Confidence scores reflect model certainty, not diagnostic accuracy.</p>
            </div>
          </AccordionPanel>
        </div>

        {/* Upload card */}
        {!previewUrl && (
          <div style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #e5e7eb", padding: 28, boxShadow: "0 4px 24px rgba(0,0,0,0.04)" }}>
            <p className="section-label">Upload Image</p>
            <div
              className={`drop-zone${dragging ? " active" : ""}`}
              style={{ padding: "48px 24px", textAlign: "center", cursor: "pointer" }}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 14px", display: "block" }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p style={{ fontSize: "15px", fontWeight: 600, color: "#374151", marginBottom: 6 }}>Drop image here or click to browse</p>
              <p style={{ fontSize: "12.5px", color: "#9ca3af" }}>Accepts JPG, PNG, WEBP · Close-up clinical or dermoscopic images work best</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFile(e.target.files?.[0])}
              />
            </div>
          </div>
        )}

        {/* Preview + Analyze */}
        {previewUrl && !result && (
          <div style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #e5e7eb", padding: 28, boxShadow: "0 4px 24px rgba(0,0,0,0.04)" }}>
            <p className="section-label">Selected Image</p>
            <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: "0 0 auto" }}>
                <img src={previewUrl} alt="Preview" style={{ width: 160, height: 160, objectFit: "cover", borderRadius: 14, border: "1.5px solid #e5e7eb", display: "block" }} />
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <p style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.7, marginBottom: 20 }}>
                  Image loaded successfully. Click <strong>Analyse Image</strong> to send it to the AI model. Analysis typically takes 10–30 seconds depending on server availability.
                </p>
                {error && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
                    <p style={{ fontSize: "12.5px", color: "#991b1b" }}>{error}</p>
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="btn-primary" onClick={handleAnalyze} disabled={loading} style={{ minWidth: 160 }}>
                    {loading ? <><span className="spinner" />Analysing…</> : "Analyse Image"}
                  </button>
                  <button className="btn-secondary" onClick={reset}>Clear</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Result */}
        {result && info && (
          <div className={`result-card${revealed ? " visible" : ""}`}>
            <div style={{ background: "#fff", borderRadius: 20, border: `1.5px solid ${info.border}`, padding: 28, boxShadow: "0 4px 24px rgba(0,0,0,0.05)", marginBottom: 16 }}>
              <p className="section-label">Analysis Result</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
                <div style={{ flex: "1 1 240px" }}>
                  <span className="badge" style={{ background: info.badge, color: info.badgeText, marginBottom: 12 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: info.color, display: "inline-block" }} />
                    {info.status}
                  </span>
                  <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "26px", fontWeight: 400, color: "#111827", lineHeight: 1.25, marginBottom: 10 }}>
                    {info.name}
                  </h2>
                  <p style={{ fontSize: "13.5px", color: "#6b7280", lineHeight: 1.75, marginBottom: 14 }}>{info.description}</p>
                  <RiskMeter risk={info.risk} />
                </div>
                <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                  <ConfidenceRing confidence={confNum} color={info.color} />
                  {result.heatmap_base64 && (
                    <div>
                      <p style={{ fontSize: "10px", textAlign: "center", color: "#9ca3af", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                        Grad-CAM Heatmap
                      </p>
                      <img
                        src={`data:image/png;base64,${result.heatmap_base64}`}
                        style={{ width: 140, height: 140, objectFit: "cover", borderRadius: 12, border: "1.5px solid #e5e7eb", display: "block" }}
                        alt="Grad-CAM heatmap visualisation"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {info.risk >= 4 && (
              <div className="disclaimer-block red" style={{ marginBottom: 16 }}>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#991b1b", marginBottom: 5 }}>⚕ Urgent Advisory</p>
                <p style={{ fontSize: "12.5px", color: "#7f1d1d", lineHeight: 1.7 }}>
                  This classification indicates a potentially high-risk finding. <strong>Please seek professional medical evaluation as soon as possible.</strong> Do not attempt to self-diagnose or self-treat based on this result. A board-certified dermatologist can perform a proper clinical examination and, if warranted, a biopsy.
                </p>
              </div>
            )}

            <button className="btn-secondary" onClick={reset} style={{ width: "100%", marginTop: 4 }}>
              ↩ Analyse a New Image
            </button>
          </div>
        )}

        {/* Limitations accordion */}
        <div className="accordion-wrap" style={{ marginTop: 28 }}>
          <AccordionPanel title="Known limitations & important caveats">
            <div className="how-body">
              <p style={{ marginBottom: 10 }}><strong>Dataset Bias</strong> — The model was trained on HAM10000, which has limited representation of darker skin tones. Performance may be reduced for individuals with Fitzpatrick skin types IV–VI.</p>
              <p style={{ marginBottom: 10 }}><strong>Image Quality Sensitivity</strong> — The model performs best on high-resolution dermoscopic images taken in controlled lighting. Poor lighting, motion blur, or unusual angles can significantly affect accuracy.</p>
              <p style={{ marginBottom: 10 }}><strong>Confidence ≠ Accuracy</strong> — A high confidence score means the model is certain about its classification, not that the classification is clinically correct. Models can be confidently wrong.</p>
              <p><strong>Scope</strong> — This tool classifies among 7 pre-defined categories only. Skin conditions outside these categories will be incorrectly forced into one of the 7 classes.</p>
            </div>
          </AccordionPanel>
        </div>

        {/* Footer disclaimer */}
        <div className="disclaimer-block" style={{ marginTop: 24 }}>Research Preview
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <svg style={{ flexShrink: 0, marginTop: 2 }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#92400e", marginBottom: 5 }}>Important Information</p>
              <p style={{ fontSize: "12.5px", color: "#78350f", lineHeight: 1.75 }}>
                <strong>Not a medical device.</strong> This tool has not been validated for clinical use, is not FDA-cleared or TGA-registered, and does not comply with any medical device regulatory standard. Results are for research and educational purposes only. <strong>Do not use this tool to make any health or treatment decisions.</strong> If you are concerned about a skin lesion, consult a qualified dermatologist without delay. Image data is transmitted to a third-party server for processing — do not upload images containing identifying information.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 40, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: "12px", color: "#9ca3af" }}>Developed by <strong style={{ color: "#6b7280" }}>LP</strong></span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["No Data Stored"].map((t) => (
              <span key={t} className="tag-chip" style={{ fontSize: "10px" }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
