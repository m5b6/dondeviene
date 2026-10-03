import { json } from '@/server/http/respond';

export const dynamic = 'force-dynamic';

export async function GET() {
  return json({ ok: true });
}
