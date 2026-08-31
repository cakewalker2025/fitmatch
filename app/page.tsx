"use client";

import { useRef, useState } from "react";
import type { Garment } from "@/lib/types";

const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type Status = "idle" | "loading" | "success" | "error";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [closet, setCloset] = useState<Garment[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    setErrorMessage(null);
    setStatus("idle");

    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      previewUrlRef.current = null;
      return;
    }

    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(url);
    previewUrlRef.current = url;
  }

  async function handleAnalyze() {
    if (!selectedFile) return;

    if (!ALLOWED_MEDIA_TYPES.includes(selectedFile.type)) {
      setStatus("error");
      setErrorMessage(
        `Unsupported file type: ${selectedFile.type || "unknown"}. Please upload a JPEG, PNG, WebP, or GIF image.`
      );
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    try {
      const base64 = await fileToBase64(selectedFile);

      const response = await fetch("/api/analyze-garment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ base64, mediaType: selectedFile.type }),
      });

      const body = await response.json();

      if (!response.ok) {
        setStatus("error");
        setErrorMessage(body.error ?? "Something went wrong analyzing the image.");
        return;
      }

      setCloset((prev) => [body as Garment, ...prev]);

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      previewUrlRef.current = null;
      setSelectedFile(null);
      setPreviewUrl(null);
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-xl flex-col gap-6 px-6 py-16">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            FitMatch — Garment Analyzer
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Upload a photo of a clothing item to extract its color, category, and style attributes.
          </p>
        </div>

        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 bg-white px-6 py-10 text-center transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {selectedFile ? selectedFile.name : "Click to upload a garment photo"}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-500">
            JPEG, PNG, WebP, or GIF
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={handleFileChange}
          />
        </label>

        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Selected garment preview"
            className="max-h-72 w-full rounded-lg border border-zinc-200 object-contain dark:border-zinc-800"
          />
        )}

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={!selectedFile || status === "loading"}
          className="flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-[#ccc]"
        >
          {status === "loading" && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-background/40 border-t-background" />
          )}
          {status === "loading" ? "Analyzing…" : "Analyze"}
        </button>

        {status === "error" && errorMessage && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {errorMessage}
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold tracking-tight text-black dark:text-zinc-50">
            Your Closet
          </h2>

          {closet.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
              No garments yet — upload a photo to get started.
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {closet.map((item) => (
                <div
                  key={item.id}
                  className="relative flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setCloset((prev) => prev.filter((g) => g.id !== item.id))
                    }
                    aria-label="Remove garment"
                    className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  >
                    ×
                  </button>

                  <div
                    className="h-8 w-8 shrink-0 rounded-md border border-zinc-300 dark:border-zinc-700"
                    style={{ backgroundColor: item.primaryColor }}
                  />

                  <dl className="text-xs leading-tight">
                    <dt className="text-zinc-500 dark:text-zinc-500">Category</dt>
                    <dd className="mb-1 text-zinc-800 dark:text-zinc-200">{item.category}</dd>
                    <dt className="text-zinc-500 dark:text-zinc-500">Pattern</dt>
                    <dd className="mb-1 text-zinc-800 dark:text-zinc-200">{item.pattern}</dd>
                    <dt className="text-zinc-500 dark:text-zinc-500">Fabric Weight</dt>
                    <dd className="mb-1 text-zinc-800 dark:text-zinc-200">{item.fabricWeight}</dd>
                    <dt className="text-zinc-500 dark:text-zinc-500">Formality</dt>
                    <dd className="text-zinc-800 dark:text-zinc-200">{item.formality}</dd>
                  </dl>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
