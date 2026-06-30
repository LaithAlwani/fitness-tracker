// Amazon Associates shop config. Set your tag in NEXT_PUBLIC_AMAZON_TAG and fill
// each product's `asin` (or a full `url`) with your affiliate links.
export const AMAZON_TAG = process.env.NEXT_PUBLIC_AMAZON_TAG || "";

export type ShopProduct = {
  id: string;
  title: string;
  blurb: string;
  category: string;
  price?: string;
  asin?: string; // Amazon ASIN — preferred; the tag is appended automatically
  url?: string; // full URL override (used as-is)
};

// Placeholder catalog — swap titles/blurbs/ASINs for your real picks.
export const SHOP_PRODUCTS: ShopProduct[] = [
  {
    id: "belt",
    title: "Lever Lifting Belt",
    blurb: "10mm support for heavy squats and deadlifts.",
    category: "Support",
    asin: "",
  },
  {
    id: "wraps",
    title: "Wrist Wraps",
    blurb: "Stiff wraps for pressing and overhead work.",
    category: "Support",
    asin: "",
  },
  {
    id: "sleeves",
    title: "Knee Sleeves (7mm)",
    blurb: "Warmth and rebound out of the hole.",
    category: "Support",
    asin: "",
  },
  {
    id: "chalk",
    title: "Liquid Chalk",
    blurb: "Grip that lasts without the mess.",
    category: "Grip",
    asin: "",
  },
  {
    id: "straps",
    title: "Lifting Straps",
    blurb: "Hold onto heavier pulls for more back gains.",
    category: "Grip",
    asin: "",
  },
  {
    id: "creatine",
    title: "Creatine Monohydrate",
    blurb: "The most studied strength supplement, 5g/day.",
    category: "Supplements",
    asin: "",
  },
  {
    id: "shaker",
    title: "Protein Shaker",
    blurb: "Leak-proof bottle with a blender ball.",
    category: "Gear",
    asin: "",
  },
  {
    id: "bands",
    title: "Resistance Bands Set",
    blurb: "Warm-ups, assistance reps, and mobility.",
    category: "Gear",
    asin: "",
  },
];

export function productUrl(p: ShopProduct): string | null {
  if (p.url) return p.url;
  if (p.asin && AMAZON_TAG) {
    return `https://www.amazon.com/dp/${p.asin}?tag=${AMAZON_TAG}`;
  }
  if (p.asin) return `https://www.amazon.com/dp/${p.asin}`;
  return null; // not configured yet
}
