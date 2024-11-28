import { Socket } from "socket.io";

interface Card {
    suit: string;
    value: string;
}

export class BlackjackGame {
    deck: Card[] = [];
    playerHand: Card[] = [];
    dealerHand: Card[] = [];
    socket: Socket;

    isOver: boolean = false;

    constructor(socket: Socket) {
        this.deck = this.createDeck();
        this.shuffleDeck();
        this.socket = socket;
    }

    writeOutput(message: string) {
        this.socket.emit("output", [message]);
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

        for (let suit of suits) {
            for (let value of values) {
                deck.push({ suit, value });
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

    startGame() {
        this.playerHand = [this.dealCard()!, this.dealCard()!];
        this.dealerHand = [this.dealCard()!, this.dealCard()!];
        this.writeOutput("Your hand: " + this.handToString(this.playerHand));
        this.writeOutput(
            "Dealer's hand: " + this.handToString(this.dealerHand.slice(0, 1)),
        );
        this.writeOutput(`Do you want to hit or stand? Type "hit" or "stand"`);
    }

    stand() {
        let playerScore = this.calculateHand(this.playerHand);
        let dealerScore = this.calculateHand(this.dealerHand);

        while (dealerScore < 17) {
            this.dealerHand.push(this.dealCard()!);
            dealerScore = this.calculateHand(this.dealerHand);
        }

        this.writeOutput(
            `Dealer's hand: ${this.handToString(this.dealerHand)}`,
        );

        if (dealerScore > 21) {
            this.writeOutput(`Dealer busts! You win!`);
        } else if (playerScore > dealerScore) {
            this.writeOutput(`You win!`);
        } else if (playerScore < dealerScore) {
            this.writeOutput(`You lose!`);
        } else {
            this.writeOutput(`It's a tie!`);
        }

        this.isOver = true;

        this.socket.emit("blackjack", "end");

        this.isOver = true;
    }

    hit() {
        this.playerHand.push(this.dealCard()!);
        this.writeOutput("Your hand: " + this.handToString(this.playerHand));

        if (this.calculateHand(this.playerHand) > 21) {
            this.writeOutput("You bust! Dealer wins!");
            this.writeOutput(`Type "start" to play again`);
        } else {
            this.writeOutput(
                `Do you want to hit or stand? Type "hit" or "stand"`,
            );
        }
    }
}
