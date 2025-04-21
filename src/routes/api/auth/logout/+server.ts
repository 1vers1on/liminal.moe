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
