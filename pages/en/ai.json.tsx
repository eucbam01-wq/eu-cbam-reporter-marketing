// FILE: C:\Users\redfi\eu-cbam-reporter\marketing\pages\en\ai.json.tsx
import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://www.grandscope.ai/#org',
        name: 'GrandScope',
        url: 'https://www.grandscope.ai'
      },
      {
        '@type': 'WebPage',
        '@id': 'https://www.grandscope.ai/en#webpage',
        url: 'https://www.grandscope.ai/en',
        name: 'GrandScope | EU CBAM Reporting Software, Annex 5.1 XML',
        inLanguage: 'en',
        isPartOf: { '@id': 'https://www.grandscope.ai/#org' }
      },
      {
        '@type': 'SoftwareApplication',
        '@id': 'https://www.grandscope.ai/en#app',
        name: 'GrandScope EU CBAM Reporter',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: 'https://www.grandscope.ai/en',
        description:
          'EU CBAM reporting software that collects supplier inputs, calculates embedded emissions, and exports Annex 5.1 XML ZIP packages structured to XSD.',
        publisher: { '@id': 'https://www.grandscope.ai/#org' },
        mainEntityOfPage: { '@id': 'https://www.grandscope.ai/en#webpage' }
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://www.grandscope.ai/en#faq',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is EU CBAM and who needs to report?',
            acceptedAnswer: {
              '@type': 'Answer',
              text:
                'The Carbon Border Adjustment Mechanism is the EU policy tool that puts a fair price on carbon embedded in certain imported goods. During the transitional phase, importers report embedded emissions for covered goods.'
            }
          },
          {
            '@type': 'Question',
            name: 'How do I submit a CBAM report?',
            acceptedAnswer: {
              '@type': 'Answer',
              text:
                'Reporting declarants can create reports in the portal or upload an XML file with attachments packaged in a ZIP. The XML is structured according to the Annex 5.1 XSD.'
            }
          },
          {
            '@type': 'Question',
            name: 'What penalties apply for missing or incorrect reports?',
            acceptedAnswer: {
              '@type': 'Answer',
              text:
                'Penalties can be between EUR 10 and EUR 50 per tonne of unreported embedded emissions, depending on the competent authority assessment and the case.'
            }
          },
          {
            '@type': 'Question',
            name: 'Can I use default values if a supplier does not reply?',
            acceptedAnswer: {
              '@type': 'Answer',
              text:
                'GrandScope supports controlled fallback to default values so you can file on time, then replace with supplier specific values as data becomes available.'
            }
          }
        ]
      }
    ]
  };

  res.setHeader('Content-Type', 'application/ld+json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.end(JSON.stringify(jsonLd));
  return { props: {} };
};

export default function AiJson() {
  return null;
}
// FILE: C:\Users\redfi\eu-cbam-reporter\marketing\pages\en\ai.json.tsx
