import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { hasActiveSubscription } from '@/lib/subscription';
import { createMoxieClient } from '@/lib/moxie/client';
import { decrypt } from '@/lib/crypto';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'No organization' }, { status: 400 });
  }

  const hasSub = await hasActiveSubscription(profile.organization_id);
  if (!hasSub) {
    return NextResponse.json({ error: 'Subscription required' }, { status: 403 });
  }

  const { data: conn } = await supabase
    .from('moxie_connections')
    .select('base_url, api_key_encrypted')
    .eq('org_id', profile.organization_id)
    .maybeSingle();

  if (!conn?.base_url || !conn?.api_key_encrypted) {
    return NextResponse.json(
      { error: 'Moxie connection not configured. Set Base URL and API Key first.', errorCode: 'notConfigured' },
      { status: 400 }
    );
  }

  try {
    const client = createMoxieClient(conn.base_url, await decrypt(conn.api_key_encrypted));
    await client.listClients();
    await supabase
      .from('moxie_connections')
      .update({ last_tested_at: new Date().toISOString() })
      .eq('org_id', profile.organization_id);
    return NextResponse.json({ ok: true, messageKey: 'connectionSuccess' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const { errorCode, userMessage } = mapMoxieErrorToUserMessage(message);
    return NextResponse.json(
      { error: userMessage, errorCode, details: message },
      { status: 400 }
    );
  }
}

/** Map Moxie API error message to user-friendly errorCode and message. */
function mapMoxieErrorToUserMessage(raw: string): { errorCode: string; userMessage: string } {
  if (raw.includes('404') || raw.includes('Not Found')) {
    return {
      errorCode: 'baseUrlNotFound',
      userMessage: 'The Moxie URL was not found. You can paste the full URL from Moxie (e.g. https://pod01.withmoxie.com/api/public); the app uses the server address.',
    };
  }
  if (raw.includes('401') || raw.includes('Unauthorized')) {
    return { errorCode: 'invalidApiKey', userMessage: 'Invalid API key. Check the key in your Moxie settings.' };
  }
  if (raw.includes('403') || raw.includes('Forbidden')) {
    return { errorCode: 'forbidden', userMessage: 'Access denied. Check your API key and permissions in Moxie.' };
  }
  if (raw.includes('ENOTFOUND') || raw.includes('ECONNREFUSED') || raw.includes('fetch failed')) {
    return {
      errorCode: 'connectionFailed',
      userMessage: 'Could not reach the Moxie server. Check the Base URL and your internet connection.',
    };
  }
  return {
    errorCode: 'connectionFailed',
    userMessage: 'Connection test failed. Please check your Base URL and API key.',
  };
}
