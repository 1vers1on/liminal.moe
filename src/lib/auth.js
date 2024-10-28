import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function isUserOwner(token) {
    if (!token) {
        return false;
    }

    const user = await prisma.users.findFirst({
        where: {
            token,
        },
    });

    console.log('user:', user);

    return user.permission === 'owner';
}
