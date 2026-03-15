import { NextResponse } from 'next/server';

export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: body.model || 'claude-sonnet-4-5-20250929',
        max_tokens: body.max_tokens || 1024,
        system: body.system,
        messages: body.messages,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return NextResponse.json({ error: errText }, { status: resp.status });
    }

    const data = await resp.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
