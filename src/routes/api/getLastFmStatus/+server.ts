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

        const currentlyPlaying = data.recenttracks.track[0]["@attr"].nowplaying;

        return json({ lastArtist, lastTrack, currentlyPlaying });
    } catch (error) {
        return json({ error: (error as Error).message }, { status: 500 });
    }
}
