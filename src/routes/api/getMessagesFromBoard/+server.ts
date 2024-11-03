import { PrismaClient } from '@prisma/client';
import { json } from '@sveltejs/kit';

const prisma = new PrismaClient();

export async function POST({ request }) {
    const data = await request.json();
    const { number } = data;

    // get last n messages sorted by date

    let messages = await prisma.messageBoard.findMany({
        take: number,
        orderBy: {
            createdAt: 'desc',
        },
        include: {
            userRelation: {
                select: {
                    name: true,
                },
            },
        },
    });

    const messagesFiltered = messages.map((message) => {
        return {
            username: message.userRelation.name,
            message: message.message,
            createdAt: message.createdAt,
        };
    });

    return json(messagesFiltered);
}
