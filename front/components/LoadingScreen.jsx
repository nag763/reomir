'use client';

import React, { useState, useEffect } from 'react';
import { Cpu, BrainCircuit } from 'lucide-react'; // Choose one, or use both!

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
  <span className="inline-block w-3 h-5 bg-green-400 ml-1 animate-pulse" />
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
    <div
      className="
            fixed inset-0 bg-gray-900 text-green-400
            flex flex-col items-center justify-center
            font-mono z-[9999] p-8
        "
    >
      {/* Top Icon and Title */}
      <div className="flex items-center mb-8">
        <BrainCircuit className="h-10 w-10 text-indigo-400 animate-pulse mr-4" />
        <h1 className="text-4xl font-bold text-gray-100">
          reomir<span className="text-indigo-400">.</span>
        </h1>
      </div>

      {/* Simulated Console Window */}
      <div
        className="
                w-full max-w-xl lg:max-w-2xl h-64
                bg-black border-2 border-gray-700 rounded-lg
                p-6 overflow-hidden shadow-2xl shadow-indigo-500/10
            "
      >
        <div className="text-sm">
          {lines.map((line, index) => (
            <p key={index} className="whitespace-pre">
              <span className="text-gray-600 mr-2">&gt;</span>
              {line}
            </p>
          ))}
          {/* Show cursor only while 'booting' */}
          {showCursor && <BlinkingCursor />}
        </div>
      </div>

      {/* Status Bar */}
      <div className="w-full max-w-xl lg:max-w-2xl mt-4 text-xs text-gray-500 flex justify-between">
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
