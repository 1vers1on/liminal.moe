import { PrismaClient } from "@prisma/client";
import { json } from "@sveltejs/kit";
import crypto from "crypto";

const prisma = new PrismaClient();

export async function POST({ request }) {
    const data = await request.json();

    const username = data.username;
    let message = "";
    if (data.message) {
        message = data.message;
    }

    if (!username) {
        return json({ error: "No username provided" });
    }

    const ip =
        request.headers.get("cf-connecting-ip") ||
        request.headers.get("x-forwarded-for") ||
        "unknown";
    if (ip === "unknown") {
        return json({ error: "No IP address found" });
    }
    const hash = crypto.createHash("sha256").update(ip).digest("hex");
    // make sure check if the ip hash is unique
    const people = await prisma.peopleHere.findMany({
        where: {
            ipHash: hash,
        },
    });

    if (people.length > 0) {
        return json({ error: "This IP address has already been used" });
    }

    // prisma.peopleHere.create({
    //     data: {
    //         name: username,
    //         message,
    //         ipHash: hash,
    //     },
    // });
    // do that but check for errors
    try {
        await prisma.peopleHere.create({
            data: {
                name: username,
                message,
                ipHash: hash,
            },
        });
    } catch (e) {
        return json({ error: "An error occurred while saving your data" });
    }
    return json({ success: true });
}
