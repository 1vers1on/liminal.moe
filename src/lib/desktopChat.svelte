<script>
    import { onMount } from "svelte";
    import { createClient } from '@supabase/supabase-js'
    const supabase = createClient('https://supaproxy.hoosiertransfer.net/', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmd3FpbG56b2tpeWNicW1rdHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MTQwNzcsImV4cCI6MjA0MjA5MDA3N30.cIcZhiECNoQviiYz9pcLJZXTf2iy4LE8B851fibaDHs');

    let terminalOutput = [];
    let inputValue = "";
    let cursorPosition = 0;
    let terminalElement;
    let currentUsername = "guest";
    let commandHistory = [];
    let historyIndex = -1;
    let loggedIn = false;

    async function signUpNewUser(username, email, password) {
        let error = null;
        const { data, supabaseError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    username: username
                }
            },
        });
        if (supabaseError) {
            error = supabaseError.message;
            return false;
        }
        currentUsername = username;
        loggedIn = true;
        return true;
    }

    async function signInUser(usernameOrEmail, password) {
        // get email for username
        const { data, error } = await supabase
            .from('profiles')
            .select()
            .eq('username', 'HoosierT')
        console.log(data);
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
            inputValue = inputValue.slice(0, cursorPosition) + event.key + inputValue.slice(cursorPosition);
            cursorPosition++;
        } else if (event.key === "Backspace") {
            if (cursorPosition > 0) {
                inputValue = inputValue.slice(0, cursorPosition - 1) + inputValue.slice(cursorPosition);
                cursorPosition--;
            }
        }
    }

    function processCommand(command) {
        if (!loggedIn && !command.startsWith("/")) {
            terminalOutput = [
                ...terminalOutput,
                `${currentUsername} > ${command}`,
                "You need to log in.",
            ];
            return;
        }
        terminalOutput = [
            ...terminalOutput,
            `${currentUsername} > ${command}`,
        ];
        if (!command.startsWith("/")) {
            return;
        }
        command = command.substr(1);
        command = command.split(" ");

        switch (command[0].toLowerCase()) {
            case "?":
            case "help":
                terminalOutput = [
                    ...terminalOutput,
                    "Available commands: help<br>login<br>register<br>clear",
                ];
                break;
            case "register":
                if (command.length < 4) {
                    terminalOutput = [
                        ...terminalOutput,
                        "Usage: /register &ltusername&gt &ltemail&gt &ltpassword&gt",
                    ];
                } else {
                    const [_, username, email, password] = command;
                    signUpNewUser(username, email, password);
                    terminalOutput = [
                        ...terminalOutput,
                        `Registered user: ${username}`,
                    ];
                }
                break;
            case "login":
                if (command.length < 3) {
                    terminalOutput = [
                        ...terminalOutput,
                        "Usage: /login &ltusername or email&gt &ltpassword&gt",
                    ];
                } else {
                    const [_, usernameOrEmail, password] = command;
                    signInUser(usernameOrEmail, password);
                    terminalOutput = [
                        ...terminalOutput,
                        `Logged in as: ${usernameOrEmail}`,
                    ];
                }
                break;
            case "clear":
                terminalOutput = [];
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

    onMount(async () => {
        terminalOutput = [];
        window.addEventListener("keydown", handleKeydown);
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
        <span class="prompt">{currentUsername} ></span>
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
