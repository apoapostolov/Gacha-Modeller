import { CASH_FIELDS, ORIGINS, type Cash, type LedgerEvent, type LedgerView, type Wallet } from './types.ts';

export function emptyCash(): Cash { return Object.fromEntries(CASH_FIELDS.map(k => [k, 0])) as Cash; }
export function contribution(cash: Cash): number {
  return cash.payments - cash.refunds - cash.tax - cash.fees - cash.fulfilment - cash.service - cash.promotion + cash.otherProduct - cash.cannibalization;
}
function checked(value: number) {
  if (!Number.isSafeInteger(value)) throw new Error('ledger: Amounts must be safe integers.');
  return value;
}
/** Validate all effects on a copy before committing. IDs deduplicate matching payloads only. */
export class ResourceLedger {
  readonly opening: LedgerView;
  private current: LedgerView;
  private applied = new Map<string, string>();
  private effects: LedgerView = { wallet: { paid: 0, earned: 0, promotional: 0 }, inventory: Object.create(null), shards: 0, cash: emptyCash() };
  readonly events: LedgerEvent[] = [];
  constructor(wallet: Wallet, inventory: Record<string, number> = {}, shards = 0, private readonly retain = 100) {
    for (const key of ORIGINS) if (checked(wallet[key]) < 0) throw new Error('ledger: Negative opening balance.');
    for (const n of Object.values(inventory)) if (checked(n) < 0) throw new Error('ledger: Negative opening inventory.');
    if (checked(shards) < 0) throw new Error('ledger: Negative opening shards.');
    this.current = { wallet: { ...wallet }, inventory: Object.assign(Object.create(null), inventory), shards, cash: emptyCash() };
    this.opening = structuredClone(this.current);
  }
  view(): LedgerView { return structuredClone(this.current); }
  movements(): LedgerView { return structuredClone(this.effects); }
  get eventCount() { return this.applied.size; }
  apply(event: LedgerEvent): boolean {
    if (!event.id || !Number.isSafeInteger(event.day) || event.day < 1) throw new Error('ledger.event: Valid ID and day required.');
    const encoded = JSON.stringify(event);
    if (this.applied.has(event.id)) {
      if (this.applied.get(event.id) !== encoded) throw new Error('ledger.event.id: Conflicting duplicate event.');
      return false;
    }
    const next = this.view();
    next.inventory = Object.assign(Object.create(null), next.inventory);
    for (const [key, amount] of Object.entries(event.wallet ?? {})) {
      if (!ORIGINS.includes(key as typeof ORIGINS[number])) throw new Error('ledger.wallet: Unknown origin.');
      next.wallet[key as keyof Wallet] = checked(next.wallet[key as keyof Wallet] + checked(amount));
      if (next.wallet[key as keyof Wallet] < 0) throw new Error('ledger.wallet: Insufficient balance.');
    }
    for (const [key, amount] of Object.entries(event.inventory ?? {})) {
      next.inventory[key] = checked((next.inventory[key] ?? 0) + checked(amount));
      if (next.inventory[key] < 0) throw new Error('ledger.inventory: Insufficient copies.');
    }
    next.shards = checked(next.shards + checked(event.shards ?? 0));
    if (next.shards < 0) throw new Error('ledger.shards: Insufficient shards.');
    for (const [key, amount] of Object.entries(event.cash ?? {})) {
      if (!CASH_FIELDS.includes(key as keyof Cash)) throw new Error('ledger.cash: Unknown field.');
      next.cash[key as keyof Cash] = checked(next.cash[key as keyof Cash] + checked(amount));
      if (next.cash[key as keyof Cash] < 0) throw new Error('ledger.cash: Negative cumulative cash category.');
    }
    if (next.cash.refunds > next.cash.payments) throw new Error('ledger.refunds: Refund exceeds payments.');
    for (const key of ORIGINS) this.effects.wallet[key] += next.wallet[key] - this.current.wallet[key];
    for (const key of Object.keys(event.inventory ?? {})) this.effects.inventory[key] = (this.effects.inventory[key] ?? 0) + (next.inventory[key] ?? 0) - (this.current.inventory[key] ?? 0);
    this.effects.shards += next.shards - this.current.shards;
    for (const key of CASH_FIELDS) this.effects.cash[key] += next.cash[key] - this.current.cash[key];
    this.current = next; this.applied.set(event.id, encoded);
    if (this.events.length < this.retain) this.events.push(structuredClone(event));
    return true;
  }
  reconcile(): boolean {
    return ORIGINS.every(k => this.opening.wallet[k] + this.effects.wallet[k] === this.current.wallet[k])
      && CASH_FIELDS.every(k => this.opening.cash[k] + this.effects.cash[k] === this.current.cash[k])
      && this.opening.shards + this.effects.shards === this.current.shards
      && Object.keys(this.current.inventory).every(k => (this.opening.inventory[k] ?? 0) + (this.effects.inventory[k] ?? 0) === this.current.inventory[k]);
  }
}
export function debit(wallet: Wallet, amount: number): Partial<Wallet> | null {
  checked(amount); if (amount < 0) throw new Error('ledger.debit: Negative amount.');
  let remaining = amount;
  const result: Partial<Wallet> = {};
  for (const key of ORIGINS) { const used = Math.min(wallet[key], remaining); result[key] = -used; remaining -= used; }
  return remaining ? null : result;
}
