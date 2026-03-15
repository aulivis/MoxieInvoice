/**
 * PDF proxy endpoint: fetches the invoice PDF from the billing provider on-demand
 * and streams it back. Moxie calls this URL via attachFileFromUrl.
 *
 * GET /api/invoices/[id]/pdf?token=<uuid>
 *
 * Security: validated via one-time pdf_token stored in the invoices table.
 * The token is cleared after successful Moxie sync (set to NULL in orchestrator).
 */

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/crypto';
import { rateLimitResponse } from '@/lib/rate-limit';
import { downloadBillingoPdf } from '@/lib/invoices/billingo';
import { getSzamlazzPdf, type SzamlazzCredentials } from '@/lib/invoices/szamlazz';

/** Allowed hosts for PDF fetches (SSRF mitigation). Only billing provider origins. */
const PDF_FETCH_ALLOWED_HOSTS = new Set([
  'www.szamlazz.hu',
  'szamlazz.hu',
]);

/** Returns true if url is safe to fetch (same-origin to allowed billing hosts). */
function isAllowedPdfUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && PDF_FETCH_ALLOWED_HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/** Extract keyman access key from a Számlázz.hu printpreview URL. */
function extractSzamlazzKeyman(pdfUrl: string): string | null {
  try {
    const u = new URL(pdfUrl);
    return u.searchParams.get('keyman');
  } catch {
    return null;
  }
}

/** Decrypt billing credentials — handles both encrypted (new) and plain-object (legacy) formats. */
async function decryptCredentials(raw: unknown): Promise<Record<string, unknown>> {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(await decrypt(raw)) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return (raw ?? {}) as Record<string, unknown>;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = rateLimitResponse(request, 'api-invoices-pdf');
  if (rateLimited) return rateLimited;
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseSecret) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const admin = createSupabaseAdmin(supabaseUrl, supabaseSecret);

  // Validate token and fetch invoice + billing credentials in one query
  const { data: invoice, error } = await admin
    .from('invoices')
    .select('id, org_id, provider, external_id, pdf_url, pdf_token')
    .eq('id', id)
    .eq('pdf_token', token)
    .maybeSingle();

  if (error || !invoice) {
    return NextResponse.json({ error: 'Not found or token invalid' }, { status: 404 });
  }

  // Fetch billing provider credentials
  const { data: billing } = await admin
    .from('billing_providers')
    .select('provider, credentials_encrypted')
    .eq('org_id', invoice.org_id)
    .maybeSingle();

  if (!billing?.credentials_encrypted) {
    return NextResponse.json({ error: 'Billing provider not configured' }, { status: 500 });
  }

  const credentials = await decryptCredentials(billing.credentials_encrypted);

  if (invoice.provider === 'billingo') {
    if (!invoice.external_id) {
      return NextResponse.json({ error: 'No external_id for Billingo invoice' }, { status: 500 });
    }

    let pdfResponse: Response;
    try {
      pdfResponse = await downloadBillingoPdf(
        { apiKey: String(credentials.apiKey || credentials.api_key || '') },
        invoice.external_id
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    // Stream PDF back to Moxie
    return new Response(pdfResponse.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice-${invoice.external_id}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  if (invoice.provider === 'szamlazz') {
    if (!invoice.external_id) {
      return NextResponse.json({ error: 'No external_id for Számlázz.hu invoice' }, { status: 500 });
    }

    const szamlazzCreds: SzamlazzCredentials = {
      agentKey: String(credentials.agentKey ?? credentials.agent_key ?? '').trim() || undefined,
      username: credentials.username != null ? String(credentials.username) : undefined,
      password: credentials.password != null ? String(credentials.password) : undefined,
    };

    const pdfBuffer = await getSzamlazzPdf(szamlazzCreds, invoice.external_id);
    if (pdfBuffer && pdfBuffer.length > 0) {
      return new Response(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="invoice-${invoice.external_id}.pdf"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    // Fallback: try direct PDF URL with keyman or printpreview
    const keyman = invoice.pdf_url ? extractSzamlazzKeyman(invoice.pdf_url) : null;

    if (keyman) {
      // Számlázz.hu provides a direct PDF download URL when accessed with the access key.
      // The printpreview endpoint serves HTML; szamlak/{keyman} serves the raw PDF.
      const directPdfUrl = `https://www.szamlazz.hu/szamla/szamlak/${encodeURIComponent(keyman)}`;

      let szRes: Response;
      try {
        szRes = await fetch(directPdfUrl, {
          headers: { Accept: 'application/pdf' },
        });
      } catch {
        szRes = new Response(null, { status: 502 });
      }

      if (szRes.ok) {
        const contentType = szRes.headers.get('Content-Type') ?? '';
        if (contentType.includes('pdf') || contentType.includes('octet-stream')) {
          return new Response(szRes.body, {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `inline; filename="invoice-${invoice.external_id ?? 'szamlazz'}.pdf"`,
              'Cache-Control': 'no-store',
            },
          });
        }
      }

      // Option B: fallback – fetch printpreview with Accept: application/pdf (SSRF: allowlist only)
      if (invoice.pdf_url && isAllowedPdfUrl(invoice.pdf_url)) {
        let fallbackRes: Response;
        try {
          fallbackRes = await fetch(invoice.pdf_url, {
            headers: { Accept: 'application/pdf' },
          });
        } catch {
          fallbackRes = new Response(null, { status: 502 });
        }

        if (fallbackRes.ok) {
          return new Response(fallbackRes.body, {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `inline; filename="invoice-${invoice.external_id ?? 'szamlazz'}.pdf"`,
              'Cache-Control': 'no-store',
            },
          });
        }
      }
    }

    return NextResponse.json(
      { error: 'Could not fetch PDF from Számlázz.hu' },
      { status: 502 }
    );
  }

  return NextResponse.json({ error: `Unknown provider: ${invoice.provider}` }, { status: 400 });
}
