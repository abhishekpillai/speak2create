'use client';

import { useState, useEffect } from 'react';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';

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
  const [timeToReset, setTimeToReset] = useState<string>('');

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

  useEffect(() => {
    if (!usageInfo?.sessionResetTime) return;

    const updateTimeToReset = () => {
      const resetTime = new Date(usageInfo.sessionResetTime);
      const now = new Date();
      const diff = resetTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeToReset('Reset available');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      if (minutes > 0) {
        setTimeToReset(`${minutes}m ${seconds}s`);
      } else {
        setTimeToReset(`${seconds}s`);
      }
    };

    updateTimeToReset();
    const interval = setInterval(updateTimeToReset, 1000);

    return () => clearInterval(interval);
  }, [usageInfo?.sessionResetTime]);

  if (!usageInfo) {
    return null;
  }

  const sessionUsed = usageInfo.sessionImagesUsed || 0;
  const sessionRemaining = usageInfo.sessionImagesRemaining || 3;
  const isNearSessionLimit = sessionRemaining <= 1;
  const isSessionLimitReached = sessionRemaining <= 0;

  if (compact) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isSessionLimitReached ? (
              <AlertCircle className="w-4 h-4 text-red-500" />
            ) : isNearSessionLimit ? (
              <AlertCircle className="w-4 h-4 text-orange-500" />
            ) : (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
            <span className="text-sm font-medium text-gray-700">
              {sessionRemaining} images left
            </span>
          </div>
          {timeToReset && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              {timeToReset}
            </div>
          )}
        </div>
        
        {/* Session usage bar */}
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Session usage</span>
            <span>{sessionUsed}/3</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                sessionUsed >= 3 ? 'bg-red-500' :
                sessionUsed >= 2 ? 'bg-orange-500' : 'bg-green-500'
              }`}
              style={{ width: `${(sessionUsed / 3) * 100}%` }}
            />
          </div>
        </div>

        {isSessionLimitReached && (
          <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
            <p className="text-xs text-red-700">
              Session limit reached. Wait {timeToReset} for reset or refresh to start a new session.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-full ${
          isSessionLimitReached ? 'bg-red-100' :
          isNearSessionLimit ? 'bg-orange-100' : 'bg-green-100'
        }`}>
          {isSessionLimitReached ? (
            <AlertCircle className="w-4 h-4 text-red-600" />
          ) : isNearSessionLimit ? (
            <AlertCircle className="w-4 h-4 text-orange-600" />
          ) : (
            <CheckCircle className="w-4 h-4 text-green-600" />
          )}
        </div>
        <h3 className="font-medium text-gray-900">Usage Limits</h3>
      </div>

      <div className="space-y-3">
        {/* Session Usage */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-700">Session images</span>
            <span className="text-sm font-medium text-gray-900">{sessionUsed}/3</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${
                sessionUsed >= 3 ? 'bg-red-500' :
                sessionUsed >= 2 ? 'bg-orange-500' : 'bg-green-500'
              }`}
              style={{ width: `${(sessionUsed / 3) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {sessionRemaining} images remaining in this 30-minute session
          </p>
        </div>

        {/* Hourly IP Limit */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-700">Hourly limit</span>
            <span className="text-sm font-medium text-gray-900">
              {5 - (usageInfo.remainingGenerations || 0)}/5
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="h-2.5 bg-blue-500 rounded-full transition-all"
              style={{ width: `${((5 - (usageInfo.remainingGenerations || 0)) / 5) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {usageInfo.remainingGenerations || 0} images remaining this hour
          </p>
        </div>

        {/* Reset Timer */}
        {timeToReset && (
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">
              Session resets in: <span className="font-medium">{timeToReset}</span>
            </span>
          </div>
        )}

        {/* Limit Warning */}
        {isSessionLimitReached ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 font-medium">Session limit reached</p>
            <p className="text-xs text-red-600 mt-1">
              Wait for session reset or refresh the page to start a new session.
            </p>
          </div>
        ) : isNearSessionLimit ? (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-700 font-medium">
              {sessionRemaining} image{sessionRemaining !== 1 ? 's' : ''} left
            </p>
            <p className="text-xs text-orange-600 mt-1">
              You're approaching your session limit.
            </p>
          </div>
        ) : null}

        {/* Info */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• 5 images per hour per IP address</p>
          <p>• 3 images per 30-minute session</p>
          <p>• Limits help manage costs and prevent abuse</p>
        </div>
      </div>
    </div>
  );
}