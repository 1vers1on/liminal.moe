import { PrismaClient } from "@prisma/client";
import { json } from "@sveltejs/kit";
import bcrypt from "bcrypt";
import crypto from "crypto";

const prisma = new PrismaClient();

function generateToken() {
    return crypto.randomBytes(64).toString("hex");
}

export async function POST({ request, cookies }) {
    try {
        const data = await request.json();
        const { username, password } = data;

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.users.create({
            data: {
                name: username,
                password: hashedPassword,
                permission: "user",
            },
        });

        if (!user) {
            return json(
                {
                    error: "Error creating user",
                },
                { status: 500 },
            );
        }

        const token = generateToken();

        const tokenRecord = await prisma.tokens.create({
            data: {
                token,
                userId: user.id,
            },
        });

        if (!tokenRecord) {
            return json(
                {
                    error: "Error creating token",
                },
                { status: 500 },
            );
        }

        cookies.set("token", tokenRecord.token, {
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: "/",
        });

        return json(
            {
                token: tokenRecord.token,
            },
            { status: 201 },
        );
    } catch (error) {
        return json(
            {
                error: (error as Error).message,
            },
            { status: 500 },
        );
    }
}
