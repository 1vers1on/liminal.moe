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

import { getUsername } from "$lib/auth";

const prisma = new PrismaClient();
const isProduction = import.meta.env.MODE === "production";

export async function GET({ cookies }) {
    if (!isProduction) {
        return json({ count: "Tracking disabled in development" });
    }

    try {
        let visitorCount = await prisma.visitorCount.findFirst();

        if (!visitorCount) {
            visitorCount = await prisma.visitorCount.create({
                data: { count: 1 },
            });
        } else {
            const token = cookies.get("token") || "";

            if ((await getUsername(token)) !== "1vers1on") {
                visitorCount = await prisma.visitorCount.update({
                    where: { id: visitorCount.id },
                    data: { count: visitorCount.count + 1 },
                });
            }
        }

        return json({ count: visitorCount.count });
    } catch (error) {
        console.error("Error updating visitor count:", error);
        return json(
            { error: "Failed to update visitor count" },
            { status: 500 },
        );
    }
}
