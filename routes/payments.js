const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const supabase = require('../lib/supabase');

router.post('/create-subscription', auth, async (req, res) => {
  res.json({ message: 'Payments coming soon' });
});

router.post('/verify', auth, async (req, res) => {
  res.json({ message: 'Payments coming soon' });
});

router.get('/status', auth, async (req, res) => {
  try {
    const { data: profile } = await supabase
      .from('profiles').select('plan, evaluations_used').eq('id', req.user.id).single();
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
