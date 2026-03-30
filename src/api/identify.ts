/**
 * Bird identification API
 * - Sound: uploads audio to local BirdNET-Analyzer server (localhost:5001)
 * - Photo: sends image to Anthropic Claude vision API
 */

export interface IdentifyMatch {
  commonName: string;
  scientificName: string;
  confidence: number; // 0–100
  funFact?: string;
  photoUrl?: string | null; // fetched separately by the UI
}

// ── Sound identification ──────────────────────────────────────────────────────

export async function identifyBySound(
  audioBlob: Blob,
  lat = 34.0195,
  lng = -118.4912,
): Promise<IdentifyMatch[]> {
  const serverUrl = (import.meta.env.VITE_BIRDNET_URL as string) || 'http://localhost:5001';

  const form = new FormData();
  form.append('audio', audioBlob, 'recording.webm');
  form.append('lat', String(lat));
  form.append('lng', String(lng));
  form.append('week', String(isoWeek(new Date())));

  const res = await fetch(`${serverUrl}/identify`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`BirdNET server error: ${res.status}`);

  const data: { detections?: Array<{ common_name: string; scientific_name: string; confidence: number }> } =
    await res.json();

  return (data.detections ?? []).map((d) => ({
    commonName: d.common_name,
    scientificName: d.scientific_name,
    confidence: d.confidence,
  }));
}

// ── Photo identification ──────────────────────────────────────────────────────

export async function identifyByPhoto(
  imageFile: File,
  lat?: number,
  lng?: number,
): Promise<IdentifyMatch[]> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string;
  if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY is not set in your .env file.');

  const base64 = await fileToBase64(imageFile);
  const mediaType = normalizeMediaType(imageFile.type);

  const month = new Date().toLocaleString('en-US', { month: 'long' });
  const locationStr =
    lat != null && lng != null
      ? `${Math.abs(lat).toFixed(3)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(3)}°${lng >= 0 ? 'E' : 'W'}`
      : 'Santa Monica, California';

  const prompt = `You are an expert birder. Identify the bird species in this photo.
The photo was taken in ${month} near ${locationStr} in the Santa Monica / LA Coast region of California.

Return ONLY valid JSON in this exact format, no other text:
{"matches":[{"commonName":"...","scientificName":"...","confidence":85,"funFact":"One interesting sentence."}]}

Rules:
- Up to 5 matches, sorted by confidence descending
- confidence is an integer 0–100
- Only include species plausible for coastal Southern California in ${month}
- funFact is exactly one concise sentence about the species
- If no bird is clearly visible: {"matches":[],"reason":"brief explanation"}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: prompt },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `API error ${res.status}`);
  }

  const data = await res.json() as { content?: Array<{ text?: string }> };
  const text = data.content?.[0]?.text ?? '';

  // Extract JSON from response (Claude may wrap it in markdown)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not parse response from field guide.');

  const parsed = JSON.parse(jsonMatch[0]) as { matches?: IdentifyMatch[] };
  return parsed.matches ?? [];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function normalizeMediaType(type: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  if (type === 'image/png') return 'image/png';
  if (type === 'image/gif') return 'image/gif';
  if (type === 'image/webp') return 'image/webp';
  return 'image/jpeg';
}

function isoWeek(d: Date): number {
  const jan1 = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
}
