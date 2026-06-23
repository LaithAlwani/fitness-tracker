"use client";

import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@liftify/convex";
import { BellRinging } from "@phosphor-icons/react";

function urlBase64ToUint8Array(base64: string) {
  // Tolerate values that picked up quotes / whitespace / newlines in env config.
  const clean = base64
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, "");
  if (!/^[A-Za-z0-9_-]+$/.test(clean)) {
    throw new Error(
      "Push key looks invalid — check NEXT_PUBLIC_VAPID_PUBLIC_KEY (no quotes or spaces).",
    );
  }
  const padding = "=".repeat((4 - (clean.length % 4)) % 4);
  const normalized = (clean + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushToggle() {
  const enabled = useQuery(api.push.pushEnabled, {});
  const save = useMutation(api.push.savePushSubscription);
  const remove = useMutation(api.push.removePushSubscription);
  const sendTest = useAction(api.push.sendTest);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window,
    );
  }, []);

  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim().replace(
    /^["']|["']$/g,
    "",
  );

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      if (!supported) throw new Error("Push isn't supported on this browser.");
      if (!vapid) throw new Error("Push isn't configured yet.");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        throw new Error("Notification permission was not granted.");
      }
      // Make sure a service worker is registered and active. It may not be yet
      // (auto-register only runs in production, and registration is async), so
      // register on demand and wait until it's controlling the page.
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        try {
          reg = await navigator.serviceWorker.register("/sw.js");
        } catch {
          throw new Error(
            "Couldn't start the background service. Make sure you're on https (or have added Liftify to your Home Screen on iPhone), then try again.",
          );
        }
      }
      const ready = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<ServiceWorkerRegistration | null>((resolve) =>
          setTimeout(() => resolve(null), 10_000),
        ),
      ]);
      const active = ready ?? reg;
      const sub = await active.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });
      const keys = (sub.toJSON().keys ?? {}) as { p256dh: string; auth: string };
      await save({ endpoint: sub.endpoint, p256dh: keys.p256dh, auth: keys.auth });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not enable push.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await remove({ endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not turn off push.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-card border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 font-medium">
        <BellRinging weight="bold" className="size-4 text-accent-strong" />
        Push reminders
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Get your weekly weigh-in reminder on this device — even when the app is
        closed.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {enabled ? (
          <>
            <button
              onClick={disable}
              disabled={busy}
              className="rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
            >
              {busy ? "Working…" : "Turn off push"}
            </button>
            <button
              onClick={async () => {
                setError(null);
                setNote(null);
                try {
                  await sendTest({});
                  setNote("Test sent — check your notifications.");
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Could not send test.",
                  );
                }
              }}
              disabled={busy}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-strong disabled:opacity-50"
            >
              Send test
            </button>
          </>
        ) : (
          <button
            onClick={enable}
            disabled={busy}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-strong disabled:opacity-50"
          >
            {busy ? "Working…" : "Enable push"}
          </button>
        )}
      </div>
      {note && <p className="mt-2 text-sm text-accent-strong">{note}</p>}
      {!supported && (
        <p className="mt-2 text-xs text-muted-foreground">
          Not supported here. On iPhone, install Liftify to your Home Screen
          first; on desktop/Android use a supported browser.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
