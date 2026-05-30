const API_PATH = import.meta.env.VITE_DATA_API_PATH || '/api/db';

async function getAuthToken() {
  try {
    const clerk = window.Clerk;
    if (clerk?.session?.getToken) return await clerk.session.getToken();
  } catch (error) {
    console.warn('Unable to read Clerk token:', error);
  }
  return null;
}

async function request(payload) {
  const token = await getAuthToken();
  const response = await fetch(API_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { data: null, error: json.error || { message: response.statusText } };
  }
  return { data: json.data, error: null };
}

class NeonQueryBuilder {
  constructor(table) {
    this.payload = {
      table,
      action: null,
      filters: [],
      order: [],
      limit: null,
      values: null,
      columns: '*',
      onConflict: null,
      single: false,
      maybeSingle: false
    };
  }

  select(columns = '*') {
    this.payload.action = this.payload.action || 'select';
    this.payload.columns = columns;
    return this;
  }

  insert(values) {
    this.payload.action = 'insert';
    this.payload.values = values;
    return this;
  }

  update(values) {
    this.payload.action = 'update';
    this.payload.values = values;
    return this;
  }

  upsert(values, options = {}) {
    this.payload.action = 'upsert';
    this.payload.values = values;
    this.payload.onConflict = options.onConflict || null;
    return this;
  }

  delete() {
    this.payload.action = 'delete';
    return this;
  }

  eq(column, value) {
    this.payload.filters.push({ op: 'eq', column, value });
    return this;
  }

  in(column, value) {
    this.payload.filters.push({ op: 'in', column, value });
    return this;
  }

  like(column, value) {
    this.payload.filters.push({ op: 'like', column, value });
    return this;
  }

  ilike(column, value) {
    this.payload.filters.push({ op: 'ilike', column, value });
    return this;
  }

  is(column, value) {
    this.payload.filters.push({ op: 'is', column, value });
    return this;
  }

  gte(column, value) {
    this.payload.filters.push({ op: 'gte', column, value });
    return this;
  }

  lte(column, value) {
    this.payload.filters.push({ op: 'lte', column, value });
    return this;
  }

  order(column, options = {}) {
    this.payload.order.push({ column, ascending: options.ascending !== false });
    return this;
  }

  limit(value) {
    this.payload.limit = value;
    return this;
  }

  single() {
    this.payload.single = true;
    return this;
  }

  maybeSingle() {
    this.payload.maybeSingle = true;
    return this;
  }

  then(resolve, reject) {
    if (!this.payload.action) this.payload.action = 'select';
    return request(this.payload).then(resolve, reject);
  }
}

export function createNeonBackedSupabaseClient() {
  return {
    from(table) {
      return new NeonQueryBuilder(table);
    }
  };
}

export async function callDataApi(payload) {
  return request(payload);
}
