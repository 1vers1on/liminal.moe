import { Socket } from "socket.io";

interface Card {
    suit: string;
    value: string;
}

interface Player {
    username: string;
    socket: Socket;
    hand: Card[];
    playing: boolean;
}

const decks = 4;

export class BlackjackGame {
    deck: Card[] = [];
    dealerHand: Card[] = [];
    connectedUsers: Map<string, Player> = new Map();

    currentPlayer: string = "";

    playersGone: string[] = [];

    isOver: boolean = false;

    owner: string = "";

    cutCardPosition: number = 0;

    constructor(owner: string) {
        this.deck = this.createDeck();
        this.shuffleDeck();
        this.owner = owner;

        this.cutCardPosition =
            Math.floor(this.deck.length * 0.6) +
            Math.floor(Math.random() * Math.floor(this.deck.length * 0.05));
    }

    startNewGame() {
        this.writeOutputToAll("Starting a new game");
        if (this.deck.length < this.cutCardPosition) {
            this.deck = this.createDeck();
            this.shuffleDeck();
            this.cutCardPosition =
                Math.floor(this.deck.length * 0.6) +
                Math.floor(Math.random() * Math.floor(this.deck.length * 0.05));

            this.writeOutputToAll("Shuffling the deck");
        }
        this.dealerHand = [];
        this.connectedUsers.forEach((player) => {
            player.hand = [];
            player.playing = true;
        });
        this.currentPlayer = "";
        this.playersGone = [];
        this.isOver = false;
        this.startGame();
    }

    removePlayer(username: string) {
        this.connectedUsers.delete(username);
        this.playersGone = this.playersGone.filter(
            (player) => player !== username,
        );

        if (this.currentPlayer === username) {
            this.currentPlayer = Array.from(this.connectedUsers.keys()).find(
                (username) =>
                    !this.playersGone.includes(username) &&
                    this.connectedUsers.get(username)!.playing,
            )!;
        }

        if (this.currentPlayer) {
            this.writeOutputToAll(`It's ${this.currentPlayer}'s turn`);
            this.writeOutputToCurrentPlayer(
                `Do you want to hit or stand? Type "hit" or "stand"`,
            );
        }
    }

    addPlayer(socket: Socket, username: string) {
        this.connectedUsers.set(username, {
            username: username,
            socket,
            hand: [],
            playing: true,
        });
    }

    writeOutputToAll(message: string) {
        for (const user of this.connectedUsers.values()) {
            user.socket.emit("output", [message]);
        }
    }

    writeOutputToCurrentPlayer(message: string) {
        this.connectedUsers
            .get(this.currentPlayer)!
            .socket.emit("output", [message]);
    }

    writeOutputToPlayer(username: string, message: string) {
        if (this.connectedUsers.has(username)) {
            this.connectedUsers.get(username)!.socket.emit("output", [message]);
        }
    }

