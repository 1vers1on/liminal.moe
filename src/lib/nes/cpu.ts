import { Bus } from './bus';

enum AddressingMode {
    ACC,
    IMP,
    IMM,
    ZP0,
    ZPX,
    ZPY,
    REL,
    ABS,
    ABX,
    ABY,
    IND,
    IZX,
    IZY
}

export class CPU {
    programCounter: number = 0;
    oldProgramCounter: number = 0;

    accumulator: number = 0;
    xIndex: number = 0;
    yIndex: number = 0;

    stackPointer: number = 0;

    status: number = 0;

    oldAccumulator: number = 0;
    oldXIndex: number = 0;
    oldYIndex: number = 0;
    oldStackPointer: number = 0;
    oldStatus: number = 0;

    branchLocation: number = 0;

    cycles: number = 0;

    pageCrossed: boolean = false;

    bus: Bus;

    running: boolean = false;

    constructor(bus: Bus) {
        this.bus = bus;
        this.powerOn();
        this.running = true;
    }

    setAccumulator(value: number) {
        this.oldAccumulator = this.accumulator;
        this.accumulator = value;
        this.accumulator &= 0xFF;
    }

    setXIndex(value: number) {
        this.oldXIndex = this.xIndex;
        this.xIndex = value;
        this.xIndex &= 0xFF;
    }

    setYIndex(value: number) {
        this.oldYIndex = this.yIndex;
        this.yIndex = value;
        this.yIndex &= 0xFF;
    }

    setStackPointer(value: number) {
        this.oldStackPointer = this.stackPointer;
        this.stackPointer = value;
        this.stackPointer &= 0xFF;
    }

    setProgramCounter(value: number) {
        this.oldProgramCounter = this.programCounter;
        this.programCounter = value;
        this.programCounter &= 0xFFFF;
    }

    powerOn() {
        this.programCounter = this.bus.readWord(0xFFFC);
        this.accumulator = 0;
        this.xIndex = 0;
        this.yIndex = 0;
        this.stackPointer = 0xFD;
        this.status = 0x24;
        this.cycles = 4;

        this.oldAccumulator = 0;
        this.oldXIndex = 0;
        this.oldYIndex = 0;
        this.oldStackPointer = 0xFD;
        this.oldStatus = 0x24;

        this.pageCrossed = false;
    }

    reset() {
        this.programCounter = this.bus.readWord(0xFFFC);
        this.setStackPointer(this.stackPointer - 3);
        this.status = 0x24;
        this.cycles = 8;
        this.pageCrossed = false;
    }

    getCarryFlag(): boolean {
        return (this.status & 0x01) !== 0;
    }

    setCarryFlag(value: boolean) {
        this.status = value ? (this.status | 0x01) : (this.status & 0xFE);
    }

    getZeroFlag(): boolean {
        return (this.status & 0x02) !== 0;
    }

    setZeroFlag(value: boolean) {
        this.status = value ? (this.status | 0x02) : (this.status & 0xFD);
    }

    getInterruptDisableFlag(): boolean {
        return (this.status & 0x04) !== 0;
    }

    setInterruptDisableFlag(value: boolean) {
        this.status = value ? (this.status | 0x04) : (this.status & 0xFB);
    }

    getDecimalModeFlag(): boolean {
        return (this.status & 0x08) !== 0;
    }

    setDecimalModeFlag(value: boolean) {
        this.status = value ? (this.status | 0x08) : (this.status & 0xF7);
    }

    getBFlag(): boolean {
        return (this.status & 0x10) !== 0;
    }

    setBFlag(value: boolean) {
        this.status = value ? (this.status | 0x10) : (this.status & 0xEF);
    }

    getIFlag(): boolean {
        return (this.status & 0x20) !== 0;
    }

    setIFlag(value: boolean) {
        this.status = value ? (this.status | 0x20) : (this.status & 0xDF);
    }

    getOverflowFlag(): boolean {
        return (this.status & 0x40) !== 0;
    }

    setOverflowFlag(value: boolean) {
        this.status = value ? (this.status | 0x40) : (this.status & 0xBF);
    }

    getNegativeFlag(): boolean {
        return (this.status & 0x80) !== 0;
    }

