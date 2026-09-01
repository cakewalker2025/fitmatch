"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Garment, Outfit, UserProfile } from "@/lib/types";
import AuthSection from "@/components/AuthSection";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseUser } from "@/lib/supabase/useUser";

const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const PROFILE_SAVE_DEBOUNCE_MS = 800;

const CONFIDENCE_DOT_COLOR: Record<Outfit["confidence"], string> = {
  high: "bg-green-500",
  medium: "bg-amber-500",
  low: "bg-rose-500",
};

type Status = "idle" | "loading" | "success" | "error";

type ProfileDraft = {
  skinUndertone: UserProfile["skinUndertone"] | "";
  skinDepth: UserProfile["skinDepth"] | "";
  hairColor: string;
  eyeColor: string;
  bodyShape: string;
  height: string;
  occasion: string;
  weather: string;
};

const EMPTY_PROFILE_DRAFT: ProfileDraft = {
  skinUndertone: "",
  skinDepth: "",
  hairColor: "",
  eyeColor: "",
  bodyShape: "",
  height: "",
  occasion: "",
  weather: "",
};

function CustomSelect<T extends string>({
  value,
  options,
  hint,
  placeholder = "Select…",
  onChange,
}: {
  value: T | "";
  options: { value: T; label: string }[];
  hint: string;
  placeholder?: string;
  onChange: (value: T) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const selectedLabel = options.find((option) => option.value === value)?.label;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-lg border border-zinc-300 bg-white px-3 py-2 text-left text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
      >
        {selectedLabel ?? <span className="text-zinc-400 dark:text-zinc-500">{placeholder}</span>}
        <span className="text-zinc-400 dark:text-zinc-500">▾</span>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-zinc-300 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <p className="border-b border-zinc-200 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
            {hint}
          </p>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const MAX_UPLOAD_DIMENSION = 1600;
const UPLOAD_JPEG_QUALITY = 0.8;

function resizeImageToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const scale = Math.min(1, MAX_UPLOAD_DIMENSION / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      URL.revokeObjectURL(objectUrl);

      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL("image/jpeg", UPLOAD_JPEG_QUALITY);
      resolve({ base64: dataUrl.split(",")[1] ?? "", mediaType: "image/jpeg" });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };

    img.src = objectUrl;
  });
}

