-- Rollback: initial schema
DROP POLICY IF EXISTS pending_jobs_all ON pending_invoice_jobs;
DROP POLICY IF EXISTS payments_all ON payments;
DROP POLICY IF EXISTS org_settings_all ON org_settings;
DROP POLICY IF EXISTS mappings_all ON moxie_field_mappings;
DROP POLICY IF EXISTS stripe_all ON stripe_customers;
DROP POLICY IF EXISTS invoices_all ON invoices;
DROP POLICY IF EXISTS billing_all ON billing_providers;
DROP POLICY IF EXISTS moxie_all ON moxie_connections;
DROP POLICY IF EXISTS profiles_update ON profiles;
DROP POLICY IF EXISTS profiles_select ON profiles;
DROP POLICY IF EXISTS org_insert ON organizations;
DROP POLICY IF EXISTS org_select ON organizations;

DROP FUNCTION IF EXISTS public.user_org_id();

DROP TABLE IF EXISTS pending_invoice_jobs;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS org_settings;
DROP TABLE IF EXISTS moxie_field_mappings;
DROP TABLE IF EXISTS stripe_customers;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS billing_providers;
DROP TABLE IF EXISTS moxie_connections;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS organizations;

DROP TYPE IF EXISTS subscription_status;
DROP TYPE IF EXISTS invoice_status;
DROP TYPE IF EXISTS billing_provider_type;
