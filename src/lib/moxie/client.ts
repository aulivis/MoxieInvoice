/**
 * Moxie Public API client.
 * @see https://help.withmoxie.com/en/articles/8154735-public-api-fundamentals
 */

const MOXIE_RATE_LIMIT = 100; // 100 requests per 5 minutes

export interface MoxieClientConfig {
  baseUrl: string;
  apiKey: string;
}

export class MoxieClient {
  constructor(private config: MoxieClientConfig) {}

  /** Base URL without trailing slash or /api/public (avoids duplicating path). */
  private getBaseUrl(): string {
    const base = this.config.baseUrl.replace(/\/$/, '').replace(/\/api\/public\/?$/i, '');
    return base;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.getBaseUrl()}/api/public${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-API-KEY': this.config.apiKey,
        ...options.headers,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Moxie API ${res.status}: ${text || res.statusText}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  /** List all clients. @see https://help.withmoxie.com/en/articles/8163927-list-clients */
  async listClients(): Promise<{ clients?: unknown[] }> {
    return this.request('/action/clients/list');
  }

  /** Create invoice. @see https://help.withmoxie.com/en/articles/8174518-create-invoice */
  async createInvoice(payload: {
    clientId?: string;
    clientName?: string;
    [key: string]: unknown;
  }): Promise<unknown> {
    return this.request('/action/invoices/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /** Attach file from URL. @see https://help.withmoxie.com/en/articles/8351218-attach-file-from-url */
  async attachFileFromUrl(params: {
    entityType: string;
    entityId: string;
    fileUrl: string;
    fileName?: string;
  }): Promise<unknown> {
    const form = new FormData();
    form.set('type', params.entityType.toUpperCase());
    form.set('id', params.entityId);
    form.set('fileUrl', params.fileUrl);
    form.set('fileName', params.fileName ?? 'file');
    const url = `${this.getBaseUrl()}/api/public/action/attachments/createFromUrl`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'X-API-KEY': this.config.apiKey },
      body: form,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Moxie API ${res.status}: ${text || res.statusText}`);
    }
    if (res.status === 204) return undefined;
    return res.json();
  }

  /** Apply payment to invoice. @see https://help.withmoxie.com/en/articles/8213724-apply-payment-to-invoice */
  async applyPayment(payload: {
    date: string;
    amount: number;
    invoiceNumber: string;
    clientName?: string;
    paymentType?: string;
    referenceNumber?: string;
    memo?: string;
  }): Promise<unknown> {
    return this.request('/action/payment/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export function createMoxieClient(baseUrl: string, apiKey: string): MoxieClient {
  return new MoxieClient({ baseUrl, apiKey });
}
