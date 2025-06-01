'use client';

import React, { useState, useEffect } from 'react';
import { BrainCircuit } from 'lucide-react'; // Choose one, or use both!

// Nerdier, more detailed loading steps
const bootSequence = [
  { text: 'REOMIR BIOS v1.3.37 initializing...', delay: 100 },
  { text: 'Checking memory banks................... OK', delay: 300 },
  { text: 'Detecting CPU core...................... ACTIVE', delay: 200 },
  { text: 'Initializing GitHub interface........... LINKED', delay: 400 },
  { text: 'Connecting to Confluence matrix......... SYNCED', delay: 400 },
  { text: 'Loading news feed protocols............. ENGAGED', delay: 350 },
  { text: 'Calibrating UI rendering engine......... READY', delay: 300 },
  { text: 'Compiling JIT assets..................', delay: 500 },
  { text: 'Decoding user credentials............... SECURE', delay: 250 },
  { text: 'Finalizing dashboard layout............. DONE', delay: 200 },
  { text: '>>> Welcome to Reomir <<<', delay: 100 },
];

const BlinkingCursor = () => (
  <span className="ml-1 inline-block h-5 w-3 animate-pulse bg-green-400" />
);

const LoadingScreen = () => {
  const [lines, setLines] = useState([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (currentLineIndex < bootSequence.length) {
      const { text, delay } = bootSequence[currentLineIndex];
      const timeoutId = setTimeout(() => {
        setLines((prevLines) => [...prevLines, text]);
        setCurrentLineIndex((prevIndex) => prevIndex + 1);
      }, delay);

      return () => clearTimeout(timeoutId);
    } else {
      // Sequence finished, maybe hide cursor after a bit
      const cursorTimeout = setTimeout(() => setShowCursor(false), 1000);
      return () => clearTimeout(cursorTimeout);
    }
  }, [currentLineIndex]);

  return (
    <div className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-gray-900 p-8 font-mono text-green-400">
      {/* Top Icon and Title */}
      <div className="mb-8 flex items-center">
        <BrainCircuit className="mr-4 h-10 w-10 animate-pulse text-indigo-400" />
        <h1 className="text-4xl font-bold text-gray-100">
          reomir<span className="text-indigo-400">.</span>
        </h1>
      </div>

      {/* Simulated Console Window */}
      <div className="h-64 w-full max-w-xl overflow-hidden rounded-lg border-2 border-gray-700 bg-black p-6 shadow-2xl shadow-indigo-500/10 lg:max-w-2xl">
        <div className="text-sm">
          {lines.map((line, index) => (
            <p key={index} className="whitespace-pre">
              <span className="mr-2 text-gray-600">&gt;</span>
              {line}
            </p>
          ))}
          {/* Show cursor only while 'booting' */}
          {showCursor && <BlinkingCursor />}
        </div>
      </div>

      {/* Status Bar */}
      <div className="mt-4 flex w-full max-w-xl justify-between text-xs text-gray-500 lg:max-w-2xl">
        <span>
          STATUS:{' '}
          {currentLineIndex < bootSequence.length
            ? 'BOOTING...'
            : 'SYSTEM READY'}
        </span>
        <span>
          {currentLineIndex}/{bootSequence.length}
        </span>
      </div>
    </div>
  );
};

export default LoadingScreen;
