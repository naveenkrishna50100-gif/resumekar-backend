const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const supabase = require('../lib/supabase');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// POST /api/payments/create-subscription
router.post('/create-subscription', auth, async (req, res) => {
  try {
    const { plan } = req.body; // 'monthly' or 'annual'

    const planId = plan === 'annual'
      ? process.env.RAZORPAY_ANNUAL_PLAN_ID
      : process.env.RAZORPAY_MONTHLY_PLAN_ID;

    if (!planId) {
      return res.status(400).json({ error: 'Plan not configured. Please contact support.' });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', req.user.id)
      .single();

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: plan === 'annual' ? 12 : 120, // 1 year or 10 years
      notes: {
        user_id: req.user.id,
        email: req.user.email,
        plan: plan
      }
    });

    res.json({
      success: true,
      subscriptionId: subscription.id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      userEmail: req.user.email,
      userName: profile?.full_name || '',
      plan
    });
  } catch (err) {
    console.error('Razorpay create subscription error:', err);
    res.status(500).json({ error: 'Payment initialization failed. Please try again.' });
  }
});

// POST /api/payments/verify
router.post('/verify', auth, async (req, res) => {
  try {
    const {
      razorpay_subscription_id,
      razorpay_payment_id,
      razorpay_signature,
      plan
    } = req.body;

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed. Please contact support.' });
    }

    // Upgrade user to Pro
    await supabase
      .from('profiles')
      .update({
        plan: 'pro',
        evaluations_used: 0
      })
      .eq('id', req.user.id);

    res.json({
      success: true,
      message: plan === 'annual'
        ? 'Welcome to Pro Annual! ₹999/year — unlimited evaluations unlocked. 🎉'
        : 'Welcome to Pro! ₹299/month — unlimited evaluations unlocked. 🎉'
    });
  } catch (err) {
    console.error('Razorpay verify error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/status
router.get('/status', auth, async (req, res) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, evaluations_used')
      .eq('id', req.user.id)
      .single();

    res.json({
      plan: profile?.plan || 'free',
      evaluationsUsed: profile?.evaluations_used || 0,
      evaluationsLimit: profile?.plan === 'pro' ? 'unlimited' : 3
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
