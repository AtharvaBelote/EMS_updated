import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type UploadField = "logoUrl" | "stampUrl" | "signUrl";

const allowedContentTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

const maxFileSizeBytes = 5 * 1024 * 1024;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

function buildPublicUrl(base: string, key: string): string {
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${normalizedBase}/${key}`;
}

export async function POST(request: Request) {
  try {
    const accountId = getRequiredEnv("R2_ACCOUNT_ID");
    const accessKeyId = getRequiredEnv("R2_ACCESS_KEY_ID");
    const secretAccessKey = getRequiredEnv("R2_SECRET_ACCESS_KEY");
    const bucketName = getRequiredEnv("R2_BUCKET_NAME");
    const publicBaseUrl = getRequiredEnv("R2_PUBLIC_BASE_URL");

    const formData = await request.formData();
    const file = formData.get("file");
    const assetField = String(formData.get("assetField") || "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (!assetField || !["logoUrl", "stampUrl", "signUrl"].includes(assetField)) {
      return NextResponse.json(
        { error: "Invalid asset field." },
        { status: 400 },
      );
    }

    if (!allowedContentTypes.has(file.type)) {
      return NextResponse.json(
        { error: "Only PNG, JPG, WEBP, and SVG files are allowed." },
        { status: 400 },
      );
    }

    if (file.size > maxFileSizeBytes) {
      return NextResponse.json(
        { error: "File too large. Max size is 5 MB." },
        { status: 400 },
      );
    }

    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    const s3Client = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const extension = file.name.includes(".")
      ? file.name.split(".").pop()?.toLowerCase()
      : "bin";
    const safeFileName = sanitizeFileName(file.name || "asset");
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).slice(2, 10);
    const key = `branding/${assetField as UploadField}/${timestamp}-${randomPart}-${safeFileName}${safeFileName.includes(".") ? "" : `.${extension}`}`;

    const body = Buffer.from(await file.arrayBuffer());

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: body,
        ContentType: file.type,
      }),
    );

    return NextResponse.json({
      key,
      url: buildPublicUrl(publicBaseUrl, key),
    });
  } catch (error) {
    const err = error as {
      name?: string;
      message?: string;
      $metadata?: { httpStatusCode?: number };
    };
    const statusCode = err?.$metadata?.httpStatusCode;
    const isAccessDenied = err?.name === "AccessDenied" || statusCode === 403;
    const message = isAccessDenied
      ? "R2 access denied. Verify R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY permissions for this bucket."
      : err?.message || "Failed to upload file to Cloudflare R2.";

    console.error("R2 upload failed:", err);
    return NextResponse.json(
      { error: message },
      { status: isAccessDenied ? 403 : 500 },
    );
  }
}
