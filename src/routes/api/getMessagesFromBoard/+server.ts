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

export async function POST({ request }) {
    const data = await request.json();
    const { number } = data;

    // get last n messages sorted by date

    let messages = await prisma.messageBoard.findMany({
        take: number,
        orderBy: {
            createdAt: "desc",
        },
        include: {
            userRelation: {
                select: {
                    name: true,
                },
            },
        },
    });

    const messagesFiltered = messages.map((message) => {
        return {
            username: message.userRelation.name,
            message: message.message,
            createdAt: message.createdAt,
        };
    });

    return json(messagesFiltered);
}
