import { FAQS } from './faq-data';

export const metadata = {
  title: 'FAQ',
  description: 'Answers to common questions about Lucky Squares Australia — how fundraisers work, payment options, draws, refunds, permits, and more.',
  alternates: { canonical: 'https://luckysquares.com.au/faq' },
};

export default function FaqLayout({ children }) {
  // Include all categories except the Glossary (definitions, not Q&A)
  const faqCategories = FAQS.filter((c) => c.category !== 'Lucky Squares Glossary');

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqCategories.flatMap((cat) =>
      cat.items.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a,
        },
      }))
    ),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      {children}
    </>
  );
}
