"use client";

import { ArrowSquareOut, ShoppingBag } from "@phosphor-icons/react";
import { SHOP_PRODUCTS, productUrl } from "@/lib/shop";

export default function ShopPage() {
  const categories = [...new Set(SHOP_PRODUCTS.map((p) => p.category))];

  return (
    <div className="container-page flex flex-col gap-6 py-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tighter">Shop</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gear we rate. As an Amazon Associate, Liftify earns from qualifying
          purchases — at no extra cost to you.
        </p>
      </div>

      {categories.map((cat) => (
        <section key={cat} className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">{cat}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SHOP_PRODUCTS.filter((p) => p.category === cat).map((p) => {
              const href = productUrl(p);
              return (
                <div
                  key={p.id}
                  className="flex flex-col justify-between gap-4 rounded-card border border-border bg-card p-5"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent-strong">
                      <ShoppingBag weight="bold" className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium">{p.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {p.blurb}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    {p.price ? (
                      <span className="text-sm font-semibold tabular-nums">
                        {p.price}
                      </span>
                    ) : (
                      <span />
                    )}
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="sponsored noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-strong"
                      >
                        View on Amazon
                        <ArrowSquareOut weight="bold" className="size-4" />
                      </a>
                    ) : (
                      <span className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground">
                        Coming soon
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
