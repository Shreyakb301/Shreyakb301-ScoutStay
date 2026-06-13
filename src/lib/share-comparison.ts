/**
 * Shareable comparison links — encode the full comparison state (traveler
 * type, stays, preference weights) into a single URL-safe string, entirely
 * client-side. No backend, no shortener service.
 *
 * Encoding pipeline:
 *   compact JSON  ->  UTF-8 bytes  ->  gzip (when available)  ->  base64url
 * A one-char prefix records whether the payload was gzipped ("g") or left
 * raw ("r"), so decoding can dispatch without guessing.
 */

import { PLATFORM_OPTIONS, TRAVELER_TYPES } from "@/lib/mock-data";
import type { CategoryId, ScoreWeights } from "@/lib/scoring";
import type {
  ComparisonRequest,
  Platform,
  StayListing,
  TravelerTypeId,
} from "@/lib/types";

export interface ShareState {
  travelerType: TravelerTypeId;
  stays: StayListing[];
  weights: ScoreWeights;
}

/** The query parameter that carries the encoded state. */
export const SHARE_PARAM = "data";

/**
 * Above this many characters a URL starts to be rejected or truncated by
 * some browsers, servers, and chat apps. We surface a warning rather than
 * hand out a link that may silently break.
 */
export const MAX_SHARE_URL_LENGTH = 8000;

/** Weights serialize to a fixed-order array; this is that order. */
const WEIGHT_ORDER: CategoryId[] = [
  "safetyScore",
  "walkabilityScore",
  "transitScore",
  "foodAccessScore",
  "noiseRiskScore",
  "valueScore",
  "travelerFitScore",
];

/** Compact stay shape — short keys keep the payload small before gzip. */
interface CompactStay {
  n: string;
  u: string;
  p: Platform;
  pr: string;
  a?: string;
  la?: number;
  lo?: number;
  pl?: string;
  c?: string;
  r?: string;
  no?: string;
}

interface CompactState {
  v: 1;
  t: TravelerTypeId;
  w: number[];
  s: CompactStay[];
}

const VALID_TRAVELERS = new Set<string>(TRAVELER_TYPES.map((type) => type.id));
const VALID_PLATFORMS = new Set<string>(
  PLATFORM_OPTIONS.map((option) => option.value)
);

// --- base64url helpers -----------------------------------------------------

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToBytes(input: string): Uint8Array<ArrayBuffer> {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// --- gzip helpers (graceful fallback when unavailable) ---------------------

function supportsCompression(): boolean {
  return (
    typeof CompressionStream !== "undefined" &&
    typeof DecompressionStream !== "undefined"
  );
}

async function gzip(
  bytes: Uint8Array<ArrayBuffer>
): Promise<Uint8Array<ArrayBuffer>> {
  const stream = new CompressionStream("gzip");
  const writer = stream.writable.getWriter();
  void writer.write(bytes);
  void writer.close();
  const buffer = await new Response(stream.readable).arrayBuffer();
  return new Uint8Array(buffer);
}

async function gunzip(
  bytes: Uint8Array<ArrayBuffer>
): Promise<Uint8Array<ArrayBuffer>> {
  const stream = new DecompressionStream("gzip");
  const writer = stream.writable.getWriter();
  void writer.write(bytes);
  void writer.close();
  const buffer = await new Response(stream.readable).arrayBuffer();
  return new Uint8Array(buffer);
}

// --- compact (de)serialization ---------------------------------------------

function toCompact(state: ShareState): CompactState {
  return {
    v: 1,
    t: state.travelerType,
    w: WEIGHT_ORDER.map((category) => state.weights[category]),
    s: state.stays.map((stay) => {
      const compact: CompactStay = {
        n: stay.name,
        u: stay.url,
        p: stay.platform,
        pr: stay.pricePerNight,
      };
      if (stay.address) compact.a = stay.address;
      if (typeof stay.latitude === "number") compact.la = stay.latitude;
      if (typeof stay.longitude === "number") compact.lo = stay.longitude;
      if (stay.placeName) compact.pl = stay.placeName;
      if (stay.city) compact.c = stay.city;
      if (stay.region) compact.r = stay.region;
      if (stay.notes) compact.no = stay.notes;
      return compact;
    }),
  };
}

function isCompactState(value: unknown): value is CompactState {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    obj.v === 1 &&
    typeof obj.t === "string" &&
    VALID_TRAVELERS.has(obj.t) &&
    Array.isArray(obj.w) &&
    obj.w.length === WEIGHT_ORDER.length &&
    obj.w.every((n) => typeof n === "number" && Number.isFinite(n)) &&
    Array.isArray(obj.s) &&
    obj.s.length >= 2 &&
    obj.s.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).n === "string"
    )
  );
}

