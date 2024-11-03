import { PrismaClient } from "@prisma/client";
import { json } from "@sveltejs/kit";

import { isUserOwner } from "$lib/auth";

const prisma = new PrismaClient();

export async function POST({ request, cookies }) {
    try {
        const token = cookies.get("token") || "";
        if (!(await isUserOwner(token))) {
            return json({ error: "Unauthorized" }, { status: 401 });
        }

        const data = await request.json();
        const { message } = data;

        let motd = await prisma.motd.findFirst();

        if (!motd) {
            motd = await prisma.motd.create({ data: { message } });
        } else {
            motd = await prisma.motd.update({
                where: {
                    id: motd.id,
                },
                data: {
                    message,
                },
            });
        }

        return json({ message: motd.message });
    } catch (error) {
        console.error("Error getting motd:", error);
        return json({ error: "Error getting motd" }, { status: 500 });
    }
}
