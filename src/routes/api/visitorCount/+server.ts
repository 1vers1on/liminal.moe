import { PrismaClient } from "@prisma/client";
import { json } from "@sveltejs/kit";

const prisma = new PrismaClient();
const isProduction = import.meta.env.MODE === "production";

export async function GET() {
    if (!isProduction) {
        return json({ count: "Tracking disabled in development" });
    }

    try {
        let visitorCount = await prisma.visitorCount.findFirst();

        if (!visitorCount) {
            visitorCount = await prisma.visitorCount.create({
                data: { count: 1 },
            });
        } else {
            visitorCount = await prisma.visitorCount.update({
                where: { id: visitorCount.id },
                data: { count: visitorCount.count + 1 },
            });
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
