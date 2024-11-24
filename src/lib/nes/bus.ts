export class Bus {
    cpuMemory: Uint8Array;
    prgMemory: Uint8Array;

    constructor() {
        this.cpuMemory = new Uint8Array(2048);
        this.prgMemory = new Uint8Array(0xffff - 0x8000);
    }

    zero() {
        this.cpuMemory.fill(0);
        this.prgMemory.fill(0);
    }

    read(address: number): number {
        if (address < 0x1ffff) {
            return this.cpuMemory[address & 0x7ff];
        } else if (address >= 0x8000 && address < 0xffff) {
            return this.prgMemory[address - 0x8000];
        } else {
            console.error("Bus read out of range: " + address.toString(16));
        }

        return 0;
    }

    readWord(address: number): number {
        return this.read(address) | (this.read(address + 1) << 8);
    }

    write(address: number, data: number) {
        data &= 0xff;
        if (address < 0x1ffff) {
            this.cpuMemory[address & 0x7ff] = data;
        } else if (address >= 0x8000 && address < 0xffff) {
            console.error("Write to PRG ROM: " + address.toString(16));
        } else {
            console.error("Bus write out of range: " + address.toString(16));
        }
    }

    writeWord(address: number, data: number) {
        data &= 0xffff;
        this.write(address, data & 0xff);
        this.write(address + 1, data >> 8);
    }
}
