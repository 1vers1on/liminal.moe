/* Copyright (C) 2025 Eleanor Hartung

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>. */

import { PrismaClient } from "@prisma/client";
import { json } from "@sveltejs/kit";
import webpush from "web-push";

import { isUserOwner } from "$lib/auth";

const vapidPrivateKey = process.env.VAPID_PRIVKEY;
if (!vapidPrivateKey) {
    throw new Error('VAPID_PRIVKEY environment variable is not set');
}

webpush.setVapidDetails(
    "mailto: <invers1on1@outlook.com>",
    "BLspM6VfkiZhsWPyCECtuL6uhwTAiGsIrJgoQuag221tZDNW4B168etD5lUXdTvgsc6DWLL2gO5W8zfb-oniYms",
    vapidPrivateKey
);

const prisma = new PrismaClient();

export async function POST({ request, cookies }) {
    const token = cookies.get("token");
    if (!token || !(await isUserOwner(token))) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, body } = await request.json();
    const payload = JSON.stringify({ title, body });

    const subscriptions = await prisma.subscription.findMany();

    const notificationPromises = subscriptions.map(async (subscription) => {
        const { endpoint, keysAuth, keysP256dh } = subscription;

        const pushSubscription = {
            endpoint,
            keys: {
                auth: keysAuth,
                p256dh: keysP256dh,
            },
        };

        try {
            await webpush.sendNotification(pushSubscription, payload);
        } catch (error) {
            console.error("Notification failed for endpoint:", endpoint, error);

            if ((error as any).statusCode === 410) {
                await prisma.subscription.delete({
                    where: {
                        endpoint,
                    },
                });
            }
        }
    });

    await Promise.all(notificationPromises);

    return json({ success: true });
}
