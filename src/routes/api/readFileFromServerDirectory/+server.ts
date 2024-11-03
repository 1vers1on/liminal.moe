import { PrismaClient } from '@prisma/client';
import { json } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export async function POST({ request }) {
    const data = await request.json();

    const { file } = data;

    const filePath = path.join("/home/hoosiertransfer/hoosiertransfer.net/serverDirectory", file);

    if (!fs.existsSync(filePath)) {
        return json({ error: "File does not exist" });
    }

    if (fs.statSync(filePath).isDirectory()) {
        return json({ error: "File is a directory" });
    }

    const fileContents = fs.readFileSync(filePath, 'utf8');

    return json({ fileContents });
}
