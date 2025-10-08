export default async function handler(req, res){
  try {
    const apiKey = process.env.HEYGEN_API_KEY;
    if(!apiKey) return res.status(400).json({ ok:false, error: "Missing HEYGEN_API_KEY" });
    // TODO: Replace this stub with a real HeyGen session creation request.
    return res.status(200).json({ ok:true, streamUrl:null });
  } catch (e){
    return res.status(500).json({ ok:false, error:String(e) });
  }
}
