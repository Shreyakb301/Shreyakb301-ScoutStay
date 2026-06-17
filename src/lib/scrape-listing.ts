/**
 * Server-only Apify caller. Imported exclusively by the API route — never by
 * client components — so the APIFY_TOKEN is never bundled to the browser.
 *
 * We use Apify's run-sync-get-dataset-items endpoint: it runs the actor and
 * returns the dataset items in one request, which suits a single listing.
 */

import "server-only";

import type { ScrapeErrorCode } from "@/lib/scrape-types";

const APIFY_BASE = "https://api.apify.com/v2";
/** Airbnb pages are heavy; give the actor room but cap it. */
const RUN_TIMEOUT_MS = 55_000;

export class ScrapeError extends Error {
  code: ScrapeErrorCode;
  constructor(code: ScrapeErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "ScrapeError";
  }
}

/**
 * Actor input. Different community Airbnb actors expect different keys, so we
 * send the common ones; actors ignore keys they don't recognize.
 */
function isoDate(daysFromNow: number): string {
  const d = new Date(Date.now() + daysFromNow * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export interface ScrapeOptions {
  /** ISO YYYY-MM-DD trip dates and guest count, from the trip intake. */
  checkIn?: string;
  checkOut?: string;
  adults?: number;
}

/**
 * The actor reads dates/guests from the URL query string (that's how Airbnb
 * surfaces a nightly price), so we apply the user's trip dates — or sensible
 * defaults — when the pasted link doesn't already carry them.
 */
function withStayParams(rawUrl: string, opts: ScrapeOptions = {}): string {
  try {
    const url = new URL(rawUrl);
    if (!url.searchParams.has("check_in"))
      url.searchParams.set("check_in", opts.checkIn || isoDate(45));
    if (!url.searchParams.has("check_out"))
      url.searchParams.set("check_out", opts.checkOut || isoDate(48));
    if (!url.searchParams.has("adults"))
      url.searchParams.set("adults", String(opts.adults || 2));
    return url.toString();
  } catch {
    return rawUrl;
  }
}

function buildActorInput(
  url: string,
  opts: ScrapeOptions = {}
): Record<string, unknown> {
  return {
    urls: [withStayParams(url, opts)],
    // The actor requires count >= 10; it still returns a single listing.
    count: 10,
    scrapeDetail: true,
    scrapeReviews: true,
    scrapeAvailability: true,
    currency: "USD",
    proxyConfiguration: { useApifyProxy: true },
  };
}

export async function scrapeAirbnbListing(
  url: string,
  opts: ScrapeOptions = {}
): Promise<unknown[]> {
  const token = process.env.APIFY_TOKEN;
  const actorId = process.env.APIFY_AIRBNB_ACTOR_ID;

  if (!token || !actorId) {
    throw new ScrapeError(
      "not_configured",
      "Scraping is not configured on the server."
    );
  }

  // Actor ids use "/" (user/name); the API path wants it as "user~name".
  const actorPath = encodeURIComponent(actorId).replace("%2F", "~");
  const endpoint =
    `${APIFY_BASE}/acts/${actorPath}/run-sync-get-dataset-items` +
    `?token=${encodeURIComponent(token)}&clean=true`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildActorInput(url, opts)),
      signal: AbortSignal.timeout(RUN_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new ScrapeError("timeout", "The scrape took too long and timed out.");
    }
    throw new ScrapeError("provider_error", "Could not reach the scraping provider.");
  }

  if (response.status === 408 || response.status === 504) {
    throw new ScrapeError("timeout", "The scrape timed out on the provider.");
  }
  if (!response.ok) {
    throw new ScrapeError(
      "provider_error",
      `Scraping provider returned ${response.status}.`
    );
  }

  let items: unknown;
  try {
    items = await response.json();
  } catch {
    throw new ScrapeError("provider_error", "Scraping provider returned invalid data.");
  }

  return Array.isArray(items) ? items : [];
}