    setNegativeFlag(value: boolean) {
        this.status = value ? (this.status | 0x80) : (this.status & 0x7F);
    }

    pushByte(value: number) {
        value &= 0xFF;
        this.bus.write(0x100 | this.stackPointer, value);
        this.setStackPointer(this.stackPointer - 1);
    }

    pushWord(value: number) {
        value &= 0xFFFF;
        this.pushByte(value >> 8);
        this.pushByte(value & 0xFF);
    }

    popByte(): number {
        this.setStackPointer(this.stackPointer + 1);
        return this.bus.read(0x100 | this.stackPointer);
    }

    popWord(): number {
        const low = this.popByte();
        const high = this.popByte();
        return low | (high << 8);
    }

    fetchByte(): number {
        const result = this.bus.read(this.programCounter);
        this.setProgramCounter(this.programCounter + 1);
        return result;
    }

    fetchWord(): number {
        const low = this.fetchByte();
        const high = this.fetchByte();
        return low | (high << 8);
    }

    fetchNoAdvance(): number {
        return this.bus.read(this.programCounter);
    }

    fetchWordNoAdvance(): number {
        const low = this.fetchNoAdvance();
        const high = this.bus.read(this.programCounter + 1);
        return low | (high << 8);
    }

    stepCpu(cycles: number): void {
        this.cycles += cycles;
    }

    getAddress(mode: AddressingMode): number {
        switch (mode) {
            case AddressingMode.ACC:
                this.stepCpu(2);
                return 0;

            case AddressingMode.IMP:
                this.stepCpu(2);
                return 0;

            case AddressingMode.IMM:
                this.stepCpu(2);
                return this.fetchByte();

            case AddressingMode.ZP0:
                this.stepCpu(3);
                return this.fetchByte();

            case AddressingMode.ZPX:
                this.stepCpu(4);
                return (this.fetchByte() + this.xIndex) & 0xFF;

            case AddressingMode.ZPY:
                this.stepCpu(4);
                return (this.fetchByte() + this.yIndex) & 0xFF;

            case AddressingMode.REL:
                return this.programCounter + this.fetchByte();

            case AddressingMode.ABS:
                this.stepCpu(4);

                return this.fetchWord();
            case AddressingMode.ABX:
                {
                    const addr = this.fetchWord();
                    if ((addr & 0xFF00) !== ((addr + this.xIndex) & 0xFF00)) {
                        this.stepCpu(1);
                    }
                    this.stepCpu(4);
                    return (addr + this.yIndex) & 0xFFFF;
                }

            case AddressingMode.ABY:
                {
                    const addr = this.fetchWord();
                    if ((addr & 0xFF00) !== ((addr + this.yIndex) & 0xFF00)) {
                        this.stepCpu(1);
                    }
                    this.stepCpu(4);
                    return (addr + this.yIndex) & 0xFFFF;
                }
            case AddressingMode.IND:
                return this.bus.readWord(this.getAddress(AddressingMode.ABS));

            case AddressingMode.IZX:
                {
                    this.stepCpu(6);
                    const addr = this.fetchByte();
                    return this.bus.read((addr + this.xIndex) & 0xFF) + (this.bus.read((addr + this.xIndex + 1) & 0xFF) << 8);
                }
            case AddressingMode.IZY:
                {
                    const base = this.fetchByte();
                    const lo = this.bus.read(base);
                    const hi = this.bus.read((base + 1) & 0xFF);
                    const derefBase = lo | (hi << 8);
                    const deref = derefBase + this.yIndex;
                    if ((derefBase & 0xFF00) !== (deref & 0xFF00)) {
                        this.stepCpu(1);
                    }
                    this.stepCpu(5);
                    return deref;
                }

            default:
                throw new Error("Invalid addressing mode");
        }
    }

    toSigned8Bit(unsigned8Bit: number): number {
        // If the number is greater than 127, it should be negative
        if (unsigned8Bit > 127) {
            return unsigned8Bit - 256;
        }
        return unsigned8Bit;
    }

    ora(addressingMode: AddressingMode): void {
        const value = this.bus.read(this.getAddress(addressingMode));
        this.setAccumulator(this.accumulator | value);
        this.setZeroFlag(this.accumulator === 0);
        this.setNegativeFlag((this.accumulator & 0x80)
            ? true
            : false);
    }

