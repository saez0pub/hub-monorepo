import { createMigrator, executeTx, getDbClient, migrateToLatest, Tables } from "./db";
import { log } from "./log";
import { Kysely, NO_MIGRATIONS } from "kysely";
import { Factories } from "@farcaster/core";
import { processOnChainEvent } from "./processors/onChainEvent";

export const db = getDbClient("postgres://replicator:password-tests@localhost:6542/replicator");

export async function cleanDB(db: Kysely<Tables>) {
  const migrator = await createMigrator(db, log);
  const { error, results } = await migrator.migrateTo(NO_MIGRATIONS);
  results?.forEach((it) => {
    if (it.status === "Success") {
      log.info(`Migration "${it.migrationName}" was downgraded successfully`);
    } else if (it.status === "Error") {
      log.error(`failed to downgrade migration "${it.migrationName}"`);
    }
  });

  if (error) {
    log.error("Failed to downgrade all database migrations");
    log.error(error);
  }

  log.info("Migrations downgraded");
  expect(error).toStrictEqual(undefined);
  const migration = await migrateToLatest(db, log);
  if (migration.isErr()) console.log(migration);
  expect(migration.isErr()).not.toBe(true);
  for (const fidToCreate of [42, 4242]) {
    const fidEvent = Factories.IdRegistryOnChainEvent.build({ fid: fidToCreate });
    await executeTx(db, async (trx) => {
      await processOnChainEvent(fidEvent, trx);
    });
  }
}
