import { handle, json } from '@/server/http/respond';
import { getRedService } from '@/server/red/instance';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () =>
    json({ services: await getRedService().serviceList() }, { cacheSeconds: 3600, staleSeconds: 86400 }),
  );
}
