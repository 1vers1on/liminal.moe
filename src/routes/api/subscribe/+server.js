// src/routes/api/subscribe.js

import { PrismaClient } from '@prisma/client';
import { json } from '@sveltejs/kit';

const prisma = new PrismaClient();

export async function POST({ request }) {
    const subscription = await request.json();

    const { endpoint, keys: { auth, p256dh } } = subscription;

    const existingSubscription = await prisma.subscription.findUnique({
        where: { endpoint }
    });

    if (!existingSubscription) {
        await prisma.subscription.create({
            data: {
                endpoint,
                keysAuth: auth,
                keysP256dh: p256dh
            }
        });
    }

    return json({ success: true });
}
