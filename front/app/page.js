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
    <div className="min-h-screen bg-gray-900 text-gray-100 font-mono flex flex-col">
      {/* Wrapping content in a main tag with grow to push footer down */}
      <main className="grow p-8 md:p-16">
        <PageHeader />

        <CtaSection />
        <FeaturesSection />

        {/* Disclaimer Section */}
        <div className="my-12 mx-auto max-w-3xl p-6 bg-amber-900/30 border border-amber-700 rounded-lg text-center shadow-lg">
          <h3 className="text-xl font-semibold text-amber-300 mb-3">
            Important Notice
          </h3>
          <p className="text-amber-400 text-sm md:text-base leading-relaxed">
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