function fromCompact(compact: CompactState): ShareState {
  const weights = WEIGHT_ORDER.reduce((acc, category, index) => {
    acc[category] = compact.w[index];
    return acc;
  }, {} as ScoreWeights);

  const stays: StayListing[] = compact.s.map((item) => {
    const platform: Platform = VALID_PLATFORMS.has(item.p) ? item.p : "other";
    const stay: StayListing = {
      id: crypto.randomUUID(),
      name: typeof item.n === "string" ? item.n : "",
      url: typeof item.u === "string" ? item.u : "",
      platform,
      pricePerNight: typeof item.pr === "string" ? item.pr : "",
    };
    if (typeof item.a === "string") stay.address = item.a;
    if (typeof item.la === "number") stay.latitude = item.la;
    if (typeof item.lo === "number") stay.longitude = item.lo;
    if (typeof item.pl === "string") stay.placeName = item.pl;
    if (typeof item.c === "string") stay.city = item.c;
    if (typeof item.r === "string") stay.region = item.r;
    if (typeof item.no === "string") stay.notes = item.no;
    return stay;
  });

  return { travelerType: compact.t, stays, weights };
}

// --- public API ------------------------------------------------------------

/** Encode comparison state to a URL-safe token (gzipped when supported). */
export async function encodeComparison(state: ShareState): Promise<string> {
  const json = JSON.stringify(toCompact(state));
  const raw = new Uint8Array(new TextEncoder().encode(json));
  if (supportsCompression()) {
    try {
      return `g${bytesToBase64Url(await gzip(raw))}`;
    } catch {
      // fall through to raw on any stream failure
    }
  }
  return `r${bytesToBase64Url(raw)}`;
}

/** Decode a token back to comparison state, or null if it's unusable. */
export async function decodeComparison(
  token: string
): Promise<ShareState | null> {
  try {
    const mode = token[0];
    const body = token.slice(1);
    if (!body) return null;
    let bytes = base64UrlToBytes(body);
    if (mode === "g") {
      if (!supportsCompression()) return null;
      bytes = await gunzip(bytes);
    } else if (mode !== "r") {
      return null;
    }
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!isCompactState(parsed)) return null;
    return fromCompact(parsed);
  } catch {
    return null;
  }
}

/** Build the full shareable URL for the current origin. */
export async function buildShareUrl(
  state: ShareState,
  pathname = "/compare"
): Promise<string> {
  const token = await encodeComparison(state);
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://scoutstay.app";
  return `${base}${pathname}?${SHARE_PARAM}=${token}`;
}

/** Pull and decode the share token from a query string, if present. */
export async function readSharedComparison(
  search: string
): Promise<ShareState | null> {
  const token = new URLSearchParams(search).get(SHARE_PARAM);
  if (!token) return null;
  return decodeComparison(token);
}

/** A ComparisonRequest view of share state, for handing to the dashboard. */
export function toComparisonRequest(state: ShareState): ComparisonRequest {
  return { travelerType: state.travelerType, stays: state.stays };
}
