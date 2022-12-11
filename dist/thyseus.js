class H {
  isLocalToThread() {
    return !1;
  }
  intersectsWith(t) {
    return !1;
  }
  intoArgument(t) {
    return t.commands;
  }
  onAddSystem(t) {
  }
}
class J {
  #t = [];
  #e = 0;
  #i;
  #s;
  #n;
  #r;
  #o;
  #h;
  constructor(t, e, s, n, r) {
    this.#s = t, this.#o = s, this.#n = e, this.#r = n, this.#h = r, this.#i = this.#r.map(
      (o) => new o({}, 0, r)
    );
  }
  get size() {
    return this.#t.reduce((t, e) => t + e.size, 0);
  }
  *[Symbol.iterator]() {
    this.#e >= this.#i.length && this.#i.push(
      ...this.#r.map(
        (s) => new s({}, 0, this.#h)
      )
    );
    const t = this.#i.slice(
      this.#e,
      this.#e + this.#r.length
    ), e = this.#e;
    this.#e += this.#r.length;
    for (const s of this.#t) {
      t.forEach((n, r) => {
        const o = this.#i[r + e], h = s.columns.get(o.constructor);
        h ? (t[r] = o, t[r].__$$s = h) : t[r] = null;
      });
      for (let n = 0; n < s.size; n++) {
        for (const r of t)
          r && (r.__$$i = n);
        this.#o ? yield t[0] : yield t;
      }
    }
  }
  testAdd(t, e) {
    this.#a(t) && this.#t.push(e);
  }
  #a(t) {
    for (let e = 0; e < this.#s.length; e++)
      if ((this.#s[e] & t) === this.#s[e] && (this.#n[e] & t) === 0n)
        return !0;
    return !1;
  }
}
class B {
  value;
  constructor(t) {
    this.value = t;
  }
}
class b {
  value;
  constructor(t) {
    this.value = t;
  }
}
class O {
  value;
  constructor(t) {
    this.value = t;
  }
}
class P {
  value;
  constructor(t) {
    this.value = t;
  }
}
class x {
  l;
  r;
  constructor(t, e) {
    this.l = t, this.r = e;
  }
}
function u(i, t, e = Error) {
  if (!i)
    throw new e(t);
}
function G(i, t, e, s) {
  const n = v(s, i, [
    [R(i, t, e)],
    [0n]
  ]), r = n[0].reduce(
    (o, h, a) => (n[0][a] & n[1][a]) === 0n ? o.add(a) : o,
    /* @__PURE__ */ new Set()
  );
  return n[0] = n[0].filter((o, h) => r.has(h)), n[1] = n[1].filter((o, h) => r.has(h)), u(
    n[0].length > 0,
    "Tried to construct a query that cannot match any entities."
  ), n;
}
const R = (i, t, e = []) => [t].flat().reduce(
  (s, n, r) => e[r] ? s : s | 1n << BigInt(i.indexOf(n)),
  0n
), v = (i, t, e) => [i].flat().reduce(
  (s, n) => K(s, t, n),
  e
), K = (i, t, e) => {
  if (e instanceof O) {
    const s = R(t, e.value);
    return [i[0].map((n) => n | s), i[1]];
  } else if (e instanceof P) {
    const s = R(t, e.value);
    return [i[0], i[1].map((n) => n | s)];
  } else if (e instanceof x) {
    const [s, n] = v(
      e.l,
      t,
      i
    ), [r, o] = v(
      e.r,
      t,
      i
    );
    return [
      [...s, ...r],
      [...n, ...o]
    ];
  }
  throw new Error(
    `Unrecognized filter (${e.constructor.name}) in Query.`
  );
};
class W {
  components = [];
  writes = [];
  optionals = [];
  filters;
  isIndividual;
  constructor(t, e = []) {
    this.isIndividual = !Array.isArray(t);
    const s = Array.isArray(t) ? t : [t];
    for (const n of s) {
      const r = n instanceof b || n instanceof B && n.value instanceof b;
      this.writes.push(r), this.optionals.push(n instanceof B);
      const o = n instanceof b ? n.value : n instanceof B ? n.value instanceof b ? n.value.value : n.value : n;
      u(
        o.size > 0,
        "You may not request direct access to ZSTs - use a With filter instead."
      ), this.components.push(o);
    }
    this.filters = e;
  }
  isLocalToThread() {
    return !1;
  }
  intersectsWith(t) {
    return t instanceof W ? this.components.some(
      (e, s) => t.components.some(
        (n, r) => e === n && (this.writes[s] || t.writes[r])
      )
    ) : !1;
  }
  onAddSystem(t) {
    this.components.forEach((e) => t.registerComponent(e)), this.#t(this.filters, t);
  }
  intoArgument(t) {
    const e = new J(
      ...G(
        t.components,
        this.components,
        this.optionals,
        this.filters
      ),
      this.isIndividual,
      this.components,
      t.commands
    );
    return t.queries.push(e), e;
  }
  #t(t, e) {
    [t].flat().forEach((s) => {
      s instanceof O || s instanceof P ? [s.value].flat().forEach((n) => e.registerComponent(n)) : s instanceof x && (this.#t(s.l, e), this.#t(s.r, e));
    });
  }
}
let C = 0, y = 1, S = 0, l = [], _ = [], $ = {};
const p = {
  u8: 1 << 0,
  u16: 1 << 1,
  u32: 1 << 2,
  u64: 1 << 3,
  i8: 1 << 4,
  i16: 1 << 5,
  i32: 1 << 6,
  i64: 1 << 7,
  f32: 1 << 8,
  f64: 1 << 9
}, U = {
  u8: Uint8Array,
  u16: Uint16Array,
  u32: Uint32Array,
  u64: BigUint64Array,
  i8: Int8Array,
  i16: Int16Array,
  i32: Int32Array,
  i64: BigInt64Array,
  f32: Float32Array,
  f64: Float64Array
}, tt = (i, t, e) => {
  const s = _.reduce(
    (r, o, h) => o < t && h < r ? h : r,
    _.length
  );
  if (s === _.length) {
    l.push(i), _.push(t), $[i] = l.length === 0 ? 0 : S;
    return;
  }
  const n = l[s];
  l.splice(s, 0, i), _.splice(s, 0, t), $[i] = $[n];
  for (let r = s + 1; r < l.length; r++)
    $[l[r]] += e;
};
function T(i, t, e, s = 0) {
  return y = Math.max(y, t), C |= s, tt(i, t, e), S += e, $;
}
function et() {
  const i = {
    schema: C,
    size: Math.ceil(S / y) * y,
    alignment: y
  };
  C = 0, S = 0, y = 1;
  for (let t = 0; t < l.length; t++)
    $[l[t]] /= _[t];
  return $ = {}, l.length = 0, _.length = 0, i;
}
function f(i) {
  return function() {
    return function(e, s) {
      const n = U[i], r = T(
        s,
        n.BYTES_PER_ELEMENT,
        n.BYTES_PER_ELEMENT,
        p[i]
      ), o = 31 - Math.clz32(n.BYTES_PER_ELEMENT);
      Object.defineProperty(e, s, {
        enumerable: !0,
        get() {
          return this.__$$s[i][(this.__$$b >> o) + r[s]];
        },
        set(h) {
          this.__$$s[i][(this.__$$b >> o) + r[s]] = h;
        }
      });
    };
  };
}
const st = f("u8"), it = f("u16"), nt = f("u32"), rt = f("u64"), ot = f("i8"), ht = f("i16"), at = f("i32"), ct = f("i64"), ut = f("f32"), ft = f("f64"), lt = function() {
  return function(t, e) {
    const s = T(
      e,
      Uint8Array.BYTES_PER_ELEMENT,
      Uint8Array.BYTES_PER_ELEMENT,
      p.u8
    );
    Object.defineProperty(t, e, {
      enumerable: !0,
      get() {
        return !!this.__$$s.u8[this.__$$b + s[e]];
      },
      set(n) {
        this.__$$s.u8[this.__$$b + s[e]] = Number(n);
      }
    });
  };
}, dt = new TextEncoder(), mt = new TextDecoder();
function gt({
  characterCount: i,
  byteLength: t
}) {
  return function(s, n) {
    t ??= i * 3;
    const r = T(
      n,
      Uint8Array.BYTES_PER_ELEMENT,
      t
    );
    Object.defineProperty(s, n, {
      enumerable: !0,
      get() {
        return mt.decode(
          this.__$$s.u8.subarray(
            this.__$$b + r[n],
            this.__$$b + r[n] + t
          )
        ).split("\0")[0];
      },
      set(o) {
        dt.encodeInto(
          o,
          this.__$$s.u8.subarray(
            this.__$$b + r[n],
            this.__$$b + r[n] + t
          ).fill(0)
        );
      }
    });
  };
}
function _t({ type: i, length: t }) {
  return function(s, n) {
    const r = U[i], o = T(
      n,
      r.BYTES_PER_ELEMENT,
      r.BYTES_PER_ELEMENT * t,
      p[i]
    ), h = 31 - Math.clz32(r.BYTES_PER_ELEMENT);
    Object.defineProperty(s, n, {
      enumerable: !0,
      get() {
        return this.__$$s[i].subarray(
          (this.__$$b >> h) + o[n],
          (this.__$$b >> h) + o[n] + t
        );
      },
      set(a) {
        this.__$$s[i].set(
          a.subarray(0, t),
          (this.__$$b >> h) + o[n]
        );
      }
    });
  };
}
function $t(i) {
  return function(e, s) {
    const n = T(
      s,
      i.alignment,
      i.size,
      i.schema
    );
    Object.defineProperty(e, s, {
      enumerable: !0,
      get() {
        const r = new i(this.__$$s, 0, {});
        return r.__$$b = this.__$$b + n[s] * i.alignment, r;
      },
      set(r) {
        this.__$$s.u8.set(
          r.__$$s,
          this.__$$b + n[s] * i.alignment
        );
      }
    });
  };
}
function c() {
  return function(t) {
    const { schema: e, size: s, alignment: n } = et();
    return class extends t {
      static schema = e | (t.schema ?? 0);
      static size = s;
      static alignment = n;
      __$$s;
      __$$b;
      #t;
      get __$$i() {
        return this.#t;
      }
      set __$$i(r) {
        this.#t = r, this.__$$b = r * this.constructor.size;
      }
      constructor(r, o) {
        super(), this.__$$s = r, this.#t = o, this.__$$b = o * this.constructor.size;
      }
    };
  };
}
c.bool = lt;
c.u8 = st;
c.u16 = it;
c.u32 = nt;
c.u64 = rt;
c.i8 = ot;
c.i16 = ht;
c.i32 = at;
c.i64 = ct;
c.f32 = ut;
c.f64 = ft;
c.string = gt;
c.array = _t;
c.substruct = $t;
function F(i) {
  return typeof i == "function" && typeof i.size == "number" && typeof i.alignment == "number" && typeof i.schema == "number";
}
class N {
  resource;
  canWrite;
  constructor(t) {
    const e = t instanceof b;
    this.resource = e ? t.value : t, this.canWrite = e;
  }
  isLocalToThread() {
    return !F(this.resource);
  }
  intersectsWith(t) {
    return t instanceof N ? this.resource === t.resource && (this.canWrite || t.canWrite) : !1;
  }
  onAddSystem(t) {
    t.registerResource(this.resource);
  }
  intoArgument(t) {
    return t.resources.get(this.resource);
  }
}
class pt {
  isLocalToThread() {
    return !0;
  }
  intersectsWith(t) {
    return !0;
  }
  intoArgument(t) {
    return t;
  }
  onAddSystem(t) {
  }
}
function m(i) {
  return (...t) => new i(...t);
}
const wt = {
  Commands: m(H),
  Query: m(W),
  Res: m(N),
  World: m(pt),
  Mut: m(b),
  Optional: m(B),
  With: m(O),
  Without: m(P),
  Or(i, t) {
    return new x(i, t);
  }
};
function bt(i, t) {
  return {
    parameters: i(wt),
    fn: t
  };
}
function* M(i) {
  let t = 0;
  for (; i !== 0n; )
    (i & 1n) === 1n && (yield t), i >>= 1n, t++;
}
function yt(i, t, e) {
  const s = Array.from({ length: i.length }, () => 0n), n = (r, o) => (s[r] & 1n << BigInt(o)) !== 0n;
  return t.forEach((r, o) => {
    if (!!r) {
      for (const h of r.before ?? []) {
        const a = i.indexOf(h);
        a !== -1 && (u(
          !n(o, a),
          `Circular dependency detected: ${i[o].fn.name} (${o}) and ${i[a].fn.name} (${a}) depend on each other.`
        ), s[a] |= 1n << BigInt(o));
      }
      for (const h of r.after ?? []) {
        const a = i.indexOf(h);
        a !== -1 && (u(
          !n(a, o),
          `Circular dependency detected: ${i[o].fn.name} (${o}) and ${i[a].fn.name} (${a}) depend on each other.`
        ), s[o] |= 1n << BigInt(a));
      }
    }
  }), s.forEach((r, o) => {
    u(
      !n(o, o),
      `Circular dependency detected: ${i[o].fn.name} (${o}) and ${i[o].fn.name} (${o}) depend on each other.`
    );
  }), t.forEach((r, o) => {
    if (!!r) {
      if (r.beforeAll)
        for (const h of M(e[o]))
          h !== o && (s[o] & 1n << BigInt(h)) === 0n && (s[h] |= 1n << BigInt(o));
      if (r.afterAll)
        for (const h of M(e[o]))
          h !== o && (s[h] & 1n << BigInt(o)) === 0n && (s[o] |= 1n << BigInt(h));
    }
  }), s.forEach((r, o) => s[o] &= e[o]), s;
}
function Et(i, t) {
  return i.parameters.some(
    (e) => t.parameters.some(
      (s) => e.intersectsWith(s) || s.intersectsWith(e)
    )
  ) ? 1 : 0;
}
function At(i) {
  return i.map(
    (t) => i.reduce(
      (e, s, n) => e | BigInt(Et(t, s)) << BigInt(n),
      0n
    )
  );
}
const Tt = (i, t) => {
  for (const [e, s] of t) {
    const n = i.get(e);
    n === void 0 ? i.set(e, s) : n !== 0n && i.set(e, n | s);
  }
  return i;
}, zt = bt(
  ({ World: i }) => [i()],
  async function(t) {
    const e = (await t.threads.send(
      "thyseus::getCommandQueue"
    )).reduce(Tt, t.commands.queue);
    for (const [s, n] of e)
      t.moveEntity(s, n);
    e.clear();
  }
);
class d {
  static schema = p.u64 | p.u32;
  static size = 8;
  __$$s;
  __$$b;
  #t;
  #e;
  constructor(t, e, s) {
    this.__$$s = t, this.#t = e, this.__$$b = e * d.size, this.#e = s;
  }
  get __$$i() {
    return this.#t;
  }
  set __$$i(t) {
    this.#t = t, this.__$$b = t * d.size;
  }
  get id() {
    return this.__$$s.u64[this.__$$b >> 3];
  }
  get index() {
    return this.__$$s.u32[this.__$$b >> 2];
  }
  get generation() {
    return this.__$$s.u32[(this.__$$b >> 2) + 1];
  }
  insert(t) {
    return this.#e.insertInto(this.id, t), this;
  }
  remove(t) {
    return this.#e.removeFrom(this.id, t), this;
  }
  despawn() {
    this.#e.despawn(this.id);
  }
}
const [, ...Bt] = Object.entries(U);
function Y(i, t) {
  return Bt.reduce((e, [s, n]) => ((p[s] & i.schema) === p[s] && (e[s] = new n(e.buffer)), e), t);
}
function k(i, t, e) {
  const s = i.createBuffer(t.size * e);
  return Y(t, {
    buffer: s,
    u8: new Uint8Array(s)
  });
}
function St(i, t, e) {
  const s = new i.buffer.constructor(
    t.size * e
  ), n = new Uint8Array(s);
  return n.set(i.u8), i.buffer = s, i.u8 = n, Y(t, i);
}
class Q {
  columns;
  meta;
  static create(t, e) {
    const s = new Uint32Array(t.createBuffer(8));
    return s[1] = t.config.getNewTableSize(0), new this(
      e.reduce((n, r) => (r.size > 0 && n.set(
        r,
        k(
          t,
          r,
          t.config.getNewTableSize(0)
        )
      ), n), /* @__PURE__ */ new Map()),
      s
    );
  }
  constructor(t, e) {
    this.columns = t, this.meta = e;
  }
  get size() {
    return this.meta[0];
  }
  set size(t) {
    this.meta[0] = t;
  }
  get capacity() {
    return this.meta[1];
  }
  set capacity(t) {
    this.meta[1] = t;
  }
  get isFull() {
    return this.capacity === this.size;
  }
  add(t) {
    this.columns.get(d).u64[this.size++] = t;
  }
  delete(t) {
    this.size--;
    for (const [e, s] of this.columns)
      s.u8.copyWithin(
        t * e.size,
        this.size * e.size,
        this.size * e.size + e.size
      ), s.u8.fill(
        0,
        this.size * e.size,
        this.size * e.size + e.size
      );
  }
  move(t, e) {
    for (const [s, n] of this.columns)
      e.columns.has(s) && e.columns.get(s).u8.set(
        n.u8.slice(
          t * s.size,
          t * s.size + s.size
        ),
        e.size * s.size
      );
    this.delete(t), e.size++;
  }
  grow(t) {
    this.capacity = t.config.getNewTableSize(this.capacity);
    for (const [e, s] of this.columns)
      this.columns.set(e, St(s, e, this.capacity));
  }
}
function Mt(i) {
  i.addSystem(zt, { afterAll: !0 }), i.registerComponent(d), i.registerThreadChannel("thyseus::getCommandQueue", (t) => () => {
    const e = new Map(t.commands.queue);
    return t.commands.queue.clear(), e;
  }), i.registerThreadChannel(
    "thyseus::newTable",
    (t) => ([e, s, n]) => {
      const r = [...M(e)].reduce(
        (h, a, g) => h.set(t.components[a], s[g]),
        /* @__PURE__ */ new Map()
      ), o = new Q(r, n);
      t.archetypes.set(e, o);
      for (const h of t.queries)
        h.testAdd(e, o);
    }
  ), i.registerThreadChannel(
    "thyseus::growTable",
    (t) => ([e, s]) => {
      const n = t.archetypes.get(e);
      let r = 0;
      for (const o of n.columns.keys())
        n.columns.set(o, s[r++]);
    }
  );
}
class A {
  static isMainThread = !!globalThis.document;
  isMainThread = A.isMainThread;
  static spawn(t, e) {
    return new this(
      A.isMainThread ? Array.from(
        { length: t },
        () => new Worker(e, { type: "module" })
      ) : [globalThis]
    );
  }
  #t = 0;
  #e = /* @__PURE__ */ new Map();
  #i = {};
  #s = [];
  #n;
  constructor(t) {
    this.#n = t;
    const e = ({
      currentTarget: s,
      data: [n, r, o]
    }) => {
      this.#e.has(n) ? (this.#e.get(n)(o), this.#e.delete(n)) : r in this.#i ? s.postMessage([
        n,
        r,
        this.#i[r](o)
      ]) : s.postMessage([n, r, null]);
    };
    for (const s of this.#n)
      s.addEventListener("message", e);
  }
  setListener(t, e) {
    this.#i[t] = e;
  }
  deleteListener(t) {
    delete this.#i[t];
  }
  send(t, e) {
    return Promise.all(
      this.#n.map((s) => {
        const n = this.#t++;
        return s.postMessage([n, t, e]), new Promise((r) => this.#e.set(n, r));
      })
    );
  }
  queue(t) {
    if (A.isMainThread) {
      const e = t();
      return this.#s.push(e), e;
    } else
      return this.#s.shift();
  }
  async wrapInQueue(t) {
    const e = "@@";
    let s;
    return this.isMainThread ? (s = await t(), await this.send(e, this.#s)) : (s = await new Promise(
      (n) => this.setListener(e, (r) => {
        this.#s = r, n(t());
      })
    ), this.deleteListener(e)), this.#s.length = 0, s;
  }
}
class qt {
  systems = [];
  systemDependencies = [];
  #t = [];
  components = /* @__PURE__ */ new Set();
  resources = /* @__PURE__ */ new Set();
  threadChannels = {};
  config;
  url;
  constructor(t, e) {
    this.config = t, this.url = e, Mt(this);
  }
  addSystem(t, e) {
    return this.systems.push(t), this.systemDependencies.push(e), this.#e(t), this;
  }
  addStartupSystem(t) {
    return this.#t.push(t), this.#e(t), this;
  }
  addPlugin(t) {
    return t(this), this;
  }
  registerComponent(t) {
    return this.components.add(t), this;
  }
  registerResource(t) {
    return this.resources.add(t), this;
  }
  registerThreadChannel(t, e) {
    return this.threadChannels[t] = e, this;
  }
  async build() {
    const t = A.spawn(this.config.threads - 1, this.url), e = await t.wrapInQueue(
      () => new Nt(
        this.config,
        t,
        [...this.components],
        [...this.resources],
        this.systems,
        this.systemDependencies,
        this.threadChannels
      )
    );
    if (t.isMainThread) {
      await Promise.all(
        Array.from(
          e.resources.values(),
          (s) => s.initialize?.(e)
        )
      );
      for (const { fn: s, parameters: n } of this.#t)
        await s(...n.map((r) => r.intoArgument(e)));
    }
    return await t.wrapInQueue(() => {
    }), e;
  }
  #e(t) {
    t.parameters.forEach((e) => e.onAddSystem(this));
  }
}
const q = 0b11111111n;
class L {
  static getBufferLength(t, e) {
    return Math.ceil(t / 8) * e;
  }
  #t;
  width;
  length;
  #e;
  constructor(t, e, s) {
    this.width = t, this.length = e, this.#e = s, this.#t = Math.ceil(this.width / 8);
  }
  get bytesPerElement() {
    return this.#t;
  }
  get byteLength() {
    return this.#e.byteLength;
  }
  get(t) {
    let e = 0n;
    const s = this.#t * t;
    for (let n = 0; n < this.#t; n++)
      e |= BigInt(this.#e[s + n]) << BigInt(n * 8);
    return e;
  }
  set(t, e) {
    const s = this.#t * t;
    for (let n = 0; n < this.#t; n++)
      this.#e[s + n] = Number(e >> BigInt(n * 8) & q);
  }
  OR(t, e) {
    const s = this.#t * t;
    for (let n = 0; n < this.#t; n++)
      this.#e[s + n] |= Number(e >> BigInt(n * 8) & q);
  }
  XOR(t, e) {
    const s = this.#t * t;
    for (let n = 0; n < this.#t; n++)
      this.#e[s + n] ^= Number(e >> BigInt(n * 8) & q);
  }
}
const w = {
  push(i, t) {
    i[i[i.length - 1]] = t, i[i.length - 1]++;
  },
  size(i) {
    return i[i.length - 1];
  },
  *iter(i) {
    const t = i[i.length - 1];
    for (let e = 0; e < t; e++)
      yield i[e];
  },
  delete(i, t) {
    i[t] = i[w.size(i) - 1], i[i.length - 1]--;
  }
};
let It = 0;
class Rt {
  static fromWorld(t, e, s) {
    const n = t.threads.queue(
      () => At(e)
    ), r = t.threads.queue(
      () => yt(e, s, n)
    ), o = t.threads.isMainThread ? e.reduce(
      (z, V, X) => V.parameters.some(
        (Z) => Z.isLocalToThread()
      ) ? z.add(X) : z,
      /* @__PURE__ */ new Set()
    ) : /* @__PURE__ */ new Set(), h = t.threads.queue(
      () => new Uint16Array(t.createBuffer(2 * e.length + 2))
    ), a = new L(
      e.length,
      2,
      t.threads.queue(
        () => new Uint8Array(
          t.createBuffer(
            L.getBufferLength(e.length, 2)
          )
        )
      )
    ), g = t.threads.queue(() => String(It++));
    return new this(
      n,
      r,
      h,
      a,
      o,
      g
    );
  }
  #t = new BroadcastChannel("thyseus::executor");
  #e = [];
  #i;
  #s;
  #n;
  #r;
  #o;
  #h;
  constructor(t, e, s, n, r, o) {
    this.#i = t, this.#s = e, this.#n = s, this.#r = n, this.#o = r, this.#h = o, this.#t.addEventListener("message", () => {
      this.#e.forEach((h) => h(0)), this.#e.length = 0;
    });
  }
  start() {
    this.#a();
  }
  reset() {
    this.#r.set(0, 0n), this.#r.set(1, 0n);
    for (let t = 0; t < this.#s.length; t++)
      this.#o.has(t) || w.push(this.#n, t);
  }
  #a() {
    this.#t.postMessage(0), this.#e.forEach((t) => t(0)), this.#e.length = 0;
  }
  async #c() {
    return new Promise((t) => this.#e.push(t));
  }
  async onReady(t) {
    await this.#c(), t();
  }
  async *[Symbol.asyncIterator]() {
    const t = new Set(this.#o);
    for (; w.size(this.#n) + t.size > 0; ) {
      const e = w.size(this.#n);
      let s = -1;
      await navigator.locks.request(this.#h, () => {
        const n = this.#r.get(0), r = this.#r.get(1);
        for (const o of [
          ...t,
          ...w.iter(this.#n)
        ])
          if ((n & this.#i[o]) === 0n && (r & this.#s[o]) === this.#s[o]) {
            s = o, t.has(o) ? t.delete(o) : w.delete(
              this.#n,
              this.#n.indexOf(o)
            ), this.#r.OR(0, 1n << BigInt(o));
            break;
          }
      }), s > -1 ? (yield s, await navigator.locks.request(this.#h, () => {
        this.#r.XOR(0, 1n << BigInt(s)), this.#r.OR(1, 1n << BigInt(s));
      }), this.#a()) : (e !== 0 || t.size !== 0) && await this.#c();
    }
  }
}
class vt {
  queue = /* @__PURE__ */ new Map();
  #t;
  #e;
  #i;
  #s;
  constructor(t, e) {
    this.#t = t;
    const s = new ArrayBuffer(8);
    this.#i = new BigUint64Array(1), this.#e = new d(
      { buffer: s, u8: new Uint8Array(s), u64: this.#i },
      0,
      this
    ), this.#s = e;
  }
  spawn() {
    const t = this.#t.spawn();
    return this.#i[0] = t, this.insertInto(t, d), this.#e;
  }
  despawn(t) {
    return this.queue.set(t, 0n), this;
  }
  get(t) {
    return this.#i[0] = t, this.#e;
  }
  insertInto(t, e) {
    this.queue.set(
      t,
      (this.queue.get(t) ?? this.#t.getTableId(t)) | 1n << BigInt(this.#s.indexOf(e))
    );
  }
  removeFrom(t, e) {
    this.queue.set(
      t,
      (this.queue.get(t) ?? this.#t.getTableId(t)) ^ 1n << BigInt(this.#s.indexOf(e))
    );
  }
}
const Ct = 0, I = 1, j = 32n, Lt = 0x00000000ffffffffn, E = (i) => Number(i & Lt), Ot = (i) => Number(i >> j);
class D {
  static fromWorld(t) {
    const e = t.config.maxEntities;
    return new D(
      t.threads.queue(
        () => new Uint32Array(t.createBuffer(e * 4))
      ),
      new L(
        t.components.length,
        e,
        t.threads.queue(() => new Uint8Array(e))
      ),
      t.threads.queue(
        () => new Uint32Array(t.createBuffer(e * 4))
      ),
      t.threads.queue(
        () => new Uint32Array(t.createBuffer(2 * 4))
      ),
      t.threads.queue(
        () => new Uint32Array(
          t.createBuffer(Math.ceil(e / 8) * 4)
        )
      )
    );
  }
  generations;
  tableIds;
  row;
  #t;
  #e;
  constructor(t, e, s, n, r) {
    this.generations = t, this.tableIds = e, this.row = s, this.#t = n, this.#e = r;
  }
  spawn() {
    for (let e = 0; e < this.#e.length && Atomics.load(this.#t, I) !== 0; e++)
      for (; ; ) {
        const s = Atomics.load(this.#e, e);
        if (s === 0)
          break;
        const n = Pt(s);
        if (Atomics.xor(this.#e, e, 1 << n) === s)
          return Atomics.sub(this.#t, I, 1), BigInt(this.generations[n]) << j | BigInt(32 * e + n);
      }
    const t = Atomics.add(this.#t, Ct, 1);
    return BigInt(t);
  }
  despawn(t) {
    const e = E(t), s = Ot(t);
    Atomics.compareExchange(
      this.generations,
      e,
      s,
      s + 1
    ) === s && (Atomics.or(this.#e, e >> 5, 1 << (e & 31)), Atomics.add(this.#t, I, 1));
  }
  getTableId(t) {
    return this.tableIds.get(E(t));
  }
  getRow(t) {
    return this.row[E(t)];
  }
  setLocation(t, e, s) {
    this.tableIds.set(E(t), e), this.row[E(t)] = s;
  }
}
const Pt = (i) => (i >>>= 0, 31 - Math.clz32(i & -i)), xt = (i = {}) => ({
  threads: 1,
  maxEntities: 2 ** 16,
  getNewTableSize: (t) => t === 0 ? 8 : t * 2,
  ...i
}), Wt = ({ threads: i, maxEntities: t }, e) => {
  i > 1 && (u(
    isSecureContext,
    "Invalid config - Multithreading (threads > 1) requires a secure context."
  ), u(
    typeof SharedArrayBuffer < "u",
    "Invalid config - Multithreading (threads > 1) requires SharedArrayBuffer."
  ), u(
    e,
    "Invalid config - Multithreading (threads > 1) requires a module URL parameter.",
    TypeError
  )), u(
    Number.isInteger(i) && 0 < i && i < 64,
    "Invalid config - 'threads' must be an integer such that 0 < threads < 64",
    RangeError
  ), u(
    Number.isInteger(t) && 0 < t && t < 2 ** 32,
    "Invalid config - 'maxEntities' must be an integer such that 0 < maxEntities < 2**32",
    RangeError
  );
};
function Ut(i, t) {
  const e = xt(i);
  return Wt(e, t), e;
}
class Nt {
  static new(t, e) {
    return new qt(Ut(t, e), e);
  }
  archetypes = /* @__PURE__ */ new Map();
  queries = [];
  #t;
  config;
  resources;
  threads;
  systems;
  executor;
  commands;
  entities;
  components;
  constructor(t, e, s, n, r, o, h) {
    this.#t = t.threads > 1 ? SharedArrayBuffer : ArrayBuffer, this.config = t, this.threads = e;
    for (const a in h)
      this.threads.setListener(a, h[a](this));
    this.components = s, this.entities = D.fromWorld(this), this.commands = new vt(this.entities, this.components), this.executor = Rt.fromWorld(this, r, o), this.resources = /* @__PURE__ */ new Map();
    for (const a of n)
      if (F(a)) {
        const g = e.queue(
          () => k(this, a, 1)
        );
        this.resources.set(
          a,
          new a(g, 0, this.commands)
        );
      } else
        e.isMainThread && this.resources.set(a, new a());
    this.systems = r.map(({ fn: a, parameters: g }) => ({
      execute: a,
      args: g.map((z) => z.intoArgument(this))
    })), this.executor.onReady(() => this.#e());
  }
  moveEntity(t, e) {
    const s = this.entities.getTableId(t), n = this.archetypes.get(s);
    if (e === 0n) {
      this.#i(t);
      return;
    }
    const r = this.#s(e);
    r.isFull && this.#n(e, r), n ? (this.entities.setLocation(
      n.columns.get(d).u64[n.size - 1],
      s,
      this.entities.getRow(t)
    ), n.move(this.entities.getRow(t), r)) : r.add(t), this.entities.setLocation(
      t,
      e,
      r.size - 1
    );
  }
  createBuffer(t) {
    return new this.#t(t);
  }
  async update() {
    this.executor.reset(), this.executor.start();
  }
  async #e() {
    for await (const t of this.executor) {
      const e = this.systems[t];
      await e.execute(...e.args);
    }
    this.executor.onReady(() => this.#e());
  }
  #i(t) {
    const e = this.entities.getTableId(t), s = this.archetypes.get(e);
    if (s) {
      const n = this.entities.getRow(t);
      this.entities.setLocation(
        s.columns.get(d).u64[s.size - 1],
        e,
        n
      ), s.delete(this.entities.getRow(t));
    }
    this.entities.setLocation(t, 0n, 0);
  }
  #s(t) {
    if (!this.archetypes.has(t)) {
      const e = Q.create(
        this,
        [...M(t)].map((s) => this.components[s])
      );
      this.threads.send("thyseus::newTable", [
        t,
        [...e.columns.values()],
        e.meta
      ]), this.archetypes.set(t, e);
      for (const s of this.queries)
        s.testAdd(t, e);
    }
    return this.archetypes.get(t);
  }
  #n(t, e) {
    e.grow(this), this.threads.send("thyseus::growTable", [
      t,
      [...e.columns.values()],
      e.meta
    ]);
  }
}
function Dt(i) {
  return i;
}
export {
  d as Entity,
  Nt as World,
  zt as applyCommands,
  Dt as definePlugin,
  bt as defineSystem,
  c as struct
};
