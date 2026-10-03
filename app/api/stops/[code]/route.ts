import { handle, json } from '@/server/http/respond';
import { getRedService } from '@/server/red/instance';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const { code } = await params;
    const service = new URL(request.url).searchParams.get('service') ?? undefined;
    const arrivals = await getRedService().stopArrivals(code.toUpperCase(), service);
    return json(arrivals, { cacheSeconds: 5, staleSeconds: 10 });
  });
}
