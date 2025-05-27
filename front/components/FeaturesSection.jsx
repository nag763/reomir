import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Workflow, Rss, ShieldCheck, Zap, Users, Lock } from 'lucide-react'; // Added icons

// This is the FeatureCard component, used by the FeaturesSection below.
// It's good practice to keep it here if it's only used by FeaturesSection,
// or move it to its own file (e.g., FeatureCard.jsx) if used elsewhere.
// For now, we'll keep it co-located.
const FeatureCard = ({ icon, title, description, tag, comingSoon }) => (
  <Card className="bg-gray-800 border-gray-700 text-gray-100 shadow-lg hover:shadow-indigo-500/30 transition-shadow duration-300">
    <CardHeader>
      <div className="flex items-center mb-3">
        <div className="p-3 rounded-full bg-gray-900 mr-4">{icon}</div>
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
      </div>
      <CardDescription className="text-gray-400">{description}</CardDescription>
    </CardHeader>
    <CardContent className="mt-auto">
      {comingSoon ? (
        <span className="text-xs text-amber-400 bg-amber-900/50 px-2 py-1 rounded border border-amber-700">
          {tag} (Coming Soon)
        </span>
      ) : (
        <span className="text-xs text-indigo-300 bg-indigo-900/50 px-2 py-1 rounded border border-indigo-700">
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
      <div className="text-center mb-10 md:mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-50 mb-3">
          Discover the Power of <span className="text-indigo-400">Reomir</span>
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Reomir is designed to streamline your development workflow, enhance
          security, and centralize your project information.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 md:gap-8">
        {featuresData.map((feature, index) => (
          <FeatureCard key={index} {...feature} />
        ))}
      </div>
    </section>
  );
};

export default FeaturesSection;
