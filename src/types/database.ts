export type BillingProviderType = 'billingo' | 'szamlazz';

export type InvoiceStatus =
  | 'pending'
  | 'created'
  | 'failed'
  | 'synced_to_moxie';

export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'trialing'
  | 'incomplete';

export type ScheduleType =
  | 'always'
  | 'weekdays_only'
  | 'business_hours_only';

export interface Organization {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  organization_id: string | null;
  display_name: string | null;
  preferred_lang: 'hu' | 'en';
  created_at: string;
  updated_at: string;
}

export interface MoxieConnection {
  id: string;
  org_id: string;
  base_url: string;
  api_key_encrypted: string | null;
  webhook_secret: string | null;
  last_tested_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingProvider {
  id: string;
  org_id: string;
  provider: BillingProviderType;
  credentials_encrypted: Record<string, unknown> | null;
  seller_name: string | null;
  seller_tax_number: string | null;
  seller_bank_account: string | null;
  created_at: string;
  updated_at: string;
}

export type PaymentStatus = 'open' | 'paid';

export interface Invoice {
  id: string;
  org_id: string;
  moxie_invoice_id: string | null;
  moxie_invoice_uuid: string | null;
  external_id: string | null;
  provider: BillingProviderType;
  status: InvoiceStatus;
  payment_status: PaymentStatus;
  pdf_url: string | null;
  pdf_token: string | null;
  total_amount: number | null;
  payload_snapshot: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
}

export interface OrgSettings {
  id: string;
  org_id: string;
  currency_convert_to_huf: boolean;
  conversion_source: 'fixed' | 'mnb_daily' | null;
  fixed_eur_huf_rate: number | null;
  schedule_type: ScheduleType;
  timezone: string;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface MoxieFieldMapping {
  id: string;
  org_id: string;
  moxie_custom_field_key: string;
  provider: BillingProviderType;
  provider_field: string;
  value_mapping: Record<string, string>;
  created_at: string;
}
