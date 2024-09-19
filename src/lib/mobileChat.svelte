<script>
    import { onMount } from "svelte";
    import { createClient } from '@supabase/supabase-js'
    const supabase = createClient('https://sfwqilnzokiycbqmktsd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmd3FpbG56b2tpeWNicW1rdHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1MTQwNzcsImV4cCI6MjA0MjA5MDA3N30.cIcZhiECNoQviiYz9pcLJZXTf2iy4LE8B851fibaDHs');

    let terminalOutput = [];
    let inputValue = "";
    let cursorPosition = 0;
    let terminalElement;
    let commandHistory = [];
    let historyIndex = -1;
    let loggedIn = false;
    let userId = "";
    let channel = supabase.channel("general_channel");
    let currentUsername;
    let anonUserNumber = -1;

    async function addMessages() {
        const { data, error } = await supabase.from("general_channel").select("*").order('created_at', { ascending: false }).limit(40);
        for (let i = data.length - 1; i >= 0; i--) {
            let message = data[i];
            terminalOutput = [
                ...terminalOutput,
                `${message.username}<span style="color: #fff;">: ${message.content}</span>`
            ];
        }
    }

    function messageRecieved(data) {
        terminalOutput = [
            ...terminalOutput,
            `${data.username}<span style="color: #fff;">: ${data.content}</span>`
        ];
    }

    async function sendMessage(message) {
        if (anonUserNumber != -1) {
            const { data, error } = await supabase.rpc('add_message_anon', { user_number: anonUserNumber, message_content: message });
        }

        const { data, error } = await supabase.rpc('add_message_to_general_channel', { user_id: userId, message_content: message });
    }

    async function signUpNewUser(username, password) {
        if (password.length < 3) {
            return "Password too short.";
        }
        const { data, error } = await supabase.rpc('add_user', { p_username: username, p_password: password });
        if (error) {
            return "Error registering user. Try a new username.";
        }
        userId = data;
        window.localStorage.setItem("userId", userId);
        loggedIn = true;
        currentUsername = username;
        await addMessages();
        return "Registered user";
    }

    async function signInUser(username, password) {
        const { data, error } = await supabase.rpc('authenticate_user', { p_username: username, p_password: password });
        if (error) {
            return "Error logging in.";
        }
        if (!data) {
            return "Invalid username or password";
        }
        userId = data;
        window.localStorage.setItem("userId", userId);
        loggedIn = true;
        currentUsername = username;
        await addMessages();
        return "Logged in";
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

    async function processCommand(command) {
        if (!loggedIn && !command.startsWith("/")) {
            terminalOutput = [
                ...terminalOutput,
                `> ${command}`,
                "You need to log in.",
            ];
            return;
        }

        if (!command.startsWith("/")) {
            await sendMessage(command);
            return;
        }
        terminalOutput = [
            ...terminalOutput,
            `> ${command}`,
        ];

        command = command.substr(1);
        command = command.split(" ");

        switch (command[0].toLowerCase()) {
            case "?":
            case "help":
                terminalOutput = [
                    ...terminalOutput,
                    "Available commands: help<br>login<br>register<br>clear<br>logout<br>anon",
                ];
                break;
            case "register":
                if (command.length < 3) {
                    terminalOutput = [
                        ...terminalOutput,
                        "Usage: /register &ltusername&gt &ltpassword&gt",
                    ];
                } else {
                    const [_, username, email, password] = command;
                    let response = await signUpNewUser(username, email, password);
                    terminalOutput = [
                        ...terminalOutput,
                        response,
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
                    const [_, username, password] = command;
                    let response = await signInUser(username, password);
                    terminalOutput = [
                        ...terminalOutput,
                        response,
                    ];
                }
                break;
            case "clear":
                terminalOutput = [];
                break;
            case "logout":
                userId = null;
                loggedIn = false;
                anonUserNumber = -1;
                window.localStorage.removeItem("userId");
                break;
            case "anon":
                userId = null;
                loggedIn = true;
                anonUserNumber = Math.floor(1000 + Math.random() * 9000);
                addMessages();
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
        let user_id = window.localStorage.getItem("userId");
        if (user_id) {
            userId = user_id;
            loggedIn = true;
            addMessages();
        } else {
            terminalOutput = [
                ...terminalOutput,
                "Log in or register. Do /help to see commands. Create a temporary user with /anon",
            ];
        }
        channel.on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: "general_channel"
            },
            (payload) => messageRecieved(payload.new)
            )
            .subscribe();
        window.addEventListener("keydown", handleKeydown);
        
        return () => {
            window.removeEventListener("keydown", handleKeydown);
        };
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