    createDeck() {
        let deck: Card[] = [];
        const suits = ["hearts", "diamonds", "clubs", "spades"];
        const values = [
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "10",
            "J",
            "Q",
            "K",
            "A",
        ];
        for (let i = 0; i < decks; i++) {
            for (let suit of suits) {
                for (let value of values) {
                    deck.push({ suit, value });
                }
            }
        }

        return deck;
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    dealCard() {
        return this.deck.pop();
    }

    calculateHand(hand: Card[]) {
        let sum = 0;
        let aces = 0;

        for (let card of hand) {
            if (card.value === "A") {
                aces++;
                sum += 11;
            } else if (["J", "Q", "K"].includes(card.value)) {
                sum += 10;
            } else {
                sum += parseInt(card.value);
            }
        }

        while (sum > 21 && aces) {
            sum -= 10;
            aces--;
        }

        return sum;
    }

    handToString(hand: Card[]) {
        return hand.map((card) => `${card.value} of ${card.suit}`).join(", ");
    }

    dealCards() {
        for (const player of this.connectedUsers.values()) {
            player.hand = [this.dealCard()!, this.dealCard()!];
            player.socket.emit("output", [
                `Your hand: ${this.handToString(player.hand)}`,
            ]);
        }
    }

    startGame() {
        for (const player of this.connectedUsers.values()) {
            player.socket.emit("blackjack", "start");
        }

        this.dealCards();
        this.dealerHand = [this.dealCard()!, this.dealCard()!];
        this.writeOutputToAll(
            "Dealer's hand: " +
                this.handToString(this.dealerHand.slice(0, 1)) +
                ", ?",
        );

        this.currentPlayer = Array.from(this.connectedUsers.keys())[0];
        this.writeOutputToAll(`It's ${this.currentPlayer}'s turn`);
        this.writeOutputToCurrentPlayer(
            `Do you want to hit or stand? Type "hit" or "stand"`,
        );
    }

    dealerTurnIfTime(): boolean {
        if (this.playersGone.length === this.connectedUsers.size) {
            this.writeOutputToAll(
                `It's the dealer's turn. Dealer's hand: ${this.handToString(
                    this.dealerHand,
                )}`,
            );
            let dealerScore = this.calculateHand(this.dealerHand);

            while (dealerScore < 17) {
                this.dealerHand.push(this.dealCard()!);

                this.writeOutputToAll(
                    `Dealer hits. Dealer's hand: ${this.handToString(
                        this.dealerHand,
                    )}`,
                );

                dealerScore = this.calculateHand(this.dealerHand);
            }

            if (dealerScore > 21) {
                this.writeOutputToAll(`Dealer busts! You all win!`);
            } else {
                for (const player of this.connectedUsers.values()) {
                    const playerScore = this.calculateHand(player.hand);
                    if (playerScore > 21) {
                        player.socket.emit("output", ["You bust!"]);
                    } else if (playerScore > dealerScore) {
                        player.socket.emit("output", ["You win!"]);
                    } else if (playerScore < dealerScore) {
                        player.socket.emit("output", ["You lose!"]);
                    } else {
                        player.socket.emit("output", ["It's a tie!"]);
                    }
                }
            }

            this.isOver = true;

            return true;
        }

        return false;
    }

    stand(username: string) {
        if (this.currentPlayer !== username) {
            this.writeOutputToPlayer(username, "It's not your turn");
            return;
        }

        const player = this.connectedUsers.get(username)!;

        this.writeOutputToAll(`${username} stands`);

        if (!this.playersGone.includes(username)) {
            this.playersGone.push(username);
        }

        if (this.dealerTurnIfTime()) {
            return;
        }

        this.currentPlayer = Array.from(this.connectedUsers.keys()).find(
            (username) =>
                !this.playersGone.includes(username) &&
                this.connectedUsers.get(username)!.playing,
        )!;

        this.writeOutputToAll(`It's ${this.currentPlayer}'s turn`);
        this.writeOutputToCurrentPlayer(
            `Do you want to hit or stand? Type "hit" or "stand"`,
        );
    }

    hit(username: string) {
        if (this.currentPlayer !== username) {
            this.writeOutputToPlayer(username, "It's not your turn");
            return;
        }

        const player = this.connectedUsers.get(username)!;
        player.hand.push(this.dealCard()!);

        player.socket.emit("output", [
            `Your hand: ${this.handToString(player.hand)}`,
        ]);

        if (this.dealerTurnIfTime()) {
            return;
        }

        const score = this.calculateHand(player.hand);
        if (score > 21) {
            this.writeOutputToAll(`${username} hits and busts!`);

            if (!this.playersGone.includes(username)) {
                this.playersGone.push(username);
            }

            if (this.dealerTurnIfTime()) {
                return;
            }

            this.currentPlayer = Array.from(this.connectedUsers.keys()).find(
                (username) =>
                    !this.playersGone.includes(username) &&
                    this.connectedUsers.get(username)!.playing,
            )!;
            player.playing = false;

            this.writeOutputToAll(`It's ${this.currentPlayer}'s turn`);
            this.writeOutputToCurrentPlayer(
                `Do you want to hit or stand? Type "hit" or "stand"`,
            );
            return;
        }

        this.writeOutputToAll(`${username} hits`);

        this.writeOutputToCurrentPlayer(
            `Do you want to hit or stand? Type "hit" or "stand"`,
        );
    }
}
