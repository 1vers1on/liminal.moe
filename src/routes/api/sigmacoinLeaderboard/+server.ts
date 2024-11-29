import { PrismaClient } from "@prisma/client";
import { json } from "@sveltejs/kit";

const prisma = new PrismaClient();

export async function GET() {
    try {
        const leaderboard = await prisma.users.findMany({
            select: {
                name: true,
                sigmaCoins: true,
            },
            orderBy: {
                sigmaCoins: "desc",
            },
            take: 10,
        });

        return json(
            {
                leaderboard,
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
