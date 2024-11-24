<script lang="ts">
    import { onMount, tick, afterUpdate } from "svelte";
    import { goto } from "$app/navigation";
    import { io } from "socket.io-client";

    import pako from "pako";

    import {
        convolve2DWithSavedKernel,
        setKernel,
        convolve2D,
        isPrime,
    } from "$lib/math";
    import { fibonacci } from "$lib/bigfib";

    import { turboLookup } from "$lib/turboLookup";
    import Page from "../routes/+page.svelte";
    import { get } from "svelte/store";

    const noises = ["meow", "nya", "mrrp", "mew", "purr", "mrow", "mewp"];

    let socket;

    let badappleFrames: Record<string, string> | null = null;

    let visitorCount = 0;

    let refreshRate = 0;
    let displayHeight = 0;
    let displayWidth = 0;
    let platform = "web";
    let gpuVendor = "";
    let terminalWidth = 80;

    let pageLoadTime = new Date();

    let environmentVariables = new Map<string, any>([
        ["PRIMORDIA_UPDATE_FREQ", 10],
        [
            "PRIMORDIA_GROWTH_FUNC",
            "return 0 + ((n >= 0.2) && (n <= 0.25)) - ((n <= 0.18) || (n >= 0.33))",
        ],
        ["TEXT_MODE", "false"],
        ["UPDATES_PER_FRAME", 1],
    ]);

    // ANSI color codes to CSS colors
    const COLORS: Record<string, string> = {
        "0": "inherit", // reset
        "30": "#000000", // black
        "31": "#cd3131", // red
        "32": "#0dbc79", // green
        "33": "#e5e510", // yellow
        "34": "#2472c8", // blue
        "35": "#bc3fbc", // magenta
        "36": "#11a8cd", // cyan
        "37": "#e5e5e5", // white
        "90": "#666666", // bright black
        "91": "#f14c4c", // bright red
        "92": "#23d18b", // bright green
        "93": "#f5f543", // bright yellow
        "94": "#3b8eea", // bright blue
        "95": "#d670d6", // bright magenta
        "96": "#29b8db", // bright cyan
        "97": "#ffffff", // bright white
    };

    // Background colors (40-47, 100-107)
    const BG_COLORS: Record<string, string> = {
        "40": "#000000",
        "41": "#cd3131",
        "42": "#0dbc79",
        "43": "#e5e510",
        "44": "#2472c8",
        "45": "#bc3fbc",
        "46": "#11a8cd",
        "47": "#e5e5e5",
        "100": "#666666",
        "101": "#f14c4c",
        "102": "#23d18b",
        "103": "#f5f543",
        "104": "#3b8eea",
        "105": "#d670d6",
        "106": "#29b8db",
        "107": "#ffffff",
    };

    function compressDataToCatNoises(data: string): string {
        try {
            const compressedData = pako.deflate(data);
            let catNoise = "";

            for (let byte of compressedData) {
                const num = byte.toString(7).padStart(3, "0");
                for (let digit of num) {
                    catNoise += noises[parseInt(digit)] + " ";
                }
            }
            return catNoise.trim();
        } catch (e) {
            addToOutputWrapped("Error converting data");
            return "";
        }
    }

    function decompressCatNoisesToData(catNoises: string): string {
        try {
            const catNoiseArray = catNoises.split(" ");
            let compressedData: number[] = [];
            let currentNumber = "";

            for (let i = 0; i < catNoiseArray.length; i++) {
                const noise = catNoiseArray[i];
                const index = noises.indexOf(noise);
                if (index !== -1) {
                    currentNumber += index;
                }
                if (currentNumber.length === 3) {
                    compressedData.push(parseInt(currentNumber, 7));
                    currentNumber = "";
                }
            }

            const decompressedData = pako.inflate(
                new Uint8Array(compressedData),
            );
            return new TextDecoder().decode(decompressedData);
        } catch (e) {
            addToOutputWrapped("Error converting data");
            return "";
        }
    }

    function scrollToBottom() {
        if (terminalElement) {
            terminalElement.scrollTop = terminalElement.scrollHeight;
        }
    }

    async function getMotd(): Promise<string> {
        const response = await fetch("/api/motd");
        const data = await response.json();
        return data.message;
    }

    function isToday(date: string): boolean {
        const now = new Date();
        const dateParts = date.split("-");
        return (
            now.getMonth() + 1 === parseInt(dateParts[0]) &&
            now.getDate() === parseInt(dateParts[1])
        );
    }

    function yearsAgo(date: string): number {
        const now = new Date();

        const pastDate = new Date(date);

        let years = now.getFullYear() - pastDate.getFullYear();

        const monthDiff = now.getMonth() - pastDate.getMonth();
        if (
            monthDiff < 0 ||
            (monthDiff === 0 && now.getDate() < pastDate.getDate())
        ) {
            years--;
        }

        return years;
    }

    let motd = [
        "Hello there! Welcome to my website.",
        "\u001b[95mFetching message of the day...",
        "\u001b[95mFetching last.fm status...",
        "{visitors} Visitors so far!",
        "<br>",
        "┏━━━Socials━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓",
        '┃  <a href="https://github.com/HoosierTransfer" target="_blank" rel="nofollow">\u001b[96mGithub</a>                                         ┃',
        "┃                                                 ┃",
        "┃  \u001b[96mDiscord: 1vers1on\u001b[0m                              ┃",
        "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛",
        "<br>",
        "If you want to find out more about me, type <i>whoami</i>, or type <i>help</i> to see a list of available commands.",
        "<br>",
        isToday("08-07") ? "It's my birthday today!<br><br>" : "",
    ];

    let pipeOutput: string[] = [];

    let terminalOutput: any[] = [];
    let inputValue = "";
    let cursorPosition = 0;
    let terminalElement: HTMLElement;
    let currentDirectory = "~";
    let commandHistory: string[] = [];
    let historyIndex = -1;

    let grid: string[][] = [];
    let gridState: number[][] = [];
    let gridLocation = 0;
    let gridColors: string[] = [];

    let gridCanvases: HTMLCanvasElement[] = [];
    let activeGridCanvas: HTMLCanvasElement;
    let gridCanvasContext: CanvasRenderingContext2D;

    let onlyUpdateChangedCells = false;
    let changedCells: number[][] = [];

    let conwayInterval: ReturnType<typeof setInterval> | null = null;
    let badAppleInterval: ReturnType<typeof setInterval> | null = null;

    let antX = 0;
    let antY = 0;
    let antDirection = 0;
    let antRule = "RL";

    let runningInterval: () => void;
    let intervalSpeed = 100;

    let commandInputCallback: ((input: string) => void) | null;
    let timerCountingDown = false;

    let transMode = false;

    let smoothGrid = false;

    let fullUpdateGridNextFrame = false;

    const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

    let primordiaStates = 12;

    let badAppleLine = 0;

    let activeOutput = "terminal";

    const mooreKernel = [
        [1, 1, 1],
        [1, 0, 1],
        [1, 1, 1],
    ];

    function writeToOutput(...text: string[]) {
        if (activeOutput === "terminal") {
            terminalOutput = [...terminalOutput, ...text];
        } else if (activeOutput === "pipe") {
            pipeOutput = [...pipeOutput, ...text];
        }
    }

    function setLineInOutput(text: string, line: number) {
        if (activeOutput === "terminal") {
            terminalOutput[line] = text;
        } else if (activeOutput === "pipe") {
            pipeOutput[line] = text;
        }
    }

    function appendToLineInOutput(text: string, line: number) {
        if (activeOutput === "terminal") {
            terminalOutput[line] += text;
        } else if (activeOutput === "pipe") {
            pipeOutput[line] += text;
        }
    }

    function getOutputLength() {
        if (activeOutput === "terminal") {
            return terminalOutput.length;
        } else if (activeOutput === "pipe") {
            return pipeOutput.length;
        }

        return 0;
    }

    function clearOutput() {
        if (activeOutput === "terminal") {
            terminalOutput = [];
        } else if (activeOutput === "pipe") {
            pipeOutput = [];
        }
    }

    function clip(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
    }

    let primordiaGrowthFunc = (n: number) => {
        return (
            (n >= 0.2 && n <= 0.25 ? 1 : 0) - (n <= 0.18 || n >= 0.33 ? 1 : 0)
        );
    };

    function conwayIteration() {
        let newGridState: number[][] = [];
        for (let i = 0; i < gridState.length; i++) {
            newGridState.push([]);
            for (let j = 0; j < gridState[i].length; j++) {
                let neighbors = 0;
                for (let x = -1; x <= 1; x++) {
                    for (let y = -1; y <= 1; y++) {
                        if (x === 0 && y === 0) {
                            continue;
                        }
                        let ni = i + x;
                        let nj = j + y;
                        if (ni < 0) {
                            ni = gridState.length - 1;
                        } else if (ni >= gridState.length) {
                            ni = 0;
                        }
                        if (nj < 0) {
                            nj = gridState[i].length - 1;
                        } else if (nj >= gridState[i].length) {
                            nj = 0;
                        }
                        neighbors += gridState[ni][nj];
                    }
                }
                if (gridState[i][j] === 1) {
                    if (neighbors < 2 || neighbors > 3) {
                        newGridState[i].push(0);
                    } else {
                        newGridState[i].push(1);
                    }
                } else {
                    if (neighbors === 3) {
                        newGridState[i].push(1);
                    } else {
                        newGridState[i].push(0);
                    }
                }

                if (gridState[i][j] !== newGridState[i][j]) {
                    changedCells.push([i, j]);
                }
            }
        }
        gridState = newGridState;
    }

    function primordiaIteration() {
        let newGridState: number[][] = [];
        let growthFuncFromEnv = environmentVariables.get(
            "PRIMORDIA_GROWTH_FUNC",
        );
        if (
            growthFuncFromEnv &&
            growthFuncFromEnv !==
                "return 0 + ((n >= 0.2) && (n <= 0.25)) - ((n <= 0.18) || (n >= 0.33))"
        ) {
            primordiaGrowthFunc = new Function("n", growthFuncFromEnv) as (
                n: number,
            ) => number;
        }

        let neighborsGrid = convolve2DWithSavedKernel(gridState);

        for (let i = 0; i < gridState.length; i++) {
            newGridState.push([]);
            for (let j = 0; j < gridState[i].length; j++) {
                // let neighbors = 0;
                // for (let x = -1; x <= 1; x++) {
                //     for (let y = -1; y <= 1; y++) {
                //         if (x === 0 && y === 0) {
                //             continue;
                //         }
                //         let ni = i + x;
                //         let nj = j + y;
                //         if (ni < 0) {
                //             ni = gridState.length - 1;
                //         } else if (ni >= gridState.length) {
                //             ni = 0;
                //         }
                //         if (nj < 0) {
                //             nj = gridState[i].length - 1;
                //         } else if (nj >= gridState[i].length) {
                //             nj = 0;
                //         }
                //         neighbors += gridState[ni][nj] * (1 / 8);
                //     }
                // }
                const updateFreq =
                    environmentVariables.get("PRIMORDIA_UPDATE_FREQ") || 10;
                newGridState[i].push(
                    clip(
                        gridState[i][j] +
                            (1 / updateFreq) *
                                primordiaGrowthFunc(neighborsGrid[i][j]),
                        0,
                        1,
                    ),
                );

                if (gridState[i][j] !== newGridState[i][j]) {
                    changedCells.push([i, j]);
                }
            }
        }
        gridState = newGridState;
    }

    function addGridToTerminal() {
        gridLocation = getOutputLength() + 1;
        writeToOutput("<br>");
        for (let i = 0; i < grid.length; i++) {
            writeToOutput(grid[i].join(""));
        }
    }

    function updateGridOnTerminal() {
        for (let i = 0; i < gridState.length; i++) {
            for (let j = 0; j < gridState[i].length; j++) {
                if (gridColors.length === 0) {
                    grid[i][j] = gridState[i][j] === 1 ? "■ " : "  ";
                } else {
                    if (gridState[i][j] > 0) {
                        let colorIndex = gridState[i][j] % gridColors.length;
                        grid[i][j] =
                            `<span style="color:${gridColors[colorIndex]}">■</span> `;
                    } else {
                        grid[i][j] = "  ";
                    }
                }
            }
        }

        for (let i = 0; i < grid.length; i++) {
            setLineInOutput(grid[i].join(""), gridLocation + i);
        }
    }

    function updateGridDirect() {
        for (let i = 0; i < grid.length; i++) {
            setLineInOutput(grid[i].join(""), gridLocation + i);
        }
    }

    async function addCanvasGrid() {
        terminalOutput.push({ type: "canvas" });
        await tick();
        for (let i = gridCanvases.length - 1; i >= 0; i--) {
            if (gridCanvases[i]) {
                activeGridCanvas = gridCanvases[i];
                break;
            }
        }

        const context = activeGridCanvas.getContext("2d");
        if (context) {
            gridCanvasContext = context;
        } else {
            console.error("Failed to get 2D context");
        }

        updateCanvasGrid();
    }

    function updateCanvasGrid() {
        const cellSize = 300 / gridState.length;
        if (!onlyUpdateChangedCells && !fullUpdateGridNextFrame) {
            gridCanvasContext.clearRect(0, 0, 300, 300);

            gridCanvasContext.fillStyle = turboColormapRgb(0);
            gridCanvasContext.fillRect(0, 0, 300, 300);
        }
        if (onlyUpdateChangedCells && !fullUpdateGridNextFrame) {
            for (let i = 0; i < changedCells.length; i++) {
                let x = changedCells[i][0];
                let y = changedCells[i][1];
                if (gridColors.length === 0) {
                    gridCanvasContext.fillStyle =
                        gridState[x][y] === 1 ? "#0f0" : "#000";
                    gridCanvasContext.fillRect(
                        x * cellSize,
                        y * cellSize,
                        cellSize,
                        cellSize,
                    );
                } else {
                    if (smoothGrid) {
                        let color = turboColormapRgb(gridState[x][y]);
                        gridCanvasContext.fillStyle = color;
                        gridCanvasContext.fillRect(
                            x * cellSize,
                            y * cellSize,
                            cellSize,
                            cellSize,
                        );
                    } else {
                        let colorIndex = gridState[x][y] % gridColors.length;
                        gridCanvasContext.fillStyle = gridColors[colorIndex];
                        gridCanvasContext.fillRect(
                            x * cellSize,
                            y * cellSize,
                            cellSize,
                            cellSize,
                        );
                    }
                }
            }
            changedCells = [];
        } else {
            for (let i = 0; i < gridState.length; i++) {
                for (let j = 0; j < gridState[i].length; j++) {
                    if (gridColors.length === 0) {
                        gridCanvasContext.fillStyle =
                            gridState[i][j] === 1 ? "#0f0" : "#000";
                        gridCanvasContext.fillRect(
                            i * cellSize,
                            j * cellSize,
                            cellSize,
                            cellSize,
                        );
                    } else {
                        if (smoothGrid) {
                            let color = turboColormapRgb(gridState[i][j]);
                            gridCanvasContext.fillStyle = color;
                            gridCanvasContext.fillRect(
                                i * cellSize,
                                j * cellSize,
                                cellSize,
                                cellSize,
                            );
                        } else {
                            let colorIndex =
                                gridState[i][j] % gridColors.length;
                            gridCanvasContext.fillStyle =
                                gridColors[colorIndex];
                            gridCanvasContext.fillRect(
                                i * cellSize,
                                j * cellSize,
                                cellSize,
                                cellSize,
                            );
                        }
                    }
                }
            }

            if (fullUpdateGridNextFrame) {
                fullUpdateGridNextFrame = false;
            }
        }
    }

    function printTypewriter(text: string, delay = 2) {
        return new Promise(async (resolve) => {
            let line = getOutputLength();
            for (let i = 0; i < text.length; i++) {
                appendToLineInOutput(text[i], line);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
            resolve(undefined);
        });
    }

    function vigenereEncrypt(plaintext: string, key: string): string {
        let encryptedText = "";
        key = key.toUpperCase();
        plaintext = plaintext.toUpperCase();

        for (let i = 0, j = 0; i < plaintext.length; i++) {
            let currentLetter = plaintext[i];

            if (currentLetter >= "A" && currentLetter <= "Z") {
                let shift = key[j % key.length].charCodeAt(0) - 65;
                let encryptedLetter = String.fromCharCode(
                    ((currentLetter.charCodeAt(0) - 65 + shift) % 26) + 65,
                );
                encryptedText += encryptedLetter;
                j++;
            } else {
                encryptedText += currentLetter;
            }
        }
        return encryptedText;
    }

    function vigenereDecrypt(encryptedText: string, key: string): string {
        let decryptedText = "";
        key = key.toUpperCase();
        encryptedText = encryptedText.toUpperCase();

        for (let i = 0, j = 0; i < encryptedText.length; i++) {
            let currentLetter = encryptedText[i];

            if (currentLetter >= "A" && currentLetter <= "Z") {
                let shift = key[j % key.length].charCodeAt(0) - 65;
                let decryptedLetter = String.fromCharCode(
                    ((currentLetter.charCodeAt(0) - 65 - shift + 26) % 26) + 65,
                );
                decryptedText += decryptedLetter;
                j++;
            } else {
                decryptedText += currentLetter;
            }
        }
        return decryptedText;
    }

    function generateEquallySpacedColors(n: number): string[] {
        const colors = [];

        for (let i = 0; i < n; i++) {
            const hue = Math.floor((360 / n) * i);
            const color = `#${hslToHex(hue, 100, 50)}`;
            colors.push(color);
        }

        return colors;
    }

    function turboColormap(x: number): [number, number, number] {
        x = Math.max(0.0, Math.min(1.0, x));
        const a = Math.floor(x * 255.0);
        const b = Math.min(255, a + 1);
        const f = x * 255.0 - a;
        return [
            turboLookup[a][0] + (turboLookup[b][0] - turboLookup[a][0]) * f,
            turboLookup[a][1] + (turboLookup[b][1] - turboLookup[a][1]) * f,
            turboLookup[a][2] + (turboLookup[b][2] - turboLookup[a][2]) * f,
        ];
    }

    function turboColormapRgb(x: number): string {
        const [r, g, b] = turboColormap(x);
        return `rgb(${r * 255}, ${g * 255}, ${b * 255})`;
    }

    function equallySpacedTubroColormap(n: number): string[] {
        const colors = [];

        for (let i = 0; i < n; i++) {
            const x = i / (n - 1);
            const [r, g, b] = turboColormap(x);
            colors.push(`rgb(${r * 255}, ${g * 255}, ${b * 255})`);
        }

        return colors;
    }

    function hslToHex(h: number, s: number, l: number): string {
        l /= 100;
        const a = (s * Math.min(l, 1 - l)) / 100;
        const f = (n: number) => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color)
                .toString(16)
                .padStart(2, "0");
        };
        return `${f(0)}${f(8)}${f(4)}`;
    }

    function addToOutputWrapped(text: string) {
        const wrappedText = text
            .split("\n")
            .map((line) => {
                let wrappedLine = "";
                let words = line.split(" ");
                let currentLine = "";

                words.forEach((word) => {
                    // Check if adding next word exceeds terminal width
                    if ((currentLine + word).length >= terminalWidth) {
                        wrappedLine += currentLine.trim() + "\n";
                        currentLine = word + " ";
                    } else {
                        currentLine += word + " ";
                    }
                });

                // Add remaining text
                if (currentLine) {
                    wrappedLine += currentLine.trim();
                }

                return wrappedLine;
            })
            .join("\n");

        writeToOutput(wrappedText);
    }

    const antInterval = () => {
        const updatesPerFrameEnv =
            environmentVariables.get("UPDATES_PER_FRAME");
        let updatesPerFrame = 1;
        if (!isNaN(parseInt(updatesPerFrameEnv))) {
            updatesPerFrame = parseInt(updatesPerFrameEnv);
        }

        for (let i = 0; i < updatesPerFrame; i++) {
            let ant = gridState[antX][antY];
            let turn = antRule.charAt(ant);
            if (turn === "R") {
                antDirection = (antDirection + 1) % 4;
            } else {
                antDirection = (antDirection - 1 + 4) % 4;
            }
            gridState[antX][antY] = (ant + 1) % antRule.length;
            changedCells.push([antX, antY]);
            switch (antDirection) {
                case 0:
                    antY = (antY + 1) % gridState.length;
                    break;
                case 1:
                    antX = (antX + 1) % gridState.length;
                    break;
                case 2:
                    antY = (antY - 1 + gridState.length) % gridState.length;
                    break;
                case 3:
                    antX = (antX - 1 + gridState.length) % gridState.length;
                    break;
            }
        }
        if (environmentVariables.get("TEXT_MODE") == "true") {
            updateGridOnTerminal();
        } else {
            updateCanvasGrid();
        }
    };

    const conwayIntervalFunc = () => {
        const updatesPerFrameEnv =
            environmentVariables.get("UPDATES_PER_FRAME");
        let updatesPerFrame = 1;
        if (!isNaN(parseInt(updatesPerFrameEnv))) {
            updatesPerFrame = parseInt(updatesPerFrameEnv);
        }

        for (let i = 0; i < updatesPerFrame; i++) {
            conwayIteration();
        }

        if (environmentVariables.get("TEXT_MODE") == "true") {
            updateGridOnTerminal();
        } else {
            updateCanvasGrid();
        }
    };

    const primordiaIntervalFunc = () => {
        const updatesPerFrameEnv =
            environmentVariables.get("UPDATES_PER_FRAME");
        let updatesPerFrame = 1;
        if (!isNaN(parseInt(updatesPerFrameEnv))) {
            updatesPerFrame = parseInt(updatesPerFrameEnv);
        }

        for (let i = 0; i < updatesPerFrame; i++) {
            primordiaIteration();
        }

        if (environmentVariables.get("TEXT_MODE") == "true") {
            updateGridOnTerminal();
        } else {
            updateCanvasGrid();
        }
    };

    const commands: Record<string, (command: string[]) => void> = {
        help: () => {
            writeToOutput(
                "\u001b[37mUse man to get more information about a command.",
                "\u001b[37mAvailable commands:",
                "\u001b[37munimash",
                "\u001b[37mproxy",
                "\u001b[37mhelp",
                "\u001b[37mman",
                "\u001b[37mclear",
                "\u001b[37mwhoami",
                "\u001b[37mecho",
                "\u001b[37mexport",
                "\u001b[37mmotd",
                "\u001b[37mls",
                "\u001b[37mcd",
                "\u001b[37mcat",
                "\u001b[37msubscribeToPush",
                "\u001b[37mturn_me_into_a_girl",
                "\u001b[37mconway",
                "\u001b[37mprimordia",
                "\u001b[37mcowsay",
                "\u001b[37mneofetch",
                "\u001b[37mant",
                "\u001b[37msetspeed",
                "\u001b[37mgridsize",
                "\u001b[37mtrans",
                "\u001b[37mnotification",
                "\u001b[37mregister",
                "\u001b[37mlogin",
                "\u001b[37mlogout",
                "\u001b[37madminhelp",
                "\u001b[37mpostMessage",
                "\u001b[37mmessageBoard",
                "\u001b[37mfibonacci",
                "\u001b[37mping",
                "\u001b[37mbadapple",
                "\u001b[37mstarwars",
                "\u001b[37mdownload",
                "\u001b[37misPrime",
                "\u001b[37mview_image",
                "\u001b[37mto_cat_noises",
                "\u001b[37mfrom_cat_noises",
            );
        },

        adminhelp: async () => {
            const response = await fetch("/api/auth/getUserData");
            const data = await response.json();

            if (
                !(
                    data.user.permission === "admin" ||
                    data.user.permission === "owner"
                )
            ) {
                writeToOutput(
                    "\u001b[37mYou do not have permission to use this command.",
                );
                return;
            }

            writeToOutput(
                "\u001b[37mAvailable admin commands:",
                "\u001b[37mupdateMotd",
                "\u001b[37mupdateuserdata",
                "\u001b[37mgetuserdata",
                "\u001b[37mnotify",
            );
        },

        cd: (command: string[]) => {
            if (command.length === 1) {
                writeToOutput("Usage: cd &lt;directory&gt;");
                return;
            }

            if (command[1] === ".." || command[1] === "../") {
                currentDirectory = "~";
                return;
            }

            if (
                command[1] === "what" ||
                command[1] === "what/" ||
                command[1] === "./what" ||
                command[1] === "./what/"
            ) {
                currentDirectory = "~/what";
                return;
            }

            writeToOutput(`cd: ${command[1]}: No such directory`);
        },

        conway: () => {
            gridColors = [];
            if (conwayInterval) clearInterval(conwayInterval);
            grid = [];
            gridState = [];
            for (let i = 0; i < 16; i++) {
                grid.push([]);
                gridState.push([]);
                for (let j = 0; j < 16; j++) {
                    gridState[i].push(Math.random() < 0.5 ? 1 : 0);
                    if (environmentVariables.get("TEXT_MODE") == "true") {
                        grid[i].push(gridState[i][j] === 1 ? "■ " : "  ");
                    }
                }
            }

            setKernel(mooreKernel, 16, 16);

            if (environmentVariables.get("TEXT_MODE") == "true") {
                addGridToTerminal();
            } else {
                addCanvasGrid();
            }

            if (conwayInterval) clearInterval(conwayInterval);
            conwayInterval = setInterval(conwayIntervalFunc, intervalSpeed);
            runningInterval = conwayIntervalFunc;
        },

        primordia: () => {
            if (conwayInterval) clearInterval(conwayInterval);
            smoothGrid = true;
            gridColors = equallySpacedTubroColormap(primordiaStates);
            grid = [];
            gridState = [];
            let width = 32;
            let height = 32;
            for (let i = 0; i < width; i++) {
                grid.push([]);
                gridState.push([]);
                for (let j = 0; j < height; j++) {
                    gridState[i].push(Math.random());

                    if (environmentVariables.get("TEXT_MODE") == "true") {
                        grid[i].push("■ ");
                    }
                }
            }

            if (environmentVariables.get("TEXT_MODE") == "true") {
                addGridToTerminal();
                updateGridOnTerminal();
            } else {
                addCanvasGrid();
            }

            let kernelNormalized: number[][] = [];
            for (let x = 0; x < 3; x++) {
                kernelNormalized.push([]);
                for (let y = 0; y < 3; y++) {
                    kernelNormalized[x][y] = mooreKernel[x][y] / 9;
                }
            }

            setKernel(kernelNormalized, width, height);

            if (conwayInterval) clearInterval(conwayInterval);
            conwayInterval = setInterval(primordiaIntervalFunc, intervalSpeed);
            runningInterval = primordiaIntervalFunc;
        },

        clear: () => {
            grid = [];
            gridState = [];
            if (conwayInterval) clearInterval(conwayInterval);
            if (badAppleInterval) clearInterval(badAppleInterval);
            clearOutput();

            gridCanvases.forEach((canvas) => {
                if (canvas) {
                    canvas.remove();
                }
            });
        },

        whoami: () => {
            writeToOutput(
                "<br>",
                "I'm HoosierTransfer a c++ developer with a passion for creating things.",
                "Some little things about me~",
                "<br>",
                "~ I go by she/her pronouns",
                "~ My other username is Aether or 1vers1on",
                "~ Yes, i'm from Indiana (I don't live there anymore though)",
                "~ I use arch btw",
                "~ Liminal space and backrooms enthusiast",
                "   - I also like the dreamcore and weirdcore aesthetics",
                `<img title="trans" style="image-rendering: pixelated;" src="button274.gif"><img title="archbtw" style="image-rendering: pixelated;" src="button195.png"><img title="firefox" style="image-rendering: pixelated;" src="button102.gif"><img title="blender" style="image-rendering: pixelated;" src="blender.gif"><img title="16bit" style="image-rendering: pixelated;" src="bestviewed16bit.gif">`,
            );
        },

        export: (command: string[]) => {
            if (command.length === 1) {
                writeToOutput("Usage: export &lt;variable&gt=&lt;value&gt");
                return;
            }

            let variable = command[1].split("=")[0];
            let value = command[1].split("=")[1];

            if (value[0] === '"' || value[0] === "'") {
                // get all commands after the first one
                let i = 2;
                while (command[i] && !command[i].endsWith(value[0])) {
                    value += " " + command[i];
                    i++;
                }
                value += " " + command[i];
            }

            environmentVariables.set(variable, value);
        },

        echo: (command: string[]) => {
            if (command.length === 1) {
                writeToOutput("<br>");
                return;
            }

            let i = 1;
            let output = "";
            while (command[i]) {
                if (command[i].startsWith("$")) {
                    let variable = command[i].slice(1);
                    if (environmentVariables.has(variable)) {
                        output += environmentVariables.get(variable);
                    } else {
                        output += command[i];
                    }
                } else {
                    output += command[i];
                }
                output += " ";
                i++;
            }

            writeToOutput(output);
        },

        motd: () => {
            writeToOutput(...motd);
        },

        ":3": () => {
            writeToOutput("meow");
        },

        ls: async (command: string[]) => {
            if (currentDirectory === "~" && command.length === 1) {
                writeToOutput(
                    "\u001b[96mprojects",
                    "\u001b[96mabout",
                    "\u001b[96mcontact",
                    "\u001b[96mskibidisigmafile",
                    "\u001b[96m.env",
                    "\u001b[96mpublickey.asc",
                    "\u001b[95mwhat",
                );
            } else if (currentDirectory === "~/what" && command.length === 1) {
                const response = await fetch(
                    "/api/listFilesInServerDirectory",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ directory: "what" }),
                    },
                );

                const data = await response.json();
                for (let file of data.files) {
                    if (file.isDirectory) {
                        writeToOutput(`\u001b[95m${file.name}`);
                    } else {
                        writeToOutput(`\u001b[96m${file.name}`);
                    }
                }
            } else if (currentDirectory === "~" && command.length === 2) {
                if (command[1] === "what") {
                    const response = await fetch(
                        "/api/listFilesInServerDirectory",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ directory: "what" }),
                        },
                    );

                    const data = await response.json();
                    for (let file of data.files) {
                        if (file.isDirectory) {
                            writeToOutput(`<\u001b[95m${file.name}`);
                        } else {
                            writeToOutput(`\u001b[96m${file.name}`);
                        }
                    }
                }
            }
        },

        cat: async (command: string[]) => {
            switch (command[1]) {
                case "projects":
                    if (currentDirectory === "~") {
                        writeToOutput(
                            "<br>",
                            "┏━━━━━Projects━━━━━┓",
                            "┃ \u001b[96mEagler Lambda\u001b[0m    ┃",
                            "┃ \u001b[96mScience Help\u001b[0m     ┃",
                            "┃ \u001b[96mSpork Viewer\u001b[0m     ┃",
                            "┃ \u001b[96mSussy OS\u001b[0m         ┃",
                            "┃ \u001b[96mYee Engine\u001b[0m       ┃",
                            "┗━━━━━━━━━━━━━━━━━━┛",
                            "<br>",
                        );
                    }
                    break;
                case "about":
                    if (currentDirectory === "~") {
                        writeToOutput(
                            "<br>",
                            "┏━━━━━━━━━━About━━━━━━━━━━━┓",
                            "┃ \u001b[96mName: HoosierTransfer\u001b[0m    ┃",
                            `┃ \u001b[96mAge: ${yearsAgo("2009-08-07")}\u001b[0m                  ┃`,
                            "┃ \u001b[96mPronouns: she/her\u001b[0m        ┃",
                            "┃ \u001b[96mLanguages: C++, Java\u001b[0m     ┃",
                            "┃ \u001b[96mOS: Arch Linux / Windows\u001b[0m ┃",
                            "┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛",
                            "<br>",
                        );
                    }
                    break;
                case "contact":
                    if (currentDirectory === "~") {
                        writeToOutput(
                            "<br>",
                            "┏━━━━━━━━━━Contact━━━━━━━━━━┓",
                            "┃ \u001b[96mDiscord: 1vers1on\u001b[0m         ┃",
                            "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛",
                            "<br>",
                        );
                    }
                    break;

                case ".env":
                    writeToOutput(
                        ...Array.from(environmentVariables).map(
                            ([key, value]) => `${key}=${value}`,
                        ),
                    );
                    break;
                case "publickey.asc":
                    writeToOutput(
                        "-----BEGIN PGP PUBLIC KEY BLOCK-----",
                        "",
                        "mDMEZyPB6BYJKwYBBAHaRw8BAQdADcSzbGQAJvjBRl7P9aiYvovY53xKivABs58q",
                        "AnPL4+20O0hvb3NpZXJUcmFuc2Zlci8xdmVyczFvbiAobXJycCA6MykgPGludmVy",
                        "czFvbjFAb3V0bG9vay5jb20+iJMEExYKADsWIQTC+7jeZ9BDTwpVTWFRoc7QBu0M",
                        "1AUCZyPB6AIbAwULCQgHAgIiAgYVCgkICwIEFgIDAQIeBwIXgAAKCRBRoc7QBu0M",
                        "1MRBAQCuDZPJZk8yeH8moIer8Gt2dapKxC8bF6lhaN+IWCw4SgD/eMba0dI0PqmU",
                        "61LiaJpMsWZzUd1/VrVaB/nwvDw0jQq4OARnI8HoEgorBgEEAZdVAQUBAQdAD6+X",
                        "KtZ+SJ3FTPbqZNjTM8wnUDFXS+lxH07aForia34DAQgHiHgEGBYKACAWIQTC+7je",
                        "Z9BDTwpVTWFRoc7QBu0M1AUCZyPB6AIbDAAKCRBRoc7QBu0M1LQUAP9w+koFFhrZ",
                        "mtU7aERE9F8gIYb9KetyUWHEOurTdEliXwD/ThuuOsvp8o8Sz6GQGCxjmYnuRj4b",
                        "MB3ulBqapiRFLQE=",
                        "=eAXd",
                        "-----END PGP PUBLIC KEY BLOCK-----",
                    );
                    break;
                case "what":
                    writeToOutput("what is a directory");
                    break;
                case "":
                    writeToOutput("cat: missing file operand");
                    break;
            }

            if (currentDirectory === "~/what") {
                if (command.length === 2) {
                    const response = await fetch(
                        "/api/readFileFromServerDirectory",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                file: "what/" + command[1],
                            }),
                        },
                    );

                    const data = await response.json();
                    if (data.error) {
                        writeToOutput(data.error);
                    } else {
                        writeToOutput(data.fileContents);
                    }
                }
            }

            // check if it starts with /what
            if (
                command[1].startsWith("what/") ||
                command[1].startsWith("./what")
            ) {
                const response = await fetch(
                    "/api/readFileFromServerDirectory",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ file: command[1] }),
                    },
                );

                const data = await response.json();
                if (data.error) {
                    writeToOutput(data.error);
                } else {
                    writeToOutput(data.fileContents);
                }
            }
        },

        view_image: async (command: string[]) => {
            if (command.length === 1) {
                writeToOutput("Usage: view_image &lt;filename&gt");
                return;
            }

            if (
                command[1].startsWith("what/") ||
                command[1].startsWith("./what")
            ) {
                const response = await fetch("/api/getImageB64", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ file: command[1] }),
                });

                if (response.status === 404) {
                    writeToOutput("\u001b[31mError: File not found");
                    return;
                }

                if (response.status !== 200) {
                    writeToOutput("\u001b[31mError: Failed to get image");
                    return;
                }

                const data = await response.json();

                writeToOutput(
                    `<img src="${data.base64}" style="max-width: 400px; max-height: 400px;">`,
                );
            } else if (currentDirectory === "~/what") {
                const response = await fetch("/api/getImageB64", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ file: "what/" + command[1] }),
                });

                if (response.status === 404) {
                    writeToOutput("\u001b[31mError: File not found");
                    return;
                }

                if (response.status !== 200) {
                    writeToOutput("\u001b[31mError: Failed to get image");
                    return;
                }

                const data = await response.json();

                writeToOutput(
                    `<img src="${data.base64}" style="max-width: 400px; max-height: 400px;">`,
                );
            } else {
                writeToOutput("\u001b[31mError: File not found");
            }
        },

        cowsay: (command: string[]) => {
            if (command.length === 1) {
                writeToOutput("Usage: cowsay &lt;message&gt");
                return;
            }
            const message = command.slice(1).join(" ");
            let underscoreTop = "_".repeat(message.length + 2);
            let underscoreBottom = "-".repeat(message.length + 2);
            writeToOutput(
                " " + underscoreTop,
                `< ${message} >`,
                " " + underscoreBottom,
                "        \\   ^__^",
                "         \\  (oo)\\_______",
                "            (__)\\       )\\/\\",
                "                ||----w |",
                "                ||     ||",
            );
        },

        neofetch: (command: string[]) => {
            neofetch(command);
        },

        fastfetch: (command: string[]) => {
            neofetch(command);
        },

        ant: (command: string[]) => {
            if (conwayInterval) clearInterval(conwayInterval);
            if (command.length === 1) {
                antRule = "RL";
                gridColors = [];
            } else {
                command[1] = command[1].toUpperCase();
                for (let i = 0; i < command[1].length; i++) {
                    if (command[1][i] !== "R" && command[1][i] !== "L") {
                        writeToOutput(
                            "\u001b[31mInvalid rule. Must be a string of R's and L's",
                        );
                        return;
                    }
                }

                antRule = command[1];
                gridColors = generateEquallySpacedColors(antRule.length);
            }
            grid = [];
            gridState = [];
            let width = 60;
            let height = 60;
            for (let i = 0; i < width; i++) {
                grid.push([]);
                gridState.push([]);
                for (let j = 0; j < height; j++) {
                    gridState[i].push(0);

                    if (environmentVariables.get("TEXT_MODE") == "true") {
                        grid[i].push(gridState[i][j] === 1 ? "■ " : "  ");
                    }
                }
            }
            antX = Math.floor(width / 2);
            antY = Math.floor(height / 2);
            if (environmentVariables.get("TEXT_MODE") == "true") {
                addGridToTerminal();
            } else {
                addCanvasGrid();
            }
            if (conwayInterval) clearInterval(conwayInterval);
            conwayInterval = setInterval(antInterval, intervalSpeed);
            runningInterval = antInterval;
        },

        setspeed: (command: string[]) => {
            if (command.length === 1) {
                writeToOutput("Usage: setspeed &lt;speed&gt");
                return;
            }
            const newSpeed = parseInt(command[1]);
            if (isNaN(newSpeed)) {
                writeToOutput("Invalid speed");
                return;
            }
            intervalSpeed = newSpeed;
            if (conwayInterval) {
                clearInterval(conwayInterval);
                conwayInterval = setInterval(runningInterval, intervalSpeed);
            }
        },

        colortest: (command: string[]) => {
            if (command.length === 1) {
                writeToOutput("Usage: colorTest &lt;number&gt");
                return;
            }

            let nOfColors = parseInt(command[1]);
            if (isNaN(nOfColors)) {
                writeToOutput("Invalid number");
                return;
            }

            let colors = generateEquallySpacedColors(nOfColors);
            let colorString = "";
            for (let i = 0; i < colors.length; i++) {
                colorString += `<span style="color:${colors[i]};">■</span> <br>`;
            }

            writeToOutput(colorString);
        },

        canvastest: async () => {
            terminalOutput = [...terminalOutput, { type: "canvas" }];
            gridCanvases = [];
            await tick();
            for (let i = 0; i < gridCanvases.length; i++) {
                if (gridCanvases[i]) {
                    activeGridCanvas = gridCanvases[i];
                    break;
                }
            }
            const context = activeGridCanvas.getContext("2d");
            if (context) {
                gridCanvasContext = context;
            } else {
                console.error("Failed to get 2D context");
            }

            for (let i = 0; i < 30; i++) {
                for (let j = 0; j < 30; j++) {
                    gridCanvasContext.fillStyle =
                        Math.random() > 0.5 ? "black" : "white";
                    gridCanvasContext.fillRect(i * 20, j * 20, 20, 20);
                }
            }
        },

        turn_me_into_a_girl: async () => {
            writeToOutput(
                "\u001b[37mAre you sure you want to turn into a girl? Please enter y/n.",
                "\u001b[37mIf you decide you don't like it, you can always choose to stop being a girl.",
            );
            commandInputCallback = async (command) => {
                if (
                    command.toLowerCase() === "y" ||
                    command.toLowerCase() === "yes"
                ) {
                    writeToOutput(
                        "\u001b[35mOkay then! As you wish.",
                        "\u001b[35mPlease wait warmly... (Press c to cancel)",
                    );
                    let timerLine = getOutputLength();
                    writeToOutput("\u001b[37m[--------------------] 0%");
                    const totalTime = 20000;
                    const startTime = new Date();
                    let lastTime = startTime;
                    let currentTime;
                    let progress = 0;
                    let easing = (x: number) => {
                        return 1 - Math.pow(1 - x, 4);
                    };
                    timerCountingDown = true;
                    while (progress < 1) {
                        if (!timerCountingDown) {
                            writeToOutput(
                                "\u001b[37mThat's totally fine. Don't worry about it.",
                                "\u001b[37mYou're a good person.",
                            );
                            return;
                        }
                        currentTime = new Date();
                        progress =
                            (currentTime.getTime() - startTime.getTime()) /
                            totalTime;
                        let bar = "\u001b[37m[\u001b[1337m";
                        let barProgress = easing(progress) * 20;
                        for (let i = 0; i < 20; i++) {
                            if (i < barProgress) {
                                bar += "=";
                            } else {
                                if (bar.endsWith("=")) {
                                    bar += "\u001b[37m";
                                }
                                bar += "-";
                            }
                        }
                        bar +=
                            "\u001b[37m] " +
                            Math.floor(easing(progress) * 100) +
                            "%";
                        setLineInOutput(bar, timerLine);
                        await delay(1000 / 60);
                    }
                    timerCountingDown = false;
                    setLineInOutput(
                        "\u001b[37m[\u001b[1337m====================\u001b[37m] 100%",
                        timerLine,
                    );
                    const line = getOutputLength();
                    setLineInOutput("\u001b[95m", line);
                    const string1 =
                        "Congratulations. You’re a girl now.<br>You might not feel much different yet, but that’s okay.<br>Only a girl would have wanted to click that button.<br>That means you’re a girl on the inside, through and through.<br>Good luck out there. We’re rooting for you.";
                    for (let i = 0; i < string1.length; i++) {
                        if (
                            string1.charAt(i) == "<" &&
                            string1.charAt(i + 1) == "b" &&
                            string1.charAt(i + 2) == "r" &&
                            string1.charAt(i + 3) == ">"
                        ) {
                            setLineInOutput("<br>", line);
                            i += 3;
                            await delay(20);
                            continue;
                        }
                        appendToLineInOutput(string1.charAt(i), line);
                        await delay(20);
                    }
                } else if (
                    command.toLowerCase() === "n" ||
                    command.toLowerCase() === "no"
                ) {
                    writeToOutput(
                        "\u001b[37mThat's totally fine. Don't worry about it.",
                        "\u001b[37mYou're a good person.",
                    );
                }
            };
        },

        notification: () => {
            writeToOutput(
                "\u001b[37mPlease enter the message you would like to send.",
            );
            commandInputCallback = (command) => {
                if (Notification.permission !== "granted") {
                    Notification.requestPermission().then((permission) => {
                        if (permission === "granted") {
                            new Notification(command);
                        }
                    });
                } else {
                    new Notification(command);
                }
            };
        },

        subscribeToPush: async () => {
            if ("serviceWorker" in navigator && "PushManager" in window) {
                navigator.serviceWorker
                    .register("/serviceworker.js")
                    .then((reg) => {
                        console.log("Service Worker registered:", reg);
                    })
                    .catch((err) => {
                        console.error(
                            "Service Worker registration failed:",
                            err,
                        );
                    });
            }
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey:
                    "BLspM6VfkiZhsWPyCECtuL6uhwTAiGsIrJgoQuag221tZDNW4B168etD5lUXdTvgsc6DWLL2gO5W8zfb-oniYms",
            });

            await fetch("/api/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(subscription),
            });

            writeToOutput("Subscribed to notifications");
        },

        register: async (command: string[]) => {
            if (command.length === 1) {
                writeToOutput(
                    "Usage: register &lt;username&gt &lt;password&gt",
                );
                return;
            }

            let username = command[1];
            let password = command[2];

            if (username.length < 3) {
                writeToOutput("Username must be at least 3 characters long");
                return;
            }

            if (password.length < 6) {
                writeToOutput("Password must be at least 6 characters long");
                return;
            }

            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, password }),
            });

            if (response.status !== 201) {
                writeToOutput(await response.text());
                return;
            }

            writeToOutput("Successfully registered and logged in");
        },

        login: async (command: string[]) => {
            if (command.length === 1) {
                writeToOutput("Usage: login &lt;username&gt &lt;password&gt");
                return;
            }

            let username = command[1];
            let password = command[2];

            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, password }),
            });

            if (response.status !== 200) {
                writeToOutput("Failed to login", await response.text());
                return;
            }

            writeToOutput("Successfully logged in");
        },

        logout: async () => {
            const response = await fetch("/api/auth/logout", {
                method: "POST",
            });

            if (response.status !== 200) {
                writeToOutput("Failed to logout", await response.text());
                return;
            }

            writeToOutput("Successfully logged out");
        },

        updateMotd: async (command: string[]) => {
            if (command.length === 1) {
                writeToOutput("Usage: updateMotd &lt;message&gt");
                return;
            }

            const response = await fetch("/api/admin/updateMotd", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ message: command.slice(1).join(" ") }),
            });

            if (response.status !== 200) {
                writeToOutput(
                    "Failed to update message of the day",
                    await response.text(),
                );
                return;
            }

            writeToOutput("Successfully updated message of the day");
        },

        updateuserdata: async (command: string[]) => {
            if (command.length === 1) {
                writeToOutput(
                    "Usage: updateuserdata &lt;username&gt &lt;column&gt &lt;value&gt",
                );
                return;
            }

            const response = await fetch("/api/admin/updateUserData", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: command[1],
                    column: command[2],
                    value: command.slice(3).join(" "),
                }),
            });

            if (response.status !== 200) {
                writeToOutput(
                    "Failed to update user data",
                    await response.text(),
                );
                return;
            }

            writeToOutput("Successfully updated user data");
        },

        getuserdata: async (command: string[]) => {
            if (command.length === 1) {
                writeToOutput("Usage: getuserdata &lt;username&gt");
                return;
            }

            const response = await fetch("/api/admin/getUserData", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username: command[1] }),
            });

            if (response.status !== 200) {
                writeToOutput("Failed to get user data", await response.text());
                return;
            }

            const data = await response.json();

            writeToOutput(JSON.stringify(data.user, null, 2));
        },

        notify: async (command: string[]) => {
            if (command.length === 1) {
                writeToOutput("Usage: notify &lt;message&gt");
                return;
            }

            const response = await fetch("/api/admin/notify", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    body: command.slice(1).join(" "),
                    title: "HoosierTransfer",
                }),
            });

            if (response.status !== 200) {
                writeToOutput(
                    "Failed to send notification",
                    await response.text(),
                );
                return;
            }

            writeToOutput("Successfully sent notification");
        },

        gridsize: (command: string[]) => {
            if (command.length < 3) {
                writeToOutput("Usage: gridsize &lt;x&gt &lt;y&gt");
                return;
            }

            if (parseInt(command[1]) > grid.length) {
                for (let i = grid.length; i < parseInt(command[1]); i++) {
                    grid.push([]);
                    gridState.push([]);
                    for (let j = 0; j < grid[0].length; j++) {
                        grid[i].push("  ");
                        gridState[i].push(0);
                    }
                }
            } else if (parseInt(command[1]) < grid.length) {
                grid = grid.slice(0, parseInt(command[1]));
                gridState = gridState.slice(0, parseInt(command[1]));
            }

            if (parseInt(command[2]) > grid[0].length) {
                for (let i = 0; i < grid.length; i++) {
                    for (
                        let j = grid[i].length;
                        j < parseInt(command[2]);
                        j++
                    ) {
                        grid[i].push("  ");
                        gridState[i].push(0);
                    }
                }
            } else if (parseInt(command[2]) < grid[0].length) {
                for (let i = 0; i < grid.length; i++) {
                    grid[i] = grid[i].slice(0, parseInt(command[2]));
                    gridState[i] = gridState[i].slice(0, parseInt(command[2]));
                }
            }

            fullUpdateGridNextFrame = true;

            if (environmentVariables.get("TEXT_MODE") == "true") {
                updateGridOnTerminal();
            } else {
                updateCanvasGrid();
            }
        },

        convtest: () => {
            // const input = [
            //     [1, 1, 1, 1, 1, 1, 1, 1],
            //     [1, 0, 0, 0, 0, 0, 0, 1],
            //     [1, 0, 0, 0, 0, 0, 0, 1],
            //     [1, 0, 0, 0, 0, 0, 0, 1],
            //     [1, 0, 0, 0, 0, 0, 0, 1],
            //     [1, 0, 0, 0, 0, 0, 0, 1],
            //     [1, 0, 0, 0, 0, 0, 0, 1],
            //     [1, 1, 1, 1, 1, 1, 1, 1]
            // ];

            // make a 16x16 grid of 1s around the edges
            const input: number[][] = [];
            const size = 32;
            for (let i = 0; i < size; i++) {
                input.push([]);
                for (let j = 0; j < size; j++) {
                    if (
                        i === 0 ||
                        i === size - 1 ||
                        j === 0 ||
                        j === size - 1
                    ) {
                        input[i].push(1);
                    } else {
                        input[i].push(0);
                    }
                }
            }

            const kernel = [
                [1, 1, 1],
                [1, 0, 1],
                [1, 1, 1],
            ];

            const output = convolve2D(input, kernel);

            writeToOutput(JSON.stringify(output, null, 2));
        },

        postMessage: async (command: string[]) => {
            if (command.length === 1) {
                writeToOutput("Usage: postMessage &lt;message&gt");
                return;
            }

            const response = await fetch("/api/addMessageToBoard", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ message: command.slice(1).join(" ") }),
            });

            if (response.status !== 200) {
                writeToOutput("Failed to post message", await response.text());
                return;
            }

            writeToOutput("Successfully posted message");
        },

        messageBoard: async () => {
            const response = await fetch("/api/getMessagesFromBoard", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ Number: 50 }),
            });

            if (response.status !== 200) {
                writeToOutput("Failed to get messages", await response.text());
                return;
            }

            const data = await response.json();

            // const date = new Date(response.createdAt);
            // const dateString = date.toDateString();

            data.forEach((message: any) => {
                const date = new Date(message.createdAt);
                const dateString = date.toDateString();

                if (message.username === "HoosierTransfer") {
                    message.username = `\u001b[1337m${message.username}`;
                }
                writeToOutput(
                    `\u001b[37m[\u001b[33m${dateString}\u001b[37m] \u001b[32m${message.username}\u001b[32m: \u001b[37m${message.message}`,
                );
            });
        },

        fibonacci: (command: string[]) => {
            if (command.length === 1) {
                writeToOutput("Usage: fibonacci &lt;number&gt");
                return;
            }

            const n = parseInt(command[1]);
            if (isNaN(n)) {
                writeToOutput("Invalid number");
                return;
            }

            const result = fibonacci(n);
            addToOutputWrapped(result);
        },

        ping: async () => {
            const startTime = performance.now();
            const response = await fetch("/api/ping");
            const endTime = performance.now();

            if (response.status !== 200) {
                writeToOutput("Failed to ping server", await response.text());
                return;
            }

            writeToOutput(`Pong! Response time: ${endTime - startTime}ms`);
        },

        badapple: async () => {
            badAppleLine = getOutputLength();
            writeToOutput("Bad Apple not loaded. Please wait...");
            const response = await fetch("/badapple.json");
            badappleFrames = await response.json();

            var i = 0;
            badAppleInterval = setInterval(() => {
                if (badappleFrames) {
                    setLineInOutput(badappleFrames["frame_" + i], badAppleLine);
                }
                if (i >= 2190) {
                    if (badAppleInterval) clearInterval(badAppleInterval);
                }
                i++;
            }, 1000 / 10);
        },

        starwars: async () => {
            badAppleLine = getOutputLength();
            writeToOutput("Please wait...");
            const response = await fetch("/starwars.json");
            badappleFrames = await response.json();

            var i = 0;
            var thisFrameShown = 0;
            badAppleInterval = setInterval(() => {
                if (badappleFrames) {
                    const firstNewline =
                        badappleFrames[i.toString()].indexOf("\n");
                    const displayFor = badappleFrames[i.toString()].substring(
                        0,
                        firstNewline,
                    );
                    setLineInOutput(
                        badappleFrames[i.toString()].substring(
                            firstNewline + 1,
                        ),
                        badAppleLine,
                    );

                    if (parseInt(displayFor) < thisFrameShown + 2) {
                        i++;
                        thisFrameShown = 0;
                    } else {
                        thisFrameShown++;
                    }

                    if (i >= 3410) {
                        if (badAppleInterval) clearInterval(badAppleInterval);
                    }
                } else {
                    setLineInOutput("Failed to load Star Wars", badAppleLine);
                    if (badAppleInterval) clearInterval(badAppleInterval);
                }
            }, 67);
        },

        download: async (command: string[]) => {
            if (command.length === 1) {
                writeToOutput("Usage: download &lt;filename&gt &lt;content&gt");
                return;
            }
            const fileContent = command.slice(2).join(" ");
            const blob = new Blob([fileContent], { type: "text/plain" });
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = command[1];
            a.click();

            URL.revokeObjectURL(url);
        },

        isPrime: (command: string[]) => {
            if (command.length === 1) {
                writeToOutput("Usage: isPrime &lt;number&gt");
                return;
            }

            const n = parseInt(command[1]);
            if (isNaN(n)) {
                writeToOutput("Invalid number");
                return;
            }

            const result = isPrime(n);
            if (result) {
                writeToOutput(`\u001b[32m${n} is prime`);
            } else {
                writeToOutput(`\u001b[31m${n} is not prime`);
            }
        },

        meow: () => {
            writeToOutput("  /\\_/\\", " ( o.o )", "  > ^ <", "Meow!");
        },

        silly_cat: (command) => {
            if (command.length === 1) {
                writeToOutput("Usage: silly_cat &lt;number&gt");
                return;
            }

            const n = parseInt(command[1]);
            if (isNaN(n)) {
                writeToOutput("Invalid number");
                return;
            }

            let output = "";

            for (let i = 0; i < n; i++) {
                output +=
                    noises[Math.floor(Math.random() * noises.length)] + " ";
            }

            addToOutputWrapped(output);
        },

        to_cat_noises: (command) => {
            if (command.length === 1) {
                writeToOutput("Usage: to_cat_noises &lt;input&gt");
                return;
            }

            const input = command.slice(1).join(" ");

            addToOutputWrapped(compressDataToCatNoises(input));
        },

        from_cat_noises: (command) => {
            if (command.length === 1) {
                writeToOutput("Usage: from_cat_noises &lt;input&gt");
                return;
            }

            const input = command.slice(1).join(" ");

            addToOutputWrapped(decompressCatNoisesToData(input));
        },

        proxy: async (command) => {
            if (command.length === 1) {
                writeToOutput("Usage: proxy &lt;url&gt");
                return;
            }

            const search = command.slice(1).join(" ");
            window.location.href = `https://sh.hoosiertransfer.net/proxy?url=${encodeURIComponent(
                search,
            )}`;
        },

        unimash: () => {
            window.location.href = "/unimash";
        },

        trans: makeTransFlagColors,

        man: manual,
        woman: manual,
    };

    function makeTransFlagColors() {
        for (let i = 0; i < terminalOutput.length; i++) {
            const imod5 = i % 5;
            if (imod5 == 0 || imod5 == 4) {
                terminalOutput[i] =
                    '<span style="color: #5BCEFA !important">' +
                    terminalOutput[i] +
                    "</span>";
            } else if (imod5 == 1 || imod5 == 3) {
                terminalOutput[i] =
                    '<span style="color: #F5A9B8 !important">' +
                    terminalOutput[i] +
                    "</span>";
            } else if (imod5 == 2) {
                terminalOutput[i] =
                    '<span style="color: #FFFFFF !important">' +
                    terminalOutput[i] +
                    "</span>";
            }
        }

        transMode = true;
    }

    function manual(command: string[]) {
        if (command.length === 1) {
            writeToOutput("Usage: man &ltcommand&gt");
            return;
        }

        switch (command[1]) {
            case "ls":
                writeToOutput(
                    "\u001b[37mls - list directory contents",
                    "\u001b[37mUsage: ls",
                );
                break;
            case "cat":
                writeToOutput(
                    "\u001b[37mcat - print file on the standard output",
                    "\u001b[37mUsage: cat &lt;filename&gt",
                );
                break;
            case "conway":
                writeToOutput(
                    "\u001b[37mconway - run Conway's Game of Life",
                    "\u001b[37mUsage: conway",
                );
                break;
            case "cowsay":
                writeToOutput(
                    "\u001b[37mcowsay - generate an ASCII cow",
                    "\u001b[37mUsage: cowsay &lt;message&gt",
                );
                break;
            case "fastfetch":
            case "neofetch":
                writeToOutput(
                    "\u001b[37mneofetch - print system information",
                    "\u001b[37mUsage: neofetch",
                );
                break;
            case "ant":
                writeToOutput(
                    "\u001b[37mant - run Langton's Ant",
                    "\u001b[37mUsage: ant &lt;rule&gt",
                );
                break;
            case "setspeed":
                writeToOutput(
                    "\u001b[37msetspeed - set the delay between frrames in the simulation",
                    "\u001b[37mUsage: setspeed &lt;speed&gt",
                );
                break;
            case "colortest":
                writeToOutput(
                    "\u001b[37mcolortest - generate a list of colors",
                    "\u001b[37mUsage: colortest &lt;number&gt",
                );
                break;
            case "help":
                writeToOutput(
                    "\u001b[37mhelp - display available commands",
                    "\u001b[37mUsage: help",
                );
                break;
            case "clear":
                writeToOutput(
                    "\u001b[37mclear - clear the terminal",
                    "\u001b[37mUsage: clear",
                );
                break;
            case "whoami":
                writeToOutput(
                    "\u001b[37mwhoami - print information about me",
                    "\u001b[37mUsage: whoami",
                );
                break;
            case "echo":
                writeToOutput(
                    "\u001b[37mecho - print arguments to the terminal",
                    "\u001b[37mUsage: echo &lt;message&gt",
                );
                break;
            case "motd":
                writeToOutput(
                    "\u001b[37mmotd - print the message of the day",
                    "\u001b[37mUsage: motd",
                );
                break;

            case "canvastest":
                writeToOutput(
                    "\u001b[37mcanvastest - test canvas rendering",
                    "\u001b[37mUsage: canvastest",
                );
                break;

            case "export":
                writeToOutput(
                    "\u001b[37mexport - set an environment variable",
                    "\u001b[37mUsage: export &lt;variable&gt=&lt;value&gt",
                );
                break;

            case "turn_me_into_a_girl":
                writeToOutput(
                    "\u001b[37mturn_me_into_a_girl - Turns you into a cute and silly girl :3",
                    "\u001b[37mUsage: turn_me_into_a_girl",
                );
                break;

            case "trans":
                writeToOutput(
                    "\u001b[37mtrans - Makes your terminal trans flag colors",
                    "\u001b[37mUsage: trans",
                );
                break;

            case "notification":
                writeToOutput(
                    "\u001b[37mnotification - send a notification",
                    "\u001b[37mUsage: notification &lt;message&gt",
                );
                break;

            case "register":
                writeToOutput(
                    "\u001b[37mregister - register a new account",
                    "\u001b[37mUsage: register &lt;username&gt &lt;password&gt",
                );
                break;

            case "login":
                writeToOutput(
                    "\u001b[37mlogin - log in to an existing account",
                    "\u001b[37mUsage: login &lt;username&gt &lt;password&gt",
                );
                break;

            case "logout":
                writeToOutput(
                    "\u001b[37mlogout - log out of the current account",
                    "\u001b[37mUsage: logout",
                );
                break;

            case "updateMotd":
                writeToOutput(
                    "\u001b[37mupdateMotd - update the message of the day",
                    "\u001b[37mUsage: updateMotd &lt;message&gt",
                );
                break;

            case "updateuserdata":
                writeToOutput(
                    "\u001b[37mupdateuserdata - update user data",
                    "\u001b[37mUsage: updateuserdata &lt;username&gt &lt;column&gt &lt;value&gt",
                );
                break;

            case "getuserdata":
                writeToOutput(
                    "\u001b[37mgetuserdata - get user data",
                    "\u001b[37mUsage: getuserdata &lt;username&gt",
                );
                break;

            case "notify":
                writeToOutput(
                    "\u001b[37mnotify - send a notification to all users",
                    "\u001b[37mUsage: notify &lt;message&gt",
                );
                break;

            case "subscribeToPush":
                writeToOutput(
                    "\u001b[37msubscribeToPush - subscribe to push notifications",
                    "\u001b[37mUsage: subscribeToPush",
                );
                break;

            case "primordia":
                writeToOutput(
                    "\u001b[37mprimordia - run Primordia",
                    "\u001b[37mUsage: primordia",
                );
                break;

            case "gridsize":
                writeToOutput(
                    "\u001b[37mgridsize - set the size of the grid",
                    "\u001b[37mUsage: gridsize &lt;x&gt &lt;y&gt",
                );
                break;

            case "convtest":
                writeToOutput(
                    "\u001b[37mconvtest - test convolution",
                    "\u001b[37mUsage: convtest",
                );
                break;

            case "postMessage":
                writeToOutput(
                    "\u001b[37mpostMessage - post a message to the message board",
                    "\u001b[37mUsage: postMessage &lt;message&gt",
                );
                break;

            case "messageBoard":
                writeToOutput(
                    "\u001b[37mmessageBoard - get messages from the message board",
                    "\u001b[37mUsage: messageBoard",
                );
                break;

            case "fibonacci":
                writeToOutput(
                    "\u001b[37mfibonacci - calculate the nth Fibonacci number really fast",
                    "\u001b[37mUsage: fibonacci &lt;number&gt",
                );
                break;

            case "cd":
                writeToOutput(
                    "\u001b[37mcd - change the current directory",
                    "\u001b[37mUsage: cd &lt;directory&gt",
                );
                break;

            case "ping":
                writeToOutput(
                    "\u001b[37mping - ping the server",
                    "\u001b[37mUsage: ping",
                );
                break;

            case "badapple":
                writeToOutput(
                    "\u001b[37mbadapple - play the Bad Apple video",
                    "\u001b[37mUsage: badapple",
                );
                break;

            case "starwars":
                writeToOutput(
                    "\u001b[37mstarwars - play Star Wars ",
                    "\u001b[37mUsage: starwars",
                );
                break;

            case "download":
                writeToOutput(
                    "\u001b[37mdownload - download to a file",
                    "\u001b[37mUsage: download &lt;filename&gt &lt;content&gt",
                );
                break;

            case "isPrime":
                writeToOutput(
                    "\u001b[37misPrime - check if a number is prime",
                    "\u001b[37mUsage: isPrime &lt;number&gt",
                );
                break;

            case "view_image":
                writeToOutput(
                    "\u001b[37mview_image - view an image",
                    "\u001b[37mUsage: view_image &lt;filename&gt",
                );
                break;

            case "meow":
                writeToOutput(
                    "\u001b[37mmeow - display a cute cat",
                    "\u001b[37mUsage: meow",
                );
                break;

            case "silly_cat":
                writeToOutput(
                    "\u001b[37msilly_cat - cat noises",
                    "\u001b[37mUsage: silly_cat &lt;number&gt",
                );
                break;

            case "to_cat_noises":
                writeToOutput(
                    "\u001b[37mto_cat_noises - convert text to cat noises",
                    "\u001b[37mUsage: to_cat_noises &lt;input&gt",
                );
                break;

            case "from_cat_noises":
                writeToOutput(
                    "\u001b[37mfrom_cat_noises - convert cat noises to text",
                    "\u001b[37mUsage: from_cat_noises &lt;input&gt",
                );
                break;

            case "proxy":
                writeToOutput(
                    "\u001b[37mproxy - proxy a website",
                    "\u001b[37mUsage: proxy &lt;url&gt",
                );
                break;

            case "unimash":
                writeToOutput(
                    "\u001b[37munimash - play unicode smash or pass",
                    "\u001b[37mUsage: unimash",
                );
                break;

            default:
                writeToOutput("\u001b[31mNo manual entry for " + command[1]);
        }
    }

    async function neofetch(command: string[]) {
        let output: string[] = [];
        if (platform.toLowerCase().includes("linux")) {
            output = [
                "\u001b[96m                  -`                     ",
                "\u001b[96m                 .o+`                    ",
                "\u001b[96m                `ooo/                    ",
                "\u001b[96m               `+oooo:                   ",
                "\u001b[96m              `+oooooo:                  ",
                "\u001b[96m              -+oooooo+:                 ",
                "\u001b[96m            `/:-:++oooo+:                ",
                "\u001b[96m           `/++++/+++++++:               ",
                "\u001b[96m          `/++++++++++++++:              ",
                "\u001b[96m         `/+++ooooooooooooo/`            ",
                "\u001b[96m        ./ooosssso++osssssso+`           ",
                "\u001b[96m       .oossssso-````/ossssss+`          ",
                "\u001b[96m      -osssssso.      :ssssssso.         ",
                "\u001b[96m     :osssssss/        osssso+++.        ",
                "\u001b[96m    /ossssssss/        +ssssooo/-        ",
                "\u001b[96m  `/ossssso+/:-        -:/+osssso+-      ",
                "\u001b[96m `+sso+:-`                 `.-/+oso:     ",
                "\u001b[96m`++:.                           `-/+/    ",
                "\u001b[96m.`                                 `/    ",
            ];
        } else if (
            platform.toLowerCase().includes("win") ||
            platform.toLowerCase().includes("windows")
        ) {
            output = [
                "\u001b[31m        ,.=:!!t3Z3z.,                   \u001b[96m",
                "\u001b[31m       :tt:::tt333EE3                   \u001b[96m",
                "\u001b[31m       Et:::ztt33EEEL\u001b[32m @Ee.,      ..,    \u001b[96m",
                "\u001b[31m      ;tt:::tt333EE7\u001b[32m ;EEEEEEttttt33#    \u001b[96m",
                "\u001b[31m     :Et:::zt333EEQ.\u001b[32m $EEEEEttttt33QL    \u001b[96m",
                "\u001b[31m     it::::tt333EEF\u001b[32m @EEEEEEttttt33F     \u001b[96m",
                '\u001b[31m    ;3=*^```"*4EEV\u001b[32m :EEEEEEttttt33@.     \u001b[96m',
                "\u001b[34m    ,.=::::!t=., \u001b[31m`\u001b[32m @EEEEEEtttz33QF      \u001b[96m",
                '\u001b[34m   ;::::::::zt33)\u001b[32m   "4EEEtttji3P*       \u001b[96m',
                "\u001b[34m  :t::::::::tt33.\u001b[33m:Z3z..\u001b[32m  ``\u001b[33m ,..g.       \u001b[96m",
                "\u001b[34m  i::::::::zt33F\u001b[33m AEEEtttt::::ztF        \u001b[96m",
                "\u001b[34m ;:::::::::t33V\u001b[33m ;EEEttttt::::t3         \u001b[96m",
                "\u001b[34m E::::::::zt33L\u001b[33m @EEEtttt::::z3F         \u001b[96m",
                '\u001b[34m{3=*^```"*4E3)\u001b[33m ;EEEtttt:::::tZ`         \u001b[96m',
                "\u001b[34m             `\u001b[33m :EEEEtttt::::z7          ",
                '\u001b[33m                 "VEzjt:;;z>*`          ',
            ];
        } else if (
            platform.toLowerCase().includes("mac") ||
            platform.toLowerCase().includes("iPhone") ||
            platform.toLowerCase().includes("iPad")
        ) {
            output = [
                `\u001b[37m                     ..'            \u001b[96m`,
                `\u001b[37m                 ,xNMM.             \u001b[96m`,
                `\u001b[37m               .OMMMMo              \u001b[96m`,
                `\u001b[37m               lMM"                 \u001b[96m`,
                `\u001b[37m     .;loddo:.  .olloddol;.         \u001b[96m`,
                `\u001b[37m   cKMMMMMMMMMMNWMMMMMMMMMM0:       \u001b[96m`,
                `\u001b[37m .KMMMMMMMMMMMMMMMMMMMMMMMWd.       \u001b[96m`,
                `\u001b[37m XMMMMMMMMMMMMMMMMMMMMMMMX.         \u001b[96m`,
                `\u001b[37m;MMMMMMMMMMMMMMMMMMMMMMMM:          \u001b[96m`,
                `\u001b[37m:MMMMMMMMMMMMMMMMMMMMMMMM:          \u001b[96m`,
                `\u001b[37m.MMMMMMMMMMMMMMMMMMMMMMMMX.         \u001b[96m`,
                `\u001b[37m kMMMMMMMMMMMMMMMMMMMMMMMMWd.       \u001b[96m`,
                `\u001b[37m 'XMMMMMMMMMMMMMMMMMMMMMMMMMMk      \u001b[96m`,
                `\u001b[37m  'XMMMMMMMMMMMMMMMMMMMMMMMMK.      \u001b[96m`,
                `\u001b[37m    kMMMMMMMMMMMMMMMMMMMMMMd        \u001b[96m`,
                `\u001b[37m     ;KMMMMMMMWXXWMMMMMMMk.         \u001b[96m`,
                `\u001b[37m       "cooc*"    "*coo'"           \u001b[96m`,
            ];
        }

        if (navigator.userAgent.includes("CrOS")) {
            output = [
                "\u001b[32m            .,:loool:,.                \u001b[96m",
                "\u001b[32m        .,coooooooooooooc,.            \u001b[96m",
                "\u001b[32m    .,lllllllllllllllllllll,.          \u001b[96m",
                "\u001b[32m    ;ccccccccccccccccccccccccc;        \u001b[96m",
                "\u001b[31m  '\u001b[32mccccccccccccccccccccccccccccc.      \u001b[96m",
                "\u001b[31m ,oo\u001b[32mc::::::::okO\u001b[37m000\u001b[33m0OOkkkkkkkkkkk:     \u001b[96m",
                "\u001b[31m.ooool\u001b[32m;;;;:x\u001b[37mK0\u001b[34mkxxxxxk\u001b[37m0X\u001b[33mK0000000000.    \u001b[96m",
                "\u001b[31m:oooool\u001b[32m;,;O\u001b[37mK\u001b[34mddddddddddd\u001b[37mKX\u001b[33m000000000d    \u001b[96m",
                "\u001b[31mlllllool\u001b[32m;l\u001b[37mN\u001b[34mdllllllllllld\u001b[37mN\u001b[33mK000000000    \u001b[96m",
                "\u001b[31mlllllllll\u001b[32m\u001b[32mo\u001b[37mM\u001b[34mdccccccccccco\u001b[37mW\u001b[33mK000000000    \u001b[96m",
                "\u001b[31m;cllllllllX\u001b[37mX\u001b[34mc:::::::::c\u001b[37m0X\u001b[33m000000000d    \u001b[96m",
                "\u001b[31m.ccccllllllO\u001b[37mNk\u001b[34mc;,,,;cx\u001b[37mKK\u001b[33m0000000000.    \u001b[96m",
                "\u001b[31m .cccccclllllxOO\u001b[37mOOO\u001b[31mOkx\u001b[33mO0000000000;     \u001b[96m",
                "\u001b[31m  .:ccccccccllllllllo\u001b[33mO0000000OOO,      \u001b[96m",
                "\u001b[31m    ,:ccccccccclllcd\u001b[33m0000OOOOOOl.       \u001b[96m",
                "\u001b[31m      '::ccccccccc\u001b[33mdOOOOOOOkx:.         \u001b[96m",
                "\u001b[31m        ..,::cccc\u001b[33mxOOOkkko;.            \u001b[96m",
                "\u001b[31m            ..,:\u001b[33mdOkxl:.                \u001b[96m",
            ];
        }

        const stats = [
            "hoosiertransfer\u001b[37m@\u001b[96mnet",
            "\u001b[37m-------------------",
            "OS\u001b[37m: " + platform,
            "Host\u001b[37m: archpcmain",
            "Uptime\u001b[37m: " +
                Math.floor(
                    (new Date().getTime() - pageLoadTime.getTime()) / 1000,
                ) +
                " seconds",
            "Packages\u001b[37m: " + Object.keys(commands).length,
            "Shell\u001b[37m: web 1.0",
            "Display\u001b[37m: " +
                displayWidth +
                "x" +
                displayHeight +
                " @ " +
                refreshRate +
                "Hz",
            "Terminal Font\u001b[37m: Jetbrains Mono",
            "User Agent\u001b[37m: " + navigator.userAgent,
            "CPU\u001b[37m: " + navigator.hardwareConcurrency + " thread(s)",
            "GPU Vendor\u001b[37m: " + gpuVendor,
            "Locale\u001b[37m: " +
                Intl.DateTimeFormat().resolvedOptions().locale,
        ];

        stats.push("");

        stats.push(
            "\u001b[30m███\u001b[31m███\u001b[32m███\u001b[33m███\u001b[34m███\u001b[37m███\u001b[36m███\u001b[37m███",
        );

        stats.push(
            "\u001b[90m███\u001b[91m███\u001b[92m███\u001b[93m███\u001b[94m███\u001b[95m███\u001b[96m███\u001b[97m███",
        );

        for (let i = 0; i < stats.length; i++) {
            output[i] += stats[i];
        }

        writeToOutput(...output);
    }

    function processAnsiColors(text: string) {
        const regex = /\u001b\[(\d+)m(.*?)(?=\u001b|\n|$)/g;
        let result = text;
        let matches = [...text.matchAll(regex)];

        if (matches.length === 0) return text;

        let processed = "";
        let lastIndex = 0;

        for (let match of matches) {
            const [fullMatch, code, content] = match;
            const index = match.index;

            processed += text.substring(lastIndex, index);
            if (transMode) {
                processed += content;
            } else if (COLORS[code]) {
                processed += `<span style="color: ${COLORS[code]}">${content}</span>`;
            } else if (BG_COLORS[code]) {
                processed += `<span style="background-color: ${BG_COLORS[code]}">${content}</span>`;
            } else if (code === "1337") {
                let rainbowText = "";
                for (let i = 0; i < content.length; i++) {
                    let hue = (i / content.length) * 360;
                    rainbowText += `<span style="color: hsl(${hue}, 100%, 50%)">${content[i]}</span>`;
                }

                processed += rainbowText;
            } else if (code === "0") {
                processed += content;
            } else {
                processed += content;
            }

            lastIndex = index + fullMatch.length;
        }

        processed += text.substring(lastIndex);

        return processed;
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            processCommand(inputValue);
            commandHistory.push(inputValue);
            historyIndex = commandHistory.length;
            inputValue = "";
            cursorPosition = 0;
        } else if (event.key === "ArrowUp") {
            if (historyIndex > 0) {
                historyIndex--;
                inputValue = commandHistory[historyIndex];
                cursorPosition = inputValue.length;
            }
        } else if (event.key === "ArrowDown") {
            if (historyIndex < commandHistory.length - 1) {
                historyIndex++;
                inputValue = commandHistory[historyIndex];
                cursorPosition = inputValue.length;
            } else {
                historyIndex = commandHistory.length;
                inputValue = "";
                cursorPosition = 0;
            }
        } else if (event.key === "ArrowLeft") {
            if (cursorPosition > 0) {
                cursorPosition--;
            }
        } else if (event.key === "ArrowRight") {
            if (cursorPosition < inputValue.length) {
                cursorPosition++;
            }
        } else if (event.key === "v" && event.ctrlKey) {
            navigator.clipboard.readText().then((text) => {
                inputValue =
                    inputValue.slice(0, cursorPosition) +
                    text +
                    inputValue.slice(cursorPosition);
                cursorPosition += text.length;
            });
        } else if (event.key === "c" && timerCountingDown && !event.ctrlKey) {
            timerCountingDown = false;
        } else if (event.key === "c" && event.ctrlKey) {
            return;
        } else if (event.key.length === 1) {
            inputValue =
                inputValue.slice(0, cursorPosition) +
                event.key +
                inputValue.slice(cursorPosition);
            cursorPosition++;
        } else if (event.key === "Backspace") {
            if (cursorPosition > 0) {
                inputValue =
                    inputValue.slice(0, cursorPosition - 1) +
                    inputValue.slice(cursorPosition);
                cursorPosition--;
            }
        }

        event.preventDefault();
    }

    function splitByUnquotedPipe(command: string) {
        const regex = /(?:[^\s|"]+|"[^"]*")+|[|]/g;
        let segments = [];
        let currentSegment = "";

        let matches = command.match(regex);
        if (matches) {
            matches.forEach((match) => {
                if (match === "|") {
                    segments.push(currentSegment.trim());
                    currentSegment = "";
                } else {
                    currentSegment += match + " ";
                }
            });
        }
        if (currentSegment) segments.push(currentSegment.trim());
        return segments;
    }

    function processCommand(command: string) {
        if (commandInputCallback) {
            commandInputCallback(command);
            commandInputCallback = null;
            return;
        }
        writeToOutput(`${currentDirectory} $ ${command}`);

        const commandSegments = splitByUnquotedPipe(command);

        if (commandSegments.length > 2) {
            writeToOutput(`\u001b[31mOnly one pipe is supported\u001b[0m`);
            return;
        }

        if (commandSegments.length > 1) {
            activeOutput = "pipe";
        }

        const args =
            commandSegments[0]
                .match(/(?:[^\s"]+|"[^"]*")+/g)
                ?.map((arg) => arg.replace(/(^"|"$)/g, "")) || [];

        args.forEach((arg, i) => {
            if (arg.includes(" ")) {
                args[i] = `"${arg}"`;
            }
        });

        if (args[0] in commands) {
            commands[args[0]](args);
        } else if (args[0] === "") {
            writeToOutput("");
        } else {
            writeToOutput(`\u001b[31m${args[0]}: command not found\u001b[0m`);
        }

        if (commandSegments.length > 1) {
            activeOutput = "terminal";
            let pipeArgs =
                commandSegments[1]
                    .match(/(?:[^\s"]+|"[^"]*")+/g)
                    ?.map((arg) => arg.replace(/(^"|"$)/g, "")) || [];

            pipeArgs = [...pipeArgs, ...pipeOutput];

            if (pipeArgs[0] in commands) {
                commands[pipeArgs[0]](pipeArgs);
            } else {
                writeToOutput(
                    `\u001b[31m${pipeArgs[0]}: command not found\u001b[0m`,
                );
            }
        }

        if (transMode) {
            makeTransFlagColors();
        }
    }

    afterUpdate(() => {
        scrollToBottom();
    });

    onMount(() => {
        (async () => {
            // socket = io({ path: "/wss/" });

            const response = await fetch("/api/visitorCount");
            const data = await response.json();
            visitorCount = data.count;

            const lastfmResponse = await fetch("/api/getLastFmStatus");
            const lastfmData = await lastfmResponse.json();
            let lastfmString: string;
            if (lastfmResponse.status === 500) {
                lastfmString = `\u001b[31mFailed to get last.fm status: ${lastfmData.error}`;
            } else if (lastfmResponse.status !== 200) {
                lastfmString = `\u001b[31mFailed to get last.fm status`;
            } else {
                if (lastfmData.currentlyPlaying) {
                    lastfmString = `\u001b[37mCurrently listening to: ${lastfmData.lastArtist} - ${lastfmData.lastTrack}`;
                } else {
                    lastfmString = `\u001b[37mLast listened to: ${lastfmData.lastArtist} - ${lastfmData.lastTrack}`;
                }
            }
            motd[2] = lastfmString;
            motd[3] = motd[3].replace("{visitors}", visitorCount.toString());

            writeToOutput(...motd);
            window.addEventListener("keydown", handleKeydown);
            getMotd().then((message) => {
                setLineInOutput(message, 1);
                motd[1] = message;
            });

            displayHeight = window.screen.availHeight;
            displayWidth = window.screen.availWidth;
            platform = window.navigator.platform;

            const canvas1 = document.createElement("canvas");
            const gl =
                canvas1.getContext("webgl") ||
                canvas1.getContext("experimental-webgl");
            if (gl) {
                const debugInfo = (gl as WebGLRenderingContext).getExtension(
                    "WEBGL_debug_renderer_info",
                );
                if (debugInfo) {
                    gpuVendor = (gl as WebGLRenderingContext).getParameter(
                        debugInfo.UNMASKED_VENDOR_WEBGL,
                    );
                }
            }
            canvas1.remove();

            let lastTimestamp = 0;
            let frameCount = 0;
            let totalTime = 0;

            function estimateRefreshRate(timestamp: number) {
                if (lastTimestamp > 0) {
                    const delta = timestamp - lastTimestamp;
                    frameCount++;
                    totalTime += delta;
                }

                lastTimestamp = timestamp;

                if (frameCount >= 60) {
                    const averageFrameTime = totalTime / frameCount;
                    refreshRate = Math.round(1000 / averageFrameTime);
                    return;
                }

                window.requestAnimationFrame(estimateRefreshRate);
            }

            window.requestAnimationFrame(estimateRefreshRate);

            terminalWidth = Math.floor(displayWidth / 10);

            return () => {
                window.removeEventListener("keydown", handleKeydown);
            };
        })();
    });
</script>

<div class="terminal" bind:this={terminalElement}>
    {#each terminalOutput as line, i}
        {#if line.type === "canvas"}
            <canvas width="300" height="300" bind:this={gridCanvases[i]}
            ></canvas>
        {:else}
            <div class="terminal-line">{@html processAnsiColors(line)}</div>
        {/if}
    {/each}
    <div class="input-line">
        <span class="prompt">{currentDirectory} $</span>
        <span class="input-text">
            {#each inputValue.split("") as char, i}
                {#if i === cursorPosition}
                    <span class="cursor">█</span>{@html char}
                {:else}
                    {@html char}
                {/if}
            {/each}
            {#if cursorPosition === inputValue.length}
                <span class="cursor end">█</span>
            {/if}
        </span>
    </div>
</div>

<style>
    .terminal {
        background-color: #000;
        color: #23d18b;
        padding: 10px;
        height: calc(100vh - 20px);
        overflow-y: auto;
    }

    .terminal::-webkit-scrollbar {
        display: none;
    }

    .terminal-line {
        word-break: break-word;
        white-space: pre;
    }

    .input-line {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
    }

    .prompt {
        margin-right: 5px;
    }

    .input-text {
        white-space: pre;

        min-width: 1px;
    }

    .cursor {
        -webkit-animation: blink 1s step-end infinite;
        animation: blink 1s step-end infinite;
    }

    .cursor.end {
        margin-left: -1ch;
    }

    @-webkit-keyframes blink {
        50% {
            opacity: 0;
        }
    }

    @keyframes blink {
        50% {
            opacity: 0;
        }
    }
</style>
