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
