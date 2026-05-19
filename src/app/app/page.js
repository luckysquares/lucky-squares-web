import { redirect } from 'next/navigation';

export default function AppPage({ searchParams }) {
  const ref = searchParams?.ref;
  redirect(ref ? `/fundraise?ref=${encodeURIComponent(ref)}` : '/fundraise');
}
