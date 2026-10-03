import { handle, json } from '@/server/http/respond';
import { getRedService } from '@/server/red/instance';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const { code } = await params;
    return json(await getRedService().route(code), { cacheSeconds: 3600, staleSeconds: 86400 });
  });
}
