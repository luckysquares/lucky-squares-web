'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function ReferralCapture() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref && ref.length >= 4) {
      localStorage.setItem('ls_ref', ref.toUpperCase());
    }
  }, [searchParams]);
  return null;
}
