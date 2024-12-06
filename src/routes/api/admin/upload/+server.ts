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
