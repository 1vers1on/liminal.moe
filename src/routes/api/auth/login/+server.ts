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
import bcrypt from "bcrypt";
import crypto from "crypto";

const prisma = new PrismaClient();

function generateToken() {
    return crypto.randomBytes(64).toString("hex");
}

export async function POST({ request, cookies }) {
    try {
        const data = await request.json();
        const { username, password } = data;

        const user = await prisma.users.findFirst({
            where: {
                name: username,
            },
        });

        if (!user) {
            return json(
                {
                    error: "User not found",
                },
                { status: 404 },
            );
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return json(
                {
                    error: "Password incorrect",
                },
                { status: 401 },
            );
        }

        const token = generateToken();

        const tokenRecord = await prisma.tokens.create({
            data: {
                token,
                userId: user.id,
            },
        });

        if (!tokenRecord) {
            return json(
                {
                    error: "Error creating token",
                },
                { status: 500 },
            );
        }

        cookies.set("token", tokenRecord.token, {
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: "/",
        });

        return json(
            {
                token: tokenRecord.token,
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
