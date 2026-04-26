const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://resumekar.in',
    'https://www.resumekar.in',
    'https://resumekar-frontend.vercel.app',
    'https://resumekar.vercel.app'
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/evaluate', require('./routes/evaluate'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/payments', require('./routes/payments'));

app.get('/', (req, res) => {
  res.json({
    status: 'ResumeKar backend running ✅',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 ResumeKar backend running on port ${PORT}`);
});
