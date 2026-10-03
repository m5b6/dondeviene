import { handle, json, optionalInteger, requireNumber } from '@/server/http/respond';
import { getRedService } from '@/server/red/instance';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return handle(async () => {
    const params = new URL(request.url).searchParams;
    const latitude = requireNumber(params, 'lat');
    const longitude = requireNumber(params, 'lng');
    const limit = optionalInteger(params, 'limit', 10, 1, 30);
    const radius = optionalInteger(params, 'radius', 800, 50, 3000);
    const stops = await getRedService().nearbyStops(latitude, longitude, { limit, maxMeters: radius });
    return json({ stops }, { cacheSeconds: 60, staleSeconds: 300 });
  });
}
