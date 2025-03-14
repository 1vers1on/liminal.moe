/* Copyright (C) 2025 Eleanor Hartung

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

export async function GET() {
    try {
        let motd = await prisma.motd.findFirst();

        if (!motd) {
            motd = await prisma.motd.create({
                data: { message: "no motd set" },
            });
        }

        return json({ message: motd.message });
    } catch (error) {
        console.error("Error getting motd:", error);
        return json({ error: "Error getting motd" }, { status: 500 });
    }
}
