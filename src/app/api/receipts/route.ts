import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ocrConfigured, readReceipt } from "@/lib/clova-ocr";
import { verifyReceipt } from "@/lib/receipt-verify";

const MAX_BYTES = 10 * 1024 * 1024;
const DAILY_LIMIT = 10;

function sniff(buf: Buffer): "jpg" | "png" | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  return null;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "notLoggedIn" }, { status: 401 });

  const form = await request.formData();
  const hospitalId = String(form.get("hospitalId") ?? "");
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "badFile" }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const format = sniff(bytes); // trust the bytes, not the client-supplied type
  if (!format) return NextResponse.json({ error: "badFile" }, { status: 400 });

  const admin = createAdminClient();
  const { data: hospital } = await admin
    .from("hospitals")
    .select("id, name")
    .eq("id", hospitalId)
    .maybeSingle();
  if (!hospital) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await admin
    .from("receipts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.user.id)
    .gte("created_at", since);
  if ((count ?? 0) >= DAILY_LIMIT) return NextResponse.json({ error: "generic" }, { status: 429 });

  const fileHash = createHash("sha256").update(bytes).digest("hex");
  const { data: dup } = await admin.from("receipts").select("id").eq("file_hash", fileHash).maybeSingle();
  if (dup) return NextResponse.json({ error: "duplicate" }, { status: 409 });

  const storagePath = `${auth.user.id}/${crypto.randomUUID()}.${format}`;
  const { error: upErr } = await admin.storage
    .from("receipts")
    .upload(storagePath, bytes, { contentType: format === "jpg" ? "image/jpeg" : "image/png" });
  if (upErr) return NextResponse.json({ error: "generic" }, { status: 500 });

  // Automatic check. Anything that fails or can't be read goes to the manual queue.
  const ocr = await readReceipt(bytes, format);
  const verdict = ocr ? verifyReceipt(ocr.parsed, hospital.name) : null;
  const reasons = verdict ? verdict.reasons : ocrConfigured() ? ["store_name_missing", "date_missing", "total_missing"] : ["ocr_unavailable"];
  const status = verdict?.passed ? "auto_approved" : "pending";

  const { data: receipt, error } = await admin
    .from("receipts")
    .insert({
      user_id: auth.user.id,
      hospital_id: hospital.id,
      storage_path: storagePath,
      file_hash: fileHash,
      status,
      ocr_store_name: ocr?.parsed.storeName ?? null,
      ocr_paid_on: ocr?.parsed.paidOn ?? null,
      ocr_total: ocr?.parsed.total ?? null,
      match_score: verdict?.score ?? null,
      ocr_raw: { reasons, clova: ocr?.raw ?? null },
    })
    .select("id, status")
    .single();
  if (error || !receipt) {
    await admin.storage.from("receipts").remove([storagePath]);
    return NextResponse.json({ error: error?.code === "23505" ? "duplicate" : "generic" }, { status: 500 });
  }

  return NextResponse.json({ id: receipt.id, status: receipt.status, reasons });
}
