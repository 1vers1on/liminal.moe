import { PrismaClient } from "@prisma/client";
import { json } from "@sveltejs/kit";
import webpush from "web-push";

import { isUserOwner } from "$lib/auth.js";

webpush.setVapidDetails("mailto: <invers1on1@outlook.com>", "BLspM6VfkiZhsWPyCECtuL6uhwTAiGsIrJgoQuag221tZDNW4B168etD5lUXdTvgsc6DWLL2gO5W8zfb-oniYms", "***REMOVED***");

const prisma = new PrismaClient();

export async function POST({ request, cookies }) {
    if (!(await isUserOwner(cookies.get("token")))) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, body } = await request.json();
    const payload = JSON.stringify({ title, body });

    const subscriptions = await prisma.subscription.findMany();

    const notificationPromises = subscriptions.map(async subscription => {
        const { endpoint, keysAuth, keysP256dh } = subscription;

        const pushSubscription = {
            endpoint,
            keys: {
                auth: keysAuth,
                p256dh: keysP256dh
            }
        };

        try {
            await webpush.sendNotification(pushSubscription, payload);
        } catch (error) {
            console.error("Notification failed for endpoint:", endpoint, error);

            if (error.statusCode === 410) {
                await prisma.subscription.delete({
                    where: {
                        endpoint
                    }
                });
            }
        }
    });

    await Promise.all(notificationPromises);

    return json({ success: true });
}
