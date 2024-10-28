import { PrismaClient } from '@prisma/client';
import { json } from '@sveltejs/kit';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import path from 'path';

const prisma = new PrismaClient();

export async function POST({ request, cookies }) {
    try {
        const token = cookies.get('token');

        if (!token) {
            return json({
                error: 'Not authorized',
            }, { status: 401 });
        }

        const user = await prisma.users.findFirst({
            where: {
                token,
            },
        });

        if (!user) {
            return json({
                error: 'User not found',
            }, { status: 404 });
        }

        await prisma.users.update({
            where: {
                id: user.id,
            },
            data: {
                token: null,
            },
        });

        cookies.set('token', '', {
            httpOnly: true,
            maxAge: 0,
            path: '/',
        });

        return json({
            message: 'Logged out',
        }, { status: 200 });
    } catch (error) {
        return json({
            error: error.message,
        }, { status: 500 });
    }
}