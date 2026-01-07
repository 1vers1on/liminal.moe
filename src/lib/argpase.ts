export type ArgValueType = string | number | boolean | string[] | number[];
export type ActionType = 'store' | 'store_true' | 'store_false' | 'count' | 'append';

export interface OptionConfig {
    flags: string[];
    description: string;
    action?: ActionType;
    type?: 'string' | 'number' | 'boolean';
    required?: boolean;
    defaultValue?: ArgValueType;
    choices?: string[];
    variadic?: boolean;
    dest?: string;
    nargs?: number | '?' | '*' | '+';
    metavar?: string;
}

export interface ArgumentConfig {
    name: string;
    description?: string;
    type?: 'string' | 'number';
    required?: boolean;
    variadic?: boolean;
    defaultValue?: ArgValueType;
    choices?: string[];
    nargs?: number | '?' | '*' | '+';
    metavar?: string;
}

export interface CommandConfig {
    name: string;
    description: string;
    aliases?: string[];
    action?: (args: ParsedArgs) => void | Promise<void>;
}

export interface ParsedArgs {
    [key: string]: ArgValueType | undefined;
    _: string[];
}

export interface ParseResult {
    success: boolean;
    args?: ParsedArgs;
    error?: string;
    helpRequested?: boolean;
    versionRequested?: boolean;
    helpText?: string;
}

export class ArgumentError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ArgumentError';
    }
}

export class HelpRequested extends Error {
    constructor(public helpText: string) {
        super('Help requested');
        this.name = 'HelpRequested';
    }
}

export class VersionRequested extends Error {
    constructor(public version: string) {
        super('Version requested');
        this.name = 'VersionRequested';
    }
}

export interface ParserConfig {
    name: string;
    description: string;
    version?: string;
    epilog?: string;
    addHelp?: boolean;
    addVersion?: boolean;
    prefixChars?: string;
    formatter?: (parser: ArgParser) => string;
}

export class ArgParser {
    private options: Map<string, OptionConfig> = new Map();
    private arguments: ArgumentConfig[] = [];
    private commands: Map<string, ArgParser> = new Map();
    private commandAliases: Map<string, string> = new Map();
    private commandActions: Map<string, (args: ParsedArgs) => void | Promise<void>> = new Map();

    public parent?: ArgParser;
    public executableName: string = 'cli';
    public prefixChars: string = '-';
    public addHelp: boolean = true;
    public addVersion: boolean = true;

    constructor(public config: ParserConfig) {
        this.executableName = config.name;
        this.prefixChars = config.prefixChars ?? '-';
        this.addHelp = config.addHelp ?? true;
        this.addVersion = config.addVersion ?? true;
    }

    public addOption(config: OptionConfig): this {
        if (config.flags.length === 0) {
            throw new ArgumentError('Option must have at least one flag.');
        }

        const normalized: OptionConfig = {
            action: 'store',
            variadic: false,
            ...config,
        };

        normalized.flags.forEach((flag) => {
            this.options.set(flag, normalized);
        });

        return this;
    }

    public add_argument(flags: string | string[], config: Partial<OptionConfig & ArgumentConfig> = {}): this {
        const flagArray = Array.isArray(flags) ? flags : [flags];

        if (flagArray[0].startsWith('-')) {
            return this.addOption({
                flags: flagArray,
                description: config.description || '',
                ...config,
            });
        } else {
            return this.addArgument({
                name: flagArray[0],
                description: config.description,
                type: config.type as 'string' | 'number',
                required: config.required,
                variadic: config.variadic,
                defaultValue: config.defaultValue,
                choices: config.choices,
                nargs: config.nargs,
                metavar: config.metavar,
            });
        }
    }

    public addArgument(config: ArgumentConfig): this {
        this.arguments.push({
            required: true,
            type: 'string',
            ...config,
        });
        return this;
    }

    public addCommand(config: CommandConfig): ArgParser {
        const subParser = new ArgParser({
            name: `${this.config.name} ${config.name}`,
            description: config.description,
            version: this.config.version,
        });
        subParser.parent = this;

        this.commands.set(config.name, subParser);

        if (config.aliases) {
            for (const alias of config.aliases) {
                this.commands.set(alias, subParser);
                this.commandAliases.set(alias, config.name);
            }
        }

        if (config.action) {
            this.commandActions.set(config.name, config.action);
        }

        return subParser;
    }

    public addSubparsers(config: { dest?: string; title?: string; description?: string } = {}): {
        addParser: (name: string, parserConfig: { description: string; aliases?: string[] }) => ArgParser;
    } {
        const dest = config.dest || 'command';

        return {
            addParser: (name: string, parserConfig: { description: string; aliases?: string[] }) => {
                return this.addCommand({
                    name,
                    description: parserConfig.description,
                    aliases: parserConfig.aliases,
                });
            }
        };
    }

