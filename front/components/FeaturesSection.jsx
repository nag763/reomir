import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Workflow, Rss, ShieldCheck, Zap } from 'lucide-react'; // Added icons

// This is the FeatureCard component, used by the FeaturesSection below.
// It's good practice to keep it here if it's only used by FeaturesSection,
// or move it to its own file (e.g., FeatureCard.jsx) if used elsewhere.
// For now, we'll keep it co-located.
const FeatureCard = ({ icon, title, description, tag, comingSoon }) => (
  <Card className="border-gray-700 bg-gray-800 text-gray-100 shadow-lg transition-shadow duration-300 hover:shadow-indigo-500/30">
    <CardHeader>
      <div className="mb-3 flex items-center">
        <div className="mr-4 rounded-full bg-gray-900 p-3">{icon}</div>
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
      </div>
      <CardDescription className="text-gray-400">{description}</CardDescription>
    </CardHeader>
    <CardContent className="mt-auto">
      {comingSoon ? (
        <span className="rounded border border-amber-700 bg-amber-900/50 px-2 py-1 text-xs text-amber-400">
          {tag} (Coming Soon)
        </span>
      ) : (
        <span className="rounded border border-indigo-700 bg-indigo-900/50 px-2 py-1 text-xs text-indigo-300">
          {tag}
        </span>
      )}
    </CardContent>
  </Card>
);

// export default FeatureCard; // We will export FeaturesSection as default

const featuresData = [
  {
    icon: <Workflow className="h-6 w-6 text-indigo-400" />,
    title: 'Unified Workspace Integration',
    description:
      'Seamlessly connect with Jira and Confluence. Bring project tracking and documentation into one centralized hub for improved team collaboration.',
    tag: 'Productivity Boost',
    comingSoon: true,
  },
  {
    icon: <Rss className="h-6 w-6 text-indigo-400" />,
    title: 'Real-time Information Flow',
    description:
      'Aggregate and monitor updates from crucial third-party RSS feeds, news, and blogs directly within Reomir. Never miss vital information.',
    tag: 'Stay Informed',
  },
  {
    icon: <ShieldCheck className="h-6 w-6 text-indigo-400" />,
    title: 'Automated Vulnerability Scanning',
    description:
      'Integrate directly with GitHub to perform automated vulnerability scans on your repositories, helping you maintain a secure codebase.',
    tag: 'DevSecOps',
    comingSoon: true,
  },
  {
    icon: <Zap className="h-6 w-6 text-indigo-400" />,
    title: 'AI-Powered Agent Assistance',
    description:
      'Leverage Google Agent AI to automate tasks, provide smart suggestions, and accelerate your development lifecycle within Reomir.',
    tag: 'Hackathon Core',
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-12 md:py-16">
      <div className="mb-10 text-center md:mb-12">
        <h2 className="mb-3 text-3xl font-bold text-gray-50 md:text-4xl">
          Discover the Power of <span className="text-indigo-400">Reomir</span>
        </h2>
        <p className="mx-auto max-w-2xl text-gray-400">
          Reomir is designed to streamline your development workflow, enhance
          security, and centralize your project information.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-2">
        {featuresData.map((feature, index) => (
          <FeatureCard key={index} {...feature} />
        ))}
      </div>
    </section>
  );
};

export default FeaturesSection;
