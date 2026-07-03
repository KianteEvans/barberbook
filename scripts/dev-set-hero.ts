import postgres from "postgres";
import { saveUpload, deleteUpload } from "../src/domain/barbers/uploads.js";

/**
 * Dev-only: set or clear the landing hero via the real upload pipeline.
 * Usage: npx tsx scripts/dev-set-hero.ts [clear]
 */

const CONN =
  process.env.DATABASE_URL ??
  "postgres://postgres:password@localhost:54333/barberbook";

// 1x1 PNG; enough to exercise storage + rendering.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function main(): Promise<void> {
  const sql = postgres(CONN, { max: 1, onnotice: () => {} });
  try {
    const [row] = await sql`SELECT hero_file FROM shop_settings WHERE id = 1`;
    if (process.argv[2] === "clear") {
      await sql`UPDATE shop_settings SET hero_file = NULL WHERE id = 1`;
      if (row?.hero_file) await deleteUpload(row.hero_file as string);
      console.log("[dev] hero cleared");
      return;
    }
    const file = new File([PNG], "hero.png", { type: "image/png" });
    const name = await saveUpload(file);
    await sql`UPDATE shop_settings SET hero_file = ${name} WHERE id = 1`;
    if (row?.hero_file) await deleteUpload(row.hero_file as string);
    console.log("[dev] hero set to", name);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
