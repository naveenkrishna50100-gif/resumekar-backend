const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const supabase = require('../lib/supabase');

router.get('/', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles').select('*').eq('id', req.user.id).single();
    if (error) return res.status(404).json({ error: 'Profile not found' });
    res.json({ profile: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', auth, async (req, res) => {
  try {
    const { fullName, phone, location, targetRoles, minSalary, experienceLevel } = req.body;
    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone, location, target_roles: targetRoles, min_salary: parseInt(minSalary) || 10, experience_level: experienceLevel })
      .eq('id', req.user.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, profile: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cv', auth, async (req, res) => {
  try {
    const { cvText, cvFilename } = req.body;
    if (!cvText) return res.status(400).json({ error: 'CV text required' });
    const { data, error } = await supabase
      .from('profiles')
      .update({ cv_text: cvText, cv_filename: cvFilename || 'resume.pdf' })
      .eq('id', req.user.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, message: 'CV saved successfully', wordCount: cvText.split(' ').length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
