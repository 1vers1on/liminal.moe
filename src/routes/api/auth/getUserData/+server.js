import { PrismaClient } from '@prisma/client';
import { json } from '@sveltejs/kit';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const prisma = new PrismaClient();

export async function GET({ request, cookies }) {
    try {
        const token = cookies.get('token');

        let user = await prisma.users.findFirst({
            where: {
                token,
            },
        });

        if (!user) {
            return {
                status: 404,
                body: {
                    error: 'User not found',
                },
            };
        }

        return json({
            user: {
                name: user.name,
                permission: user.permission,
            },
        }, { status: 200 });
    } catch (error) {
        return json({
            error: error.message,
        }, { status: 500 });
    }
}
