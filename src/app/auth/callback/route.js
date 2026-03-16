import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/app';

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.user) {
      // Seed trial subscription if none exists
      try {
        const { data: existing } = await supabase.from('subscriptions')
          .select('id')
          .eq('user_id', data.user.id)
          .limit(1)
          .single();
        if (!existing) {
          const now = new Date();
          const trialEnd = new Date(now);
          trialEnd.setDate(trialEnd.getDate() + 14);
          await supabase.from('subscriptions').insert({
            user_id: data.user.id,
            status: 'trialing',
            trial_start: now.toISOString(),
            trial_end: trialEnd.toISOString(),
          });
        }
      } catch (e) {
        console.error('Trial seed error:', e);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/app?error=auth`);
}
