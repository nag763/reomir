import PageHeader from '@/components/PageHeader';
import FeaturesSection from '@/components/FeaturesSection';
import CtaSection from '@/components/CtaSection';
import PageFooter from '@/components/PageFooter';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-mono p-8 md:p-16">
      <PageHeader />
      <FeaturesSection />

      <CtaSection />

      <PageFooter />
    </div>
  );
}
