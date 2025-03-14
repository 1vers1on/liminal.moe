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

import { json } from "@sveltejs/kit";
import { format } from "prettier";
export async function GET() {
    try {
        const response = await fetch(
            `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=HoosierTransfer&api_key=${process.env.LASTFM_API_KEY}&format=json&limit=1`,
        );

        const data = await response.json();

        const lastArtist = data.recenttracks.track[0].artist["#text"];
        const lastTrack = data.recenttracks.track[0].name;

        const currentlyPlaying = data.recenttracks.track[0]["@attr"];

        return json({
            lastArtist,
            lastTrack,
            currentlyPlaying: currentlyPlaying
                ? currentlyPlaying.nowplaying
                    ? true
                    : false
                : false,
        });
    } catch (error) {
        return json({ error: (error as Error).message }, { status: 500 });
    }
}
