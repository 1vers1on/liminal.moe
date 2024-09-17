<script>
    import { onMount } from "svelte";
    let terminalOutput = [];
    let inputValue = "";
    let cursorPosition = 0;
    let terminalElement;
    let currentDirectory = "~";
    let commandHistory = [];
    let historyIndex = -1;
    let loggedInUser = null;

    function setCookie(name, value, days) {
        const date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        const expires = "expires=" + date.toUTCString();
        document.cookie = name + "=" + value + ";" + expires + ";path=/";
    }

    function getCookie(name) {
        const cookieName = name + "=";
        const decodedCookie = decodeURIComponent(document.cookie);
        const cookiesArray = decodedCookie.split(';');
        for(let i = 0; i < cookiesArray.length; i++) {
            let cookie = cookiesArray[i].trim();
            if (cookie.indexOf(cookieName) === 0) {
                return cookie.substring(cookieName.length, cookie.length);
            }
        }
        return "";
    }

    function checkSession() {
        const token = getCookie("sessionToken");
        if (token) {
            loggedInUser = getCookie("username");
        }
    }

    function login(username, password) {
        // Simulated login (replace with actual login logic)
        if (username === "user" && password === "password") {
            setCookie("sessionToken", "12345", 7);
            setCookie("username", username, 7);
            loggedInUser = username;
            terminalOutput = [...terminalOutput, `Welcome, ${username}! You are now logged in.`];
        } else {
            terminalOutput = [...terminalOutput, "Login failed. Please try again."];
        }
    }

    function register(username, password) {
        // Simulated registration (replace with actual registration logic)
        terminalOutput = [...terminalOutput, "User registered successfully."];
        login(username, password);
    }

    function sendMessage(message) {
        // Simulated send message function
        terminalOutput = [...terminalOutput, `${loggedInUser}: ${message}`];
    }

    function receiveMessage(message, from) {
        // Simulated receive message function
        terminalOutput = [...terminalOutput, `${from}: ${message}`];
    }

    function processCommand(command) {
        terminalOutput = [
            ...terminalOutput,
            `${currentDirectory} $ ${command}`,
        ];
        command = command.split(" ");

        switch (command[0].toLowerCase()) {
            case "login":
                if (command.length >= 3) {
                    login(command[1], command[2]);
                } else {
                    terminalOutput = [...terminalOutput, "Usage: login <username> <password>"];
                }
                break;
            case "register":
                if (command.length >= 3) {
                    register(command[1], command[2]);
                } else {
                    terminalOutput = [...terminalOutput, "Usage: register <username> <password>"];
                }
                break;
            case "send":
                if (loggedInUser && command.length >= 2) {
                    sendMessage(command.slice(1).join(" "));
                } else {
                    terminalOutput = [...terminalOutput, "You must be logged in to send messages."];
                }
                break;
            case "logout":
                loggedInUser = null;
                document.cookie = "sessionToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                document.cookie = "username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                terminalOutput = [...terminalOutput, "You are now logged out."];
                break;
            case "clear":
                terminalOutput = [];
                break;
            default:
                terminalOutput = [...terminalOutput, `Command not found: ${command[0]}`];
        }

        setTimeout(() => {
            terminalElement.scrollTop = terminalElement.scrollHeight;
        }, 0);
    }

    onMount(() => {
        checkSession();
        if (loggedInUser) {
            terminalOutput = [...terminalOutput, `Welcome back, ${loggedInUser}.`];
        }
        window.addEventListener("keydown", handleKeydown);
        return () => {
            window.removeEventListener("keydown", handleKeydown);
        };
    });

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
        font-family: monospace;
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
