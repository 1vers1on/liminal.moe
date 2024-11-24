import { PrismaClient } from "@prisma/client";
import { json } from "@sveltejs/kit";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

export async function POST({ request }) {
    const data = await request.json();

    const { directory } = data;

    const directoryPath = path.join(
        "/home/hoosiertransfer/hoosiertransfernet/serverDirectory",
        directory,
    );
    const files = fs.readdirSync(directoryPath).map((file) => {
        return {
            name: file,
            isDirectory: fs
                .statSync(path.join(directoryPath, file))
                .isDirectory(),
        };
    });

    return json({ files });
}