    asl(addressingMode: AddressingMode): void {
        const address = this.getAddress(addressingMode);
        const value = this.bus.read(address);
        this.setCarryFlag((value & 0x80) !== 0);
        this.bus.write(address, value << 1);
        this.setZeroFlag((value << 1) === 0);
        this.setNegativeFlag(((value << 1) & 0x80)
            ? true
            : false);
    }

    and(addressingMode: AddressingMode): void {
        const value = this.bus.read(this.getAddress(addressingMode));
        this.setAccumulator(this.accumulator & value);
        this.setZeroFlag(this.accumulator === 0);
        this.setNegativeFlag((this.accumulator & 0x80)
            ? true
            : false);
    }

    bit(addressingMode: AddressingMode): void {
        const value = this.bus.read(this.getAddress(addressingMode));
        this.setZeroFlag((this.accumulator & value) === 0);
        this.setOverflowFlag((value & 0x40) !== 0);
        this.setNegativeFlag((value & 0x80) !== 0);
    }

    rol(addressingMode: AddressingMode): void {
        const address = this.getAddress(addressingMode);
        let value = this.bus.read(address);
        const carry = this.getCarryFlag();
        this.setCarryFlag((value & 0x80) !== 0);
        value = (value << 1) | (carry ? 1 : 0);
        this.bus.write(address, value);
        this.setZeroFlag(value === 0);
        this.setNegativeFlag((value & 0x80) !== 0);

        this.stepCpu(2);
    }

    eor(addressingMode: AddressingMode): void {
        const value = this.bus.read(this.getAddress(addressingMode));
        this.setAccumulator(this.accumulator ^ value);
        this.setZeroFlag(this.accumulator === 0);
        this.setNegativeFlag((this.accumulator & 0x80)
            ? true
            : false);
    }

    lsr(addressingMode: AddressingMode): void {
        const address = this.getAddress(addressingMode);
        let value = this.bus.read(address);
        this.setCarryFlag((value & 0x01) !== 0);
        value >>= 1;
        this.bus.write(address, value);
        this.setZeroFlag(value === 0);
        this.setNegativeFlag(false);
    }

    adc(addressingMode: AddressingMode): void {
        const value = this.bus.read(this.getAddress(addressingMode));
        const carry = this.getCarryFlag();
        const result = this.accumulator + value + (carry ? 1 : 0);
        this.setCarryFlag(result > 0xFF);
        this.setZeroFlag((result & 0xFF) === 0);
        this.setOverflowFlag(((this.accumulator ^ result) & (value ^ result) & 0x80) !== 0);
        this.setNegativeFlag((result & 0x80) !== 0);
        this.setAccumulator(result & 0xFF);
    }

    ror(addressingMode: AddressingMode): void {
        const address = this.getAddress(addressingMode);
        let value = this.bus.read(address);
        const carry = this.getCarryFlag();
        this.setCarryFlag((value & 0x01) !== 0);
        value = (value >> 1) | (carry ? 0x80 : 0);
        this.bus.write(address, value);
        this.setZeroFlag(value === 0);
        this.setNegativeFlag((value & 0x80) !== 0);
    }

