import { handle, json } from '@/server/http/respond';
import { RedError } from '@/server/red/errors';
import { getRedService } from '@/server/red/instance';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return handle(async () => {
    const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
    if (query.length < 2) throw new RedError('INVALID_INPUT', 'query parameter "q" needs at least 2 characters');
    return json(await getRedService().search(query), { cacheSeconds: 300, staleSeconds: 600 });
  });
}
