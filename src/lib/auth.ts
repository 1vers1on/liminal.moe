import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function isUserOwner(token: string) {
    if (!token) {
        return false;
    }

    const user = await prisma.users.findFirst({
        where: {
            token,
        },
    });

    return user.permission === 'owner';
}