    execOnce(): void {
        if (!this.running) {
            return;
        }

        const opcode = this.fetchByte();

        switch (opcode) {
            case 0x00: // BRK
                this.setProgramCounter(this.programCounter + 1);
                this.pushWord(this.programCounter);
                this.pushByte(this.status);
                this.setIFlag(true);
                this.setProgramCounter(this.bus.readWord(0xFFFE));
                this.stepCpu(7);
                break;

            case 0x01: // ORA IZX
                this.ora(AddressingMode.IZX);
                break;

            case 0x05: // ORA ZP0
                this.ora(AddressingMode.ZP0);
                break;

            case 0x06: // ASL ZP0
                this.asl(AddressingMode.ZP0);
                break;

            case 0x08: // PHP
                this.pushByte(this.status);
                this.stepCpu(3);
                break;

            case 0x09: // ORA IMM
                this.ora(AddressingMode.IMM);
                break;

            case 0x0A: // ASL ACC
                this.setCarryFlag((this.accumulator & 0x80) !== 0);
                this.setAccumulator(this.accumulator << 1);
                this.setZeroFlag(this.accumulator === 0);
                this.setNegativeFlag((this.accumulator & 0x80)
                    ? true
                    : false);
                this.stepCpu(2);
                break;

            case 0x0D: // ORA ABS
                this.ora(AddressingMode.ABS);
                break;

            case 0x0E: // ASL ABS
                this.asl(AddressingMode.ABS);
                break;

            case 0x10: // BPL
                if (!this.getNegativeFlag()) {
                    const offset = this.toSigned8Bit(this.fetchByte());
                    const newAddress = this.programCounter + offset;
                    this.branchLocation = newAddress;
                    if ((newAddress & 0xFF00) != (this.programCounter & 0xFF00)) {
                        this.stepCpu(1);
                    }
                    this.setProgramCounter(newAddress);
                    this.stepCpu(1);
                }

                this.stepCpu(2);
                break;

            case 0x11: // ORA IZY
                this.ora(AddressingMode.IZY);
                break;

            case 0x15: // ORA ZPX
                this.ora(AddressingMode.ZPX);
                break;

            case 0x16: // ASL ZPX
                this.asl(AddressingMode.ZPX);
                break;

            case 0x18: // CLC
                this.setCarryFlag(false);
                this.stepCpu(2);
                break;

            case 0x19: // ORA ABY
                this.ora(AddressingMode.ABY);
                break;

            case 0x1D: // ORA ABX
                this.ora(AddressingMode.ABX);
                break;

            case 0x1E: // ASL ABX
                this.asl(AddressingMode.ABX);
                break;

            case 0x20: // JSR
                {
                    const address = this.fetchWord();
                    this.pushWord(this.programCounter + 1);
                    this.setProgramCounter(address);
                    this.stepCpu(6);
                }
                break;

            case 0x21: // AND IZX
                this.and(AddressingMode.IZX);
                break;

            case 0x24: // BIT ZP0
                this.bit(AddressingMode.ZP0);
                break;

            case 0x25: // AND ZP0
                this.and(AddressingMode.ZP0);
                break;
            
            case 0x26: // ROL ZP0
                this.rol(AddressingMode.ZP0);
                break;

            case 0x28: // PLP
                this.status = (this.popByte() & 0xEF) | (this.status & 0x10) | 0x20;
                this.stepCpu(4);
                break;

            case 0x29: // AND IMM
                this.and(AddressingMode.IMM);
                break;

            case 0x2A: // ROL ACC
                {
                    const carry = this.getCarryFlag();
                    this.setCarryFlag((this.accumulator & 0x80) !== 0);
                    this.setAccumulator((this.accumulator << 1) | (carry ? 1 : 0));
                    this.setZeroFlag(this.accumulator === 0);
                    this.setNegativeFlag((this.accumulator & 0x80) !== 0);
                }
                this.stepCpu(2);
                break;

            case 0x2C: // BIT ABS
                this.bit(AddressingMode.ABS);
                break;

            case 0x2D: // AND ABS
                this.and(AddressingMode.ABS);
                break;

            case 0x2E: // ROL ABS
                this.rol(AddressingMode.ABS);
                break;

            case 0x30: // BMI
                if (this.getNegativeFlag()) {
                    const offset = this.toSigned8Bit(this.fetchByte());
                    const newAddress = this.programCounter + offset;
                    this.branchLocation = newAddress;
                    if ((newAddress & 0xFF00) != (this.programCounter & 0xFF00)) {
                        this.stepCpu(1);
                    }
                    this.setProgramCounter(newAddress);
                    this.stepCpu(1);
                }

                this.stepCpu(2);
                break;

            case 0x31: // AND IZY
                this.and(AddressingMode.IZY);
                break;

            case 0x35: // AND ZPX
                this.and(AddressingMode.ZPX);
                break;

            case 0x36: // ROL ZPX
                this.rol(AddressingMode.ZPX);
                break;

            case 0x38: // SEC
                this.setCarryFlag(true);
                this.stepCpu(2);
                break;

            case 0x39: // AND ABY
                this.and(AddressingMode.ABY);
                break;

            case 0x3D: // AND ABX
                this.and(AddressingMode.ABX);
                break;

            case 0x3E: // ROL ABX
                this.rol(AddressingMode.ABX);
                break;

            case 0x40: // RTI
                this.status = (this.popByte() & 0xEF) | (this.status & 0x10) | 0x20;
                this.setProgramCounter(this.popWord());
                this.stepCpu(6);
                break;

            case 0x41: // EOR IZX
                this.eor(AddressingMode.IZX);
                break;

            case 0x45: // EOR ZP0
                this.eor(AddressingMode.ZP0);
                break;
            
            case 0x46: // LSR ZP0
                this.lsr(AddressingMode.ZP0);
                break;

            case 0x48: // PHA
                this.pushByte(this.accumulator);
                this.stepCpu(3);
                break;

            case 0x49: // EOR IMM
                this.eor(AddressingMode.IMM);
                break;

            case 0x4A: // LSR ACC
                this.setCarryFlag((this.accumulator & 0x01) !== 0);
                this.setAccumulator(this.accumulator >> 1);
                this.setZeroFlag(this.accumulator === 0);
                this.setNegativeFlag(false);
                this.stepCpu(2);
                break;

            case 0x4C: // JMP ABS
                this.setProgramCounter(this.fetchWord());
                this.stepCpu(3);
                break;

            case 0x4D: // EOR ABS
                this.eor(AddressingMode.ABS);
                break;

            case 0x4E: // LSR ABS
                this.lsr(AddressingMode.ABS);
                break;

            case 0x50: // BVC
                if (!this.getOverflowFlag()) {
                    const offset = this.toSigned8Bit(this.fetchByte());
                    const newAddress = this.programCounter + offset;
                    this.branchLocation = newAddress;
                    if ((newAddress & 0xFF00) != (this.programCounter & 0xFF00)) {
                        this.stepCpu(1);
                    }
                    this.setProgramCounter(newAddress);
                    this.stepCpu(1);
                }

                this.stepCpu(2);
                break;

            case 0x51: // EOR IZY
                this.eor(AddressingMode.IZY);
                break;

            case 0x55: // EOR ZPX
                this.eor(AddressingMode.ZPX);
                break;

            case 0x56: // LSR ZPX
                this.lsr(AddressingMode.ZPX);
                break;

            case 0x58: // CLI
                this.setIFlag(false);
                this.stepCpu(2);
                break;

            case 0x59: // EOR ABY
                this.eor(AddressingMode.ABY);
                break;

            case 0x5D: // EOR ABX
                this.eor(AddressingMode.ABX);
                break;


            case 0x5E: // LSR ABX
                this.lsr(AddressingMode.ABX);
                break;

            case 0x60: // RTS
                this.setProgramCounter(this.popWord() + 1);
                this.stepCpu(6);
                break;

            case 0x61: // ADC IZX
                this.adc(AddressingMode.IZX);
                break;

            case 0x65: // ADC ZP0
                this.adc(AddressingMode.ZP0);
                break;

            case 0x66: // ROR ZP0
                this.ror(AddressingMode.ZP0);
                break;

            case 0x68: // PLA
                this.setAccumulator(this.popByte());
                this.setZeroFlag(this.accumulator === 0);
                this.setNegativeFlag((this.accumulator & 0x80) !== 0);
                this.stepCpu(4);
                break;

            case 0x69: // ADC IMM
                this.adc(AddressingMode.IMM);
                break;
            

            case 0x6A: // ROR ACC
                {
                    const carry = this.getCarryFlag();
                    this.setCarryFlag((this.accumulator & 0x01) !== 0);
                    this.setAccumulator((this.accumulator >> 1) | (carry ? 0x80 : 0));
                    this.setZeroFlag(this.accumulator === 0);
                    this.setNegativeFlag((this.accumulator & 0x80) !== 0);
                }
                this.stepCpu(2);

                break;

            case 0x6C: // JMP IND
                {
                    const address = this.fetchWord();
                    this.setProgramCounter(this.bus.readWord(address) | (this.bus.read((address & 0xFF00) | ((address + 1) & 0xFF)) << 8));             
                    this.stepCpu(5);
                }
                break;

            case 0x6D: // ADC ABS
                this.adc(AddressingMode.ABS);
                break;

            case 0x6E: // ROR ABS
                this.ror(AddressingMode.ABS);
                break;

            default:
                throw new Error("Invalid opcode");
        }
    }
}