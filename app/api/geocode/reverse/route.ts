import { handle, json, requireNumber } from '@/server/http/respond';
import { getRedService } from '@/server/red/instance';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return handle(async () => {
    const params = new URL(request.url).searchParams;
    const place = await getRedService().reverse(requireNumber(params, 'lat'), requireNumber(params, 'lng'));
    return json(place, { cacheSeconds: 3600, staleSeconds: 86400 });
  });
}
