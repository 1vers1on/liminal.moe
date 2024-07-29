<script>
    import { onMount } from "svelte";

    let terminalOutput = [];
    let inputValue = "";
    let currentDirectory = "~";
    let commandHistory = [];
    let historyIndex = -1;

    function handleInput(event) {
        if (event.key === "Enter") {
            processCommand(inputValue);
            commandHistory.push(inputValue);
            historyIndex = commandHistory.length;
            inputValue = "";
        } else if (event.key === "ArrowUp" && historyIndex > 0) {
            historyIndex--;
            inputValue = commandHistory[historyIndex];
        } else if (event.key === "ArrowDown" && historyIndex < commandHistory.length - 1) {
            historyIndex++;
            inputValue = commandHistory[historyIndex];
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
                    "Available commands: help<br>clear<br>whoami<br>echo<br>motd<br>ls<br>cat",
                ];
                break;
            case "clear":
                terminalOutput = [];
                break;
            case "whoami":
                terminalOutput = [
                    ...terminalOutput,
                    "<br>",
                    "I'm HoosierTransfer a c++ and java developer with a passion for creating things.",
                    "I'm also a cellular automata enthusiast.",
                    "Some little things about me~",
                    "<br>",
                    "~ I go by he/him pronouns",
                    "   ↳ I don't care what pronouns you use just be respectful",
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
                ];
            case "cat":
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
                                "┃ <span style='color:#0ff;'>Pronouns: He/Him</span>         ┃",
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

        inputElement.focus();
    }

    onMount(() => {
        terminalOutput = ["Welcome to HoosierTransfer's website! Type 'help' for available commands.", "This site is best viewed on a desktop."];
    });
</script>

<div class="terminal">
    {#each terminalOutput as line}
        <div class="terminal-line">{@html line}</div>
    {/each}
    <div class="input-line">
        <span class="prompt">{currentDirectory} $</span>
        <input type="text" bind:value={inputValue} on:keydown={handleInput} autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
    </div>
</div>

<style>
    .terminal {
        background-color: #000;
        color: #0f0;
        font-family: monospace;
        padding: 10px;
        height: 100vh;
        overflow-y: auto;
    }

    .terminal-line {
        white-space: pre-wrap;
        word-break: break-word;
    }

    .input-line {
        display: flex;
        align-items: center;
    }

    .prompt {
        margin-right: 5px;
    }

    input {
        background-color: #ffffff28;
        border: none;
        color: #0f0;
        font-family: monospace;
        font-size: inherit;
        flex-grow: 1;
        outline: none;
    }
</style>