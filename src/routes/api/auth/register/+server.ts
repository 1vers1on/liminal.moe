import { PrismaClient } from '@prisma/client';
import { json } from '@sveltejs/kit';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const prisma = new PrismaClient();

function generateToken() {
    return crypto.randomBytes(64).toString('hex');
}

export async function POST({ request, cookies }) {
    try {
        const data = await request.json();
        const { username, password } = data;

        const hashedPassword = await bcrypt.hash(password, 10);

        const token = generateToken();

        const user = await prisma.users.create({
            data: {
                name: username,
                password: hashedPassword,
                token,
                permission: "user",
            },
        });

        cookies.set('token', user.token, {
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        return json({
            token: user.token,
        }, { status: 201 });
    } catch (error) {
        return json({
            error: error.message,
        }, { status: 500 });
    }
}