    public parse(argv: string[]): ParsedArgs {
        const args: ParsedArgs = { _: [] };

        this._initializeDefaults(args);

        let i = 0;
        const handleRemaining = (sliceIdx: number) => {
            const remaining = argv.slice(sliceIdx);
            this._parsePositionals(remaining, args);
        };

        while (i < argv.length) {
            const arg = argv[i];

            if (arg === '--') {
                handleRemaining(i + 1);
                break;
            }

            if (arg.startsWith(this.prefixChars[0])) {
                const result = this._parseOption(arg, argv, i, args);

                if (result.helpRequested) {
                    throw new HelpRequested(this.formatHelp());
                }

                if (result.versionRequested) {
                    throw new VersionRequested(this.config.version || '1.0.0');
                }

                if (result.key) {
                    if (result.action === 'append') {
                        const current = args[result.key];
                        if (Array.isArray(current)) {
                            (current as (string | number)[]).push(result.value as string | number);
                        } else {
                            args[result.key] = [result.value as string | number] as string[] | number[];
                        }
                    } else if (result.action === 'count') {
                        args[result.key] = ((args[result.key] as number) || 0) + 1;
                    } else {
                        args[result.key] = result.value;
                    }
                }

                i += result.consumed;
            }
            // Handle subcommands
            else if (this.commands.has(arg)) {
                const commandName = this.commandAliases.get(arg) || arg;
                const subParser = this.commands.get(arg)!;

                const remainingArgs = argv.slice(i + 1);
                const parsedSubArgs = subParser.parse(remainingArgs);

                args.command = commandName;

                return { ...args, ...parsedSubArgs };
            }
            else {
                handleRemaining(i);
                break;
            }
        }

        this._validate(args);

        return args;
    }

