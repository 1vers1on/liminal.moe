<script>
    import { onMount } from "svelte";
    import { createClient } from "@supabase/supabase-js";
    import { goto } from "$app/navigation";
    import { encryptedIsland, cProgram } from "$lib/mylittleisland.js"
    const supabase = createClient(
        "https://sfwqilnzokiycbqmktsd.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmd3FpbG56b2tpeWNicW1rdHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MTQwNzcsImV4cCI6MjA0MjA5MDA3N30.cIcZhiECNoQviiYz9pcLJZXTf2iy4LE8B851fibaDHs",
    );

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
        "Hello there! Welcome to HoosierTransfer's website.",
        "<span style='color:#f0f;'>Fetching message of the day...</span>",
        "<br>",
        "┏━━━Socials━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓",
        '┃  <a href="https://github.com/HoosierTransfer" target="_blank" rel="nofollow" style="color:#0ff;">Github</a>                                         ┃',
        "┃                                                 ┃",
        '┃  <a href="https://discord.gg/EFv6RKexw9" target="_blank" rel="nofollow" style="color:#0ff;">Discord Server</a>                                 ┃',
        "┃                                                 ┃",
        "┃  <span style='color:#0ff;'>Discord: HoosierTransfer</span>                       ┃",
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

            if (currentLetter >= 'A' && currentLetter <= 'Z') {
                let shift = key[j % key.length].charCodeAt(0) - 65;
                let encryptedLetter = String.fromCharCode(((currentLetter.charCodeAt(0) - 65 + shift) % 26) + 65);
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

            if (currentLetter >= 'A' && currentLetter <= 'Z') {
                let shift = key[j % key.length].charCodeAt(0) - 65;
                let decryptedLetter = String.fromCharCode(((currentLetter.charCodeAt(0) - 65 - shift + 26) % 26) + 65);
                decryptedText += decryptedLetter;
                j++;
            } else {
                decryptedText += currentLetter;
            }
        }
        return decryptedText;
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
    }

    function processCommand(command) {
        terminalOutput = [
            ...terminalOutput,
            `${currentDirectory} $ ${command}`,
        ];
        command = command.split(" ");

        switch (command[0].toLowerCase()) {
            case "?":
            case "help":
                terminalOutput = [
                    ...terminalOutput,
                    "Available commands: help<br>chat<br>clear<br>whoami<br>echo<br>motd<br>ls<br>cat",
                ];
                break;
            case "testtype":
                printTypewriter("This is a test of the typewriter effect.");
                break;
            case "chat":
                goto("/chat");
                break;
            case "clear":
                terminalOutput = [];
                break;
            case "whoami":
                terminalOutput = [
                    ...terminalOutput,
                    "<br>",
                    "I'm HoosierTransfer a c++ and java developer with a passion for creating things.",
                    "Some little things about me~",
                    "<br>",
                    "~ I go by she/her pronouns",
                    "~ My other username is Aether or aethergen",
                    "~ Yes, i'm from Indiana (I don't live there anymore though)",
                    "~ I use arch btw",
                ];
            case "echo":
                if (command.length === 1) {
                    terminalOutput = [...terminalOutput, "<br>"];
                    break;
                }
                terminalOutput = [
                    ...terminalOutput,
                    command.slice(1).join(" "),
                ];
                break;
            case "motd":
                terminalOutput = [...terminalOutput, ...motd];
                break;
            case "ls":
                terminalOutput = [
                    ...terminalOutput,
                    "<span style='color:#0ff;'>projects</span>",
                    "<span style='color:#0ff;'>about</span>",
                    "<span style='color:#0ff;'>contact</span>",
                    "<span style='color:#0ff;'>ursosilly</span>",
                    "<span style='color:#f00;'>decrypt</span>"
                ];
                break;
            case "./decrypt":
                if (command.length !== 3) {
                    terminalOutput = [
                        ...terminalOutput,
                        "Usage: ./decrypt &ltkey&gt &ltfilename&gt",
                    ];
                    break;
                }

                if (command[2] !== "ursosilly") {
                    terminalOutput = [
                        ...terminalOutput,
                        "Error opening file",
                    ];
                    break;
                }

                terminalOutput = [
                    ...terminalOutput,
                    vigenereDecrypt(encryptedIsland, command[1]),
                ];
                break;
            case "cat":
                switch (command[1]) {
                    case "projects":
                        if (currentDirectory === "~") {
                            terminalOutput = [
                                ...terminalOutput,
                                "<br>",
                                "┏━━━━━Projects━━━━━┓",
                                "┃ <span style='color:#0ff;'>Eagler Lambda</span>    ┃",
                                "┃ <span style='color:#0ff;'>Eagler 1.12</span>      ┃",
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
                                "┃ <span style='color:#0ff;'>Discord: HoosierTransfer</span>  ┃",
                                "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛",
                                "<br>",
                            ];
                        }
                        break;
                    case "ursosilly":
                        if (currentDirectory === "~") {
                            // append every line in encryptedIsland to terminalOutput
                            terminalOutput = [
                                ...terminalOutput,
                                encryptedIsland,
                            ];
                        }
                        break;
                    case "decrypt":
                        if (currentDirectory === "~") {
                            // append every line in encryptedIsland to terminalOutput
                            terminalOutput = [
                                ...terminalOutput,
                                cProgram,
                            ];
                        }
                        break;
                    case "":
                        terminalOutput = [
                            ...terminalOutput,
                            "cat: missing file operand",
                            "Try 'cat --help' for more information.",
                        ];
                }
                break;
            case "":
                break;
            default:
                terminalOutput = [
                    ...terminalOutput,
                    `Command not found: ${command[0]}`,
                ];
        }

        setTimeout(() => {
            terminalElement.scrollTop = terminalElement.scrollHeight;
        }, 0);
    }

    onMount(() => {
        terminalOutput = motd;
        window.addEventListener("keydown", handleKeydown);
        getMotd().then((message) => {
            terminalOutput[1] = message;
            motd[1] = message;
        });
        return () => {
            window.removeEventListener("keydown", handleKeydown);
        };
    });
</script>

<div class="terminal" bind:this={terminalElement}>
    {#each terminalOutput as line}
        <div class="terminal-line">{@html line}</div>
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
        display: flex;
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
        animation: blink 1s step-end infinite;
    }

    .cursor.end {
        margin-left: -1ch;
    }

    @keyframes blink {
        50% {
            opacity: 0;
        }
    }
</style>
