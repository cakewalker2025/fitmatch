"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseUser } from "@/lib/supabase/useUser";

type AuthMode = "login" | "signup";
type FormStatus = "idle" | "submitting";

export default function AuthSection() {
  const supabase = useMemo(() => createClient(), []);
  const { user, loading: authLoading } = useSupabaseUser();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setInfoMessage(null);
    setFormStatus("submitting");

    const { data, error } =
      mode === "signup"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setFormError(error.message);
      setFormStatus("idle");
      return;
    }

    if (mode === "signup" && !data.session) {
      setInfoMessage("Check your email to confirm your account.");
      setFormStatus("idle");
      return;
    }

    setFormStatus("idle");
    setEmail("");
    setPassword("");
  }

  async function handleLogOut() {
    await supabase.auth.signOut();
  }

  if (authLoading) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-500 dark:text-zinc-500">Loading account…</p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          Signed in as <span className="font-medium">{user.email}</span>
        </p>
        <button
          type="button"
          onClick={handleLogOut}
          className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold tracking-tight text-black dark:text-zinc-50">
          {mode === "login" ? "Log In" : "Sign Up"}
        </h2>
        <button
          type="button"
          onClick={() => {
            setMode((prev) => (prev === "login" ? "signup" : "login"));
            setFormError(null);
            setInfoMessage(null);
          }}
          className="ml-auto text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          {mode === "login" ? "Need an account? Sign up" : "Have an account? Log in"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          />
        </div>

        <button
          type="submit"
          disabled={formStatus === "submitting"}
          className="flex h-10 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-[#ccc]"
        >
          {formStatus === "submitting"
            ? "Please wait…"
            : mode === "login"
              ? "Log In"
              : "Sign Up"}
        </button>

        {formError && (
          <p className="text-sm text-red-700 dark:text-red-400">{formError}</p>
        )}
        {infoMessage && (
          <p className="text-sm text-green-700 dark:text-green-400">{infoMessage}</p>
        )}
      </form>
    </div>
  );
}