export default function Home() {
  const { user, loading: authLoading } = useSupabaseUser();
  const supabase = useMemo(() => createClient(), []);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [closet, setCloset] = useState<Garment[]>([]);
  const [closetLoaded, setClosetLoaded] = useState(false);
  const [closetLoadError, setClosetLoadError] = useState<string | null>(null);
  const [closetActionError, setClosetActionError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileDraft>(EMPTY_PROFILE_DRAFT);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [outfitStatus, setOutfitStatus] = useState<Status>("idle");
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [outfitErrorMessage, setOutfitErrorMessage] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      setCloset([]);
      setClosetLoaded(false);
      return;
    }

    let cancelled = false;
    setClosetLoaded(false);
    setClosetLoadError(null);

    supabase
      .from("garments")
      .select("id, primary_color, secondary_colors, category, pattern, fabric_weight, formality")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;

        if (error) {
          setClosetLoadError(error.message);
        } else {
          setCloset(
            (data ?? []).map((row) => ({
              id: row.id,
              category: row.category,
              primaryColor: row.primary_color,
              secondaryColors: row.secondary_colors ?? [],
              pattern: row.pattern,
              fabricWeight: row.fabric_weight,
              formality: row.formality,
            }))
          );
        }
        setClosetLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user, supabase]);

  useEffect(() => {
    if (!user) {
      setProfile(EMPTY_PROFILE_DRAFT);
      setProfileLoaded(false);
      return;
    }

    let cancelled = false;
    setProfileLoaded(false);
    setProfileLoadError(null);

    supabase
      .from("profiles")
      .select(
        "skin_undertone, skin_depth, hair_color, eye_color, body_shape, height, occasion, weather"
      )
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;

        if (error) {
          setProfileLoadError(error.message);
        } else {
          setProfile(
            data
              ? {
                  skinUndertone: (data.skin_undertone ?? "") as ProfileDraft["skinUndertone"],
                  skinDepth: (data.skin_depth ?? "") as ProfileDraft["skinDepth"],
                  hairColor: data.hair_color ?? "",
                  eyeColor: data.eye_color ?? "",
                  bodyShape: data.body_shape ?? "",
                  height: data.height ?? "",
                  occasion: data.occasion ?? "",
                  weather: data.weather ?? "",
                }
              : EMPTY_PROFILE_DRAFT
          );
        }
        setProfileLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user, supabase]);

  useEffect(() => {
    if (!user || !profileLoaded) return;

    const timeoutId = setTimeout(() => {
      supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            skin_undertone: profile.skinUndertone || null,
            skin_depth: profile.skinDepth || null,
            hair_color: profile.hairColor || null,
            eye_color: profile.eyeColor || null,
            body_shape: profile.bodyShape || null,
            height: profile.height || null,
            occasion: profile.occasion || null,
            weather: profile.weather || null,
          },
          { onConflict: "id" }
        )
        .then(({ error }) => {
          setProfileSaveError(error ? error.message : null);
        });
    }, PROFILE_SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [profile, user, profileLoaded, supabase]);

  const isProfileComplete =
    profile.skinUndertone !== "" &&
    profile.skinDepth !== "" &&
    profile.hairColor.trim() !== "" &&
    profile.eyeColor.trim() !== "" &&
    profile.bodyShape.trim() !== "" &&
    profile.height.trim() !== "" &&
    profile.occasion.trim() !== "";

  function updateProfile<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

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
    if (!selectedFile || !user) return;

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
      const { base64, mediaType } = await resizeImageToBase64(selectedFile);

      const response = await fetch("/api/analyze-garment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ base64, mediaType }),
      });

      let body;
      try {
        body = await response.json();
      } catch {
        setStatus("error");
        setErrorMessage(
          "Something went wrong on the server. Please try a smaller photo or try again."
        );
        return;
      }

      if (!response.ok) {
        setStatus("error");
        setErrorMessage(body.error ?? "Something went wrong analyzing the image.");
        return;
      }

      const garment = body as Garment;

      const { error: insertError } = await supabase.from("garments").insert({
        id: garment.id,
        user_id: user.id,
        primary_color: garment.primaryColor,
        secondary_colors: garment.secondaryColors,
        category: garment.category,
        pattern: garment.pattern,
        fabric_weight: garment.fabricWeight,
        formality: garment.formality,
      });

      if (insertError) {
        setStatus("error");
        setErrorMessage(`Couldn't save the garment: ${insertError.message}`);
        return;
      }

      setCloset((prev) => [garment, ...prev]);

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

  async function handleDeleteGarment(id: string) {
    setClosetActionError(null);

    const { error } = await supabase.from("garments").delete().eq("id", id);

    if (error) {
      setClosetActionError(error.message);
      return;
    }

    setCloset((prev) => prev.filter((g) => g.id !== id));
  }

  const canGenerateOutfits = closet.length >= 2 && isProfileComplete;

  const generateOutfitsHint = canGenerateOutfits
    ? null
    : [
        closet.length < 2 ? "Add at least 2 garments" : null,
        !isProfileComplete ? "Complete your profile above" : null,
      ]
        .filter(Boolean)
        .join(" and ");

  async function handleGenerateOutfits() {
    if (!canGenerateOutfits) return;

    const realProfile: UserProfile = {
      skinUndertone: profile.skinUndertone as UserProfile["skinUndertone"],
      skinDepth: profile.skinDepth as UserProfile["skinDepth"],
      hairColor: profile.hairColor,
      eyeColor: profile.eyeColor,
      bodyShape: profile.bodyShape,
      height: profile.height,
      occasion: profile.occasion,
      ...(profile.weather.trim() !== "" ? { weather: profile.weather } : {}),
    };

    setOutfitStatus("loading");
    setOutfitErrorMessage(null);

    try {
      const response = await fetch("/api/generate-outfit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wardrobe: closet, profile: realProfile }),
      });

      let body;
      try {
        body = await response.json();
      } catch {
        setOutfitStatus("error");
        setOutfitErrorMessage(
          "Something went wrong on the server. Please try a smaller photo or try again."
        );
        return;
      }

      if (!response.ok) {
        setOutfitStatus("error");
        setOutfitErrorMessage(body.error ?? "Something went wrong generating outfits.");
        return;
      }

      setOutfits(body as Outfit[]);
      setOutfitStatus("success");
    } catch (error) {
      setOutfitStatus("error");
      setOutfitErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-xl flex-col gap-6 px-6 py-16">
        <AuthSection />

        {!authLoading && user && (
          <>
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

        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-5 py-4 dark:border-indigo-900 dark:bg-indigo-950">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-black dark:text-zinc-50">
              Your Profile
            </h2>
            {isProfileComplete && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-300">
                ✓ Profile saved
              </span>
            )}
          </div>

          {(profileLoadError || profileSaveError) && (
            <p className="mt-2 text-xs text-red-700 dark:text-red-400">
              {profileLoadError
                ? `Couldn't load your profile: ${profileLoadError}`
                : `Couldn't save your profile: ${profileSaveError}`}
            </p>
          )}

          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Hair Color
              </label>
              <input
                type="text"
                value={profile.hairColor}
                onChange={(e) => updateProfile("hairColor", e.target.value)}
                placeholder="e.g. dark brown"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Eye Color
              </label>
              <input
                type="text"
                value={profile.eyeColor}
                onChange={(e) => updateProfile("eyeColor", e.target.value)}
                placeholder="e.g. brown"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Skin Undertone
              </label>
              <CustomSelect
                value={profile.skinUndertone}
                onChange={(value) => updateProfile("skinUndertone", value)}
                hint="Not sure? Look at the veins on your wrist — greenish usually means warm, blue/purple usually means cool. Or: does gold or silver jewelry suit you better? Gold = warm, silver = cool."
                options={[
                  { value: "warm", label: "Warm" },
                  { value: "cool", label: "Cool" },
                  { value: "neutral", label: "Neutral" },
                ]}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Body Shape
              </label>
              <input
                type="text"
                value={profile.bodyShape}
                onChange={(e) => updateProfile("bodyShape", e.target.value)}
                placeholder="e.g. rectangle"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Height
              </label>
              <input
                type="text"
                value={profile.height}
                onChange={(e) => updateProfile("height", e.target.value)}
                placeholder="e.g. 5'10&quot;"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Occasion
              </label>
              <input
                type="text"
                value={profile.occasion}
                onChange={(e) => updateProfile("occasion", e.target.value)}
                placeholder="e.g. business casual office day"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Skin Depth
              </label>
              <CustomSelect
                value={profile.skinDepth}
                onChange={(value) => updateProfile("skinDepth", value)}
                hint="How light or dark your natural skin tone is overall."
                options={[
                  { value: "light", label: "Light" },
                  { value: "medium", label: "Medium" },
                  { value: "deep", label: "Deep" },
                ]}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Weather <span className="font-normal text-zinc-500 dark:text-zinc-500">(optional)</span>
              </label>
              <input
                type="text"
                value={profile.weather}
                onChange={(e) => updateProfile("weather", e.target.value)}
                placeholder="e.g. mild, 65°F"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold tracking-tight text-black dark:text-zinc-50">
            Your Closet
          </h2>

          {(closetLoadError || closetActionError) && (
            <p className="mt-2 text-xs text-red-700 dark:text-red-400">
              {closetLoadError
                ? `Couldn't load your closet: ${closetLoadError}`
                : `Couldn't remove that garment: ${closetActionError}`}
            </p>
          )}

          {!closetLoaded ? (
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
              Loading your closet…
            </p>
          ) : closet.length === 0 ? (
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
                    onClick={() => handleDeleteGarment(item.id)}
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

        <div>
          <h2 className="text-lg font-semibold tracking-tight text-black dark:text-zinc-50">
            Generate Outfits
          </h2>

          <button
            type="button"
            onClick={handleGenerateOutfits}
            disabled={!canGenerateOutfits || outfitStatus === "loading"}
            className="mt-3 flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-[#ccc]"
          >
            {outfitStatus === "loading" && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-background/40 border-t-background" />
            )}
            {outfitStatus === "loading" ? "Generating…" : "Generate Outfits"}
          </button>

          {!canGenerateOutfits && generateOutfitsHint && (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
              {generateOutfitsHint}
            </p>
          )}

          {outfitStatus === "error" && outfitErrorMessage && (
            <div className="mt-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {outfitErrorMessage}
            </div>
          )}

          {outfitStatus === "success" && outfits.length > 0 && (
            <div className="mt-3 flex flex-col gap-3">
              {outfits.map((outfit, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {outfit.harmonyModel}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      <span
                        className={`h-2 w-2 rounded-full ${CONFIDENCE_DOT_COLOR[outfit.confidence]}`}
                      />
                      {outfit.confidence} confidence
                    </span>
                  </div>

                  <div className="mt-3 flex gap-4">
                    {(["dominant", "secondary", "accent"] as const)
                      .map((role) => ({ role, itemId: outfit.colorRoles[role] }))
                      .filter(
                        (entry): entry is { role: typeof entry.role; itemId: string } =>
                          entry.itemId != null
                      )
                      .map(({ role, itemId }) => {
                        const item = closet.find((g) => g.id === itemId);
                        return (
                          <div key={role} className="flex flex-col items-center gap-1">
                            <div
                              className="h-8 w-8 rounded-md border border-zinc-300 dark:border-zinc-700"
                              style={{ backgroundColor: item?.primaryColor ?? "#e5e7eb" }}
                            />
                            <span className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                              {role}
                            </span>
                          </div>
                        );
                      })}
                  </div>

                  <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
                    {outfit.reasoning}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
          </>
        )}
      </main>
    </div>
  );
}
