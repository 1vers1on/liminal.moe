/* Copyright (C) 2025 Ellie Hartung

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

const prisma = new PrismaClient();

export async function userExists(token: string) {
    if (!token) {
        return false;
    }

    deleteOldTokens(token);

    const tokenRecord = await prisma.tokens.findFirst({
        where: {
            token,
        },
        include: {
            user: true,
        },
    });

    return !!tokenRecord?.user;
}

export async function isUserOwner(token: string) {
    if (!token) {
        return false;
    }

    deleteOldTokens(token);

    const tokenRecord = await prisma.tokens.findFirst({
        where: {
            token,
        },
        include: {
            user: true,
        },
    });

    return tokenRecord?.user?.permission === "owner";
}

export async function getUsername(token: string) {
    if (!token) {
        return null;
    }

    deleteOldTokens(token);

    const tokenRecord = await prisma.tokens.findFirst({
        where: {
            token,
        },
        include: {
            user: true,
        },
    });

    return tokenRecord?.user?.name;
}

export async function deleteOldTokens(
    userToken: string,
    ageLimitMs: number = 2592000000,
) {
    try {
        const tokenRecord = await prisma.tokens.findFirst({
            where: { token: userToken },
            include: { user: true },
        });

        if (!tokenRecord) {
            throw new Error("Token not found");
        }

        const userId = tokenRecord.user.id;

        const allTokens = await prisma.tokens.findMany({
            where: { userId },
        });

        const currentTime = new Date().getTime();

        const expiredTokens = allTokens.filter((token) => {
            const tokenAge = currentTime - new Date(token.createdAt).getTime();
            return tokenAge > ageLimitMs;
        });

        const recentToken = allTokens.reduce((recent, token) => {
            return new Date(token.createdAt).getTime() >
                new Date(recent.createdAt).getTime()
                ? token
                : recent;
        });

        for (const expiredToken of expiredTokens) {
            if (expiredToken.id !== recentToken.id) {
                await prisma.tokens.delete({
                    where: { id: expiredToken.id },
                });
            }
        }

        return { success: true, message: "Old tokens deleted successfully" };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}
