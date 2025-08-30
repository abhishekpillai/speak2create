'use client';

import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

interface RateLimitInfo {
  ipRemaining?: number;
  ipResetTime?: string;
  sessionImagesUsed?: number;
  sessionImagesRemaining?: number;
  sessionResetTime?: string;
}

interface UsageLimitsProps {
  sessionId: string;
  rateLimitInfo?: RateLimitInfo;
  compact?: boolean;
}

export default function UsageLimits({ sessionId, rateLimitInfo, compact = false }: UsageLimitsProps) {
  const [usageInfo, setUsageInfo] = useState<any>(null);

  useEffect(() => {
    const fetchUsageInfo = async () => {
      try {
        const response = await fetch(`/api/usage?sessionId=${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          setUsageInfo(data);
        }
      } catch (error) {
        console.error('Failed to fetch usage info:', error);
      }
    };

    // Use rateLimitInfo from API if available, otherwise fetch
    if (rateLimitInfo) {
      setUsageInfo({
        remainingGenerations: rateLimitInfo.ipRemaining || 5,
        sessionImagesUsed: rateLimitInfo.sessionImagesUsed || 0,
        sessionImagesRemaining: rateLimitInfo.sessionImagesRemaining || 3,
        sessionResetTime: rateLimitInfo.sessionResetTime,
        resetTime: rateLimitInfo.ipResetTime,
      });
    } else {
      fetchUsageInfo();
    }
  }, [sessionId, rateLimitInfo]);

  if (!usageInfo) {
    return null;
  }

  const sessionRemaining = usageInfo.sessionImagesRemaining || 3;
  const isLimitReached = sessionRemaining <= 0;

  // Only show message when limit is reached
  if (!isLimitReached) {
    return null;
  }

  // Simple, user-friendly message
  return (
    <div className="bg-orange-50 rounded-lg border border-orange-200 p-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-orange-800">
            System is at capacity
          </p>
          <p className="text-xs text-orange-700 mt-1">
            We're experiencing high demand. Please try again in a few minutes.
          </p>
          <p className="text-xs text-orange-600 mt-2">
            Need more access? Email <a href="mailto:hi@abhipillai.com" className="underline">hi@abhipillai.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}