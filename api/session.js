export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const API_KEY = process.env.HEYGEN_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'Missing HEYGEN_API_KEY' });

  try {
    const newRes = await fetch('https://api.heygen.com/v1/streaming.new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': API_KEY },
      body: JSON.stringify({ version: 'v2', quality: 'high', activity_idle_timeout: 180 })
    });
    const j = await newRes.json();
    if (!newRes.ok) return res.status(newRes.status).json(j);
    const { session_id, url, access_token } = j.data || {};
    if (!session_id || !url || !access_token) return res.status(500).json({ error: 'Missing fields', j });

    const startRes = await fetch('https://api.heygen.com/v1/streaming.start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': API_KEY },
      body: JSON.stringify({ session_id })
    });
    const started = await startRes.json();
    if (!startRes.ok) return res.status(startRes.status).json(started);

    return res.status(200).json({ session_id, url, access_token });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
