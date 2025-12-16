'use client';

import { useState, useEffect } from 'react';
import { billingApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, Building2, AlertCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Subscription {
  plan: string;
  status: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

export default function BillingPage() {
  const { user, refreshUser } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      conversions: 100,
      icon: Zap,
      features: [
        '100 conversions/month',
        'Basic formats (PNG, JPG)',
        'API access',
        'Community support',
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$29',
      period: 'per month',
      conversions: 5000,
      icon: Crown,
      features: [
        '5,000 conversions/month',
        'All formats (PNG, JPG, WebP, AVIF)',
        'Priority API access',
        'Email support',
        'Advanced compression',
      ],
    },
    {
      id: 'business',
      name: 'Business',
      price: '$99',
      period: 'per month',
      conversions: 25000,
      icon: Building2,
      features: [
        '25,000 conversions/month',
        'All formats + custom',
        'Dedicated infrastructure',
        'Priority support',
        'Advanced compression',
        'Custom integrations',
      ],
    },
  ];

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await billingApi.getSubscription();
      setSubscription(response.data);
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: string) => {
    setActionLoading(true);
    setError('');

    try {
      await billingApi.subscribe(plan);
      await refreshUser();
      await fetchSubscription();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    setError('');

    try {
      await billingApi.cancel();
      await refreshUser();
      await fetchSubscription();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to cancel subscription');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  const currentPlan = user?.plan || 'free';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Billing & Subscription</h1>
        <p className="text-slate-600 mt-2">Manage your subscription and billing information</p>
      </div>

      {subscription && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current Subscription</CardTitle>
                <CardDescription className="mt-2">
                  Plan: <span className="font-semibold capitalize">{subscription.plan}</span>
                </CardDescription>
              </div>
              <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                {subscription.status}
              </Badge>
            </div>
          </CardHeader>
          {subscription.currentPeriodEnd && (
            <CardContent>
              <p className="text-sm text-slate-600">
                {subscription.cancelAtPeriodEnd
                  ? `Your subscription will end on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                  : `Next billing date: ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
              </p>
            </CardContent>
          )}
        </Card>
      )}

      {error && (
        <div className="flex items-start space-x-2 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrentPlan = currentPlan === plan.id;
          const isUpgrade = plans.findIndex((p) => p.id === currentPlan) < plans.findIndex((p) => p.id === plan.id);

          return (
            <Card
              key={plan.id}
              className={`relative ${
                isCurrentPlan ? 'border-blue-600 border-2' : 'border-slate-200'
              }`}
            >
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge>Current Plan</Badge>
                </div>
              )}

              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <Icon className="h-8 w-8 text-blue-600" />
                  {isCurrentPlan && (
                    <Badge variant="secondary">Active</Badge>
                  )}
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                  <span className="text-slate-600 ml-2">/ {plan.period}</span>
                </div>
                <CardDescription className="text-lg mt-2">
                  {plan.conversions.toLocaleString()} conversions/month
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <Check className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  plan.id !== 'free' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full" disabled={actionLoading}>
                          Cancel Subscription
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to cancel your subscription? You will still have access until the end of your billing period.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                          <AlertDialogAction onClick={handleCancel}>
                            Yes, Cancel
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )
                ) : (
                  <Button
                    className="w-full"
                    variant={isUpgrade ? 'default' : 'outline'}
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={actionLoading}
                  >
                    {actionLoading
                      ? 'Processing...'
                      : isUpgrade
                      ? `Upgrade to ${plan.name}`
                      : plan.id === 'free'
                      ? 'Downgrade to Free'
                      : `Switch to ${plan.name}`}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>
            If you have any questions about billing or need to discuss custom plans, please contact our support team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline">Contact Support</Button>
        </CardContent>
      </Card>
    </div>
  );
}
