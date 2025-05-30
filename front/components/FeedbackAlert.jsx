import React from 'react';

export const FeedbackAlert = ({ message, type = 'info' }) => {
  if (!message) return null;

  let baseClasses = 'p-4 mb-4 rounded-md text-sm';
  let typeClasses = '';

  switch (type) {
    case 'error':
      typeClasses = 'bg-red-900/30 text-red-300 border border-red-700';
      break;
    case 'success':
      typeClasses = 'bg-green-900/30 text-green-300 border border-green-700';
      break;
    case 'info':
    default:
      typeClasses = 'bg-blue-900/30 text-blue-300 border border-blue-700';
      break;
  }

  return <div className={`${baseClasses} ${typeClasses}`}>{message}</div>;
};
