import { PrismaClient } from "@prisma/client";
import { json } from "@sveltejs/kit";

import { getUsername } from "$lib/auth";

const prisma = new PrismaClient();
const isProduction = import.meta.env.MODE === "production";

const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX_REQUESTS = 10;

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const lastRequest = rateLimitMap.get(ip) || 0;

    if (now - lastRequest < RATE_LIMIT_WINDOW_MS) {
        return false;
    }

    rateLimitMap.set(ip, now);
    return true;
}

export async function GET({ cookies, getClientAddress }) {
    if (!isProduction) {
        return json({ count: "Tracking disabled in development" });
    }

    const clientIp = getClientAddress();
    const isRateLimited = !checkRateLimit(clientIp);

    try {
        let visitorCount = await prisma.visitorCount.findFirst();

        if (!visitorCount) {
            visitorCount = await prisma.visitorCount.create({
                data: { count: 1 },
            });
        } else if (!isRateLimited) {
            const token = cookies.get("token") || "";

            if ((await getUsername(token)) !== "1vers1on") {
                visitorCount = await prisma.visitorCount.update({
                    where: { id: visitorCount.id },
                    data: { count: visitorCount.count + 1 },
                });
            }
        }

        return json({ count: visitorCount.count });
    } catch (error) {
        console.error("Error updating visitor count:", error);
        return json(
            { error: "Failed to update visitor count" },
            { status: 500 },
        );
    }
}