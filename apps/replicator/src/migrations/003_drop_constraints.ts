import { Kysely, sql } from "kysely";
import { PARTITIONS } from "../env";

type Constraint = {
  constraintName: string;
  tableName: string;
  columns: string[];
  targetTable: string;
  targetColumns: string[];
};
const constraints: Constraint[] = [
  {
    constraintName: PARTITIONS ? "fids_chain_event_id_fid_foreign" : "fids_chain_event_id_foreign",
    tableName: "fids",
    columns: PARTITIONS ? ["chainEventId", "fid"] : ["chainEventId"],
    targetTable: "chainEvents",
    targetColumns: PARTITIONS ? ["id", "fid"] : ["id"],
  },
  {
    constraintName: "signers_fid_foreign",
    tableName: "signers",
    columns: ["fid"],
    targetTable: "fids",
    targetColumns: ["fid"],
  },
  {
    constraintName: "signers_requester_fid_foreign",
    tableName: "signers",
    columns: ["requesterFid"],
    targetTable: "fids",
    targetColumns: ["fid"],
  },
  {
    constraintName: "signers_add_chain_event_id_foreign",
    tableName: "signers",
    columns: PARTITIONS ? ["addChainEventId", "fid"] : ["addChainEventId"],
    targetTable: "chainEvents",
    targetColumns: PARTITIONS ? ["id", "fid"] : ["id"],
  },
  {
    constraintName: "signers_remove_chain_event_id_foreign",
    tableName: "signers",
    columns: PARTITIONS ? ["removeChainEventId", "fid"] : ["removeChainEventId"],
    targetTable: "chainEvents",
    targetColumns: PARTITIONS ? ["id", "fid"] : ["id"],
  },
  {
    constraintName: "username_proofs_fid_foreign",
    tableName: "usernameProofs",
    columns: ["fid"],
    targetTable: "fids",
    targetColumns: ["fid"],
  },
  {
    constraintName: "fnames_fid_foreign",
    tableName: "fnames",
    columns: ["fid"],
    targetTable: "fids",
    targetColumns: ["fid"],
  },
  {
    constraintName: "messages_fid_foreign",
    tableName: "messages",
    columns: ["fid"],
    targetTable: "fids",
    targetColumns: ["fid"],
  },
  {
    constraintName: "messages_signer_fid_foreign",
    tableName: "messages",
    columns: ["fid", "signer"],
    targetTable: "signers",
    targetColumns: ["fid", "key"],
  },
  {
    constraintName: "casts_fid_foreign",
    tableName: "casts",
    columns: ["fid"],
    targetTable: "fids",
    targetColumns: ["fid"],
  },
  {
    constraintName: "casts_hash_foreign",
    tableName: "casts",
    columns: PARTITIONS ? ["hash", "fid"] : ["hash"],
    targetTable: "messages",
    targetColumns: PARTITIONS ? ["hash", "fid"] : ["hash"],
  },
  {
    constraintName: "reactions_fid_foreign",
    tableName: "reactions",
    columns: ["fid"],
    targetTable: "fids",
    targetColumns: ["fid"],
  },
  {
    constraintName: "reactions_hash_foreign",
    tableName: "reactions",
    columns: PARTITIONS ? ["hash", "fid"] : ["hash"],
    targetTable: "messages",
    targetColumns: PARTITIONS ? ["hash", "fid"] : ["hash"],
  },
  {
    constraintName: PARTITIONS ? "reactions_target_hash_fid_foreign" : "reactions_target_hash_foreign",
    tableName: "reactions",
    columns: PARTITIONS ? ["targetCastHash", "targetCastFid"] : ["targetCastHash"],
    targetTable: "casts",
    targetColumns: PARTITIONS ? ["hash", "fid"] : ["hash"],
  },
  {
    constraintName: "links_fid_foreign",
    tableName: "links",
    columns: ["fid"],
    targetTable: "fids",
    targetColumns: ["fid"],
  },
  {
    constraintName: "links_target_fid_foreign",
    tableName: "links",
    columns: ["targetFid"],
    targetTable: "fids",
    targetColumns: ["fid"],
  },
  {
    constraintName: "verifications_fid_foreign",
    tableName: "verifications",
    columns: ["fid"],
    targetTable: "fids",
    targetColumns: ["fid"],
  },
  {
    constraintName: "verifications_hash_foreign",
    tableName: "verifications",
    columns: PARTITIONS ? ["hash", "fid"] : ["hash"],
    targetTable: "messages",
    targetColumns: PARTITIONS ? ["hash", "fid"] : ["hash"],
  },
  {
    constraintName: "user_data_fid_foreign",
    tableName: "userData",
    columns: ["fid"],
    targetTable: "fids",
    targetColumns: ["fid"],
  },
  {
    constraintName: PARTITIONS ? "user_data_hash_fid_foreign" : "user_data_hash_foreign",
    tableName: "userData",
    columns: PARTITIONS ? ["hash", "fid"] : ["hash"],
    targetTable: "messages",
    targetColumns: PARTITIONS ? ["hash", "fid"] : ["hash"],
  },
  {
    constraintName: PARTITIONS
      ? "storage_allocations_chain_event_id_fid_foreign"
      : "storage_allocations_chain_event_id_foreign",
    tableName: "storageAllocations",
    columns: PARTITIONS ? ["chainEventId", "fid"] : ["chainEventId"],
    targetTable: "chainEvents",
    targetColumns: PARTITIONS ? ["id", "fid"] : ["id"],
  },
];

// biome-ignore lint/suspicious/noExplicitAny: legacy code, avoid using ignore for new code
export async function up(db: Kysely<any>): Promise<void> {
  for (const constraint of constraints) {
    await db.schema.alterTable(constraint.tableName).dropConstraint(constraint.constraintName).execute();
  }
}

// biome-ignore lint/suspicious/noExplicitAny: legacy code, avoid using ignore for new code
export async function down(db: Kysely<any>): Promise<void> {
  //   for (const constraint of constraints) {
  //     const query = db.schema.alterTable(constraint.tableName)
  //       .addForeignKeyConstraint(constraint.constraintName, constraint.columns, constraint.targetTable, constraint.targetColumns)
  //       .onDelete("cascade");
  //     console.log(query.compile());
  //     try {
  //       await query.execute();
  //     } catch {
  //
  //     }
  //   }
}
