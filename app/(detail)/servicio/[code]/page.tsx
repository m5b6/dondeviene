'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ServiceView } from '@/components/service-view';
import { ArrowLeft } from '@/components/sign';
import { useArrivals } from '@/lib/hooks';
import { canonicalServiceCode } from '@/server/red/codes';

const STOP_PATTERN = /^[A-Z]{2}\d+$/;

function ServiceScreen() {
  const params = useParams<{ code: string }>();
  const search = useSearchParams();
  const service = canonicalServiceCode(decodeURIComponent(params.code));
  const rawStop = search.get('stop')?.toUpperCase() ?? null;
  const stopCode = rawStop && STOP_PATTERN.test(rawStop) ? rawStop : null;
  const { data } = useArrivals(stopCode, service);
  const arrival = data?.services.find((item) => item.service === service) ?? null;

  return (
    <>
      <nav className="safe-top sticky top-0 z-10 bg-ink px-5 pt-5 text-paper lg:px-12" aria-label="Volver">
        <Link
          href={stopCode ? `/paradero/${stopCode}` : '/'}
          className="inline-flex h-11 items-center gap-2 text-label uppercase"
        >
          <ArrowLeft />
          {stopCode ? `Paradero ${stopCode}` : 'Inicio'}
        </Link>
      </nav>
      <ServiceView service={service} stopCode={stopCode} arrival={arrival} />
    </>
  );
}

export default function ServicePage() {
  return (
    <Suspense>
      <ServiceScreen />
    </Suspense>
  );
}
