export async function POST({ request }) {
    try {
        await request.blob();
        return new Response(null, { status: 200 });
    } catch (error) {
        return new Response("Upload failed", { status: 500 });
    }
}
