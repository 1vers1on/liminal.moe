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
