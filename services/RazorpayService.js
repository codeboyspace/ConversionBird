const Razorpay = require('razorpay');
const crypto = require('crypto');

let razorpayInstance = null;

const getRazorpayInstance = () => {
  if (!razorpayInstance) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay environment variables not configured');
    }
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
};

const PLAN_PRICES = {
  pro: {
    planId: process.env.PRO_PLAN_ID,
    amount: 49900, // ₹499 in paisa
    currency: 'INR'
  },
  business: {
    planId: process.env.BUSINESS_PLAN_ID,
    amount: 199900, // ₹1999 in paisa
    currency: 'INR'
  }
};

async function createSubscription(planName, user) {
  try {
    const plan = PLAN_PRICES[planName];
    if (!plan) {
      throw new Error('Invalid plan name');
    }

    const razorpay = getRazorpayInstance();
    const subscription = await razorpay.subscriptions.create({
      plan_id: plan.planId,
      customer_notify: 1,
      quantity: 1,
      total_count: 12, // 12 months
      start_at: Math.floor(Date.now() / 1000) + 86400, // Start tomorrow
      addons: [],
      notes: {
        userId: user._id.toString(),
        email: user.email
      }
    });

    return {
      subscriptionId: subscription.id,
      shortUrl: subscription.short_url,
      status: subscription.status
    };
  } catch (error) {
    console.error('Error creating Razorpay subscription:', error);
    throw new Error('Failed to create subscription');
  }
}

function verifyWebhookSignature(body, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');

  return signature === expectedSignature;
}

async function handleWebhookEvent(event) {
  try {
    const { event: eventType, payload } = event;
    const subscription = payload.subscription.entity;

    switch (eventType) {
      case 'subscription.activated':
        // Update user plan to pro/business
        await updateUserPlan(subscription.notes.userId, subscription.plan_id);
        break;
      case 'subscription.paused':
      case 'subscription.cancelled':
        // Downgrade to free
        await updateUserPlan(subscription.notes.userId, null);
        break;
      case 'subscription.completed':
        // Handle completion if needed
        break;
      default:
        console.log('Unhandled webhook event:', eventType);
    }
  } catch (error) {
    console.error('Error handling webhook event:', error);
  }
}

async function updateUserPlan(userId, planId) {
  const User = require('../models/User');
  let plan = 'free';

  if (planId === process.env.PRO_PLAN_ID) {
    plan = 'pro';
  } else if (planId === process.env.BUSINESS_PLAN_ID) {
    plan = 'business';
  }

  await User.findByIdAndUpdate(userId, {
    plan,
    razorpaySubscriptionId: planId
  });
}

module.exports = {
  createSubscription,
  verifyWebhookSignature,
  handleWebhookEvent
};