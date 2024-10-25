<script>
    import { onMount, tick } from "svelte";
    import { createClient } from "@supabase/supabase-js";
    import { goto } from "$app/navigation";
    import { encryptedIsland, cProgram } from "$lib/mylittleisland.js";
    const supabase = createClient(
        "https://sfwqilnzokiycbqmktsd.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmd3FpbG56b2tpeWNicW1rdHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MTQwNzcsImV4cCI6MjA0MjA5MDA3N30.cIcZhiECNoQviiYz9pcLJZXTf2iy4LE8B851fibaDHs",
    );

    let refreshRate = 0;
    let displayHeight = 0;
    let displayWidth = 0;
    let platform = "web";
    let gpuVendor = "";

    let pageLoadTime = new Date();

    let environmentVariables = new Map();

    // ANSI color codes to CSS colors
    const COLORS = {
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
    const BG_COLORS = {
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

    async function getMotd() {
        const { data, error } = await supabase
            .from("motd")
            .select("message")
            .order("id", { ascending: false })
            .limit(1)
            .single();

        if (error) {
            console.error("Error fetching message of the day:", error);
            return JSON.stringify(error);
        }

        return data.message;
    }

    function isToday(date) {
        const now = new Date();
        const dateParts = date.split("-");
        return (
            now.getMonth() + 1 === parseInt(dateParts[0]) &&
            now.getDate() === parseInt(dateParts[1])
        );
    }

    function yearsAgo(date) {
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
        "<span style='color:#f0f;'>Fetching message of the day...</span>",
        "<br>",
        "┏━━━Socials━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓",
        '┃  <a href="https://github.com/HoosierTransfer" target="_blank" rel="nofollow" style="color:#0ff;">Github</a>                                         ┃',
        "┃                                                 ┃",
        "┃  <span style='color:#0ff;'>Discord: 1vers1on</span>                              ┃",
        "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛",
        "<br>",
        "If you want to find out more about me, type <i>whoami</i>, or type <i>help</i> to see a list of available commands. Use chat to go to irc chat.",
        "<br>",
        isToday("08-07") ? "It's my birthday today!<br><br>" : "",
    ];

    let terminalOutput = [];
    let inputValue = "";
    let cursorPosition = 0;
    let terminalElement;
    let currentDirectory = "~";
    let commandHistory = [];
    let historyIndex = -1;

    let grid = [];
    let gridState = [];
    let gridLocation = 0;
    let gridColors = [];

    let gridCanvases = [];
    let activeGridCanvas;
    let gridCanvasContext;

    let onlyUpdateChangedCells = true;
    let changedCells = [];

    let conwayInterval;

    let antX, antY;
    let antDirection = 0;
    let antRule = "RL";

    let runningInterval;
    let intervalSpeed = 100;

    let commandInputCallback;
    let timerCountingDown = false;

    let transMode = false;

    const delay = (ms) => new Promise((res) => setTimeout(res, ms));

    function conwayIteration() {
        let newGridState = [];
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

    function addGridToTerminal() {
        gridLocation = terminalOutput.length + 1;
        terminalOutput.push("<br>");
        for (let i = 0; i < grid.length; i++) {
            terminalOutput.push(grid[i].join(""));
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
            terminalOutput[gridLocation + i] = grid[i].join("");
        }
    }

    function updateGridDirect() {
        for (let i = 0; i < grid.length; i++) {
            terminalOutput[gridLocation + i] = grid[i].join("");
        }
    }

    async function addCanvasGrid() {
        terminalOutput.push({ type: "canvas" });
        await tick();
        for (let i = 0; i < gridCanvases.length; i++) {
            if (gridCanvases[i]) {
                activeGridCanvas = gridCanvases[i];
                break;
            }
        }
        gridCanvasContext = activeGridCanvas.getContext("2d");
    }

    function updateCanvasGrid() {
        const cellSize = 300 / gridState.length;
        if (!onlyUpdateChangedCells) {
            gridCanvasContext.clearRect(0, 0, 300, 300);
        }
        if (onlyUpdateChangedCells) {
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
                    if (gridState[x][y] > 0) {
                        let colorIndex = gridState[x][y] % gridColors.length;
                        gridCanvasContext.fillStyle = gridColors[colorIndex];
                        gridCanvasContext.fillRect(
                            x * cellSize,
                            y * cellSize,
                            cellSize,
                            cellSize,
                        );
                    } else {
                        gridCanvasContext.fillStyle = "#000";
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
                        if (gridState[i][j] > 0) {
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
                        } else {
                            gridCanvasContext.fillStyle = "#000";
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
        }
    }

    function printTypewriter(text, delay = 2) {
        return new Promise(async (resolve) => {
            let line = terminalOutput.length;
            for (let i = 0; i < text.length; i++) {
                terminalOutput[line] = (terminalOutput[line] || "") + text[i];
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
            resolve();
        });
    }

    function vigenereEncrypt(plaintext, key) {
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

    function vigenereDecrypt(encryptedText, key) {
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

    function generateEquallySpacedColors(n) {
        const colors = [];

        for (let i = 0; i < n; i++) {
            const hue = Math.floor((360 / n) * i);
            const color = `#${hslToHex(hue, 100, 50)}`;
            colors.push(color);
        }

        return colors;
    }

    function hslToHex(h, s, l) {
        l /= 100;
        const a = (s * Math.min(l, 1 - l)) / 100;
        const f = (n) => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color)
                .toString(16)
                .padStart(2, "0");
        };
        return `${f(0)}${f(8)}${f(4)}`;
    }

    const antInterval = () => {
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
        if (environmentVariables.get("text_mode") == "true") {
            updateGridOnTerminal();
        } else {
            updateCanvasGrid();
        }
    };

    const conwayIntervalFunc = () => {
        conwayIteration();
        if (environmentVariables.get("text_mode") == "true") {
            updateGridOnTerminal();
        } else {
            updateCanvasGrid();
        }
    };

    const commands = {
        help: () => {
            terminalOutput = [
                ...terminalOutput,
                "Use man to get more information about a command.",
                "Available commands: help<br>man<br>chat<br>clear<br>whoami<br>echo<br>export<br>motd<br>ls<br>cat<br>turn_me_into_a_girl<br>conway<br>javascript<br>cowsay<br>neofetch<br>ant<br>setspeed<br>trans",
            ];
        },

        conway: () => {
            gridColors = [];
            clearInterval(conwayInterval);
            grid = [];
            gridState = [];
            for (let i = 0; i < 30; i++) {
                grid.push([]);
                gridState.push([]);
                for (let j = 0; j < 30; j++) {
                    gridState[i].push(Math.random() < 0.5 ? 1 : 0);
                    if (environmentVariables.get("text_mode") == "true") {
                        grid[i].push(gridState[i][j] === 1 ? "■ " : "  ");
                    }
                }
            }

            if (environmentVariables.get("text_mode") == "true") {
                addGridToTerminal();
            } else {
                addCanvasGrid();
            }

            clearInterval(conwayInterval);
            conwayInterval = setInterval(conwayIntervalFunc, intervalSpeed);
            runningInterval = conwayIntervalFunc;
        },

        chat: () => {
            goto("/chat");
        },

        clear: () => {
            grid = [];
            gridState = [];
            clearInterval(conwayInterval);
            terminalOutput = [];

            gridCanvases.forEach((canvas) => {
                if (canvas) {
                    canvas.remove();
                }
            });
        },

        whoami: () => {
            terminalOutput = [
                ...terminalOutput,
                "<br>",
                "I'm HoosierTransfer a c++ and rust developer with a passion for creating things.",
                "Some little things about me~",
                "<br>",
                "~ I go by she/her pronouns",
                "~ Transgender and Pansexual",
                "~ My other username is Aether or 1vers1on",
                "~ Yes, i'm from Indiana (I don't live there anymore though)",
                "~ I use arch btw",
            ];
        },

        export: (command) => {
            if (command.length === 1) {
                terminalOutput = [
                    ...terminalOutput,
                    "Usage: export &lt;variable&gt=&lt;value&gt",
                ];
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

        echo: (command) => {
            if (command.length === 1) {
                terminalOutput = [...terminalOutput, "<br>"];
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

            terminalOutput = [...terminalOutput, output];
        },

        motd: () => {
            terminalOutput = [...terminalOutput, ...motd];
        },

        ":3": () => {
            terminalOutput = [...terminalOutput, "meow"];
        },

        ls: () => {
            terminalOutput = [
                ...terminalOutput,
                "<span style='color:#0ff;'>projects</span>",
                "<span style='color:#0ff;'>about</span>",
                "<span style='color:#0ff;'>contact</span>",
                "<span style='color:#0ff;'>skibidisigmafile</span>",
                // "<span style='color:#f00;'>decrypt</span>",
            ];
        },

        // "./decrypt": (command) => {
        //     if (command.length !== 3) {
        //         terminalOutput = [
        //             ...terminalOutput,
        //             "Usage: ./decrypt &ltkey&gt &ltfilename&gt",
        //         ];
        //         return;
        //     }

        //     if (command[2] !== "skibidisigmafile") {
        //         terminalOutput = [...terminalOutput, "Error opening file"];
        //         return;
        //     }

        //     terminalOutput = [
        //         ...terminalOutput,
        //         vigenereDecrypt(encryptedIsland, command[1]),
        //     ];
        // },

        cat: (command) => {
            switch (command[1]) {
                case "projects":
                    if (currentDirectory === "~") {
                        terminalOutput = [
                            ...terminalOutput,
                            "<br>",
                            "┏━━━━━Projects━━━━━┓",
                            "┃ <span style='color:#0ff;'>Eagler Lambda</span>    ┃",
                            "┃ <span style='color:#0ff;'>Science Help</span>     ┃",
                            "┃ <span style='color:#0ff;'>Spork Viewer</span>     ┃",
                            "┃ <span style='color:#0ff;'>Sussy OS</span>         ┃",
                            "┃ <span style='color:#0ff;'>Yee Engine</span>       ┃",
                            "┗━━━━━━━━━━━━━━━━━━┛",
                            "<br>",
                        ];
                    }
                    break;
                case "about":
                    if (currentDirectory === "~") {
                        terminalOutput = [
                            ...terminalOutput,
                            "<br>",
                            "┏━━━━━━━━━━About━━━━━━━━━━━┓",
                            "┃ <span style='color:#0ff;'>Name: HoosierTransfer</span>    ┃",
                            `┃ <span style='color:#0ff;'>Age: ${yearsAgo("2009-08-07")}</span>                  ┃`,
                            "┃ <span style='color:#0ff;'>Pronouns: she/her</span>            ┃",
                            "┃ <span style='color:#0ff;'>Languages: C++, Java</span>     ┃",
                            "┃ <span style='color:#0ff;'>OS: Arch Linux / Windows</span> ┃",
                            "┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛",
                            "<br>",
                        ];
                    }
                    break;
                case "contact":
                    if (currentDirectory === "~") {
                        terminalOutput = [
                            ...terminalOutput,
                            "<br>",
                            "┏━━━━━━━━━━Contact━━━━━━━━━━┓",
                            "┃ <span style='color:#0ff;'>Discord: 1vers1on</span>         ┃",
                            "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛",
                            "<br>",
                        ];
                    }
                    break;
                case "skibidisigmafile":
                    if (currentDirectory === "~") {
                        // append every line in encryptedIsland to terminalOutput
                        terminalOutput = [...terminalOutput, encryptedIsland];
                    }
                    break;
                case "decrypt":
                    if (currentDirectory === "~") {
                        terminalOutput = [...terminalOutput, cProgram];
                    }
                    break;
                case "":
                    terminalOutput = [
                        ...terminalOutput,
                        "cat: missing file operand",
                    ];
                    break;
            }
        },
        javascript: () => {
            const code = inputValue.split(" ").slice(1).join(" ");
            try {
                const result = eval(code);
                terminalOutput = [...terminalOutput, result];
            } catch (e) {
                terminalOutput = [...terminalOutput, e.message];
            }
        },
        cowsay: (command) => {
            if (command.length === 1) {
                terminalOutput = [
                    ...terminalOutput,
                    "Usage: cowsay &lt;message&gt",
                ];
                return;
            }
            const message = command.slice(1).join(" ");
            let underscoreTop = "_".repeat(message.length + 2);
            let underscoreBottom = "-".repeat(message.length + 2);
            terminalOutput = [
                ...terminalOutput,
                " " + underscoreTop,
                `< ${message} >`,
                " " + underscoreBottom,
                "        \\   ^__^",
                "         \\  (oo)\\_______",
                "            (__)\\       )\\/\\",
                "                ||----w |",
                "                ||     ||",
            ];
        },

        neofetch: () => {
            neofetch();
        },

        fastfetch: () => {
            neofetch();
        },

        ant: (command) => {
            clearInterval(conwayInterval);
            if (command.length === 1) {
                antRule = "RL";
                gridColors = [];
            } else {
                command[1] = command[1].toUpperCase();
                for (let i = 0; i < command[1].length; i++) {
                    if (command[1][i] !== "R" && command[1][i] !== "L") {
                        terminalOutput = [
                            ...terminalOutput,
                            "\u001b[31mInvalid rule. Must be a string of R's and L's",
                        ];
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

                    if (environmentVariables.get("text_mode") == "true") {
                        grid[i].push(gridState[i][j] === 1 ? "■ " : "  ");
                    }
                }
            }
            antX = Math.floor(width / 2);
            antY = Math.floor(height / 2);
            if (environmentVariables.get("text_mode") == "true") {
                addGridToTerminal();
            } else {
                addCanvasGrid();
            }
            clearInterval(conwayInterval);
            conwayInterval = setInterval(antInterval, intervalSpeed);
            runningInterval = antInterval;
        },

        setspeed: (command) => {
            if (command.length === 1) {
                terminalOutput = [
                    ...terminalOutput,
                    "Usage: setspeed &lt;speed&gt",
                ];
                return;
            }
            const newSpeed = parseInt(command[1]);
            if (isNaN(newSpeed)) {
                terminalOutput = [...terminalOutput, "Invalid speed"];
                return;
            }
            intervalSpeed = newSpeed;
            if (conwayInterval) {
                clearInterval(conwayInterval);
                conwayInterval = setInterval(runningInterval, intervalSpeed);
            }
        },

        colortest: (command) => {
            if (command.length === 1) {
                terminalOutput = [
                    ...terminalOutput,
                    "Usage: colorTest &lt;number&gt",
                ];
                return;
            }

            let nOfColors = parseInt(command[1]);
            if (isNaN(nOfColors)) {
                terminalOutput = [...terminalOutput, "Invalid number"];
                return;
            }

            let colors = generateEquallySpacedColors(nOfColors);
            let colorString = "";
            for (let i = 0; i < colors.length; i++) {
                colorString += `<span style="color:${colors[i]};">■</span> <br>`;
            }

            terminalOutput = [...terminalOutput, colorString];
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
            gridCanvasContext = activeGridCanvas.getContext("2d");

            for (let i = 0; i < 30; i++) {
                for (let j = 0; j < 30; j++) {
                    gridCanvasContext.fillStyle =
                        Math.random() > 0.5 ? "black" : "white";
                    gridCanvasContext.fillRect(i * 20, j * 20, 20, 20);
                }
            }
        },

        turn_me_into_a_girl: async () => {
            terminalOutput = [
                ...terminalOutput,
                "\u001b[37mAre you sure you want to turn into a girl? Please enter y/n.",
                "\u001b[37mIf you decide you don't like it, you can always choose to stop being a girl.",
            ];
            commandInputCallback = async (command) => {
                if (
                    command.toLowerCase() === "y" ||
                    command.toLowerCase() === "yes"
                ) {
                    terminalOutput = [
                        ...terminalOutput,
                        "\u001b[35mOkay then! As you wish.",
                        "\u001b[35mPlease wait warmly... (Press c to cancel)",
                    ];
                    let timerLine = terminalOutput.length;
                    terminalOutput = [
                        ...terminalOutput,
                        "\u001b[37m[--------------------] 0%",
                    ];
                    const totalTime = 20000;
                    const startTime = new Date();
                    let lastTime = startTime;
                    let currentTime;
                    let progress = 0;
                    let easing = (x) => {
                        return 1 - Math.pow(1 - x, 4);
                    };
                    timerCountingDown = true;
                    while (progress < 1) {
                        if (!timerCountingDown) {
                            terminalOutput = [
                                ...terminalOutput,
                                "\u001b[37mThat's totally fine. Don't worry about it.",
                                "\u001b[37mYou're a good person.",
                            ];
                            return;
                        }
                        currentTime = new Date();
                        progress = (currentTime - startTime) / totalTime;
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
                        terminalOutput[timerLine] = bar;
                        await delay(1000 / 60);
                    }
                    timerCountingDown = false;
                    terminalOutput[timerLine] =
                        "\u001b[37m[\u001b[1337m====================\u001b[37m] 100%";
                    const line = terminalOutput.length;
                    terminalOutput[line] = "\u001b[95m";
                    const string1 =
                        "Congratulations. You’re a girl now.<br>You might not feel much different yet, but that’s okay.<br>Only a girl would have wanted to click that button.<br>That means you’re a girl on the inside, through and through.<br>Good luck out there. We’re rooting for you.";
                    for (let i = 0; i < string1.length; i++) {
                        if (
                            string1.charAt(i) == "<" &&
                            string1.charAt(i + 1) == "b" &&
                            string1.charAt(i + 2) == "r" &&
                            string1.charAt(i + 3) == ">"
                        ) {
                            terminalOutput[line] += "<br>";
                            i += 3;
                            await delay(20);
                            continue;
                        }
                        terminalOutput[line] += string1.charAt(i);
                        await delay(20);
                    }
                } else if (
                    command.toLowerCase() === "n" ||
                    command.toLowerCase() === "no"
                ) {
                    terminalOutput = [
                        ...terminalOutput,
                        "\u001b[37mThat's totally fine. Don't worry about it.",
                        "\u001b[37mYou're a good person.",
                    ];
                }
            };
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

    function manual(command) {
        if (command.length === 1) {
            terminalOutput = [...terminalOutput, "Usage: man &ltcommand&gt"];
            return;
        }

        switch (command[1]) {
            case "ls":
                terminalOutput = [
                    ...terminalOutput,
                    "ls - list directory contents",
                    "Usage: ls",
                ];
                break;
            case "cat":
                terminalOutput = [
                    ...terminalOutput,
                    "cat - print file on the standard output",
                    "Usage: cat &lt;filename&gt",
                ];
                break;
            case "conway":
                terminalOutput = [
                    ...terminalOutput,
                    "conway - run Conway's Game of Life",
                    "Usage: conway",
                ];
                break;
            case "javascript":
                terminalOutput = [
                    ...terminalOutput,
                    "javascript - run JavaScript code",
                    "Usage: javascript &lt;code&gt",
                ];
                break;
            case "cowsay":
                terminalOutput = [
                    ...terminalOutput,
                    "cowsay - generate an ASCII cow",
                    "Usage: cowsay &lt;message&gt",
                ];
                break;
            case "neofetch":
                terminalOutput = [
                    ...terminalOutput,
                    "neofetch - print system information",
                    "Usage: neofetch",
                ];
                break;
            case "ant":
                terminalOutput = [
                    ...terminalOutput,
                    "ant - run Langton's Ant",
                    "Usage: ant &lt;rule&gt",
                ];
                break;
            case "setspeed":
                terminalOutput = [
                    ...terminalOutput,
                    "setspeed - set the delay between frrames in the simulation",
                    "Usage: setspeed &lt;speed&gt",
                ];
                break;
            case "colortest":
                terminalOutput = [
                    ...terminalOutput,
                    "colortest - generate a list of colors",
                    "Usage: colortest &lt;number&gt",
                ];
                break;
            case "help":
                terminalOutput = [
                    ...terminalOutput,
                    "help - display available commands",
                    "Usage: help",
                ];
                break;
            case "chat":
                terminalOutput = [
                    ...terminalOutput,
                    "chat - go to the chat page",
                    "Usage: chat",
                ];
                break;
            case "clear":
                terminalOutput = [
                    ...terminalOutput,
                    "clear - clear the terminal",
                    "Usage: clear",
                ];
                break;
            case "whoami":
                terminalOutput = [
                    ...terminalOutput,
                    "whoami - print information about me",
                    "Usage: whoami",
                ];
                break;
            case "echo":
                terminalOutput = [
                    ...terminalOutput,
                    "echo - print arguments to the terminal",
                    "Usage: echo &lt;message&gt",
                ];
                break;
            case "motd":
                terminalOutput = [
                    ...terminalOutput,
                    "motd - print the message of the day",
                    "Usage: motd",
                ];
                break;

            case "canvastest":
                terminalOutput = [
                    ...terminalOutput,
                    "canvastest - test canvas rendering",
                    "Usage: canvastest",
                ];
                break;

            case "export":
                terminalOutput = [
                    ...terminalOutput,
                    "export - set an environment variable",
                    "Usage: export &lt;variable&gt=&lt;value&gt",
                ];
                break;

            case "turn_me_into_a_girl":
                terminalOutput = [
                    ...terminalOutput,
                    "turn_me_into_a_girl - Turns you into a cute and silly girl :3",
                    "Usage: turn_me_into_a_girl",
                ];
                break;

            case "trans":
                terminalOutput = [
                    ...terminalOutput,
                    "trans - Makes your terminal trans flag colors",
                    "Usage: trans",
                ];
                break;

            default:
                terminalOutput = [
                    ...terminalOutput,
                    "No manual entry for " + command[1],
                ];
        }
    }

    async function neofetch(command) {
        let battery;
        try {
            battery = await navigator.getBattery();
        } catch {}
        let output;
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
            "Host\u001b[37m: Github Pages",
            "Uptime\u001b[37m: " +
                Math.floor((new Date() - pageLoadTime) / 1000) +
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
            "Terminal Font\u001b[37m: Consolas",
            "User Agent\u001b[37m: " + navigator.userAgent,
            "CPU\u001b[37m: " + navigator.hardwareConcurrency + " thread(s)",
            "GPU Vendor\u001b[37m: " + gpuVendor,
            "Locale\u001b[37m: " +
                Intl.DateTimeFormat().resolvedOptions().locale,
        ];

        if (battery) {
            stats.push(
                "Battery\u001b[37m: " +
                    (battery.charging ? "Charging" : "Discharging") +
                    " (" +
                    Math.floor(battery.level * 100) +
                    "%)",
            );
        }

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

        terminalOutput = [...terminalOutput, ...output];
    }

    function processAnsiColors(text) {
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

    function handleKeydown(event) {
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
        } else if (event.key === "c" && timerCountingDown) {
            timerCountingDown = false;
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

    function processCommand(command) {
        if (commandInputCallback) {
            commandInputCallback(command);
            commandInputCallback = null;
            return;
        }
        terminalOutput = [
            ...terminalOutput,
            `${currentDirectory} $ ${command}`,
        ];
        command = command.split(" ");

        if (command[0] in commands) {
            commands[command[0]](command);
        } else if ((command[0] = "")) {
            terminalOutput = [...terminalOutput, ""];
        } else {
            terminalOutput = [
                ...terminalOutput,
                `\u001b[31m${command[0]}: command not found\u001b[0m`,
            ];
        }

        setTimeout(() => {
            terminalElement.scrollTop = terminalElement.scrollHeight;
        }, 0);

        if (transMode) {
            makeTransFlagColors();
        }
    }

    onMount(() => {
        terminalOutput = motd;
        window.addEventListener("keydown", handleKeydown);
        getMotd().then((message) => {
            terminalOutput[1] = message;
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
            const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
            gpuVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        }
        canvas1.remove();

        let lastTimestamp = 0;
        let frameCount = 0;
        let totalTime = 0;

        function estimateRefreshRate(timestamp) {
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

        return () => {
            window.removeEventListener("keydown", handleKeydown);
        };
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
        color: #0f0;
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
