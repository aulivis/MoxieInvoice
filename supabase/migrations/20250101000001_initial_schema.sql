-- Organizations (tenant)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  display_name TEXT,
  preferred_lang TEXT NOT NULL DEFAULT 'hu' CHECK (preferred_lang IN ('hu', 'en')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Moxie connection per org
CREATE TABLE moxie_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  base_url TEXT NOT NULL,
  api_key_encrypted TEXT,
  webhook_secret TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Billing provider: Billingo or Számlázz.hu
CREATE TYPE billing_provider_type AS ENUM ('billingo', 'szamlazz');

CREATE TABLE billing_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  provider billing_provider_type NOT NULL,
  credentials_encrypted JSONB,
  seller_name TEXT,
  seller_tax_number TEXT,
  seller_bank_account TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoices (our tracking)
CREATE TYPE invoice_status AS ENUM (
  'pending', 'created', 'failed', 'synced_to_moxie'
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  moxie_invoice_id TEXT,
  external_id TEXT,
  provider billing_provider_type NOT NULL,
  status invoice_status NOT NULL DEFAULT 'pending',
  pdf_url TEXT,
  payload_snapshot JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_org_id ON invoices(org_id);
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX idx_invoices_external_id ON invoices(org_id, external_id);

-- Stripe customers and subscription
CREATE TYPE subscription_status AS ENUM (
  'active', 'canceled', 'past_due', 'trialing', 'incomplete'
);

CREATE TABLE stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  subscription_id TEXT,
  status subscription_status,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Moxie custom field → Billing provider field mapping
CREATE TABLE moxie_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  moxie_custom_field_key TEXT NOT NULL,
  provider billing_provider_type NOT NULL,
  provider_field TEXT NOT NULL,
  value_mapping JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, moxie_custom_field_key, provider_field)
);

CREATE INDEX idx_moxie_field_mappings_org ON moxie_field_mappings(org_id);

-- Org settings: currency conversion and invoicing schedule
CREATE TABLE org_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  currency_convert_to_huf BOOLEAN NOT NULL DEFAULT false,
  conversion_source TEXT CHECK (conversion_source IN ('fixed', 'mnb_daily')),
  fixed_eur_huf_rate NUMERIC(12, 4),
  schedule_type TEXT NOT NULL DEFAULT 'always' CHECK (schedule_type IN ('always', 'weekdays_only', 'business_hours_only')),
  timezone TEXT NOT NULL DEFAULT 'Europe/Budapest',
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments (optional tracking for sync to Moxie)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  external_payment_id TEXT,
  amount NUMERIC(14, 2) NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL,
  synced_to_moxie_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_org_id ON payments(org_id);

-- Pending invoice jobs (queue for schedule-restricted processing)
CREATE TABLE pending_invoice_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_pending_invoice_jobs_status ON pending_invoice_jobs(status);
CREATE INDEX idx_pending_invoice_jobs_org ON pending_invoice_jobs(org_id);

-- RLS: enable and policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE moxie_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE moxie_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_invoice_jobs ENABLE ROW LEVEL SECURITY;

-- Helper: user's org_id from profile (public schema – auth schema is not writable by migrations)
CREATE OR REPLACE FUNCTION public.user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public;

-- Policies: user can only access their org's data
CREATE POLICY org_select ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- Only authenticated users can create organizations (app creates one on signup)
CREATE POLICY org_insert ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_update ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY moxie_all ON moxie_connections
  FOR ALL USING (org_id = public.user_org_id());
CREATE POLICY billing_all ON billing_providers
  FOR ALL USING (org_id = public.user_org_id());
CREATE POLICY invoices_all ON invoices
  FOR ALL USING (org_id = public.user_org_id());
CREATE POLICY stripe_all ON stripe_customers
  FOR ALL USING (org_id = public.user_org_id());
CREATE POLICY mappings_all ON moxie_field_mappings
  FOR ALL USING (org_id = public.user_org_id());
CREATE POLICY org_settings_all ON org_settings
  FOR ALL USING (org_id = public.user_org_id());
CREATE POLICY payments_all ON payments
  FOR ALL USING (org_id = public.user_org_id());
CREATE POLICY pending_jobs_all ON pending_invoice_jobs
  FOR ALL USING (org_id = public.user_org_id());

-- App creates organization and profile on first signup/login if missing
