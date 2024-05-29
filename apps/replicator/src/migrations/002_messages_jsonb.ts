import { Kysely } from "kysely";

// biome-ignore lint/suspicious/noExplicitAny: legacy code, avoid using ignore for new code
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("messages")
    .alterColumn("body", (column) => column.setDataType("jsonb"))
    .execute();
  await db.schema
    .createIndex("jean_messages_fid_type")
    .using("btree")
    .on("messages")
    .columns(["fid", "type"])
    .execute();
  await db.schema.createIndex("jean_messages_body").using("gin").on("messages").column("body").execute();
}

// biome-ignore lint/suspicious/noExplicitAny: legacy code, avoid using ignore for new code
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex("jean_messages_body").ifExists().execute();
  await db.schema
    .alterTable("messages")
    .alterColumn("body", (column) => column.setDataType("json"))
    .execute();
  await db.schema.dropIndex("jean_messages_fid_type").ifExists().execute();
}
