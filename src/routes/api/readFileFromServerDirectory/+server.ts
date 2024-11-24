import { json } from "@sveltejs/kit";
import fs from "fs";
import path from "path";

export async function POST({ request }) {
    const data = await request.json();

    const { file } = data;

    const filePath = path.join(
        "/home/hoosiertransfer/hoosiertransfernet/serverDirectory",
        file,
    );

    if (!fs.existsSync(filePath)) {
        return json({ error: "File does not exist" }, { status: 404 });
    }

    if (fs.statSync(filePath).isDirectory()) {
        return json({ error: "File is a directory" }, { status: 400 });
    }

    const fileContents = fs.readFileSync(filePath, "utf8");

    return json({ fileContents });
}
