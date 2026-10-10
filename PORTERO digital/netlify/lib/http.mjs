export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
export const err = (status, message) => json({ error: message }, status);
export const readJson = async (req) => { try { return await req.json(); } catch { return null; } };
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
