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
import sanitizeHtml from "sanitize-html";

const prisma = new PrismaClient();

export async function POST({ request, cookies }) {
    const token = cookies.get("token");

    const tokenRecord = await prisma.tokens.findFirst({
        where: {
            token,
        },
        include: {
            user: true, // Include the associated user data
        },
    });

    if (!tokenRecord) {
        return json({ success: false, error: "Invalid token" });
    }

    const user = tokenRecord.user;

    const data = await request.json();
    let { message } = data;

    message = sanitizeHtml(message, {
        allowedTags: ["span"],
        allowedAttributes: {
            span: ["style"],
        },
    });

    if (
        user.lastMessage &&
        new Date().getTime() - new Date(user.lastMessage).getTime() < 43200000
    ) {
        return json({
            success: false,
            error: "You can only send a message every 12 hours",
        });
    }

    await prisma.messageBoard.create({
        data: {
            message,
            user: user.id,
        },
    });

    return json({ success: true });
}
