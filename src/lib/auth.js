import { PrismaClient } from '@prisma/client';

export async function isUserOwner(token) {
    const prisma = new PrismaClient();

    if (!token) {
        return false;
    }

    const user = await prisma.users.findFirst({
        where: {
            token,
        },
    });

    if (user.permission === 'owner') {
        return true;
    }

    return false;
}
