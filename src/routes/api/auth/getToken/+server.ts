import { PrismaClient } from "@prisma/client";
import { json } from "@sveltejs/kit";

const prisma = new PrismaClient();

export async function GET({ cookies }) {
    try {
        const token = cookies.get("token");

        if (!token) {
            return json(
                {
                    error: "Not authorized",
                },
                { status: 401 },
            );
        }

        return json(
            {
                token,
            },
            { status: 200 },
        );
    } catch (error) {
        return json(
            {
                error: (error as Error).message,
            },
            { status: 500 },
        );
    }
}
