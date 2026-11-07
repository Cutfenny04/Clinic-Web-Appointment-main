/**
 * Pengganti minimal Supabase client untuk pengujian unit/route tanpa jaringan.
 * Mendukung pola query yang dipakai backend: select/insert/update/upsert/delete,
 * eq/neq/in/gte/lte/lt/gt/ilike/or/order/limit, single/maybeSingle, count head, rpc.
 */
export function fakeSupabase(db, calls = []) {
  return {
    from(table) { return new Query(db, table, calls); },
    rpc(name, args) {
      calls.push({ rpc: name, args });
      const fn = db.rpc?.[name];
      return Promise.resolve(fn ? fn(args) : { data: null, error: { code: "PGRST202", message: "function not found" } });
    },
  };
}

class Query {
  constructor(db, table, calls) {
    Object.assign(this, { db, table, calls, filters: [], op: "select", payload: null, mode: "many", head: false });
  }
  select(_cols, opts = {}) { this.head = !!opts.head; return this; }
  insert(p) { this.op = "insert"; this.payload = p; return this; }
  update(p) { this.op = "update"; this.payload = p; return this; }
  upsert(p) { this.op = "upsert"; this.payload = p; return this; }
  delete() { this.op = "delete"; return this; }
  eq(c, v) { this.filters.push((r) => r[c] === v); return this; }
  neq(c, v) { this.filters.push((r) => r[c] !== v); return this; }
  in(c, vs) { this.filters.push((r) => vs.includes(r[c])); return this; }
  gte(c, v) { this.filters.push((r) => r[c] >= v); return this; }
  lte(c, v) { this.filters.push((r) => r[c] <= v); return this; }
  gt(c, v) { this.filters.push((r) => r[c] > v); return this; }
  lt(c, v) { this.filters.push((r) => r[c] < v); return this; }
  ilike(c, p) { const s = p.replace(/%/g, "").toLowerCase(); this.filters.push((r) => String(r[c] || "").toLowerCase().includes(s)); return this; }
  or() { return this; }
  order() { return this; }
  limit() { return this; }
  single() { this.mode = "single"; return this; }
  maybeSingle() { this.mode = "maybe"; return this; }
  then(res, rej) { return Promise.resolve().then(() => this.exec()).then(res, rej); }
  exec() {
    this.calls.push({ table: this.table, op: this.op, payload: this.payload });
    const all = (this.db[this.table] ||= []);
    let rows = all.filter((r) => this.filters.every((f) => f(r)));
    if (this.op === "insert" || this.op === "upsert") {
      const items = [].concat(this.payload).map((x) => ({ id: x.id || `id-${all.length + 1}`, ...x }));
      all.push(...items);
      rows = items;
    } else if (this.op === "update") {
      rows.forEach((r) => Object.assign(r, this.payload));
    } else if (this.op === "delete") {
      this.db[this.table] = all.filter((r) => !rows.includes(r));
    }
    if (this.head) return { data: null, count: rows.length, error: null };
    if (this.mode === "single") return rows.length === 1 ? { data: rows[0], error: null } : { data: null, error: { code: "PGRST116", message: "no rows" } };
    if (this.mode === "maybe") return { data: rows[0] || null, error: null };
    return { data: rows, error: null };
  }
}
