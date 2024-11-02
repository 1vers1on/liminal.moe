class Complex {
    constructor(real, imaginary = 0n) {
        this.real = BigInt(real);
        this.imaginary = BigInt(imaginary);
    }

    static multiply(a, b) {
        return new Complex(
            a.real * b.real - a.imaginary * b.imaginary,
            a.real * b.imaginary + a.imaginary * b.real
        );
    }

    static add(a, b) {
        return new Complex(a.real + b.real, a.imaginary + b.imaginary);
    }

    static subtract(a, b) {
        return new Complex(a.real - b.real, a.imaginary - b.imaginary);
    }

    static divide(a, b) {
        const denom = b.real * b.real + b.imaginary * b.imaginary;
        return new Complex(
            (a.real * b.real + a.imaginary * b.imaginary) / denom,
            (a.imaginary * b.real - a.real * b.imaginary) / denom
        );
    }
}

function fft(a, invert = false) {
    const n = a.length;
    const logN = Math.log2(n);
    const roots = new Array(n);

    for (let i = 0; i < n; i++) {
        roots[i] = new Complex(Math.cos(2 * Math.PI * i / n), Math.sin(2 * Math.PI * i / n));
    }

    for (let len = 1; len < n; len *= 2) {
        for (let i = 0; i < n; i += len * 2) {
            for (let j = 0; j < len; j++) {
                const root = roots[(invert ? -j : j) * (n / (len * 2)) % n];
                const u = a[i + j];
                const v = Complex.multiply(root, a[i + j + len]);
                a[i + j] = Complex.add(u, v);
                a[i + j + len] = Complex.subtract(u, v);
            }
        }
    }

    if (invert) {
        for (let i = 0; i < n; i++) {
            a[i] = new Complex(a[i].real / n, a[i].imaginary / n);
        }
    }
}

function bitReverseShuffle(a) {
    const n = a.length;
    const result = new Array(n);
    for (let i = 0; i < n; i++) {
        const j = parseInt(i.toString(2).padStart(Math.log2(n), '0').split('').reverse().join(''), 2);
        result[j] = a[i];
    }
    return result;
}

function multiplyPolynomials(a, b) {
    const n = 1 << Math.ceil(Math.log2(a.length + b.length - 1));
    const aPadded = bitReverseShuffle([...a, ...new Array(n - a.length).fill(0n)]);
    const bPadded = bitReverseShuffle([...b, ...new Array(n - b.length).fill(0n)]);
    
    fft(aPadded);
    fft(bPadded);

    const c = new Array(n).fill(new Complex(0n));
    for (let i = 0; i < n; i++) {
        c[i] = Complex.multiply(aPadded[i], bPadded[i]);
    }

    fft(c, true);
    const result = c.map(x => x.real);
    return result;
}

class Zrt5 {
    constructor(a, b) {
        this.a = a;
        this.b = b;
    }

    multiply(x) {
        let bb = this.b * x.b;
        bb = (bb << 2n) + bb;
        return new Zrt5(
            this.a * x.a + bb,
            this.a * x.b + this.b * x.a
        );
    }

    multiplyAssign(x) {
        const result = this.multiply(x);
        this.a = result.a;
        this.b = result.b;
        return this;
    }

    rightShift(n) {
        this.a >>= BigInt(n);
        this.b >>= BigInt(n);
        return this;
    }
}

export function fibonacci(n) {
    if (n === 0) {
        return 0n;
    }

    let step = new Zrt5(1n, 1n);
    let fib = new Zrt5(1n, 1n);
    n--;

    while (n > 0) {
        if (n & 1) {
            fib.multiplyAssign(step);
            fib.rightShift(1);
        }
        step.multiplyAssign(step);
        step.rightShift(1);
        n >>= 1;
    }

    return fib.b.toString();
}
