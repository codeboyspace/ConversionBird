const { createSubscription, handleWebhookEvent, verifyWebhookSignature } = require('../services/RazorpayService');
const User = require('../models/User');

exports.createSubscription = async (req, res) => {
  try {
    const { plan } = req.body;
    const user = req.user;

    if (!['pro', 'business'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Must be pro or business' });
    }

    if (user.plan === plan) {
      return res.status(400).json({ error: `You are already on the ${plan} plan` });
    }

    // Check if Razorpay is configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ error: 'Payment system not configured' });
    }

    const subscription = await createSubscription(plan, user);

    res.json({
      message: 'Subscription created successfully',
      subscription: {
        id: subscription.subscriptionId,
        url: subscription.shortUrl,
        status: subscription.status
      }
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
};

exports.getSubscriptionStatus = async (req, res) => {
  try {
    const user = req.user;

    res.json({
      plan: user.plan,
      subscriptionId: user.razorpaySubscriptionId,
      conversionsThisMonth: user.conversionsThisMonth
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    // For now, just downgrade to free
    // In production, you'd call Razorpay API to cancel
    await User.findByIdAndUpdate(req.user._id, {
      plan: 'free',
      razorpaySubscriptionId: null
    });

    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
};

exports.webhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const secret = process.env.WEBHOOK_SECRET;

    if (!verifyWebhookSignature(req.body, signature, secret)) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    await handleWebhookEvent(req.body);

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};