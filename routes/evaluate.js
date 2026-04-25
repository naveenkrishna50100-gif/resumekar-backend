const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const supabase = require('../lib/supabase');
const { evaluateJob } = require('../lib/ai');

router.post('/', auth, async (req, res) => {
  try {
    const { jobDescription, jobUrl } = req.body;
    if (!jobDescription && !jobUrl) {
      return res.status(400).json({ error: 'Job description or URL required' });
    }
    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('*').eq('id', req.user.id).single();
    if (profileError || !profile) {
      return res.status(400).json({ error: 'Profile not found. Please complete your profile first.' });
    }
    if (!profile.cv_text) {
      return res.status(400).json({ error: 'Please upload your CV before evaluating jobs.' });
    }
    if (profile.plan === 'free' && (profile.evaluations_used || 0) >= 3) {
      return res.status(403).json({
        error: 'You have used all 3 free evaluations this month.',
        upgrade: true,
        message: 'Upgrade to Pro for ₹299/month for unlimited evaluations.'
      });
    }
    const result = await evaluateJob(
      profile.cv_text,
      jobDescription || `Job URL: ${jobUrl}`,
      profile.min_salary || 10
    );
    const { data: evaluation } = await supabase
      .from('evaluations')
      .insert({
        user_id: req.user.id,
        score: result.score,
        score_num: result.score_num,
        verdict: result.verdict,
        match_pct: result.match_pct,
        exp_match: result.exp_match,
        salary_fit: result.salary_fit,
        gaps: result.gaps,
        tailored_summary: result.tailored_summary,
        key_skills: result.key_skills,
        experience: result.experience,
        projects: result.projects,
        education: result.education,
        certifications: result.certifications,
        interview_angle: result.interview_angle
      }).select().single();
    await supabase.from('profiles')
      .update({ evaluations_used: (profile.evaluations_used || 0) + 1 })
      .eq('id', req.user.id);
    res.json({
      success: true,
      evaluation: { ...result, id: evaluation?.id },
      usage: {
        used: (profile.evaluations_used || 0) + 1,
        limit: profile.plan === 'free' ? 3 : 'unlimited',
        plan: profile.plan
      }
    });
  } catch (err) {
    console.error('Evaluate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('evaluations')
      .select('id, score, verdict, match_pct, salary_fit, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    res.json({ evaluations: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
