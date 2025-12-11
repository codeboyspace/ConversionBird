'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Subscription {
  plan: string;
  subscriptionId?: string;
  conversionsThisMonth: number;
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetch('/api/billing/subscription', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data) {
          setSubscription(data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  const upgradePlan = async (plan: string) => {
    const token = localStorage.getItem('token');

    try {
      const res = await fetch('/api/billing/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();
      if (res.ok) {
        // Redirect to Razorpay payment URL
        window.location.href = data.subscription.url;
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Failed to create subscription');
    }
  };

  const cancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;

    const token = localStorage.getItem('token');

    try {
      const res = await fetch('/api/billing/subscription', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setSubscription(prev => prev ? { ...prev, plan: 'free', subscriptionId: undefined } : null);
        alert('Subscription cancelled successfully');
      }
    } catch (error) {
      alert('Failed to cancel subscription');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">ConversionBird - Billing</h1>
            </div>
            <div className="flex items-center">
              <a href="/dashboard" className="text-gray-500 hover:text-gray-700">← Back to Dashboard</a>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Current Plan</h2>
            <div className="mt-4 bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 capitalize">
                    {subscription?.plan || 'Free'} Plan
                  </h3>
                  <p className="text-sm text-gray-500">
                    {subscription?.conversionsThisMonth || 0} conversions this month
                  </p>
                </div>
                {subscription?.plan !== 'free' && (
                  <button
                    onClick={cancelSubscription}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                  >
                    Cancel Subscription
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Available Plans</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Free Plan */}
              <div className={`bg-white shadow rounded-lg p-6 ${subscription?.plan === 'free' ? 'ring-2 ring-indigo-500' : ''}`}>
                <h3 className="text-lg font-medium text-gray-900">Free</h3>
                <p className="mt-2 text-sm text-gray-500">Perfect for getting started</p>
                <p className="mt-4 text-3xl font-bold text-gray-900">₹0</p>
                <p className="text-sm text-gray-500">per month</p>
                <ul className="mt-4 space-y-2">
                  <li className="text-sm text-gray-600">• 1,000 conversions/month</li>
                  <li className="text-sm text-gray-600">• 5MB max file size</li>
                  <li className="text-sm text-gray-600">• Basic support</li>
                </ul>
                <button
                  disabled={subscription?.plan === 'free'}
                  className="mt-6 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-400 cursor-not-allowed"
                >
                  Current Plan
                </button>
              </div>

              {/* Pro Plan */}
              <div className={`bg-white shadow rounded-lg p-6 ${subscription?.plan === 'pro' ? 'ring-2 ring-indigo-500' : ''}`}>
                <h3 className="text-lg font-medium text-gray-900">Pro</h3>
                <p className="mt-2 text-sm text-gray-500">For growing businesses</p>
                <p className="mt-4 text-3xl font-bold text-gray-900">₹499</p>
                <p className="text-sm text-gray-500">per month</p>
                <ul className="mt-4 space-y-2">
                  <li className="text-sm text-gray-600">• 10,000 conversions/month</li>
                  <li className="text-sm text-gray-600">• 25MB max file size</li>
                  <li className="text-sm text-gray-600">• Priority support</li>
                </ul>
                <button
                  onClick={() => upgradePlan('pro')}
                  disabled={subscription?.plan === 'pro'}
                  className={`mt-6 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md ${
                    subscription?.plan === 'pro'
                      ? 'text-white bg-gray-400 cursor-not-allowed'
                      : 'text-white bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {subscription?.plan === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
                </button>
              </div>

              {/* Business Plan */}
              <div className={`bg-white shadow rounded-lg p-6 ${subscription?.plan === 'business' ? 'ring-2 ring-indigo-500' : ''}`}>
                <h3 className="text-lg font-medium text-gray-900">Business</h3>
                <p className="mt-2 text-sm text-gray-500">For high-volume users</p>
                <p className="mt-4 text-3xl font-bold text-gray-900">₹1,999</p>
                <p className="text-sm text-gray-500">per month</p>
                <ul className="mt-4 space-y-2">
                  <li className="text-sm text-gray-600">• 100,000 conversions/month</li>
                  <li className="text-sm text-gray-600">• 100MB max file size</li>
                  <li className="text-sm text-gray-600">• 24/7 support</li>
                </ul>
                <button
                  onClick={() => upgradePlan('business')}
                  disabled={subscription?.plan === 'business'}
                  className={`mt-6 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md ${
                    subscription?.plan === 'business'
                      ? 'text-white bg-gray-400 cursor-not-allowed'
                      : 'text-white bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {subscription?.plan === 'business' ? 'Current Plan' : 'Upgrade to Business'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}