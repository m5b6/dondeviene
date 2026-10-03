import { handle, json } from '@/server/http/respond';
import { getRedService } from '@/server/red/instance';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => json(await getRedService().status(), { cacheSeconds: 30, staleSeconds: 60 }));
}
