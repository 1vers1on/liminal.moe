<script>
    import { createClient } from '@supabase/supabase-js'
    import { onMount } from 'svelte';
    const supabase = createClient('https://sfwqilnzokiycbqmktsd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmd3FpbG56b2tpeWNicW1rdHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MTQwNzcsImV4cCI6MjA0MjA5MDA3N30.cIcZhiECNoQviiYz9pcLJZXTf2iy4LE8B851fibaDHs');

    async function getMotd() {
        const { data, error } = await supabase
            .from('motd')
            .select('message')
            .order('id', { ascending: false })
            .limit(1)
            .single();
        
        if (error) {
            console.error('Error fetching message of the day:', error);
            return "Error fetching message of the day.";
        }

        return data.message;
    }

    function yearsAgo(date) {
        const now = new Date();
        const pastDate = new Date(date);
        let years = now.getFullYear() - pastDate.getFullYear();

        const monthDiff = now.getMonth() - pastDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < pastDate.getDate())) {
            years--;
        }

        return years;
    }

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

    let motd = [
        "Welcome to HoosierTransfer's website! Type 'help' for available commands.",
        "This website is best viewed on a desktop browser.",
        "The mobile version is not being updated anymore.",
        "Fetching message of the day..."
    ];

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
                    "~ I go by she/her pronouns",
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
            const terminal = document.querySelector('.terminal');
            terminal.scrollTop = terminal.scrollHeight;
        }, 0);

        inputValue = "";
    }

    onMount(() => {
        terminalOutput = motd;
        getMotd().then(message => {
            terminalOutput[1] = message;
            motd[1] = message;
        });
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