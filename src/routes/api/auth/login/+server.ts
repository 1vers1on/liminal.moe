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

        let user = await prisma.users.findFirst({
            where: {
                name: username,
            },
        });

        if (!user) {
            return json({
                error: 'User not found',
            }, { status: 404 });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return json({
                error: 'Password incorrect',
            }, { status: 401 });
        }

        const token = generateToken();

        user = await prisma.users.update({
            where: {
                id: user.id,
            },
            data: {
                token,
            },
        });

        if (!user) {
            return json({
                error: 'Error updating user',
            }, { status: 500 });
        }

        if (!user.token) {
            return json({
                error: 'Error updating token',
            }, { status: 500 });
        }

        cookies.set('token', user.token, {
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        return json({
            token: user.token,
        }, { status: 200 });
    } catch (error) {
        return json({
            error: (error as Error).message,
        }, { status: 500 });
    }
}
