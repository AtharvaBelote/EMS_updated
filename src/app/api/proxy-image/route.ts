import { NextResponse } from "next/server";

export const runtime = "nodejs";

const R2_PUBLIC_BASE = process.env.R2_PUBLIC_BASE_URL ?? "";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  // Only allow proxying images from our own R2 bucket
  if (R2_PUBLIC_BASE && !url.startsWith(R2_PUBLIC_BASE)) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 403 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream fetch failed: ${response.status}` },
        { status: 502 },
      );
    }

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:${contentType};base64,${base64}`;

    return NextResponse.json({ dataUrl });
  } catch (err) {
    console.error("[proxy-image] fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 });
  }
}
