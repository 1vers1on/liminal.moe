class Zrt5 {
    a: bigint;
    b: bigint;

    constructor(a: bigint, b: bigint) {
        this.a = a;
        this.b = b;
    }

    multiply(x: Zrt5): Zrt5 {
        let bb = this.b * x.b;
        bb = (bb << 2n) + bb;
        return new Zrt5(
            this.a * x.a + bb,
            this.a * x.b + this.b * x.a
        );
    }

    multiplyAssign(x: Zrt5): this {
        const result = this.multiply(x);
        this.a = result.a;
        this.b = result.b;
        return this;
    }

    rightShift(n: number): this {
        this.a >>= BigInt(n);
        this.b >>= BigInt(n);
        return this;
    }
}

export function fibonacci(n: number): string {
    if (n === 0) {
        return '0';
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
