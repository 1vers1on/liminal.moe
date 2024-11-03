import { PrismaClient } from '@prisma/client';
import { json } from '@sveltejs/kit';

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
            return json({
                error: 'User not found',
            }, { status: 404 });
        }

        return json({
            user: {
                name: user.name,
                permission: user.permission,
            },
        }, { status: 200 });
    } catch (error) {
        return json({
            error: (error as Error).message,
        }, { status: 500 });
    }
}
