import { PrismaClient } from '@prisma/client';
import { json } from '@sveltejs/kit';
import sanitizeHtml from 'sanitize-html';

const prisma = new PrismaClient();

export async function POST({ request, cookies }) {
    const token = cookies.get('token');

    let user = await prisma.users.findFirst({
        where: {
            token,
        },
    });

    if (!user) {
        return json({ success: false, error: 'Invalid token' });
    }

    const data = await request.json();
    let { message } = data;

    message = sanitizeHtml(message, {
        allowedTags: ['span'],
        allowedAttributes: {
            'span': ['style'],
        }
    });

    if (user.lastMessage && new Date().getTime() - new Date(user.lastMessage).getTime() < 43200000) {
        return json({ success: false, error: 'You can only send a message every 12 hours' });
    }

    await prisma.messageBoard.create({
        data: {
            message,
            user: user.id,
        },
    });

    return json({ success: true });
}
