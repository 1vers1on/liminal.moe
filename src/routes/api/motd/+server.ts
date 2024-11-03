import { PrismaClient } from "@prisma/client";
import { json } from "@sveltejs/kit";

const prisma = new PrismaClient();

export async function GET() {
    try {
        let motd = await prisma.motd.findFirst();

        if (!motd) {
            motd = await prisma.motd.create({
                data: { message: "no motd set" },
            });
        }

        return json({ message: motd.message });
    } catch (error) {
        console.error("Error getting motd:", error);
        return json({ error: "Error getting motd" }, { status: 500 });
    }
}
