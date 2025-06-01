import PageHeader from '@/components/PageHeader';
import FeaturesSection from '@/components/FeaturesSection';
import CtaSection from '@/components/CtaSection';
import PageFooter from '@/components/PageFooter';

export const metadata = {
  title: 'Reomir',
  description: 'Welcome to our application! Explore features and get started.',
};

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-900 font-mono text-gray-100">
      {/* Wrapping content in a main tag with grow to push footer down */}
      <main className="grow p-8 md:p-16">
        <PageHeader />

        <CtaSection />
        <FeaturesSection />

        {/* Disclaimer Section */}
        <div className="mx-auto my-12 max-w-3xl rounded-lg border border-amber-700 bg-amber-900/30 p-6 text-center shadow-lg">
          <h3 className="mb-3 text-xl font-semibold text-amber-300">
            Important Notice
          </h3>
          <p className="text-sm leading-relaxed text-amber-400 md:text-base">
            This project is currently under development for the{' '}
            <strong>Google Agent AI Hackathon 2025</strong>.
            <br />
            It serves as a prototype and is{' '}
            <strong>
              not intended for use in an enterprise context or for production
              workloads
            </strong>
            .
          </p>
        </div>
      </main>
      <PageFooter />
    </div>
  );
}
