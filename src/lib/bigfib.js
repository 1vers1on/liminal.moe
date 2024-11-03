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
