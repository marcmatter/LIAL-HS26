/**
 * Exact rational numbers backed by BigInt, so row reduction never
 * accumulates floating point error. Instances are immutable and always
 * normalised (gcd-reduced, positive denominator).
 */
export class Fraction {
  readonly n: bigint;
  readonly d: bigint;

  static readonly ZERO = new Fraction(0n);
  static readonly ONE = new Fraction(1n);

  constructor(n: bigint, d: bigint = 1n) {
    if (d === 0n) throw new RangeError("Division by zero.");
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    const g = gcd(n < 0n ? -n : n, d);
    this.n = g > 1n ? n / g : n;
    this.d = g > 1n ? d / g : d;
  }

  /**
   * Parses "3", "-2.5", "1e-3", "1/3" or "-0.5/1.5". Commas are accepted as
   * decimal separators. Returns null for anything else (or a zero denominator).
   */
  static parse(raw: string): Fraction | null {
    const s = raw.trim().replace(",", ".");
    if (s === "") return null;
    const slash = s.indexOf("/");
    if (slash === -1) return parseDecimal(s);
    const num = parseDecimal(s.slice(0, slash));
    const den = parseDecimal(s.slice(slash + 1));
    if (!num || !den || den.isZero()) return null;
    return num.div(den);
  }

  add(o: Fraction): Fraction {
    return new Fraction(this.n * o.d + o.n * this.d, this.d * o.d);
  }

  sub(o: Fraction): Fraction {
    return new Fraction(this.n * o.d - o.n * this.d, this.d * o.d);
  }

  mul(o: Fraction): Fraction {
    return new Fraction(this.n * o.n, this.d * o.d);
  }

  div(o: Fraction): Fraction {
    return new Fraction(this.n * o.d, this.d * o.n);
  }

  neg(): Fraction {
    return new Fraction(-this.n, this.d);
  }

  isZero(): boolean {
    return this.n === 0n;
  }

  isOne(): boolean {
    return this.n === 1n && this.d === 1n;
  }

  isNegative(): boolean {
    return this.n < 0n;
  }

  isInteger(): boolean {
    return this.d === 1n;
  }

  toNumber(): number {
    return Number(this.n) / Number(this.d);
  }

  /** "a/b", or "a" for integers. Round-trips through Fraction.parse. */
  toString(): string {
    return this.d === 1n ? this.n.toString() : `${this.n}/${this.d}`;
  }

  /** Decimal representation rounded to `digits` places, without trailing zeros. */
  toDecimal(digits = 7): string {
    if (this.isInteger()) return this.n.toString();
    const rounded = Number(this.toNumber().toFixed(digits));
    return Object.is(rounded, -0) ? "0" : rounded.toString();
  }
}

function gcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) [a, b] = [b, a % b];
  return a === 0n ? 1n : a;
}

function parseDecimal(s: string): Fraction | null {
  const m = /^\s*([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?\s*$/.exec(s);
  if (!m) return null;
  const [, sign, int = "", frac = "", exp = "0"] = m;
  if (int === "" && frac === "") return null;
  let n = BigInt((int || "0") + frac);
  let d = 10n ** BigInt(frac.length);
  const e = Number(exp);
  if (Math.abs(e) > 100) return null;
  if (e > 0) n *= 10n ** BigInt(e);
  if (e < 0) d *= 10n ** BigInt(-e);
  return new Fraction(sign === "-" ? -n : n, d);
}
