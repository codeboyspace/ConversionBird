'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { User, TrendingUp, Zap, Crown } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  const usage = user.usage ?? { conversions: 0, limit: 0 };
  const usagePercentage = usage.limit > 0 ? (usage.conversions / usage.limit) * 100 : 0;
  const conversionsLeft = Math.max(usage.limit - usage.conversions, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-2">Welcome back, {user.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account</CardTitle>
            <User className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{user.name}</div>
            <p className="text-xs text-slate-600 mt-1">{user.email}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
            <Crown className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{user.plan}</div>
            <p className="text-xs text-slate-600 mt-1">Active subscription</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions Used</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usage.conversions.toLocaleString()}</div>
            <p className="text-xs text-slate-600 mt-1">of {usage.limit.toLocaleString()} this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <Zap className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionsLeft.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage This Month</CardTitle>
          <CardDescription>
            You&apos;ve used {usage.conversions.toLocaleString()} of {usage.limit.toLocaleString()} conversions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Progress value={usagePercentage} className="h-3" />
            <div className="flex justify-between text-sm text-slate-600">
              <span>{usagePercentage.toFixed(1)}% used</span>
              <span>{conversionsLeft.toLocaleString()} remaining</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Email</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Plan</span>
              <span className="font-medium capitalize">{user.plan}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Monthly Limit</span>
              <span className="font-medium">{usage.limit.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Usage</span>
              <span className="font-medium">{usage.conversions.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Start converting images with ConversionBird</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 rounded-full p-1 mt-1">
                <div className="bg-blue-600 rounded-full w-4 h-4 flex items-center justify-center text-white text-xs">
                  1
                </div>
              </div>
              <div>
                <p className="font-medium">Create an API key</p>
                <p className="text-sm text-slate-600">Generate your first API key to get started</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 rounded-full p-1 mt-1">
                <div className="bg-blue-600 rounded-full w-4 h-4 flex items-center justify-center text-white text-xs">
                  2
                </div>
              </div>
              <div>
                <p className="font-medium">Try the converter</p>
                <p className="text-sm text-slate-600">Test image conversion in your dashboard</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 rounded-full p-1 mt-1">
                <div className="bg-blue-600 rounded-full w-4 h-4 flex items-center justify-center text-white text-xs">
                  3
                </div>
              </div>
              <div>
                <p className="font-medium">Integrate with your app</p>
                <p className="text-sm text-slate-600">Use our API in your application</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