    public parseArgs(argv: string[]): ParseResult {
        try {
            const args = this.parse(argv);
            return { success: true, args };
        } catch (error) {
            if (error instanceof HelpRequested) {
                return {
                    success: false,
                    helpRequested: true,
                    helpText: error.helpText
                };
            }
            if (error instanceof VersionRequested) {
                return {
                    success: false,
                    versionRequested: true,
                    helpText: error.version
                };
            }
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    public parseKnownArgs(argv: string[]): { args: ParsedArgs; remaining: string[] } {
        const args: ParsedArgs = { _: [] };
        const remaining: string[] = [];

        this._initializeDefaults(args);

        let i = 0;
        while (i < argv.length) {
            const arg = argv[i];

            if (arg === '--') {
                remaining.push(...argv.slice(i + 1));
                break;
            }

            if (arg.startsWith(this.prefixChars[0])) {
                try {
                    const result = this._parseOption(arg, argv, i, args);

                    if (result.helpRequested) {
                        throw new HelpRequested(this.formatHelp());
                    }

                    if (result.versionRequested) {
                        throw new VersionRequested(this.config.version || '1.0.0');
                    }

                    if (result.key) {
                        if (result.action === 'append') {
                            const current = args[result.key];
                            if (Array.isArray(current)) {
                                (current as (string | number)[]).push(result.value as string | number);
                            } else {
                                args[result.key] = [result.value as string | number] as string[] | number[];
                            }
                        } else if (result.action === 'count') {
                            args[result.key] = ((args[result.key] as number) || 0) + 1;
                        } else {
                            args[result.key] = result.value;
                        }
                    }

                    i += result.consumed;
                } catch {
                    remaining.push(arg);
                    i++;
                }
            } else if (this.commands.has(arg)) {
                const commandName = this.commandAliases.get(arg) || arg;
                const subParser = this.commands.get(arg)!;

                const remainingArgs = argv.slice(i + 1);
                const { args: subArgs, remaining: subRemaining } = subParser.parseKnownArgs(remainingArgs);

                args.command = commandName;
                return { args: { ...args, ...subArgs }, remaining: subRemaining };
            } else {
                const positionalValues: string[] = [];
                while (i < argv.length && !argv[i].startsWith(this.prefixChars[0])) {
                    positionalValues.push(argv[i]);
                    i++;
                }
                this._parsePositionals(positionalValues, args);
            }
        }

        return { args, remaining };
    }

    public async run(
        argv: string[],
        options: {
            onHelp?: (text: string) => void;
            onVersion?: (version: string) => void;
            onError?: (error: string, usage: string) => void;
        } = {}
    ): Promise<ParsedArgs | null> {
        const {
            onHelp = (text) => console.log(text),
            onVersion = (v) => console.log(v),
            onError = (err, usage) => {
                console.error(`\nerror: ${err}\n`);
                console.error(`${usage}\n`);
            }
        } = options;

        const result = this.parseArgs(argv);

        if (result.helpRequested) {
            onHelp(result.helpText || this.formatHelp());
            return null;
        }

        if (result.versionRequested) {
            onVersion(result.helpText || this.config.version || '1.0.0');
            return null;
        }

        if (!result.success) {
            onError(result.error || 'Unknown error', this.formatUsage());
            return null;
        }

        const args = result.args!;

        if (typeof args.command === 'string' && this.commandActions.has(args.command)) {
            const action = this.commandActions.get(args.command)!;
            await action(args);
        } else if (!args.command && this.commandActions.size > 0 && this.commands.size > 0) {
            onHelp(this.formatHelp());
            return null;
        }

        return args;
    }

    private _initializeDefaults(args: ParsedArgs) {
        const seenKeys = new Set<string>();

        this.options.forEach((opt) => {
            const key = this.getDestKey(opt);
            if (seenKeys.has(key)) return;
            seenKeys.add(key);

            if (opt.defaultValue !== undefined) {
                args[key] = opt.defaultValue;
            } else if (opt.action === 'store_true') {
                args[key] = false;
            } else if (opt.action === 'store_false') {
                args[key] = true;
            } else if (opt.action === 'count') {
                args[key] = 0;
            } else if (opt.action === 'append') {
                args[key] = [];
            }
        });

        this.arguments.forEach((arg) => {
            if (arg.defaultValue !== undefined) {
                args[arg.name] = arg.defaultValue;
            }
        });
    }

    private _parseOption(
        arg: string,
        argv: string[],
        i: number,
        currentArgs: ParsedArgs
    ): {
        key: string;
        value: ArgValueType;
        consumed: number;
        helpRequested: boolean;
        versionRequested: boolean;
        action?: ActionType;
    } {
        if (this.addHelp && (arg === '-h' || arg === '--help')) {
            return { key: '', value: true, consumed: 1, helpRequested: true, versionRequested: false };
        }

        if (this.addVersion && (arg === '-V' || arg === '--version')) {
            return { key: '', value: true, consumed: 1, helpRequested: false, versionRequested: true };
        }

        if (arg.length > 2 && arg[0] === '-' && arg[1] !== '-' && !arg.includes('=')) {
            const firstFlag = `-${arg[1]}`;
            const optConfig = this.options.get(firstFlag);

            if (optConfig && optConfig.action === 'count') {
                const count = arg.slice(1).split('').filter(c => c === arg[1]).length;
                const propName = this.getDestKey(optConfig);
                return {
                    key: propName,
                    value: count,
                    consumed: 1,
                    helpRequested: false,
                    versionRequested: false,
                    action: 'count'
                };
            }
        }

        let key = arg;
        let value: string | undefined;

        if (arg.includes('=')) {
            const eqIndex = arg.indexOf('=');
            key = arg.substring(0, eqIndex);
            value = arg.substring(eqIndex + 1);
        }

        const optConfig = this.options.get(key);
        if (!optConfig) {
            throw new ArgumentError(`Unrecognized option: ${key}`);
        }

        const propName = this.getDestKey(optConfig);
        let consumed = 1;
        let finalValue: ArgValueType = '';

        if (optConfig.action === 'store_true') {
            finalValue = true;
        } else if (optConfig.action === 'store_false') {
            finalValue = false;
        } else if (optConfig.action === 'count') {
            finalValue = 1;
        } else {
            if (optConfig.nargs !== undefined) {
                const { values: nargsValues, consumed: nargsConsumed } = this._consumeNargs(
                    argv, i + 1, optConfig.nargs, value
                );
                consumed += nargsConsumed;

                if (optConfig.nargs === '?' && nargsValues.length === 0) {
                    finalValue = optConfig.defaultValue ?? '';
                } else if (typeof optConfig.nargs === 'number' || optConfig.nargs === '+' || optConfig.nargs === '*') {
                    finalValue = nargsValues.map(v => this._castValue(v, optConfig.type)) as string[] | number[];
                } else {
                    finalValue = this._castValue(nargsValues[0], optConfig.type);
                }
            } else {
                if (value === undefined) {
                    if (i + 1 < argv.length && !argv[i + 1].startsWith(this.prefixChars[0])) {
                        value = argv[i + 1];
                        consumed += 1;
                    } else if (optConfig.action === 'store') {
                        throw new ArgumentError(`Option ${key} requires a value.`);
                    }
                }

                finalValue = this._castValue(value, optConfig.type);
            }
        }

        return {
            key: propName,
            value: finalValue,
            consumed,
            helpRequested: false,
            versionRequested: false,
            action: optConfig.action
        };
    }

    private _consumeNargs(
        argv: string[],
        startIdx: number,
        nargs: number | '?' | '*' | '+',
        existingValue?: string
    ): { values: string[]; consumed: number } {
        const values: string[] = existingValue !== undefined ? [existingValue] : [];
        let consumed = 0;

        if (typeof nargs === 'number') {
            const needed = nargs - values.length;
            for (let j = 0; j < needed && startIdx + j < argv.length; j++) {
                const nextArg = argv[startIdx + j];
                if (nextArg.startsWith(this.prefixChars[0])) break;
                values.push(nextArg);
                consumed++;
            }
            if (values.length < nargs) {
                throw new ArgumentError(`Expected ${nargs} arguments`);
            }
        } else if (nargs === '?') {
            if (values.length === 0 && startIdx < argv.length && !argv[startIdx].startsWith(this.prefixChars[0])) {
                values.push(argv[startIdx]);
                consumed++;
            }
        } else if (nargs === '*' || nargs === '+') {
            while (startIdx + consumed < argv.length) {
                const nextArg = argv[startIdx + consumed];
                if (nextArg.startsWith(this.prefixChars[0])) break;
                values.push(nextArg);
                consumed++;
            }
            if (nargs === '+' && values.length === 0) {
                throw new ArgumentError(`Expected at least one argument`);
            }
        }

        return { values, consumed };
    }

    private _parsePositionals(argv: string[], args: ParsedArgs) {
        let argIdx = 0;
        let configIdx = 0;

        while (configIdx < this.arguments.length && argIdx < argv.length) {
            const config = this.arguments[configIdx];
            const rawVal = argv[argIdx];

            if (config.nargs !== undefined) {
                const { values, consumed } = this._consumeNargs(argv, argIdx, config.nargs);

                if (typeof config.nargs === 'number' || config.nargs === '+' || config.nargs === '*') {
                    args[config.name] = values.map(v => this._castValue(v, config.type)) as string[] | number[];
                } else {
                    args[config.name] = this._castValue(values[0], config.type);
                }

                argIdx += consumed;
                configIdx++;
                continue;
            }

            if (config.variadic) {
                const values = argv.slice(argIdx);
                args[config.name] = values.map(v => this._castValue(v, config.type)) as string[] | number[];
                argIdx = argv.length;
                break;
            }

            args[config.name] = this._castValue(rawVal, config.type);
            argIdx++;
            configIdx++;
        }

        if (argIdx < argv.length) {
            args._.push(...argv.slice(argIdx));
        }
    }

    private _validate(args: ParsedArgs) {
        const seenOptions = new Set<string>();

        this.options.forEach((opt) => {
            const key = this.getDestKey(opt);
            if (seenOptions.has(key)) return;
            seenOptions.add(key);

            const value = args[key];

            if (opt.required && (value === undefined || value === null || (Array.isArray(value) && value.length === 0))) {
                throw new ArgumentError(`the following arguments are required: ${opt.flags[0]}`);
            }

            if (opt.choices && value !== undefined) {
                const valuesToCheck = Array.isArray(value) ? value : [value];
                for (const v of valuesToCheck) {
                    if (!opt.choices.includes(String(v))) {
                        throw new ArgumentError(
                            `argument ${opt.flags[0]}: invalid choice: '${v}' (choose from ${opt.choices.join(', ')})`
                        );
                    }
                }
            }
        });

        this.arguments.forEach((arg) => {
            if (arg.required && args[arg.name] === undefined) {
                throw new ArgumentError(`the following arguments are required: ${arg.name}`);
            }

            if (arg.choices && args[arg.name] !== undefined) {
                const value = args[arg.name];
                const valuesToCheck = Array.isArray(value) ? value : [value];
                for (const v of valuesToCheck) {
                    if (!arg.choices.includes(String(v))) {
                        throw new ArgumentError(
                            `argument ${arg.name}: invalid choice: '${v}' (choose from ${arg.choices.join(', ')})`
                        );
                    }
                }
            }
        });
    }

    private _castValue(
        val: string | undefined,
        type: 'string' | 'number' | 'boolean' = 'string'
    ): string | number | boolean {
        if (val === undefined) return '';
        if (type === 'number') {
            const num = Number(val);
            if (isNaN(num)) throw new ArgumentError(`Value "${val}" is not a valid number.`);
            return num;
        }
        if (type === 'boolean') {
            const lower = val.toLowerCase();
            if (lower === 'true' || lower === '1' || lower === 'yes') return true;
            if (lower === 'false' || lower === '0' || lower === 'no') return false;
            throw new ArgumentError(`Value "${val}" is not a valid boolean.`);
        }
        return val;
    }

    public getDestKey(opt: OptionConfig): string {
        if (opt.dest) return opt.dest;
        return this.getFlagKey(opt);
    }

    public getFlagKey(opt: OptionConfig): string {
        const longestFlag = opt.flags.reduce((a, b) => (a.length > b.length ? a : b));
        const cleanName = longestFlag.replace(/^-+/, '');
        if (cleanName.startsWith('no-') && (opt.action === 'store_true' || opt.action === 'store_false')) {
            return cleanName.substring(3);
        }
        return cleanName.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    }

    public formatUsage(): string {
        const usageParts = [this.config.name];

        if (this.options.size > 0) usageParts.push('[OPTIONS]');
        if (this.commands.size > 0) usageParts.push('COMMAND');

        this.arguments.forEach(arg => {
            const name = arg.metavar || arg.name;
            if (arg.variadic || arg.nargs === '*' || arg.nargs === '+') {
                usageParts.push(arg.required ? `${name}...` : `[${name}...]`);
            } else if (arg.nargs === '?') {
                usageParts.push(`[${name}]`);
            } else {
                usageParts.push(arg.required ? name : `[${name}]`);
            }
        });

        return `Usage: ${usageParts.join(' ')}`;
    }

    public formatHelp(): string {
        const { name, description, version, epilog } = this.config;
        const lines: string[] = [];

        lines.push(`${name}${version ? ` v${version}` : ''}`);
        lines.push(description);
        lines.push('');
        lines.push(this.formatUsage());
        lines.push('');

        if (this.arguments.length > 0) {
            lines.push('Arguments:');
            this.arguments.forEach(arg => {
                const name = arg.metavar || arg.name;
                const info = arg.type && arg.type !== 'string' ? `(${arg.type})` : '';
                const desc = arg.description || '';
                const def = arg.defaultValue !== undefined ? `[default: ${arg.defaultValue}]` : '';
                lines.push(`  ${name.padEnd(20)} ${desc} ${info} ${def}`.trimEnd());
            });
            lines.push('');
        }

        if (this.options.size > 0 || this.addHelp || this.addVersion) {
            lines.push('Options:');

            if (this.addHelp) {
                lines.push(`  ${'-h, --help'.padEnd(25)} Show this help message`);
            }
            if (this.addVersion && this.config.version) {
                lines.push(`  ${'-V, --version'.padEnd(25)} Show version number`);
            }

            const uniqueKeys = new Set<string>();
            this.options.forEach(opt => uniqueKeys.add(this.getDestKey(opt)));

            uniqueKeys.forEach(keyStr => {
                const opt = Array.from(this.options.values()).find(o => this.getDestKey(o) === keyStr);
                if (!opt) return;

                const flags = opt.flags.join(', ');
                let meta = '';
                if (opt.action === 'store' && opt.type !== 'boolean') {
                    meta = opt.metavar || `<${opt.type || 'string'}>`;
                }

                const def = opt.defaultValue !== undefined ? `[default: ${opt.defaultValue}]` : '';
                const req = opt.required ? '[required]' : '';
                const choices = opt.choices ? `[choices: ${opt.choices.join(', ')}]` : '';

                const flagPart = meta ? `${flags} ${meta}` : flags;
                lines.push(`  ${flagPart.padEnd(25)} ${opt.description} ${def} ${req} ${choices}`.trimEnd());
            });
            lines.push('');
        }

        if (this.commands.size > 0) {
            lines.push('Commands:');
            const seenCommands = new Set<string>();
            this.commands.forEach((sub, cmdName) => {
                if (this.commandAliases.has(cmdName)) return;
                if (seenCommands.has(cmdName)) return;
                seenCommands.add(cmdName);

                const aliases: string[] = [];
                this.commandAliases.forEach((original, alias) => {
                    if (original === cmdName) aliases.push(alias);
                });

                const aliasStr = aliases.length > 0 ? ` (${aliases.join(', ')})` : '';
                lines.push(`  ${cmdName.padEnd(20)} ${sub.config.description}${aliasStr}`);
            });
            lines.push('');
        }

        if (epilog) {
            lines.push(epilog);
            lines.push('');
        }

        return lines.join('\n');
    }

    public printHelp(): void {
        console.log(this.formatHelp());
    }

    public printUsage(): void {
        console.log(this.formatUsage());
    }
}

export default ArgParser;
