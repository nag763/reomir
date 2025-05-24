'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const FeatureCard = ({ icon, title, description, tag }) => (
    <Card className="bg-gray-800 border-gray-700 text-gray-100 shadow-lg hover:shadow-indigo-500/30 transition-shadow duration-300">
        <CardHeader>
            <div className="flex items-center mb-3">
                <div className="p-3 rounded-full bg-gray-900 mr-4">
                   {icon}
                </div>
                <CardTitle className="text-xl font-semibold">{title}</CardTitle>
            </div>
            <CardDescription className="text-gray-400">{description}</CardDescription>
        </CardHeader>
        <CardContent>
            <span className="text-xs text-gray-500 bg-gray-900 px-2 py-1 rounded">
                {tag}
            </span>
        </CardContent>
    </Card>
);

export default FeatureCard;