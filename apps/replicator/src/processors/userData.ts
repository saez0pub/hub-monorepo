import { UserDataAddMessage, UsernameProofMessage } from "@farcaster/hub-nodejs";
import { DBTransaction, execute } from "../db.js";
import { farcasterTimeToDate, StoreMessageOperation } from "../util.js";

export const processUserDataMessage = async (
  message: UserDataAddMessage,
  operation: StoreMessageOperation,
  trx: DBTransaction,
) => {
  if (operation === "merge") {
    await processUserDataAdd(message, trx);
  } else {
    await processUserDataRemove(message, trx);
  }
};

const processUserDataAdd = async (message: UserDataAddMessage, trx: DBTransaction) => {
  const now = new Date();

  await trx
    .insertInto("userData")
    .values({
      timestamp: farcasterTimeToDate(message.data.timestamp),
      fid: message.data.fid,
      hash: message.hash,
      type: message.data.userDataBody.type,
      value: message.data.userDataBody.value,
    })
    .onConflict((oc) =>
      oc
        .columns(["fid", "type"])
        .doUpdateSet(({ ref }) => ({
          hash: ref("excluded.hash"),
          timestamp: ref("excluded.timestamp"),
          value: ref("excluded.value"),
          updatedAt: now,
        }))
        .where(({ or, eb, ref }) =>
          // Only update if a value has actually changed
          or([
            eb("excluded.hash", "!=", ref("userData.hash")),
            eb("excluded.timestamp", "!=", ref("userData.timestamp")),
            eb("excluded.value", "!=", ref("userData.value")),
            eb("excluded.updatedAt", "!=", ref("userData.updatedAt")),
          ]),
        ),
    )
    .execute();
};
const processUserDataRemove = async (message: UserDataAddMessage, trx: DBTransaction) => {
  const now = new Date();

  await trx
    .updateTable("userData")
    .where("fid", "=", message.data.fid)
    .where("hash", "=", message.hash)
    .where("type", "=", message.data.userDataBody.type)
    .where("value", "=", message.data.userDataBody.value)
    .set({
      deletedAt: now,
    })
    .execute();
};
