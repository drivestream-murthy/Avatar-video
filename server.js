import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

app.use(express.static('public', { extensions: ['html'] }));

app.get('/token', async (_req, res) => {
  try {
    if (!HEYGEN_API_KEY) return res.status(400).json({ error: 'Missing HEYGEN_API_KEY on server' });
    const r = await fetch('https://api.heygen.com/v1/streaming.create_token', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${HEYGEN_API_KEY}` }
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: 'Failed to create token', detail: data });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Server error', detail: String(e) });
  }
});

app.listen(PORT, () => console.log(`Running: http://localhost:${PORT}`));
