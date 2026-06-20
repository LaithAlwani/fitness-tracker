"use client";

import { useEffect, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useAction } from "convex/react";
import { api } from "@liftify/convex";
import { buttonClass } from "@/components/ui/button";

const PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise: Promise<Stripe | null> | null = PK ? loadStripe(PK) : null;

export function CardUpdate({ onClose }: { onClose: () => void }) {
  const createSetupIntent = useAction(api.billing.createSetupIntent);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(
      window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false,
    );
    createSetupIntent({})
      .then(({ clientSecret }) => setClientSecret(clientSecret))
      .catch((e) =>
        setError(
          e instanceof Error ? e.message : "Could not start card update.",
        ),
      );
  }, [createSetupIntent]);

  if (!stripePromise) {
    return (
      <p className="text-sm text-red-600">
        Card updates aren&apos;t configured (missing publishable key).
      </p>
    );
  }
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!clientSecret) {
    return (
      <p className="text-sm text-muted-foreground">Loading secure card form…</p>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: dark ? "night" : "stripe",
          variables: { colorPrimary: "#84cc16" },
        },
      }}
    >
      <CardForm onClose={onClose} />
    </Elements>
  );
}

function CardForm({ onClose }: { onClose: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const setDefault = useAction(api.billing.setDefaultPaymentMethod);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSaving(true);
    setError(null);

    const result = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    });
    if (result.error) {
      setError(result.error.message ?? "Could not save card.");
      setSaving(false);
      return;
    }
    const si = result.setupIntent;
    const pm =
      typeof si?.payment_method === "string"
        ? si.payment_method
        : si?.payment_method?.id;
    if (!pm) {
      setError("Could not read the new card.");
      setSaving(false);
      return;
    }
    try {
      await setDefault({ paymentMethodId: pm });
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Card saved, but couldn't set it as default.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-accent-strong">
          Payment method updated.
        </p>
        <button
          onClick={onClose}
          className={buttonClass("secondary", "md", "self-start")}
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className={buttonClass("secondary", "md")}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || saving}
          className={buttonClass("primary", "md")}
        >
          {saving ? "Saving…" : "Save card"}
        </button>
      </div>
    </form>
  );
}
