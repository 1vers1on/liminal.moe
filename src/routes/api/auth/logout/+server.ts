import { PrismaClient } from "@prisma/client";
import { json } from "@sveltejs/kit";

const prisma = new PrismaClient();

export async function POST({ request, cookies }) {
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

        const tokenRecord = await prisma.tokens.findFirst({
            where: {
                token,
            },
        });

        if (!tokenRecord) {
            return json(
                {
                    error: "Token not found",
                },
                { status: 404 },
            );
        }

        await prisma.tokens.delete({
            where: {
                id: tokenRecord.id,
            },
        });

        cookies.set("token", "", {
            httpOnly: true,
            maxAge: 0,
            path: "/",
        });

        return json(
            {
                message: "Logged out successfully",
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
