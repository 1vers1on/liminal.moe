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

import { isUserOwner } from "$lib/auth";

const prisma = new PrismaClient();

export async function POST({ request, cookies }) {
    try {
        const token = cookies.get("token");
        if (!token || !(await isUserOwner(token))) {
            return json({ error: "Unauthorized" }, { status: 401 });
        }

        const data = await request.json();
        const { username } = data;

        let user = await prisma.users.findFirst({
            where: {
                name: username,
            },
        });

        if (!user) {
            return json({ error: "User not found" }, { status: 404 });
        }

        return json({ user });
    } catch (error) {
        console.error("Error updaing user data:", error);
        return json({ error: "Error updaing user data" }, { status: 500 });
    }
}
