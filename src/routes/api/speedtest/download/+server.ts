export async function GET({ url }) {
    const size =
        parseInt(url.searchParams.get("size") || "0") || 5 * 1024 * 1024;
    const buffer = new ArrayBuffer(size);

    return new Response(buffer, {
        headers: {
            "Content-Type": "application/octet-stream",
            "Content-Length": size.toString(),
        },
    });
}
