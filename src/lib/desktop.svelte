<script module lang="ts">
    declare class V86 {
        constructor(options: any);
    }
</script>

<script lang="ts">
    import { onMount, tick } from "svelte";
    import { goto } from "$app/navigation";
    import { io } from "socket.io-client";

    import { isMobile } from "$lib/mobile";

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
    import type { Socket } from "socket.io";
    import nacl from "tweetnacl";
    import naclUtil from "tweetnacl-util";

    import {
        estrogenStore,
        spiroStore,
        bicaStore,
        cyrpoStore,
        progesteroneStore,
        estrogenGelStore,
        estrogenPillsStore,
        estrogenPatchesStore,
        estrogenInjectionsStore,
    } from "$lib/stores";
    import { run } from "svelte/legacy";

    let mobileInputContent = "";
    let doNotTrack = true;

    const keyPair = nacl.box.keyPair();
    let sharedKey: Uint8Array | null = null;
    let isSshMode = false;

    let mobile = $state(false);

    const noises = ["meow", "nya", "mrrp", "mew", "purr", "mrow", "mewp"];
    let mobileInput: HTMLInputElement;
    let keydownCallback: ((event: KeyboardEvent) => boolean) | null = null;

    let hiddenInput = "";
    let hiddenInputCallback: ((input: string) => void) | null = null;

    const TEST_FILE_SIZE = 1000000;
    const UPLOAD_TEST_SIZE = 10000000;

    let estrogenClickerGameActive: boolean = $state(false);

    let fileInput: HTMLInputElement;

    let socket: ReturnType<typeof io>;

    let badappleFrames: Record<string, string> | null = null;

    let visitorCount = 0;

    let refreshRate = 0;
    let displayHeight = 0;
    let displayWidth = 0;
    let platform = "web";
    let gpuVendor = "";
    let terminalWidth = 80;
    let terminalHeight = 24;

    let pageLoadTime = new Date();

    let v86Loaded = false;
    let v86Focused = false;
    let v86Running = $state(false);

    let emulator: any;

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

    const COLORS2: Record<number, string> = {
        0: "#000000",
        1: "#cd3131",
        2: "#0dbc79",
        3: "#e5e510",
        4: "#2472c8",
        5: "#bc3fbc",
        6: "#11a8cd",
        7: "#e5e5e5",
        8: "#666666",
        9: "#f14c4c",
        10: "#23d18b",
        11: "#f5f543",
        12: "#3b8eea",
        13: "#d670d6",
        14: "#29b8db",
        15: "#ffffff",
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

    function makeTextWindow(title: string, content: string[], width: number): string {
        // make a window like the thingy in the motd
        let window = [];
        let windowWidth = Math.max(title.length, width);
        window.push("┌" + "─".repeat(windowWidth) + "┐");
        window.push("│" + title.padEnd(windowWidth) + "│");
        window.push("├" + "─".repeat(windowWidth) + "┤");
        for (let line of content) {
            window.push("│" + line.padEnd(windowWidth) + "│");
        }
        window.push("└" + "─".repeat(windowWidth) + "┘");
        return window.join("<br>");
    }

    let motd = [
        "Hello there! Welcome to my website.",
        "\u001b[95mFetching message of the day...",
        "\u001b[95mFetching last.fm status...",
        "\u001b[95mFetching visitor count...\u001b[0m Visitors so far!",
        makeTextWindow("Socials", [
            "Github: 1vers1on",
            "Discord: 1vers1on",
            "Email: invers1on1@outlook.com"
        ], 30),
        "If you want to find out more about me, type <i>whoami</i>, or type <i>help</i> to see a list of available commands.",
        "<br>",
        isToday("08-07") ? "It's my birthday today!<br><br>" : "",
    ];

    let pipeOutput: string[] = [];

    // let terminalOutput: any[] = [];
    let terminalOutput: string[] = $state([]);
    let inputValue = $state("");
    let cursorPosition = $state(0);
    let terminalElement: HTMLElement;
    let currentDirectory = $state("~");
    let commandHistory: string[] = [];
    let historyIndex = -1;

    let grid: string[][] = [];
    let gridState: number[][] = [];
    let gridLocation = 0;
    let gridColors: string[] = [];

    let gridCanvases: HTMLCanvasElement[] = $state([]);
    let activeGridCanvas: HTMLCanvasElement;
    let gridCanvasContext: CanvasRenderingContext2D;

    let onlyUpdateChangedCells = false;
    let changedCells: number[][] = [];

    let intervalProcess: ReturnType<typeof setInterval> | null = null;
    let badAppleInterval: ReturnType<typeof setInterval> | null = null;

    let estrogenInterval: ReturnType<typeof setInterval> | null = null;

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

    let mousePosX = 0;
    let mousePosY = 0;

    let pendingInvite = false;

    let cmatrixInterval: ReturnType<typeof setInterval> | null = null;
    let cmatrixActive: boolean = false;

    // minesweeper

    interface MinesweeperCell {
        isMine: boolean;
        isFlagged: boolean;
        isRevealed: boolean;
        adjacentMines: number;
    }

    let minesweeperGrid: MinesweeperCell[][] = $state([]);

    const minesweeperColors: Record<number, string> = {
        1: "\u001b[34m",
        2: "\u001b[32m",
        3: "\u001b[31m",
        4: "\u001b[35m",
        5: "\u001b[36m",
        6: "\u001b[33m",
        7: "\u001b[37m",
        8: "\u001b[90m",
    };

    let minesweeperGameActive = false;

    let minesweeperFirstClick = true;

    let mineSweeperYsize = 9;
    let mineSweeperXsize = 9;
    let mineSweeperMines = 10;

    let blackjackActive = false;
    let inBlackjackRoom = false;

    function get8BitAnsiColor(color: number): string {
        if (color < 16) {
            return COLORS2[color];
        } else if (color < 232) {
            const r = Math.floor((color - 16) / 36);
            const g = Math.floor(((color - 16) % 36) / 6);
            const b = (color - 16) % 6;
            return `rgb(${r * 51}, ${g * 51}, ${b * 51})`;
        } else {
            const shade = (color - 232) * 10 + 8;
            return `rgb(${shade}, ${shade}, ${shade})`;
        }
    }

    function getRandomChar() {
        return String.fromCharCode(Math.floor(Math.random() * 93) + 33);
    }

    function initMinesweeperGrid() {
        minesweeperGrid = [];
        for (let i = 0; i < mineSweeperYsize; i++) {
            minesweeperGrid.push([]);
            for (let j = 0; j < mineSweeperXsize; j++) {
                minesweeperGrid[i].push({
                    isMine: false,
                    isFlagged: false,
                    isRevealed: false,
                    adjacentMines: 0,
                });
            }
        }

        placeMinesweeperMines(mineSweeperMines);
        calculateAdjacentMines();

        minesweeperGameActive = true;
    }

    function placeMinesweeperMines(mines: number) {
        let minesPlaced = 0;
        while (minesPlaced < mines) {
            let x = Math.floor(Math.random() * mineSweeperYsize);
            let y = Math.floor(Math.random() * mineSweeperXsize);
            if (!minesweeperGrid[x][y].isMine) {
                minesweeperGrid[x][y].isMine = true;
                minesPlaced++;
            }
        }
    }

    function calculateAdjacentMines() {
        for (let i = 0; i < mineSweeperYsize; i++) {
            for (let j = 0; j < mineSweeperXsize; j++) {
                if (minesweeperGrid[i][j].isMine) {
                    continue;
                }
                let adjacentMines = 0;
                for (let x = -1; x <= 1; x++) {
                    for (let y = -1; y <= 1; y++) {
                        if (x === 0 && y === 0) {
                            continue;
                        }
                        let ni = i + x;
                        let nj = j + y;
                        if (
                            ni < 0 ||
                            ni >= mineSweeperYsize ||
                            nj < 0 ||
                            nj >= mineSweeperXsize
                        ) {
                            continue;
                        }
                        if (minesweeperGrid[ni][nj].isMine) {
                            adjacentMines++;
                        }
                    }
                }
                minesweeperGrid[i][j].adjacentMines = adjacentMines;
            }
        }
    }

    function getMinesweeperSymbol(x: number, y: number): string {
        if (minesweeperGrid[x][y].isFlagged) {
            return "\u001b[31mF\u001b[0m&nbsp;";
        } else if (minesweeperGrid[x][y].isRevealed) {
            if (minesweeperGrid[x][y].isMine) {
                return "\u001b[37mX\u001b[0m&nbsp;";
            } else if (minesweeperGrid[x][y].adjacentMines > 0) {
                return `${minesweeperColors[minesweeperGrid[x][y].adjacentMines]}${
                    minesweeperGrid[x][y].adjacentMines
                }\u001b[0m&nbsp;`;
            } else {
                return "&nbsp;&nbsp;";
            }
        } else {
            return "■&nbsp;";
        }
    }

    function rightClickMinesweeperCell(
        event: MouseEvent,
        x: number,
        y: number,
    ) {
        if (!minesweeperGameActive) {
            return;
        }

        event.preventDefault();
        if (!minesweeperGameActive) {
            return;
        }
        if (minesweeperGrid[x][y].isRevealed) {
            return;
        }
        minesweeperGrid[x][y].isFlagged = !minesweeperGrid[x][y].isFlagged;
    }

    function clickMinesweeperCell(x: number, y: number) {
        if (!minesweeperGameActive) {
            return;
        }

        if (minesweeperFirstClick) {
            while (
                minesweeperGrid[x][y].isMine ||
                minesweeperGrid[x][y].adjacentMines > 0
            ) {
                initMinesweeperGrid();
            }
            minesweeperFirstClick = false;
        }

        if (minesweeperGrid[x][y].isFlagged) {
            return;
        }
        if (minesweeperGrid[x][y].isMine) {
            writeToOutput("You lose!");
            for (let i = 0; i < mineSweeperYsize; i++) {
                for (let j = 0; j < mineSweeperXsize; j++) {
                    minesweeperGrid[i][j].isRevealed = true;
                    minesweeperGrid[i][j].isFlagged = false;
                }
            }
            minesweeperGameActive = false;
            return;
        }

        minesweeperGrid[x][y].isRevealed = true;

        let stack: [number, number][] = [[x, y]];

        while (stack.length > 0) {
            let cell = stack.pop();
            if (!cell) continue;
            let [i, j] = cell;
            if (minesweeperGrid[i][j].adjacentMines > 0) {
                continue;
            }
            for (let x = -1; x <= 1; x++) {
                for (let y = -1; y <= 1; y++) {
                    if (x === 0 && y === 0) {
                        continue;
                    }
                    let ni = i + x;
                    let nj = j + y;
                    if (
                        ni < 0 ||
                        ni >= mineSweeperYsize ||
                        nj < 0 ||
                        nj >= mineSweeperXsize
                    ) {
                        continue;
                    }
                    if (minesweeperGrid[ni][nj].isRevealed) {
                        continue;
                    }
                    minesweeperGrid[ni][nj].isRevealed = true;
                    if (minesweeperGrid[ni][nj].adjacentMines === 0) {
                        stack.push([ni, nj]);
                    }
                }
            }
        }

        if (
            minesweeperGrid.every((row) =>
                row.every((cell) => cell.isRevealed || cell.isMine),
            )
        ) {
            writeToOutput("You win!");
            for (let i = 0; i < mineSweeperYsize; i++) {
                for (let j = 0; j < mineSweeperXsize; j++) {
                    minesweeperGrid[i][j].isRevealed = true;
                    minesweeperGrid[i][j].isFlagged = false;
                }
            }

            minesweeperGameActive = false;
        }
    }

    // credit to adryd for the oneko vencord plugin
    let oneko: HTMLElement;

    let nekoPosX = 32;
    let nekoPosY = 32;

    let nekoFrameCount = 0;
    let nekoIdleTime = 0;
    let nekoIdleAnimation: string | null = null;
    let nekoIdleAnimationFrame = 0;
    const nekoSpeed = 10;
    const nekoSpriteSets: Record<string, number[][]> = {
        idle: [[-3, -3]],
        alert: [[-7, -3]],
        scratchSelf: [
            [-5, 0],
            [-6, 0],
            [-7, 0],
        ],
        scratchWallN: [
            [0, 0],
            [0, -1],
        ],
        scratchWallS: [
            [-7, -1],
            [-6, -2],
        ],
        scratchWallE: [
            [-2, -2],
            [-2, -3],
        ],
        scratchWallW: [
            [-4, 0],
            [-4, -1],
        ],
        tired: [[-3, -2]],
        sleeping: [
            [-2, 0],
            [-2, -1],
        ],
        N: [
            [-1, -2],
            [-1, -3],
        ],
        NE: [
            [0, -2],
            [0, -3],
        ],
        E: [
            [-3, 0],
            [-3, -1],
        ],
        SE: [
            [-5, -1],
            [-5, -2],
        ],
        S: [
            [-6, -3],
            [-7, -2],
        ],
        SW: [
            [-5, -3],
            [-6, -1],
        ],
        W: [
            [-4, -2],
            [-4, -3],
        ],
        NW: [
            [-1, 0],
            [-1, -1],
        ],
    };

    function setSprite(name: string, frame: number) {
        const sprite =
            nekoSpriteSets[name][frame % nekoSpriteSets[name].length];
        oneko.style.backgroundPosition = `${sprite[0] * 32}px ${sprite[1] * 32}px`;
    }

    function resetIdleAnimation() {
        nekoIdleAnimation = null;
        nekoIdleAnimationFrame = 0;
    }

    function idle() {
        nekoIdleTime += 1;

        if (
            nekoIdleTime > 10 &&
            Math.floor(Math.random() * 200) == 0 &&
            nekoIdleAnimation == null
        ) {
            let avalibleIdleAnimations = ["sleeping", "scratchSelf"];
            if (nekoPosX < 32) {
                avalibleIdleAnimations.push("scratchWallW");
            }
            if (nekoPosY < 32) {
                avalibleIdleAnimations.push("scratchWallN");
            }
            if (nekoPosX > window.innerWidth - 32) {
                avalibleIdleAnimations.push("scratchWallE");
            }
            if (nekoPosY > window.innerHeight - 32) {
                avalibleIdleAnimations.push("scratchWallS");
            }
            nekoIdleAnimation =
                avalibleIdleAnimations[
                    Math.floor(Math.random() * avalibleIdleAnimations.length)
                ];
        }

        switch (nekoIdleAnimation) {
            case "sleeping":
                if (nekoIdleAnimationFrame < 8) {
                    setSprite("tired", 0);
                    break;
                }
                setSprite("sleeping", Math.floor(nekoIdleAnimationFrame / 4));
                if (nekoIdleAnimationFrame > 192) {
                    resetIdleAnimation();
                }
                break;
            case "scratchWallN":
            case "scratchWallS":
            case "scratchWallE":
            case "scratchWallW":
            case "scratchSelf":
                setSprite(nekoIdleAnimation, nekoIdleAnimationFrame);
                if (nekoIdleAnimationFrame > 9) {
                    resetIdleAnimation();
                }
                break;
            default:
                setSprite("idle", 0);
                return;
        }
        nekoIdleAnimationFrame += 1;
    }

    function frame() {
        nekoFrameCount += 1;
        const diffX = nekoPosX - mousePosX;
        const diffY = nekoPosY - mousePosY;
        const distance = Math.sqrt(diffX ** 2 + diffY ** 2);

        if (distance < nekoSpeed || distance < 48) {
            idle();
            return;
        }

        nekoIdleAnimation = null;
        nekoIdleAnimationFrame = 0;

        if (nekoIdleTime > 1) {
            setSprite("alert", 0);
            // count down after being alerted before moving
            nekoIdleTime = Math.min(nekoIdleTime, 7);
            nekoIdleTime -= 1;
            return;
        }

        let direction;
        direction = diffY / distance > 0.5 ? "N" : "";
        direction += diffY / distance < -0.5 ? "S" : "";
        direction += diffX / distance > 0.5 ? "W" : "";
        direction += diffX / distance < -0.5 ? "E" : "";
        setSprite(direction, nekoFrameCount);

        nekoPosX -= (diffX / distance) * nekoSpeed;
        nekoPosY -= (diffY / distance) * nekoSpeed;

        nekoPosX = Math.min(Math.max(16, nekoPosX), window.innerWidth - 16);
        nekoPosY = Math.min(Math.max(16, nekoPosY), window.innerHeight - 16);

        oneko.style.left = `${nekoPosX - 16}px`;
        oneko.style.top = `${nekoPosY - 16}px`;
    }

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

    function writeToOutputWithoutNewline(text: string) {
        if (activeOutput === "terminal") {
            terminalOutput[terminalOutput.length - 1] += text;
        } else if (activeOutput === "pipe") {
            pipeOutput[pipeOutput.length - 1] += text;
        }
    }

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

    function getLineFromOutput(line: number): string {
        if (activeOutput === "terminal") {
            return terminalOutput[line];
        } else if (activeOutput === "pipe") {
            return pipeOutput[line];
        }

        return "";
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

    function setCharInLineInStdout(char: string, line: number, col: number) {
        // Ensure there are enough lines
        while (terminalOutput.length <= line) {
            terminalOutput.push(""); // Add empty lines if necessary
        }

        // Ensure the line has enough columns (whitespace padding)
        const lineChars = terminalOutput[line].split("");
        while (lineChars.length <= col) {
            lineChars.push(" "); // Add whitespace if necessary
        }

        // Replace the character at the specified position
        lineChars[col] = char;

        // Join the modified line and update the terminal output
        terminalOutput[line] = lineChars.join("");
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
        terminalOutput.push("cAnVas");
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

    function getKeyboardCode(event: KeyboardEvent): number {
        if (event.key === "ArrowUp") {
            return 38;
        } else if (event.key === "ArrowDown") {
            return 40;
        } else if (event.key === "ArrowLeft") {
            return 37;
        } else if (event.key === "ArrowRight") {
            return 39;
        } else if (event.key === "Enter") {
            return 13;
        } else if (event.key === "Backspace") {
            return 8;
        } else if (event.key.length === 1) {
            return event.key.charCodeAt(0);
        }
        return -1;
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

    async function measureDownloadSpeed() {
        const start = performance.now();
        try {
            const response = await fetch(
                `/api/speedtest/download?size=${TEST_FILE_SIZE}`,
            );
            const data = await response.blob();
            const end = performance.now();
            const durationInSeconds = (end - start) / 1000;
            const bitsLoaded = TEST_FILE_SIZE * 8;
            return (bitsLoaded / durationInSeconds / 1024 / 1024).toFixed(2); // Mbps
        } catch (error) {
            console.error("Download test failed:", error);
            return 0;
        }
    }

    async function measureUploadSpeed() {
        const testData = new Blob([new ArrayBuffer(UPLOAD_TEST_SIZE)]);
        const start = performance.now();
        try {
            await fetch("/api/speedtest/upload", {
                method: "POST",
                body: testData,
            });
            const end = performance.now();
            const durationInSeconds = (end - start) / 1000;
            const bitsLoaded = UPLOAD_TEST_SIZE * 8;
            return (bitsLoaded / durationInSeconds / 1024 / 1024).toFixed(2); // Mbps
        } catch (error) {
            console.error("Upload test failed:", error);
            return 0;
        }
    }

    interface Command {
        execute: (command: string[]) => void;
        manual_entries: string[];
        hidden?: boolean;
        admin_only?: boolean;
        help_subsection?: string;
        case_insensitive?: boolean;
    }

    const commands: Record<string, Command> = {
        help: {
            execute: () => {
                writeToOutput(
                    "\u001b[37mUse man to get more information about a command.",
                    "\u001b[37mAvailable commands:",
                );

                for (const command in commands) {
                    if (
                        !commands[command].hidden &&
                        !commands[command].admin_only &&
                        !commands[command].help_subsection
                    ) {
                        writeToOutput(`\u001b[37m${command}`);
                    }
                }
            },

            manual_entries: [
                "help - display available commands",
                "Usage: help",
            ],
        },

        blackjackHelp: {
            execute: () => {
                writeToOutput(
                    "\u001b[37mUse man to get more information about a command.",
                    "\u001b[37mAvailable commands:",
                );

                for (const command in commands) {
                    if (commands[command].help_subsection === "blackjack") {
                        writeToOutput(`\u001b[37m${command}`);
                    }
                }
            },

            manual_entries: [
                "blackjackHelp - display available blackjack commands",
                "Usage: blackjackHelp",
            ],
        },

        adminhelp: {
            execute: async () => {
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

                writeToOutput("\u001b[37mAvailable admin commands:");

                for (const command in commands) {
                    if (
                        !commands[command].hidden &&
                        commands[command].admin_only
                    ) {
                        writeToOutput(`\u001b[37m${command}`);
                    }
                }
            },

            manual_entries: [
                "adminhelp - display available admin commands",
                "Usage: adminhelp",
            ],
        },

        cd: {
            execute: (command: string[]) => {
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

            manual_entries: [
                "cd - change the current directory",
                "Usage: cd &lt;directory&gt;",
            ],
        },

        conway: {
            execute: () => {
                gridColors = [];
                if (intervalProcess) clearInterval(intervalProcess);
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

                if (intervalProcess) clearInterval(intervalProcess);
                intervalProcess = setInterval(
                    conwayIntervalFunc,
                    intervalSpeed,
                );
                runningInterval = conwayIntervalFunc;
            },

            manual_entries: [
                "conway - run Conway's Game of Life",
                "Usage: conway",
            ],
        },

        primordia: {
            execute: () => {
                if (intervalProcess) clearInterval(intervalProcess);
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

                if (intervalProcess) clearInterval(intervalProcess);
                intervalProcess = setInterval(
                    primordiaIntervalFunc,
                    intervalSpeed,
                );
                runningInterval = primordiaIntervalFunc;
            },

            manual_entries: ["primordia - run Primordia", "Usage: primordia"],
        },

        clear: {
            execute: () => {
                grid = [];
                gridState = [];
                if (intervalProcess) clearInterval(intervalProcess);
                if (badAppleInterval) clearInterval(badAppleInterval);
                clearOutput();

                minesweeperGameActive = false;
                minesweeperGrid = [];

                gridCanvases.forEach((canvas) => {
                    if (canvas) {
                        canvas.remove();
                    }
                });
            },

            manual_entries: ["clear - clear the terminal", "Usage: clear"],
        },

        whoami: {
            execute: () => {
                writeToOutput(
                    "<br>",
                    "I'm 1vers1on, a developer with a passion for creating things.",
                    "Some little things about me~",
                    "<br>",
                    "~ I go by she/her pronouns",
                    "~ Liminal space and backrooms enthusiast",
                    "   - I also like the dreamcore and weirdcore aesthetics",
                    `<img title="trans" style="image-rendering: pixelated;" src="button274.gif"><img title="archbtw" style="image-rendering: pixelated;" src="button195.png"><img title="firefox" style="image-rendering: pixelated;" src="button102.gif"><img title="blender" style="image-rendering: pixelated;" src="blender.gif"><img title="16bit" style="image-rendering: pixelated;" src="bestviewed16bit.gif"><a href="https://sushi.tauon.dev" target="_blank"><img src="luna88x31.png" width="88px" height="31px" alt="luna 88 by 31 button" style="image-rendering: pixelated"></a><img title="cssdif" style="image-rendering: pixelated;" src="cssdif.gif"><img title="e-scp" style="image-rendering: pixelated;" src="e-scp.gif"><img title="femboy" style="image-rendering: pixelated;" src="femboy.gif"><img title="gay" style="image-rendering: pixelated;" src="gaywebring.gif">`,
                    `<img title="lulu" style="image-rendering: pixelated;" src="lulu.gif"><img title="miku" style="image-rendering: pixelated;" src="miku.gif"><img title="lulu" style="image-rendering: pixelated;" src="lulu.gif"><img title="mousepow" style="image-rendering: pixelated;" src="mousepow.gif"><img title="newlambda" style="image-rendering: pixelated;" src="newlambda.gif"><img title="nya" style="image-rendering: pixelated;" src="nya2.gif"><img title="parental" style="image-rendering: pixelated;" src="parental.gif"><img title="transnow" style="image-rendering: pixelated;" src="transnow2.gif">`,
                );
            },

            manual_entries: [
                "whoami - display information about me",
                "Usage: whoami",
            ],
        },

        export: {
            execute: (command: string[]) => {
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

            manual_entries: [
                "export - set an environment variable",
                "Usage: export &lt;variable&gt=&lt;value&gt",
            ],
        },

        echo: {
            execute: (command: string[]) => {
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

            manual_entries: [
                "echo - display a line of text",
                "Usage: echo &lt;text&gt",
            ],
        },

        motd: {
            execute: () => {
                writeToOutput(...motd);
            },

            manual_entries: [
                "motd - display the message of the day",
                "Usage: motd",
            ],
        },

        ":3": {
            execute: () => {
                writeToOutput("meow");
            },

            manual_entries: [":3 - :3", "Usage: :3"],

            hidden: true,
        },

        ls: {
            execute: async (command: string[]) => {
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
                } else if (
                    currentDirectory === "~/what" &&
                    command.length === 1
                ) {
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

            manual_entries: ["ls - list directory contents", "Usage: ls"],
        },

        cat: {
            execute: async (command: string[]) => {
                if (command.length === 1) {
                    writeToOutput("Usage: cat &lt;file&gt;");
                    return;
                }

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
                                "┃ \u001b[96mName: 1vers1on\u001b[0m           ┃",
                                `┃ \u001b[96mAge: ${yearsAgo("2009-08-07")}\u001b[0m                  ┃`,
                                "┃ \u001b[96mPronouns: she/her\u001b[0m        ┃",
                                "┃ \u001b[96mLanguages: C++, ts, Rust\u001b[0m ┃",
                                "┃ \u001b[96mOS: Arch Linux          \u001b[0m ┃",
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

            manual_entries: [
                "cat - print files to the standard output",
                "Usage: cat &lt;file&gt;",
            ],
        },

        view_image: {
            execute: async (command: string[]) => {
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

            manual_entries: [
                "view_image - view an image",
                "Usage: view_image &lt;filename&gt",
            ],
        },

        cowsay: {
            execute: (command: string[]) => {
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

            manual_entries: [
                "cowsay - say a message with a cow",
                "Usage: cowsay &lt;message&gt",
            ],
        },

        neofetch: {
            execute: (command: string[]) => {
                neofetch(command);
            },

            manual_entries: [
                "neofetch - display system information",
                "Usage: neofetch",
            ],
        },

        fastfetch: {
            execute: (command: string[]) => {
                neofetch(command);
            },

            manual_entries: [
                "fastfetch - display system information",
                "Usage: fastfetch",
            ],

            hidden: true,
        },

        ant: {
            execute: (command: string[]) => {
                if (intervalProcess) clearInterval(intervalProcess);
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
                if (intervalProcess) clearInterval(intervalProcess);
                intervalProcess = setInterval(antInterval, intervalSpeed);
                runningInterval = antInterval;
            },

            manual_entries: ["ant - run Langton's Ant", "Usage: ant [rule]"],
        },

        setspeed: {
            execute: (command: string[]) => {
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
                if (intervalProcess) {
                    clearInterval(intervalProcess);
                    intervalProcess = setInterval(
                        runningInterval,
                        intervalSpeed,
                    );
                }
            },

            manual_entries: [
                "setspeed - set the speed of the simulation",
                "Usage: setspeed &lt;speed&gt",
            ],
        },

        colortest: {
            execute: (command: string[]) => {
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

            manual_entries: [
                "colortest - display a test of colors",
                "Usage: colortest &lt;number&gt",
            ],

            hidden: true,
        },

        canvastest: {
            execute: async (command: string[]) => {
                terminalOutput = [...terminalOutput, "cAnVas"];
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

            manual_entries: [
                "canvastest - display a test of the canvas",
                "Usage: canvastest",
            ],

            hidden: true,
        },

        turn_me_into_a_girl: {
            execute: async (command: string[]) => {
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

            manual_entries: [
                "\u001b[37mturn_me_into_a_girl - Turns you into a cute and silly girl :3",
                "\u001b[37mUsage: turn_me_into_a_girl",
            ],
        },

        notification: {
            execute: (command: string[]) => {
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

            manual_entries: [
                "notification - send a notification",
                "Usage: notification",
            ],

            admin_only: true,
        },

        subscribeToPush: {
            execute: async (command: string[]) => {
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

            manual_entries: [
                "subscribeToPush - subscribe to push notifications",
                "Usage: subscribeToPush",
            ],
        },

        register: {
            execute: async (command: string[]) => {
                if (command.length === 1) {
                    writeToOutput(
                        "Usage: register &lt;username&gt &lt;password&gt",
                    );
                    return;
                }

                let username = command[1];
                let password = command[2];

                if (username.length < 3) {
                    writeToOutput(
                        "Username must be at least 3 characters long",
                    );
                    return;
                }

                if (password.length < 6) {
                    writeToOutput(
                        "Password must be at least 6 characters long",
                    );
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

            manual_entries: [
                "register - register a new account",
                "Usage: register &lt;username&gt &lt;password&gt",
            ],
        },

        login: {
            execute: async (command: string[]) => {
                if (command.length === 1) {
                    writeToOutput("Usage: login &lt;username&gt");
                    return;
                }

                let username = command[1];
                writeToOutput(
                    "Please enter your password. It will be hidden for security reasons.",
                );
                hiddenInputCallback = async (password) => {
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
                };
            },

            manual_entries: [
                "login - login to an account",
                "Usage: login &lt;username&gt",
            ],
        },

        logout: {
            execute: async (command: string[]) => {
                const response = await fetch("/api/auth/logout", {
                    method: "POST",
                });

                if (response.status !== 200) {
                    writeToOutput("Failed to logout", await response.text());
                    return;
                }

                writeToOutput("Successfully logged out");
            },

            manual_entries: [
                "logout - logout of the current account",
                "Usage: logout",
            ],
        },

        updateMotd: {
            execute: async (command: string[]) => {
                if (command.length === 1) {
                    writeToOutput("Usage: updateMotd &lt;message&gt");
                    return;
                }

                const response = await fetch("/api/admin/updateMotd", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        message: command.slice(1).join(" "),
                    }),
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

            manual_entries: [
                "updateMotd - update the message of the day",
                "Usage: updateMotd &lt;message&gt",
            ],

            admin_only: true,
        },

        updateuserdata: {
            execute: async (command: string[]) => {
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

            manual_entries: [
                "updateuserdata - update user data",
                "Usage: updateuserdata &lt;username&gt &lt;column&gt &lt;value&gt",
            ],

            admin_only: true,
        },

        getuserdata: {
            execute: async (command: string[]) => {
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
                    writeToOutput(
                        "Failed to get user data",
                        await response.text(),
                    );
                    return;
                }

                const data = await response.json();

                writeToOutput(JSON.stringify(data.user, null, 2));
            },

            manual_entries: [
                "getuserdata - get user data",
                "Usage: getuserdata &lt;username&gt",
            ],

            admin_only: true,
        },

        notify: {
            execute: async (command: string[]) => {
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
                        title: "1vers1on",
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

            manual_entries: [
                "notify - send a notification to all users",
                "Usage: notify &lt;message&gt",
            ],

            admin_only: true,
        },

        gridsize: {
            execute: (command: string[]) => {
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
                        gridState[i] = gridState[i].slice(
                            0,
                            parseInt(command[2]),
                        );
                    }
                }

                fullUpdateGridNextFrame = true;

                if (environmentVariables.get("TEXT_MODE") == "true") {
                    updateGridOnTerminal();
                } else {
                    updateCanvasGrid();
                }
            },

            manual_entries: [
                "gridsize - set the size of the grid",
                "Usage: gridsize &lt;x&gt &lt;y&gt",
            ],
        },

        convtest: {
            execute: (command: string[]) => {
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

            manual_entries: [
                "convtest - test the convolution function",
                "Usage: convtest",
            ],

            hidden: true,
        },

        postMessage: {
            execute: async (command: string[]) => {
                if (command.length === 1) {
                    writeToOutput("Usage: postMessage &lt;message&gt");
                    return;
                }

                const response = await fetch("/api/addMessageToBoard", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        message: command.slice(1).join(" "),
                    }),
                });

                if (response.status !== 200) {
                    writeToOutput(
                        "Failed to post message",
                        await response.text(),
                    );
                    return;
                }

                writeToOutput("Successfully posted message");
            },

            manual_entries: [
                "postMessage - post a message to the message board",
                "Usage: postMessage &lt;message&gt",
            ],
        },

        messageBoard: {
            execute: async (command: string[]) => {
                const response = await fetch("/api/getMessagesFromBoard", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ Number: 50 }),
                });

                if (response.status !== 200) {
                    writeToOutput(
                        "Failed to get messages",
                        await response.text(),
                    );
                    return;
                }

                const data = await response.json();

                // const date = new Date(response.createdAt);
                // const dateString = date.toDateString();

                data.forEach((message: any) => {
                    const date = new Date(message.createdAt);
                    const dateString = date.toDateString();

                    if (message.username === "1vers1on") {
                        message.username = `\u001b[1337m${message.username}`;
                    }
                    writeToOutput(
                        `\u001b[37m[\u001b[33m${dateString}\u001b[37m] \u001b[32m${message.username}\u001b[32m: \u001b[37m${message.message}`,
                    );
                });
            },

            manual_entries: [
                "messageBoard - view the message board",
                "Usage: messageBoard",
            ],
        },

        fibonacci: {
            execute: (command: string[]) => {
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

            manual_entries: [
                "fibonacci - calculate the fibonacci sequence",
                "Usage: fibonacci &lt;number&gt",
            ],
        },

        ping: {
            execute: async (command: string[]) => {
                const startTime = performance.now();
                const response = await fetch("/api/ping");
                const endTime = performance.now();

                if (response.status !== 200) {
                    writeToOutput(
                        "Failed to ping server",
                        await response.text(),
                    );
                    return;
                }

                writeToOutput(`Pong! Response time: ${endTime - startTime}ms`);
            },

            manual_entries: ["ping - ping the server", "Usage: ping"],
        },

        badapple: {
            execute: async (command: string[]) => {
                badAppleLine = getOutputLength();
                writeToOutput("Bad Apple not loaded. Please wait...");
                const response = await fetch("/badapple.json");
                badappleFrames = await response.json();

                var i = 0;
                badAppleInterval = setInterval(() => {
                    if (badappleFrames) {
                        setLineInOutput(
                            badappleFrames["frame_" + i],
                            badAppleLine,
                        );
                    }
                    if (i >= 2190) {
                        if (badAppleInterval) clearInterval(badAppleInterval);
                    }
                    i++;
                }, 1000 / 10);
            },

            manual_entries: [
                "badapple - play the Bad Apple video",
                "Usage: badapple",
            ],
        },

        starwars: {
            execute: async (command: string[]) => {
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
                        const displayFor = badappleFrames[
                            i.toString()
                        ].substring(0, firstNewline);
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
                            if (badAppleInterval)
                                clearInterval(badAppleInterval);
                        }
                    } else {
                        setLineInOutput(
                            "Failed to load Star Wars",
                            badAppleLine,
                        );
                        if (badAppleInterval) clearInterval(badAppleInterval);
                    }
                }, 67);
            },

            manual_entries: [
                "starwars - play the Star Wars video",
                "Usage: starwars",
            ],
        },

        download: {
            execute: async (command: string[]) => {
                if (command.length === 1) {
                    writeToOutput(
                        "Usage: download &lt;filename&gt &lt;content&gt",
                    );
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

            manual_entries: [
                "download - download input as a file",
                "Usage: download &lt;filename&gt &lt;content&gt",
            ],
        },

        isPrime: {
            execute: (command: string[]) => {
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

            manual_entries: [
                "isPrime - check if a number is prime",
                "Usage: isPrime &lt;number&gt",
            ],
        },

        meow: {
            execute: (command: string[]) => {
                writeToOutput("  /\\_/\\", " ( o.o )", "  > ^ <", "Meow!");
            },

            manual_entries: ["meow - meow", "Usage: meow"],

            hidden: true,
        },

        silly_cat: {
            execute: async (command: string[]) => {
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

            manual_entries: [
                "silly_cat - cat noises",
                "Usage: silly_cat &lt;number&gt",
            ],

            hidden: true,
        },

        to_cat_noises: {
            execute: (command: string[]) => {
                if (command.length === 1) {
                    writeToOutput("Usage: to_cat_noises &lt;input&gt");
                    return;
                }

                const input = command.slice(1).join(" ");

                addToOutputWrapped(compressDataToCatNoises(input));
            },

            manual_entries: [
                "to_cat_noises - convert input to cat noises",
                "Usage: to_cat_noises &lt;input&gt",
            ],
        },

        from_cat_noises: {
            execute: (command: string[]) => {
                if (command.length === 1) {
                    writeToOutput("Usage: from_cat_noises &lt;input&gt");
                    return;
                }

                const input = command.slice(1).join(" ");

                addToOutputWrapped(decompressCatNoisesToData(input));
            },

            manual_entries: [
                "from_cat_noises - convert cat noises to input",
                "Usage: from_cat_noises &lt;input&gt",
            ],
        },

        unimash: {
            execute: (command: string[]) => {
                window.location.href = "/unimash";
            },

            manual_entries: [
                "unimash - play unicode smash or pass",
                "Usage: unimash",
            ],
        },

        upload: {
            execute: async (command: string[]) => {
                fileInput.click();
            },

            manual_entries: ["upload - upload a file", "Usage: upload"],

            admin_only: true,
        },

        speedtest: {
            execute: async (command: string[]) => {
                writeToOutput("\u001b[33mRunning speed test...");
                const startTime = performance.now();
                const responsePing = await fetch("/api/ping");
                const endTime = performance.now();

                if (responsePing.status !== 200) {
                    writeToOutput("Failed to ping server");
                    return;
                }

                const downloadSpeed = await measureDownloadSpeed();
                const uploadSpeed = await measureUploadSpeed();

                writeToOutput(
                    `\u001b[37mPing: ${endTime - startTime}ms`,
                    `\u001b[37mDownload speed: ${downloadSpeed} Mbps`,
                    `\u001b[37mUpload speed: ${uploadSpeed} Mbps`,
                );
            },

            manual_entries: [
                "speedtest - run a speed test",
                "Usage: speedtest",
            ],
        },

        estrogen_clicker: {
            execute: (command: string[]) => {
                estrogenClickerGameActive = true;

                terminalOutput = [...terminalOutput, "NR4nvDQUzDKMcQDSL9isYA"];

                estrogenInterval = setInterval(() => {
                    let estrogenIncrease =
                        estrogenGelStore.get() +
                        estrogenPillsStore.get() * 10 +
                        estrogenPatchesStore.get() * 20 +
                        estrogenInjectionsStore.get() * 50;

                    estrogenStore.set(estrogenStore.get() + estrogenIncrease);
                }, 1000);
            },

            manual_entries: [
                "estrogen_clicker - start the estrogen clicker game",
                "Usage: estrogen_clicker",
            ],
        },

        buy_upgrade: {
            execute: (command: string[]) => {
                if (command.length === 1) {
                    writeToOutput("Usage: buy_upgrade &lt;upgrade&gt");
                    return;
                }

                if (!estrogenClickerGameActive) {
                    writeToOutput("Estrogen clicker game is not active");
                    return;
                }

                const upgrade = command[1].toLowerCase();

                if (!estrogenUpgrades[upgrade]) {
                    writeToOutput("Invalid upgrade");
                    return;
                }

                estrogenUpgrades[upgrade]();

                if (estrogenStore.get() < 0) estrogenStore.set(0);
            },

            manual_entries: [
                "buy_upgrade - buy an upgrade in the estrogen clicker game",
                "Usage: buy_upgrade &lt;upgrade&gt",
            ],
        },

        list_upgrades: {
            execute: (command: string[]) => {
                if (!estrogenClickerGameActive) {
                    writeToOutput("Estrogen clicker game is not active");
                    return;
                }

                writeToOutput(
                    "Available upgrades:",
                    `Spiro: ${spiroStore.get()} - ${100 + spiroStore.get() * 100 * ((spiroStore.get() + 10) * 0.1)} estrogen - gain 1 estrogen per click`,
                    `Bica: ${bicaStore.get()} - ${1000 + bicaStore.get() * 1000 * ((bicaStore.get() + 10) * 0.2)} estrogen - gain 16 estrogen per click`,
                    `Cypro: ${cyrpoStore.get()} - ${500 + cyrpoStore.get() * 500 * ((cyrpoStore.get() + 10) * 0.15)} estrogen - gain 8 estrogen per click`,
                    `Progesterone: ${progesteroneStore.get()} - ${10000 + progesteroneStore.get() * 10000 * ((progesteroneStore.get() + 10) * 0.5)} estrogen - multiplies click gain`,
                    "\n",
                    `Estrogen Gel: ${estrogenGelStore.get()} - ${1000 + estrogenGelStore.get() * 1000 * ((estrogenGelStore.get() + 10) * 0.1)} estrogen - gain 2 estrogen every second`,
                    `Estrogen Pill: ${estrogenPillsStore.get()} - ${5000 + estrogenPillsStore.get() * 5000 * ((estrogenPillsStore.get() + 10) * 0.1)} estrogen - gain 10 estrogen every second`,
                    `Estrogen Patch: ${estrogenPatchesStore.get()} - ${10000 + estrogenPatchesStore.get() * 10000 * ((estrogenPatchesStore.get() + 10) * 0.2)} estrogen - gain 20 estrogen every second`,
                    `Estrogen Injection: ${estrogenInjectionsStore.get()} - ${20000 + estrogenInjectionsStore.get() * 20000 * ((estrogenInjectionsStore.get() + 10) * 0.3)} estrogen - gain 50 estrogen every second`,
                );
            },

            manual_entries: [
                "list_upgrades - list available upgrades in the estrogen clicker game",
                "Usage: list_upgrades",
            ],
        },

        reset_game: {
            execute: (command: string[]) => {
                estrogenStore.set(0);
                spiroStore.set(0);
                bicaStore.set(0);
                cyrpoStore.set(0);
                writeToOutput("Game reset");
            },

            manual_entries: [
                "reset_game - reset the estrogen clicker game",
                "Usage: reset_game",
            ],
        },

        test_hidden_input: {
            execute: (command: string[]) => {
                writeToOutput("Enter a hidden input");

                hiddenInputCallback = (input) => {
                    writeToOutput(`Hidden input: ${input}`);
                };
            },

            manual_entries: [
                "test_hidden_input - test hidden input",
                "Usage: test_hidden_input",
            ],

            hidden: true,
        },

        test: {
            execute: (command: string[]) => {
                const questions = [
                    {
                        question: "Test 1",
                        answers: ["Answer 1", "Answer 2", "Answer 3"],
                    },
                    {
                        question: "Test 2",
                        answers: ["Answer 4", "Answer 5", "Answer 6"],
                    },
                    {
                        question: "Test 3",
                        answers: ["Answer 7", "Answer 8", "Answer 9"],
                    },
                ];
                let startLine = terminalOutput.length + 1;
                let currentQuestion = 0;
                let selectedValue = 0;

                let selectedValues: number[] = [];

                writeToOutput(
                    "\u001b[37m" + questions[currentQuestion].question,
                );
                for (
                    let i = 0;
                    i < questions[currentQuestion].answers.length;
                    i++
                ) {
                    if (i === selectedValue) {
                        writeToOutput(
                            `[\u001b[33m*\u001b[0m] - ${questions[currentQuestion].answers[i]}`,
                        );
                    } else {
                        writeToOutput(
                            `[ ] - ${questions[currentQuestion].answers[i]}`,
                        );
                    }
                }

                keydownCallback = (event) => {
                    if (event.key === "ArrowDown") {
                        terminalOutput[startLine + selectedValue] =
                            terminalOutput[startLine + selectedValue].replace(
                                "[\u001b[33m*\u001b[0m]",
                                "[ ]",
                            );
                        selectedValue =
                            (selectedValue + 1) %
                            questions[currentQuestion].answers.length;
                        terminalOutput[startLine + selectedValue] =
                            terminalOutput[startLine + selectedValue].replace(
                                "[ ]",
                                "[\u001b[33m*\u001b[0m]",
                            );
                    } else if (event.key === "ArrowUp") {
                        terminalOutput[startLine + selectedValue] =
                            terminalOutput[startLine + selectedValue].replace(
                                "[\u001b[33m*\u001b[0m]",
                                "[ ]",
                            );
                        selectedValue =
                            (selectedValue -
                                1 +
                                questions[currentQuestion].answers.length) %
                            questions[currentQuestion].answers.length;
                        terminalOutput[startLine + selectedValue] =
                            terminalOutput[startLine + selectedValue].replace(
                                "[ ]",
                                "[\u001b[33m*\u001b[0m]",
                            );
                    } else if (event.key === "Enter") {
                        writeToOutput(
                            `Selected: ${questions[currentQuestion].answers[selectedValue]}`,
                        );
                        selectedValues.push(selectedValue);
                        currentQuestion++;
                        selectedValue = 0;
                        if (currentQuestion < questions.length) {
                            startLine = terminalOutput.length + 1;
                            writeToOutput(
                                "\u001b[37m" +
                                    questions[currentQuestion].question,
                            );
                            for (
                                let i = 0;
                                i < questions[currentQuestion].answers.length;
                                i++
                            ) {
                                if (i === selectedValue) {
                                    writeToOutput(
                                        `[\u001b[33m*\u001b[0m] - ${questions[currentQuestion].answers[i]}`,
                                    );
                                } else {
                                    writeToOutput(
                                        `[ ] - ${questions[currentQuestion].answers[i]}`,
                                    );
                                }
                            }
                        } else {
                            keydownCallback = null;
                        }
                    }
                    return false;
                };
            },

            manual_entries: ["test - test command", "Usage: test"],

            hidden: true,
        },

        neko: {
            execute: (command: string[]) => {
                oneko.style.display = "block";
                let lastFrameTimestamp: number;
                function animationFrame(timestamp: number) {
                    if (!oneko.isConnected) {
                        return;
                    }
                    if (!lastFrameTimestamp) {
                        lastFrameTimestamp = timestamp;
                    }
                    if (timestamp - lastFrameTimestamp > 100) {
                        lastFrameTimestamp = timestamp;
                        frame();
                    }
                    window.requestAnimationFrame(animationFrame);
                }

                window.requestAnimationFrame(animationFrame);
            },
            manual_entries: [
                "neko - make a cat follow your cursor",
                "Usage: neko",
            ],
        },

        yippe: {
            execute: (command: string[]) => {
                for (let i = 0; i < 777; i++) {
                    writeToOutput("Yipee!!");
                }
            },
            manual_entries: ["yipe - yipee", "Usage: yipee"],

            hidden: true,
        },

        minesweeper: {
            execute: (command: string[]) => {
                if (command.length === 1) {
                    writeToOutput("Usage: minesweeper &lt;easy|medium|hard&gt");
                    return;
                }

                if (command[1] === "easy") {
                    mineSweeperYsize = 9;
                    mineSweeperXsize = 9;
                    mineSweeperMines = 10;
                } else if (command[1] === "medium") {
                    mineSweeperYsize = 16;
                    mineSweeperXsize = 16;
                    mineSweeperMines = 40;
                } else if (command[1] === "hard") {
                    mineSweeperYsize = 16;
                    mineSweeperXsize = 24;
                    mineSweeperMines = 70;
                } else if (command[1] === "expert") {
                    mineSweeperYsize = 16;
                    mineSweeperXsize = 30;
                    mineSweeperMines = 99;
                } else {
                    writeToOutput(
                        "Usage: minesweeper &lt;easy|medium|hard|expert&gt",
                    );
                    return;
                }

                initMinesweeperGrid();
                writeToOutput("QjucQiik0VmEON7mdPDqhA");
            },

            manual_entries: [
                "minesweeper - play minesweeper",
                "Usage: minesweeper &lt;easy|medium|hard|expert&gt",
            ],
        },

        blackjack: {
            execute: (command: string[]) => {
                blackjackActive = true;
                socket.emit("blackjack", ["create"]);
            },

            manual_entries: [
                "blackjack - play blackjack",
                "Usage: blackjack &lt;bet&gt",
            ],
        },

        startBlackjack: {
            execute: (command: string[]) => {
                blackjackActive = true;
                socket.emit("blackjack", ["start"]);
            },

            manual_entries: [
                "startBlackjack - start a blackjack game",
                "Usage: startBlackjack",
            ],

            help_subsection: "blackjack",
        },

        hit: {
            execute: (command: string[]) => {
                if (!blackjackActive) {
                    writeToOutput("Blackjack game is not active");
                    return;
                }

                socket.emit("blackjack", ["hit"]);
            },

            manual_entries: ["hit - hit in blackjack", "Usage: hit"],

            help_subsection: "blackjack",
        },

        stand: {
            execute: (command: string[]) => {
                if (!blackjackActive) {
                    writeToOutput("Blackjack game is not active");
                    return;
                }

                socket.emit("blackjack", ["stand"]);
            },

            manual_entries: ["stand - stand in blackjack", "Usage: stand"],

            help_subsection: "blackjack",
        },

        invite: {
            execute: (command: string[]) => {
                if (command.length === 1) {
                    writeToOutput("Usage: invite &lt;username&gt");
                    return;
                }

                socket.emit("blackjack", ["invite", command[1]]);
            },

            manual_entries: [
                "invite - invite a user to play blackjack",
                "Usage: invite &lt;username&gt",
            ],

            help_subsection: "blackjack",
        },

        accept: {
            execute: (command: string[]) => {
                socket.emit("blackjack", ["accept"]);

                pendingInvite = false;
            },

            manual_entries: [
                "accept - accept a blackjack invite",
                "Usage: accept",
            ],

            help_subsection: "blackjack",
        },

        decline: {
            execute: (command: string[]) => {
                socket.emit("blackjack", ["decline"]);

                pendingInvite = false;
            },

            manual_entries: [
                "decline - decline a blackjack invite",
                "Usage: decline",
            ],

            help_subsection: "blackjack",
        },

        playersInGame: {
            execute: (command: string[]) => {
                socket.emit("blackjack", ["playersInGame"]);
            },

            manual_entries: [
                "playersInGame - get players in the blackjack game",
                "Usage: playersInGame",
            ],

            help_subsection: "blackjack",
        },

        stopGame: {
            execute: (command: string[]) => {
                blackjackActive = false;
                socket.emit("blackjack", ["stop"]);
            },

            manual_entries: [
                "stopGame - stop the blackjack game",
                "Usage: stopGame",
            ],

            help_subsection: "blackjack",
        },

        onlineUsers: {
            execute: (command: string[]) => {
                socket.emit("onlineUsers");
            },

            manual_entries: [
                "onlineUsers - gets who is online",
                "Usage: onlineUsers",
            ],
        },

        sigmacoins: {
            execute: async () => {
                const response = await fetch("/api/getSigmacoins");
                if (response.status !== 200) {
                    writeToOutput(
                        "Failed to get sigmacoins",
                        await response.text(),
                    );
                    return;
                }

                const data = await response.json();

                writeToOutput(`You have ${data.sigmacoins} sigmacoins`);
            },

            manual_entries: [
                "sigmacoins - check your sigmacoins",
                "Usage: sigmacoins",
            ],
        },

        leaderboard: {
            execute: async () => {
                const response = await fetch("/api/sigmacoinLeaderboard");
                if (response.status !== 200) {
                    writeToOutput(
                        "Failed to get sigmacoin leaderboard",
                        await response.text(),
                    );
                    return;
                }

                const data = (await response.json()).leaderboard;

                data.forEach((entry: any, index: number) => {
                    writeToOutput(
                        `\u001b[37m${index + 1}. \u001b[32m${entry.name} - ${entry.sigmaCoins} sigmacoins`,
                    );
                });
            },

            manual_entries: [
                "leaderboard - view the sigmacoin leaderboard",
                "Usage: leaderboard",
            ],
        },

        cmatrix: {
            execute: (command: string[]) => {
                clearOutput();
                const matrixChars = Array.from({ length: 94 }, (_, i) =>
                    String.fromCharCode(33 + i),
                );
                const brightGreen = "\u001b[92m";
                const darkGreen = "\u001b[32m";

                const runningLines = new Int8Array(terminalWidth);
                const charIndices = new Int8Array(terminalWidth);

                const buffer = new Array(terminalWidth);
                let outputBuffer = "";

                cmatrixInterval = setInterval(() => {
                    if (cmatrixActive) {
                        cmatrixActive = false;
                        if (cmatrixInterval) clearInterval(cmatrixInterval);
                        return;
                    }

                    for (let i = 0; i < terminalWidth; i++) {
                        if (runningLines[i] > 0) {
                            runningLines[i]--;
                            charIndices[i] = (Math.random() * 94) | 0;
                            buffer[i] = darkGreen + matrixChars[charIndices[i]];
                        } else {
                            if (Math.random() < 0.05) {
                                runningLines[i] = (Math.random() * 10 + 1) | 0;
                                charIndices[i] = (Math.random() * 94) | 0;
                                buffer[i] =
                                    brightGreen + matrixChars[charIndices[i]];
                            } else {
                                buffer[i] = " ";
                            }
                        }
                    }

                    outputBuffer = buffer.join("");

                    terminalOutput = [
                        outputBuffer,
                        ...terminalOutput.slice(0, terminalHeight - 1),
                    ];
                }, 1000 / 60);
            },

            manual_entries: ["cmatrix - activate cmatrix", "Usage: cmatrix"],
        },

        copy: {
            execute: (command: string[]) => {
                if (command.length === 1) {
                    writeToOutput("Usage: copy &lt;text&gt");
                    return;
                }

                const text = command.slice(1).join(" ");
                navigator.clipboard.writeText(text);
                writeToOutput("Copied to clipboard");
            },

            manual_entries: [
                "copy - copy text to clipboard",
                "Usage: copy &lt;text&gt",
            ],
        },

        paste: {
            execute: async () => {
                const text = await navigator.clipboard.readText();
                writeToOutput(text);
            },

            manual_entries: [
                "paste - paste text from clipboard",
                "Usage: paste",
            ],
        },

        flipacoin: {
            execute: () => {
                const array = new Uint8Array(1);
                window.crypto.getRandomValues(array);

                if (array[0] % 2 === 0) {
                    writeToOutput("Heads");
                } else {
                    writeToOutput("Tails");
                }
            },

            manual_entries: ["flipacoin - flip a coin", "Usage: flipacoin"],
        },

        ssh: {
            execute: (command: string[]) => {},

            manual_entries: [
                "ssh - connect to a remote server",
                "Usage: ssh &lt;username&gt",
            ],
        },

        linux: {
            execute: (command: string[]) => {
                if (!v86Loaded) {
                    writeToOutput("v86 is not loaded yet. give it a sec plz");
                    return;
                }

                emulator = new V86({
                    wasm_path: "v86.wasm",

                    bios: {
                        url: "seabios.bin",
                    },
                    vga_bios: {
                        url: "vgabios.bin",
                    },
                    bzimage: {
                        url: "buildroot-bzimage.bin",
                        async: false,
                    },
                    filesystem: {},
                    cmdline: "tsc=reliable mitigations=off random.trust_cpu=on",
                    autostart: true,
                });

                emulator.add_listener("emulator-stopped", () => {
                    v86Focused = false;
                    v86Running = false;
                    clearOutput();
                    writeToOutput("linux stopped");
                });

                emulator.add_listener("emulator-ready", () => {
                    emulator.screen_adapter.set_size_text(
                        terminalWidth,
                        terminalHeight,
                    );
                    emulator.screen_adapter.put_char = function (
                        row: number,
                        col: number,
                        chr: number,
                        blinking: number,
                        bg_color: number,
                        fg_color: number,
                    ) {
                        if (chr === 0) {
                            return;
                        }
                        if (row >= terminalHeight || col >= terminalWidth) {
                            return;
                        }
                        if (row < 0 || col < 0) {
                            return;
                        }

                        setCharInLineInStdout(
                            `${String.fromCharCode(chr)}`,
                            row,
                            col,
                        );
                    };

                    emulator.screen_adapter.clear_screen = function () {
                        clearOutput();
                    };

                    emulator.keyboard_set_status(true);
                });

                console.log("linux started");
                writeToOutput("");
                clearOutput();

                v86Focused = true;
                v86Running = true;
            },

            manual_entries: ["linux - boot linux", "Usage: linux"],
        },

        iwashere: {
            execute: async (command: string[]) => {
                if (command.length < 2) {
                    writeToOutput("Usage: iwashere &ltusername&gt (message)");
                    return;
                }

                const username = command[1];
                const message = command.slice(2).join(" ");

                const response = await fetch("/api/iwashere", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ username, message }),
                });

                if (response.status !== 200) {
                    writeToOutput(
                        "Failed to mark your presence",
                        await response.text(),
                    );
                    return;
                }

                const data = await response.json();

                if (data.success) {
                    writeToOutput(
                        "Marked your presence on the internet forever",
                    );
                } else {
                    writeToOutput(data.error);
                }
            },

            manual_entries: [
                "iwashere - Mark your presence on the internet forever.",
                "If you would like to request a removal, please contact me.",
                "Usage: iwashere &ltusername&gt (message)",
            ],

            case_insensitive: true,
        },

        gibberish: {
            execute: (command: string[]) => {
                if (command.length === 1) {
                    writeToOutput("Usage: gibberish <words>");
                    return;
                }

                const length = parseInt(command[1]);
                if (isNaN(length)) {
                    writeToOutput("Invalid length");
                    return;
                }

                const weightedConsonants = [
                    { a: "t", weight: 0.159 },
                    { a: "n", weight: 0.094 },
                    { a: "s", weight: 0.093 },
                    { a: "r", weight: 0.087 },
                    { a: "h", weight: 0.08 },
                    { a: "d", weight: 0.079 },
                    { a: "l", weight: 0.058 },
                    { a: "c", weight: 0.045 },
                    { a: "m", weight: 0.032 },
                    { a: "w", weight: 0.03 },
                    { a: "f", weight: 0.028 },
                    { a: "g", weight: 0.024 },
                    { a: "y", weight: 0.019 },
                    { a: "p", weight: 0.019 },
                    { a: "b", weight: 0.015 },
                    { a: "v", weight: 0.01 },
                    { a: "k", weight: 0.008 },
                    { a: "j", weight: 0.002 },
                    { a: "x", weight: 0.001 },
                    { a: "q", weight: 0.001 },
                    { a: "z", weight: 0.001 },
                ];

                const weightedVowels = [
                    { a: "e", weight: 0.127 },
                    { a: "a", weight: 0.081 },
                    { a: "i", weight: 0.069 },
                    { a: "o", weight: 0.075 },
                    { a: "u", weight: 0.027 },
                ];

                const weightedSyllables = [
                    { a: "CV", weight: 0.4 }, // very common and simple
                    { a: "CVC", weight: 0.35 }, // simple but a bit more complex
                    { a: "VC", weight: 0.15 }, // still simple
                    { a: "V", weight: 0.05 }, // single vowels (shortest)
                    { a: "CVCV", weight: 0.02 }, // gets a little more complex
                    { a: "CCV", weight: 0.02 }, // slightly more complex, but still simple
                    { a: "CCVC", weight: 0.01 }, // longer and more complex
                    { a: "CCVCC", weight: 0.01 }, // even more complex
                    { a: "CCCVCC", weight: 0.005 }, // very rare, complex
                ];

                const pickRandomWeighted = (
                    weighted: { a: string; weight: number }[],
                ) => {
                    const totalWeight = weighted.reduce(
                        (acc, curr) => acc + curr.weight,
                        0,
                    );
                    const random = Math.random() * totalWeight;
                    let sum = 0;
                    for (const letter of weighted) {
                        sum += letter.weight;
                        if (random < sum) {
                            return letter.a;
                        }
                    }
                    return weighted[weighted.length - 1].a;
                };

                const maxSyllables = 4;
                const minSyllables = 2;

                let gibberish = "";

                for (let i = 0; i < length; i++) {
                    let word = "";
                    const numSyllables = Math.floor(
                        Math.random() * (maxSyllables - minSyllables + 1) +
                            minSyllables,
                    );
                    for (let j = 0; j < numSyllables; j++) {
                        let pattern = pickRandomWeighted(weightedSyllables);
                        for (let k = 0; k < pattern.length; k++) {
                            if (pattern[k] === "C") {
                                word += pickRandomWeighted(weightedConsonants);
                            } else {
                                word += pickRandomWeighted(weightedVowels);
                            }
                        }
                    }
                    gibberish += word + " ";
                }

                gibberish =
                    gibberish.charAt(0).toUpperCase() + gibberish.slice(1);
                gibberish = gibberish.slice(0, -1) + ".";

                addToOutputWrapped(gibberish);
            },

            manual_entries: [
                "gibberish - generate gibberish",
                "Usage: gibberish &lt;words&gt",
            ],
        },

        trans: {
            execute: (command: string[]) => {
                makeTransFlagColors();
            },

            manual_entries: [
                "trans - make the terminal trans flag colors",
                "Usage: trans",
            ],
        },

        man: {
            execute: (command: string[]) => {
                manual(command);
            },

            manual_entries: [
                "man - display manual entries",
                "Usage: man &lt;command&gt",
            ],
        },

        woman: {
            execute: (command: string[]) => {
                manual(command);
            },

            manual_entries: [
                "woman - display manual entries",
                "Usage: woman &lt;command&gt",
            ],

            hidden: true,
        },
    };

    let estrogenUpgrades: Record<string, () => void> = {
        spiro: () => {
            if (
                estrogenStore.get() >=
                100 + spiroStore.get() * 100 * ((spiroStore.get() + 10) * 0.1)
            ) {
                estrogenStore.set(
                    estrogenStore.get() -
                        spiroStore.get() *
                            100 *
                            ((spiroStore.get() + 10) * 0.1),
                );
                spiroStore.set(spiroStore.get() + 1);

                writeToOutput("Bought Spironolactone");
            } else {
                writeToOutput("Not enough estrogen to buy Spironolactone");
            }
        },

        bica: () => {
            if (
                estrogenStore.get() >=
                1000 + bicaStore.get() * 1000 * ((bicaStore.get() + 10) * 0.2)
            ) {
                estrogenStore.set(
                    estrogenStore.get() -
                        bicaStore.get() * 1000 * ((bicaStore.get() + 10) * 0.2),
                );
                if (Math.random() < 0.05) {
                    writeToOutput("Womp womp liver failure :(");
                    estrogenStore.set(estrogenStore.get() - 10000);
                    return;
                }
                bicaStore.set(bicaStore.get() + 1);

                writeToOutput("Bought Bicalutamide");
            } else {
                writeToOutput("Not enough estrogen to buy Bicalutamide");
            }
        },

        cypro: () => {
            if (
                estrogenStore.get() >=
                500 + cyrpoStore.get() * 500 * ((cyrpoStore.get() + 10) * 0.15)
            ) {
                estrogenStore.set(
                    estrogenStore.get() -
                        cyrpoStore.get() *
                            500 *
                            ((cyrpoStore.get() + 10) * 0.15),
                );
                cyrpoStore.set(cyrpoStore.get() + 1);

                writeToOutput("Bought Cyproterone");
            } else {
                writeToOutput("Not enough estrogen to buy Cyproterone");
            }
        },

        progesterone: () => {
            if (
                estrogenStore.get() >=
                10000 +
                    progesteroneStore.get() *
                        10000 *
                        ((progesteroneStore.get() + 10) * 0.5)
            ) {
                estrogenStore.set(
                    estrogenStore.get() -
                        progesteroneStore.get() *
                            10000 *
                            ((progesteroneStore.get() + 10) * 0.5),
                );
                progesteroneStore.set(progesteroneStore.get() + 1);

                writeToOutput("Bought Progesterone");
            } else {
                writeToOutput("Not enough estrogen to buy Progesterone");
            }
        },

        estrogen_gel: () => {
            if (
                estrogenStore.get() >=
                1000 +
                    estrogenGelStore.get() *
                        1000 *
                        ((estrogenGelStore.get() + 10) * 0.1)
            ) {
                estrogenStore.set(
                    estrogenStore.get() -
                        estrogenGelStore.get() *
                            1000 *
                            ((estrogenGelStore.get() + 10) * 0.1),
                );
                estrogenGelStore.set(estrogenGelStore.get() + 1);

                writeToOutput("Bought Estrogen Gel");
            } else {
                writeToOutput("Not enough estrogen to buy Estrogen Gel");
            }
        },

        estrogen_pill: () => {
            if (
                estrogenStore.get() >=
                5000 +
                    estrogenPillsStore.get() *
                        5000 *
                        ((estrogenPillsStore.get() + 10) * 0.1)
            ) {
                if (Math.random() < 0.01) {
                    writeToOutput("Womp womp blood clot :(");
                    estrogenStore.set(estrogenStore.get() - 10000);
                    return;
                }
                estrogenStore.set(
                    estrogenStore.get() -
                        estrogenPillsStore.get() *
                            5000 *
                            ((estrogenPillsStore.get() + 10) * 0.1),
                );
                estrogenPillsStore.set(estrogenPillsStore.get() + 1);

                writeToOutput("Bought Estrogen Pill");
            } else {
                writeToOutput("Not enough estrogen to buy Estrogen Pill");
            }
        },

        estrogen_patch: () => {
            if (
                estrogenStore.get() >=
                10000 +
                    estrogenPatchesStore.get() *
                        10000 *
                        ((estrogenPatchesStore.get() + 10) * 0.2)
            ) {
                estrogenStore.set(
                    estrogenStore.get() -
                        estrogenPatchesStore.get() *
                            10000 *
                            ((estrogenPatchesStore.get() + 10) * 0.2),
                );
                estrogenPatchesStore.set(estrogenPatchesStore.get() + 1);

                writeToOutput("Bought Estrogen Patch");
            } else {
                writeToOutput("Not enough estrogen to buy Estrogen Patch");
            }
        },

        estrogen_injection: () => {
            if (
                estrogenStore.get() >=
                20000 +
                    estrogenInjectionsStore.get() *
                        20000 *
                        ((estrogenInjectionsStore.get() + 10) * 0.3)
            ) {
                estrogenStore.set(
                    estrogenStore.get() -
                        estrogenInjectionsStore.get() *
                            20000 *
                            ((estrogenInjectionsStore.get() + 10) * 0.3),
                );
                estrogenInjectionsStore.set(estrogenInjectionsStore.get() + 1);

                writeToOutput("Bought Estrogen Injection");
            } else {
                writeToOutput("Not enough estrogen to buy Estrogen Injection");
            }
        },
    };

    function clickEstrogen() {
        estrogenStore.set(
            estrogenStore.get() +
                (spiroStore.get() +
                    bicaStore.get() * 16 +
                    cyrpoStore.get() * 8 +
                    1) *
                    (progesteroneStore.get() + 1),
        );
    }

    async function uploadFile(event: any) {
        const file = event.target.files[0];
        if (!file) return; // No file selected

        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/admin/upload", {
            method: "POST",
            body: formData,
        });
        if (res.ok) {
            const data = await res.json();
            writeToOutput(
                "\u001b[37mUploded file to:",
                window.location.origin + data.filePath,
            );
        } else if (res.status === 401) {
            writeToOutput("\u001b[31mUnauthorized");
        } else {
            writeToOutput(
                "\u001b[31mFailed to upload file" + (await res.text()),
            );
        }
    }

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
            writeToOutput(`Usage: ${command[0]} &lt;command&gt`);
            return;
        }
        if (!commands[command[1]]) {
            writeToOutput("\u001b[31mCommand not found");
            return;
        }

        const entry = commands[command[1]].manual_entries;

        for (let i = 0; i < entry.length; i++) {
            writeToOutput("\u001b[37m" + entry[i]);
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
            "liminal.moe",
            "\u001b[37m-------------------",
            "OS\u001b[37m: " + platform,
            "Host\u001b[37m: sigmatron9000",
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

    function processAnsiCodes(text: string) {
        const regex = /\u001b\[([\d;]+)m(.*?)(?=\u001b|\n|$)/g;
        let processed = "";
        let lastIndex = 0;

        for (const match of text.matchAll(regex)) {
            const [fullMatch, codesStr, content] = match;
            const index = match.index || 0;
            processed += text.substring(lastIndex, index);
            lastIndex = index + fullMatch.length;

            if (transMode) {
                processed += content;
                continue;
            }

            const codes = codesStr.split(";");
            let style = "";
            let textContent = content;
            let rainbowApplied = false;

            for (let i = 0; i < codes.length; i++) {
                const code = codes[i];

                if (code === "0") {
                    style = "";
                    continue;
                }

                if (code === "1") {
                    style += "font-weight: bold;";
                } else if (code === "2") {
                    style += "opacity: 0.5;";
                } else if (code === "3") {
                    style += "font-style: italic;";
                } else if (code === "4") {
                    style += "text-decoration: underline;";
                } else if (code === "5" || code === "6") {
                    style += "text-decoration: blink;";
                } else if (code === "7") {
                    style += "filter: invert(1);";
                } else if (code === "8") {
                    style += "display: none;";
                } else if (code === "9") {
                    style += "text-decoration: line-through;";
                } else if (code === "1337") {
                    let rainbowText = "";
                    for (let j = 0; j < content.length; j++) {
                        let hue = (j / content.length) * 360;
                        rainbowText += `<span style="color: hsl(${hue}, 100%, 50%)">${content[j]}</span>`;
                    }
                    textContent = rainbowText;
                    rainbowApplied = true;
                } else if (COLORS[code]) {
                    style += `color: ${COLORS[code]};`;
                } else if (BG_COLORS[code]) {
                    style += `background-color: ${BG_COLORS[code]};`;
                } else if (code === "38" && codes[i + 1] === "5") {
                    const colorCode = codes[i + 2];
                    style += `color: ${get8BitAnsiColor(parseInt(colorCode))};`;
                    i += 2;
                } else if (code === "48" && codes[i + 1] === "5") {
                    const colorCode = codes[i + 2];
                    style += `background-color: ${get8BitAnsiColor(parseInt(colorCode))};`;
                    i += 2;
                } else if (code === "38" && codes[i + 1] === "2") {
                    const r = codes[i + 2],
                        g = codes[i + 3],
                        b = codes[i + 4];
                    style += `color: rgb(${r}, ${g}, ${b});`;
                    i += 4;
                } else if (code === "48" && codes[i + 1] === "2") {
                    const r = codes[i + 2],
                        g = codes[i + 3],
                        b = codes[i + 4];
                    style += `background-color: rgb(${r}, ${g}, ${b});`;
                    i += 4;
                }
            }

            processed += `<span style="${style}">${textContent}</span>`;
        }

        processed += text.substring(lastIndex);
        return processed;
    }

    function handleKeydown(event: KeyboardEvent) {
        if (v86Running) {
            if (event.key === "Escape" && event.ctrlKey) {
                v86Focused = !v86Focused;
                emulator.keyboard_set_status(v86Focused);
            }
        }

        if (v86Focused) {
            return;
        }

        scrollToBottom();

        if (hiddenInputCallback) {
            if (event.key.length === 1) {
                hiddenInput += event.key;
            } else if (event.key === "Backspace") {
                hiddenInput = hiddenInput.slice(0, -1);
            } else if (event.key === "Enter") {
                hiddenInputCallback(hiddenInput);
                hiddenInputCallback = null;
                hiddenInput = "";
            }

            return;
        }

        if (keydownCallback) {
            if (keydownCallback(event)) {
                if (event.key.length === 1) {
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
            }

            return;
        }

        if (event.key === "Enter") {
            processCommand(inputValue);
            if (commandHistory[commandHistory.length - 1] !== inputValue) {
                commandHistory.push(inputValue);
            }
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
            if (cmatrixInterval) clearInterval(cmatrixInterval);
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

        if (command.length === 0) {
            return;
        }

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
            for (const key in commands) {
                if (commands[key].case_insensitive) {
                    if (key.toLowerCase() === args[0].toLowerCase()) {
                        commands[key].execute(args);
                        return;
                    }
                } else {
                    if (key === args[0]) {
                        commands[key].execute(args);
                        return;
                    }
                }
            }
        } else if (args[0] === "") {
            writeToOutput("");
        } else {
            socket.emit("command", args);
        }

        if (commandSegments.length > 1) {
            activeOutput = "terminal";
            let pipeArgs =
                commandSegments[1]
                    .match(/(?:[^\s"]+|"[^"]*")+/g)
                    ?.map((arg) => arg.replace(/(^"|"$)/g, "")) || [];

            pipeArgs = [...pipeArgs, ...pipeOutput];

            if (pipeArgs[0] in commands) {
                for (const key in commands) {
                    if (commands[key].case_insensitive) {
                        if (key.toLowerCase() === pipeArgs[0].toLowerCase()) {
                            commands[key].execute(pipeArgs);
                            return;
                        }
                    } else {
                        if (key === pipeArgs[0]) {
                            commands[key].execute(pipeArgs);
                            return;
                        }
                    }
                }
            } else {
                socket.emit("command", pipeArgs);
            }

            pipeOutput = [];
        }

        if (transMode) {
            makeTransFlagColors();
        }
    }

    $effect(() => {
        terminalOutput;
        scrollToBottom();
    });
    writeToOutput(...motd);

    onMount(() => {
        (async () => {
            doNotTrack =
                (navigator.doNotTrack && navigator.doNotTrack === "1") ||
                ((navigator as any).msDoNotTrack &&
                    (navigator as any).msDoNotTrack === "1") ||
                ((window as any).doNotTrack &&
                    (window as any).doNotTrack === "1");
            const script = document.createElement("script");
            script.src = "libv86.js";
            script.onload = () => {
                v86Loaded = true;
            };
            document.body.appendChild(script);
            mobile = isMobile();
            if (mobile) {
                writeToOutput(
                    "\u001b[31mMobile support is experimental and WILL NOT work as expected",
                );
                mobileInput.addEventListener("keydown", (event) => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        handleKeydown({ key: "Enter" } as KeyboardEvent);
                        mobileInput.value = "";
                        mobileInputContent = "";
                    }
                });
                mobileInput.addEventListener("input", (event) => {
                    const inputValue = mobileInput.value;
                    if (inputValue.length < mobileInputContent.length) {
                        mobileInputContent = inputValue;
                        handleKeydown({ key: "Backspace" } as KeyboardEvent);
                    } else {
                        const diff = inputValue.slice(
                            mobileInputContent.length,
                        );
                        mobileInputContent = inputValue;
                        for (let i = 0; i < diff.length; i++) {
                            handleKeydown({ key: diff[i] } as KeyboardEvent);
                        }
                    }
                });
            } else {
                window.addEventListener("keydown", handleKeydown);
            }
            getMotd().then((message) => {
                setLineInOutput(message, 1);
                motd[1] = message;
            });

            socket = io({ path: "/wss/" });

            socket.on("ssh", (output: string) => {
                const data = JSON.parse(output);
            });

            socket.on("output", (output: string[]) => {
                writeToOutput(...output);
            });

            socket.on("blackjack", (output: string) => {
                if (output === "end") {
                    blackjackActive = false;
                }

                if (output === "start") {
                    inBlackjackRoom = true;
                    blackjackActive = true;
                }

                if (output === "leave") {
                    inBlackjackRoom = false;
                }

                if (output === "invite") {
                    pendingInvite = true;
                }

                if (output === "expired") {
                    pendingInvite = false;
                    writeToOutput("\u001b[31mInvite expired");
                }
            });

            displayHeight = window.screen.availHeight;
            displayWidth = window.screen.availWidth;
            platform = window.navigator.platform;

            document.addEventListener("mousemove", (event) => {
                mousePosX = event.clientX;
                mousePosY = event.clientY;
            });

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

            terminalHeight = Math.floor(displayHeight / 25);

            fetch("/api/auth/getToken")
                .then((response) => response.json())
                .then((data) => {
                    socket.emit("auth", data.token);
                });

            fetch("/api/visitorCount")
                .then((response) => response.json())
                .then((data) => {
                    visitorCount = data.count;
                    motd[3] = motd[3].replace(
                        "\u001b[95mFetching visitor count...",
                        visitorCount.toString(),
                    );
                    setLineInOutput(motd[3], 3);
                });

            fetch("/api/getLastFmStatus")
                .then((response) => {
                    if (response.status === 500) {
                        throw new Error("Server error");
                    }
                    return response.json();
                })
                .then((data) => {
                    const lastfmString = data.currentlyPlaying
                        ? `\u001b[37mCurrently listening to: ${data.lastArtist} - ${data.lastTrack}`
                        : `\u001b[37mNot currently listening to anything`;
                    motd[2] = lastfmString;
                    setLineInOutput(lastfmString, 2);
                })
                .catch((error) => {
                    const errorString = `\u001b[31mFailed to get last.fm status${error ? ": " + error : ""}`;
                    motd[2] = errorString;
                    setLineInOutput(errorString, 2);
                });
            return () => {
                window.removeEventListener("keydown", handleKeydown);
            };
        })();
    });
</script>

<div id="screen_container" style="display: block"></div>

<!-- {#if mobile}
    <div
        style="display: flex; justify-content: center; align-items: center; height: 100vh;"
    >
        <div style="text-align: center;">
            <h1>Sorry, this site is not optimized for mobile devices</h1>
            <p>Please visit on a desktop or laptop</p>
            <p>
                If you are not on mobile and this message is showing, please
                press any key to continue
            </p>
        </div>
    </div>
{:else} -->
<div class="terminal" bind:this={terminalElement}>
    {#each terminalOutput as line, i}
        {#if line === "cAnVas"}
            <canvas width="300" height="300" bind:this={gridCanvases[i]}
            ></canvas>
        {:else if line === "NR4nvDQUzDKMcQDSL9isYA"}
            <button class="ebutton" onclick={clickEstrogen}>
                <img
                    src="estrogen.png"
                    alt="Estrogen"
                    style="max-width: 100px; max-height: 100px;"
                    draggable="false"
                />
            </button>
        {:else if line === "QjucQiik0VmEON7mdPDqhA"}
            {#each minesweeperGrid as row, i}
                {#each row as cell, j}
                    <button
                        class="minesweeperButton"
                        onclick={() => clickMinesweeperCell(i, j)}
                        oncontextmenu={(event) =>
                            rightClickMinesweeperCell(event, i, j)}
                    >
                        {@html processAnsiCodes(getMinesweeperSymbol(i, j))}
                    </button>
                {/each}
                <br />
            {/each}
        {:else}
            <div class="terminal-line">{@html processAnsiCodes(line)}</div>
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
    {#if v86Running}
        <div class="terminal-line">
            Linux is currently running. Press ctrl + escape to switch between
            terminals.
        </div>
    {/if}
    <!-- {#if mobile} -->
    <input
        type="text"
        class="mobileInput"
        bind:this={mobileInput}
        placeholder="Type here on mobile."
        style={mobile ? "" : "display: none;"}
    />
    <!-- {/if} -->
</div>
<input
    type="file"
    bind:this={fileInput}
    onchange={uploadFile}
    style="display: none;"
/>
{#if estrogenClickerGameActive}
    <span class="estrogen-count">{$estrogenStore} Estrogen</span>
{/if}

<div
    class="oneko"
    bind:this={oneko}
    style="display: none;"
    draggable="false"
></div>

<!-- {/if} -->

<style>
    input {
        font-family: inherit;
        font-size: inherit;
        background: transparent;
        border: 1px solid #23d18b;
        color: white;
    }

    input:focus {
        border: 1px solid #2bffaa;
        outline: none;
    }

    img {
        user-select: none;
        -moz-user-select: none;
        -webkit-user-select: none;
        -ms-user-select: none;
    }

    .ebutton {
        background-color: transparent;
        border: none;
        cursor: pointer;
        transition: ease 0.1s;
    }

    .minesweeperButton {
        background: none;
        color: inherit;
        border: none;
        padding: 0;
        font: inherit;
        cursor: pointer;
        outline: inherit;
    }

    .ebutton:active {
        transform: scale(0.9);
    }

    .estrogen-count {
        position: fixed;
        top: 0;
        right: 0;
        background-color: #23d18b;
        color: #000;
        font-size: 2rem;
    }

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
        word-break: break-all;
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

    .oneko {
        width: 32px;
        height: 32px;
        position: fixed;
        pointer-events: none;
        background-image: url("/oneko.gif");
        image-rendering: pixelated;
        left: 16px;
        top: 16px;
        z-index: 100000;
        user-select: none;
        -moz-user-select: none;
        -webkit-user-select: none;
        -ms-user-select: none;
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
