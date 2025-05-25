import React from 'react';
import { Rocket } from 'lucide-react';

const PageHeader = () => (
  <header className="text-center mb-16 md:mb-24">
    <div className="inline-block bg-gray-800 p-4 rounded-lg shadow-lg mb-4">
      <Rocket className="h-12 w-12 text-indigo-400" />
    </div>
    <h1 className="text-4xl md:text-6xl font-bold mb-2">
      reomir<span className="text-indigo-400">.</span>
    </h1>
    <p className="text-lg md:text-xl text-gray-400">
      Your Internal Developer Hub: Streamlined. Secure. Smart.
    </p>
    <div className="mt-4 text-xs text-gray-600">
      {`// Built with <NextJS /> <React /> <Tailwind /> <shadcn/ui />`}
    </div>
  </header>
);

export default PageHeader;
