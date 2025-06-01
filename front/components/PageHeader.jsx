import React from 'react';
import { Rocket } from 'lucide-react';

const PageHeader = () => (
  <header className="mb-16 text-center md:mb-24">
    <div className="mb-4 inline-block rounded-lg bg-gray-800 p-4 shadow-lg">
      <Rocket className="h-12 w-12 text-indigo-400" />
    </div>
    <h1 className="mb-2 text-4xl font-bold md:text-6xl">
      reomir<span className="text-indigo-400">.</span>
    </h1>
    <p className="text-lg text-gray-400 md:text-xl">
      Your Internal Developer Hub: Streamlined. Secure. Smart.
    </p>
    <div className="mt-4 text-xs text-gray-600">
      {`// Built with <NextJS /> <React /> <Tailwind /> <shadcn/ui />`}
    </div>
  </header>
);

export default PageHeader;
