import { handle, json, optionalInteger, parseLatLng } from '@/server/http/respond';
import { getRedService } from '@/server/red/instance';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return handle(async () => {
    const params = new URL(request.url).searchParams;
    const result = await getRedService().plan({
      from: parseLatLng(params.get('from'), 'from'),
      to: parseLatLng(params.get('to'), 'to'),
      date: params.get('date') ?? undefined,
      time: params.get('time') ?? undefined,
      arriveBy: params.get('arriveBy') === 'true',
      busOnly: params.get('busOnly') === 'true',
      maxItineraries: optionalInteger(params, 'max', 5, 1, 10),
    });
    return json(result, { cacheSeconds: 30, staleSeconds: 60 });
  });
}
