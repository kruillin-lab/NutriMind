"use client";

import NextImage from "next/image";
import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, Plus, Trash2, Loader2, ImageIcon } from "lucide-react";
import { formatLocalDateKey } from "@/lib/date-utils";

interface ProgressPhoto {
  id: string;
  imageData: string;
  mimeType: string;
  photoDate: string;
  caption: string | null;
  weightKg: number | null;
  createdAt: string;
}

export function ProgressPhotos() {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [photoDate, setPhotoDate] = useState(formatLocalDateKey(new Date()));

  const fetchPhotos = useCallback(async () => {
    try {
      const response = await fetch("/api/progress-photos");
      if (response.ok) {
        const data = await response.json();
        setPhotos(data.photos);
      }
    } catch (error) {
      console.error("Error fetching photos:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const compressImage = (file: File, maxWidthPx = 1200): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const scale = Math.min(1, maxWidthPx / img.width);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("Canvas not supported"));
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_MB = 10;
    if (file.size > MAX_MB * 1024 * 1024) {
      alert(`Please choose an image under ${MAX_MB}MB.`);
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    try {
      const compressed = await compressImage(file);
      setPreviewUrl(compressed);
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !previewUrl) return;

    const MAX_BASE64_BYTES = 3 * 1024 * 1024;
    if (previewUrl.length > MAX_BASE64_BYTES) {
      alert("Image is still too large after compression. Please choose a smaller photo.");
      return;
    }

    setUploading(true);
    try {
      const response = await fetch("/api/progress-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData: previewUrl,
          mimeType: "image/jpeg",
          photoDate,
          caption: caption || null,
          weightKg: weightKg ? parseFloat(weightKg) : null,
        }),
      });

      if (response.ok) {
        setDialogOpen(false);
        setSelectedFile(null);
        setPreviewUrl(null);
        setCaption("");
        setWeightKg("");
        fetchPhotos();
      } else {
        const data = await response.json().catch(() => ({}));
        alert(data.error || "Failed to upload photo.");
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
      alert("Failed to upload photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this photo?")) return;

    try {
      const response = await fetch(`/api/progress-photos?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchPhotos();
      }
    } catch (error) {
      console.error("Error deleting photo:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <section className="surface p-6">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="surface overflow-hidden">
        <div className="foil" />
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4" style={{ color: "var(--brass)" }} />
            <h3 className="smallcaps">Progress Photos</h3>
          </div>
          <button onClick={() => setDialogOpen(true)} className="btn-ghost h-8 px-3 text-xs">
            <Plus className="h-4 w-4 mr-1" />
            Add Photo
          </button>
        </div>
        <div className="px-5 py-4">
          {photos.length === 0 ? (
            <div className="text-center py-8">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-sm">
                No progress photos yet
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Take photos to track your visual progress over time
              </p>
              <button
                onClick={() => setDialogOpen(true)}
                className="btn-ghost mt-4 h-8 px-3 text-xs"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Your First Photo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative group aspect-square rounded-sm overflow-hidden border border-border bg-muted"
                >
                  <NextImage
                    src={photo.imageData}
                    alt={photo.caption || "Progress photo"}
                    fill
                    sizes="(min-width: 768px) 33vw, 50vw"
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <p className="text-white text-xs font-medium">
                      {formatDate(photo.photoDate)}
                    </p>
                    {photo.weightKg && (
                      <p className="text-white/80 text-xs num">
                        {photo.weightKg.toFixed(1)} kg
                      </p>
                    )}
                    {photo.caption && (
                      <p className="text-white/70 text-xs truncate mt-1">
                        {photo.caption}
                      </p>
                    )}
                    <button
                      onClick={() => handleDelete(photo.id)}
                      className="mt-2 inline-flex h-7 items-center rounded-sm border border-[var(--ledger-red)]/40 bg-[var(--ledger-red)]/20 px-2 text-xs text-white transition-colors hover:bg-[var(--ledger-red)]/30"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Progress Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="photo" className="smallcaps">Photo</Label>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="rounded-sm"
              />
            </div>

            {previewUrl && (
              <div className="relative aspect-video rounded-sm overflow-hidden border border-border bg-muted">
                <NextImage
                  src={previewUrl}
                  alt="Preview"
                  fill
                  sizes="100vw"
                  className="object-contain"
                  unoptimized
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="photoDate" className="smallcaps">Date</Label>
              <Input
                id="photoDate"
                type="date"
                value={photoDate}
                onChange={(e) => setPhotoDate(e.target.value)}
                className="num rounded-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight" className="smallcaps">Weight (kg, optional)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                placeholder="e.g., 70.5"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="num rounded-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="caption" className="smallcaps">Caption (optional)</Label>
              <Input
                id="caption"
                placeholder="e.g., Week 4 progress"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="rounded-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDialogOpen(false)}
                disabled={uploading}
                className="btn-ghost h-9 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="btn-primary h-9 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-40"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Upload Photo
                  </>
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
