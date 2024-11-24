import fs from "fs/promises";
import path from "path";
import { isUserOwner } from "$lib/auth";
import { json } from "@sveltejs/kit";

export async function POST({ request, cookies }) {
    const token = cookies.get("token");
    if (!token || !(await isUserOwner(token))) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.formData();
    const file = data.get("file");

    if (!file || typeof file === "string") {
        return new Response("No file uploaded", { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024 * 1024) {
        return new Response("File too large", { status: 400 });
    }

    const randomString = Math.random().toString(36).substring(2, 15);
    const uploadDir = path.resolve(
        "/home/hoosiertransfer/hoosiertransfer.net/uploads/" + randomString,
    );
    await fs.mkdir(uploadDir, { recursive: true });

    const buffer = await file.arrayBuffer();
    const filePath = path.join(
        uploadDir,
        file.name.replace(/[^a-z0-9.]/gi, "_"),
    );
    await fs.writeFile(filePath, Buffer.from(buffer));

    return new Response(
        JSON.stringify({
            success: true,
            filePath: `/uploads/${randomString}/${file.name}`,
        }),
        {
            headers: { "Content-Type": "application/json" },
        },
    );
}
