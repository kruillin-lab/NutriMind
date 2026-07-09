"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, QrCode, Image as ImageIcon, Loader2, AlertCircle, CheckCircle } from "lucide-react";

export interface NutritionResult {
  name: string;
  servingSize?: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  vitaminCMg: number;
  calciumMg: number;
  ironMg: number;
  potassiumMg: number;
}

interface ScannerModalProps {
  onResult: (result: NutritionResult) => void;
  onClose: () => void;
}

type Tab = "barcode" | "label";
type Status = "idle" | "scanning" | "loading" | "error";

export function ScannerModal({ onResult, onClose }: ScannerModalProps) {
  const [tab, setTab] = useState<Tab>("barcode");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NutritionResult | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Start barcode scanner when on barcode tab and no result yet
  useEffect(() => {
    if (tab !== "barcode" || result) return;

    let active = true;

    async function start() {
      if (!videoRef.current) return;
      setStatus("scanning");
      setError(null);

      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();

        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          async (scanResult) => {
            if (!active || !scanResult) return;
            active = false;
            controls.stop();

            setStatus("loading");
            try {
              const res = await fetch(
                `/api/scan-barcode?barcode=${encodeURIComponent(scanResult.getText())}`
              );
              const data = await res.json();
              if (!res.ok || !data.success) {
                setError(data.error ?? "Product not found");
                setStatus("error");
                return;
              }
              setResult(data.product);
              setStatus("idle");
            } catch {
              setError("Failed to look up product");
              setStatus("error");
            }
          }
        );

        controlsRef.current = controls;
      } catch {
        setError("Could not access camera. Check browser permissions.");
        setStatus("error");
      }
    }

    start();

    return () => {
      active = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [tab, result]);

  function switchTab(next: Tab) {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setTab(next);
    setResult(null);
    setError(null);
    setStatus("idle");
  }

  function retry() {
    setResult(null);
    setError(null);
    setStatus("idle");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("loading");
    setError(null);

    try {
      const compressed = await compressImage(file);
      const res = await fetch("/api/parse-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: compressed }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? "Failed to parse label");
        setStatus("error");
        return;
      }

      setResult(data.nutrition);
      setStatus("idle");
    } catch {
      setError("Failed to process image");
      setStatus("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-background border-b border-border">
        <h2 className="text-lg font-bold tracking-[-0.02em] text-foreground">Scan Food</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex bg-background border-b border-border">
        {(["barcode", "label"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`smallcaps flex-1 py-3 flex items-center justify-center gap-2 border-b-2 transition-colors ${
              tab === t
                ? "text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            style={tab === t ? { borderColor: "var(--brass)" } : undefined}
          >
            {t === "barcode" ? <QrCode className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
            {t === "barcode" ? "Barcode" : "Nutrition Label"}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
        {result ? (
          <ResultCard result={result} onRetry={retry} onConfirm={(edited) => onResult(edited)} />
        ) : tab === "barcode" ? (
          <BarcodeView videoRef={videoRef} status={status} error={error} onRetry={retry} />
        ) : (
          <LabelView
            fileRef={fileRef}
            status={status}
            error={error}
            onSelect={handleImageSelect}
          />
        )}
      </div>
    </div>
  );
}

// ── Sub-views ─────────────────────────────────────────────────────────────────

function ResultCard({
  result,
  onRetry,
  onConfirm,
}: {
  result: NutritionResult;
  onRetry: () => void;
  onConfirm: (edited: NutritionResult) => void;
}) {
  const [editedName, setEditedName] = useState(result.name);

  const handleConfirm = () => {
    onConfirm({ ...result, name: editedName.trim() || result.name });
  };

  return (
    <div className="surface w-full max-w-sm space-y-5 overflow-hidden p-6">
      <div className="foil -mx-6 -mt-6 mb-1" />
      <div className="flex items-center gap-2" style={{ color: "var(--ledger-green)" }}>
        <CheckCircle className="h-5 w-5" />
        <span className="smallcaps">Found</span>
      </div>
      <div>
        <label className="smallcaps mb-1 block">Name (editable)</label>
        <Input
          value={editedName}
          onChange={(e) => setEditedName(e.target.value)}
          className="h-auto rounded-sm py-1.5 text-lg font-semibold leading-tight"
        />
        {result.servingSize && (
          <p className="mt-0.5 text-sm text-muted-foreground">Per serving: {result.servingSize}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="surface-raised col-span-2 p-3 text-center">
          <p className="num-display text-3xl text-foreground">{result.calories}</p>
          <p className="smallcaps mt-0.5">Calories</p>
        </div>
        {[
          ["Protein", `${result.proteinG}g`],
          ["Carbs", `${result.carbsG}g`],
          ["Fat", `${result.fatG}g`],
          ["Fiber", `${result.fiberG}g`],
          ["Sugar", `${result.sugarG}g`],
          ["Sodium", `${result.sodiumMg}mg`],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between">
            <span className="smallcaps">{label}</span>
            <span className="num font-medium text-foreground">{value}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <button className="btn-ghost flex-1" onClick={onRetry}>
          Scan Again
        </button>
        <button className="btn-primary flex-1" onClick={handleConfirm}>
          Log This
        </button>
      </div>
    </div>
  );
}

function BarcodeView({
  videoRef,
  status,
  error,
  onRetry,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  status: Status;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-5">
      <div className="relative w-full aspect-square rounded-sm overflow-hidden bg-zinc-900">
        <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
        {/* Corner brackets overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-52 h-52 relative">
            {["tl", "tr", "bl", "br"].map((pos) => (
              <div
                key={pos}
                className={`absolute w-7 h-7 border-2 ${
                  pos === "tl"
                    ? "top-0 left-0 border-r-0 border-b-0"
                    : pos === "tr"
                    ? "top-0 right-0 border-l-0 border-b-0"
                    : pos === "bl"
                    ? "bottom-0 left-0 border-r-0 border-t-0"
                    : "bottom-0 right-0 border-l-0 border-t-0"
                }`}
                style={{ borderColor: "var(--brass-foil)" }}
              />
            ))}
          </div>
        </div>
        {status === "loading" && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Loader2 className="h-10 w-10 text-white animate-spin" />
          </div>
        )}
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-3 rounded-sm bg-card/95 px-4 py-3 text-center">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <p className="text-sm text-foreground">{error}</p>
          <button className="btn-ghost" onClick={onRetry}>
            Try Again
          </button>
        </div>
      ) : (
        <p className="smallcaps text-center text-white/60">
          {status === "loading" ? "Looking up product…" : "Point camera at a barcode"}
        </p>
      )}
    </div>
  );
}

function LabelView({
  fileRef,
  status,
  error,
  onSelect,
}: {
  fileRef: React.RefObject<HTMLInputElement | null>;
  status: Status;
  error: string | null;
  onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  if (status === "loading") {
    return (
      <div className="flex flex-col items-center gap-4 text-white">
        <Loader2 className="h-12 w-12 animate-spin" />
        <p className="text-sm text-white/70">Reading nutrition label…</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-5">
      <div className="w-full border-2 border-dashed border-white/25 rounded-sm p-10 flex flex-col items-center gap-3 text-white/60">
        <ImageIcon className="h-14 w-14" />
        <p className="text-sm text-center">
          Take a photo of a nutrition facts panel or upload an image
        </p>
      </div>
      {error && (
        <div className="flex items-center gap-2 rounded-sm bg-card/95 px-3 py-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onSelect}
      />
      <button className="btn-primary w-full" onClick={() => fileRef.current?.click()}>
        <ImageIcon className="h-4 w-4 mr-2" />
        Take Photo / Upload
      </button>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function compressImage(file: File, maxWidth = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}
