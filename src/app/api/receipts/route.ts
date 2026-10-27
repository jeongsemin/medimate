import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readReceipt } from "@/lib/clova-ocr";
import { isAcceptableSize, sniffImage } from "@/lib/receipt-file";
import { decideReceipt } from "@/lib/receipt-verify";

const DAILY_LIMIT = 10;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "notLoggedIn" }, { status: 401 });

  const form = await request.formData();
  const hospitalId = String(form.get("hospitalId") ?? "");
  const file = form.get("file");
  if (!(file instanceof File) || !isAcceptableSize(file.size)) {
    return NextResponse.json({ error: "badFile" }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const format = sniffImage(bytes); // trust the bytes, not the client-supplied type
  if (!format) return NextResponse.json({ error: "badFile" }, { status: 400 });

  const admin = createAdminClient();
  const { data: suspension } = await admin.from("suspensions").select("user_id").eq("user_id", auth.user.id).maybeSingle();
  if (suspension) return NextResponse.json({ error: "suspended" }, { status: 403 });

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
  const { status, reasons, score } = decideReceipt(ocr?.parsed ?? null, hospital.name);

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
      match_score: score,
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
