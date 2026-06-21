"use client";

import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@liftify/convex";
import { BellRinging } from "@phosphor-icons/react";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
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

  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

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
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        throw new Error(
          "No service worker yet — install Liftify to your Home Screen (or use the deployed site) to enable push.",
        );
      }
      const sub = await reg.pushManager.subscribe({
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
