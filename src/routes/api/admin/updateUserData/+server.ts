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
        const { username, column, value } = data;

        let user = await prisma.users.findFirst({
            where: {
                name: username,
            },
        });

        if (!user) {
            return json({ error: "User not found" }, { status: 404 });
        }

        user = await prisma.users.update({
            where: {
                id: user.id,
            },
            data: {
                [column]: value,
            },
        });

        return json({ user });
    } catch (error) {
        console.error("Error updaing user data:", error);
        return json({ error: "Error updaing user data" }, { status: 500 });
    }
}
