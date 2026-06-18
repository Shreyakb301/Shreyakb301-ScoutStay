import { getDrivingRoute } from "@/lib/google-routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const originLat = num(body.originLat);
  const originLng = num(body.originLng);
  const destLat = num(body.destLat);
  const destLng = num(body.destLng);
  if (
    originLat === null ||
    originLng === null ||
    destLat === null ||
    destLng === null
  ) {
    return Response.json({ ok: false }, { status: 400 });
  }

  const route = await getDrivingRoute(
    { lat: originLat, lng: originLng },
    { lat: destLat, lng: destLng }
  );
  if (!route) {
    // Not configured or Google failed — caller keeps the estimate.
    return Response.json({ ok: false });
  }

  return Response.json({
    ok: true,
    distanceKm: route.distanceKm,
    durationMinutes: route.durationMinutes,
  });
}
