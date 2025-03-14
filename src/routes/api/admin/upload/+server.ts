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

import fs from "fs/promises";
import path from "path";
import { isUserOwner } from "$lib/auth";
import { json } from "@sveltejs/kit";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB limit

export async function POST({ request, cookies }) {
    try {
        const token = cookies.get("token");
        if (!token || !(await isUserOwner(token))) {
            return json({ error: "Unauthorized" }, { status: 401 });
        }

        const data = await request.formData();
        const file = data.get("file");

        if (!file || !(file instanceof File)) {
            return json({ error: "No valid file uploaded" }, { status: 400 });
        }

        // if (file.size > MAX_FILE_SIZE) {
        //     return json({ error: "File too large" }, { status: 413 });
        // }

        const randomString = Math.random().toString(36).substring(2, 15);
        const uploadDir = path.resolve(
            "/home/hoosiertransfer/hoosiertransfernet/uploads/" + randomString,
        );
        await fs.mkdir(uploadDir, { recursive: true });

        const filePath = path.join(
            uploadDir,
            file.name.replace(/[^a-z0-9.]/gi, "_"),
        );

        const arrayBuffer = await file.arrayBuffer();
        await fs.writeFile(filePath, Buffer.from(arrayBuffer));

        return json({
            success: true,
            filePath: `/uploads/${randomString}/${file.name.replace(/[^a-z0-9.]/gi, "_")}`,
        });
    } catch (error) {
        console.error("Upload error:", error);
        return json({ error: "Upload failed" }, { status: 500 });
    }
}
