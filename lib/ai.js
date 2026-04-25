const axios = require('axios');

async function callAI(prompt, maxTokens = 2000) {
  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4-5',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://resumekar.in',
        'X-Title': 'ResumeKar'
      },
      timeout: 30000
    }
  );
  return response.data.choices[0].message.content;
}

async function evaluateJob(cvText, jobDescription, minSalaryLPA = 10) {
  const prompt = `You are ResumeKar, an AI job search copilot built specifically for Indian students and freshers.

CANDIDATE CV:
${cvText}

JOB DESCRIPTION:
${jobDescription}

CANDIDATE MINIMUM SALARY EXPECTATION: ₹${minSalaryLPA} LPA

Carefully analyze the fit between this candidate and job. Return ONLY valid JSON, no markdown, no backticks, no explanation outside JSON:
{
  "score": "A/B+/B/C/D",
  "score_num": 4.2,
  "verdict": "Strong match",
  "company": "Exact company name from JD",
  "role": "Exact role title from JD",
  "salary": "Salary range as string e.g. ₹18-24 LPA",
  "salary_min_lpa": 18,
  "salary_max_lpa": 24,
  "location": "Location from JD or Remote",
  "match_pct": 87,
  "exp_match": 90,
  "salary_fit": true,
  "worth_applying": true,
  "gaps": [
    {"type": "match", "text": "Specific strength from CV that directly matches JD requirement"},
    {"type": "warning", "text": "Partial match area to address"},
    {"type": "gap", "text": "Missing requirement from JD"}
  ],
  "candidate_name": "Full name exactly as in CV",
  "candidate_email": "Email exactly as in CV",
  "candidate_phone": "Phone exactly as in CV",
  "candidate_location": "Location from CV",
  "candidate_github": "GitHub URL from CV if present",
  "candidate_linkedin": "LinkedIn URL from CV if present",
  "candidate_tagline": "Short professional tagline tailored to THIS specific JD",
  "tailored_summary": "3 sentences using candidate REAL company names, tools, achievements. Match JD keywords. Never invent experience.",
  "key_skills": ["skill1 from CV relevant to JD", "skill2", "skill3", "skill4", "skill5", "skill6", "skill7", "skill8"],
  "experience": [
    {
      "title": "Exact job title from CV",
      "company": "Exact company from CV",
      "date": "Exact date range from CV",
      "bullets": [
        "Rewritten bullet using JD keywords while staying truthful",
        "Another bullet emphasizing relevant skills",
        "Another bullet showing impact with numbers"
      ]
    }
  ],
  "projects": [
    {
      "name": "Exact project name from CV",
      "date": "Year from CV",
      "description": "Rewritten emphasizing skills relevant to this JD"
    }
  ],
  "education": {
    "degree": "Exact degree from CV",
    "college": "Exact college from CV",
    "date": "Years from CV",
    "cgpa": "CGPA from CV",
    "coursework": "Relevant coursework if mentioned"
  },
  "certifications": ["cert1 from CV", "cert2"],
  "interview_angle": "Specific actionable angle. If worth_applying false, explain why and what roles to target instead."
}

CRITICAL RULES:
1. salary_fit = false if salary_max_lpa < ${minSalaryLPA}
2. worth_applying = false if score is D OR match_pct < 40
3. If worth_applying is false, set experience and projects to empty arrays
4. Never invent skills or experience not in CV
5. If company not in JD use "Not specified"`;

  const raw = await callAI(prompt, 2500);

  try {
    const result = JSON.parse(raw.replace(/```json|```/g, '').trim());

    if (result.salary_max_lpa && result.salary_max_lpa < minSalaryLPA) {
      result.salary_fit = false;
    }
    if (result.match_pct < 40 || result.score === 'D') {
      result.worth_applying = false;
      result.experience = [];
      result.projects = [];
      result.tailored_summary = '';
    }

    return result;
  } catch (e) {
    throw new Error('AI response could not be parsed. Please try again.');
  }
}

module.exports = { callAI, evaluateJob };
