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
