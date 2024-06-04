import { executeTx } from "../db";
import { Factories, getFarcasterTime, MessageType, UserDataType } from "@farcaster/core";
import { log } from "../log";
import { storeMessage } from "./index";
import { cleanDB, db } from "../utils.spec.helper";
import { bytesToHex } from "../util";
import { processVerificationAddEthAddress } from "./verification";
import { processUserDataMessage } from "./userData";

jest.mock("bullmq", () => {
  return {
    Queue: jest.fn().mockImplementation(() => {
      return {
        add: jest.fn(),
      };
    }),
  };
});

jest.mock("../log", () => ({
  log: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    child: jest.fn(),
  },
}));

let fid: number;
beforeAll(async () => {
  await cleanDB(db);
});

describe("on reaction event", () => {
  it("should insert in database and manage conflict", async () => {
    fid = 42;
    const time = getFarcasterTime()._unsafeUnwrap() - 10;
    const username = `test${fid}`;
    const message = await Factories.UserDataAddMessage.create({
      data: { fid, timestamp: time, userDataBody: { type: UserDataType.USERNAME, value: username } },
    });
    await executeTx(db, async (trx) => {
      await storeMessage(message, "merge", trx, log);
      await processUserDataMessage(message, "merge", trx);
    });
    const messagesResult = await db
      .selectFrom("messages")
      .selectAll()
      .where("fid", "=", fid)
      .where("type", "=", MessageType.USER_DATA_ADD)
      .execute();
    expect(messagesResult).toHaveLength(1);
    expect(
      messagesResult.map((message) => {
        return {
          fid: message.fid,
          body: message.body,
        };
      }),
    ).toStrictEqual([
      {
        fid: fid,
        body: {
          type: UserDataType.USERNAME,
          value: username,
        },
      },
    ]);
    const derivedResult = await db
      .selectFrom("userData")
      .selectAll()
      .where("fid", "=", fid)
      .where("type", "=", UserDataType.USERNAME)
      .execute();
    expect(derivedResult).toHaveLength(1);
    const newUsername = "test${fid}-2";
    const newMessage = await Factories.UserDataAddMessage.create({
      data: { fid, timestamp: time + 10, userDataBody: { type: UserDataType.USERNAME, value: newUsername } },
    });
    await executeTx(db, async (trx) => {
      await storeMessage(newMessage, "merge", trx, log);
      await processUserDataMessage(newMessage, "merge", trx);
      // The deletion should not update a new username
      await storeMessage(message, "delete", trx, log);
      await processUserDataMessage(message, "delete", trx);
    });
    const messagesResultReplay = await db
      .selectFrom("messages")
      .selectAll()
      .where("fid", "=", fid)
      .where("type", "=", MessageType.USER_DATA_ADD)
      .where("deletedAt", "is", null)
      .execute();
    expect(messagesResultReplay).toHaveLength(1);
    expect(
      messagesResultReplay.map((message) => {
        return {
          fid: message.fid,
          body: message.body,
        };
      }),
    ).toStrictEqual([
      {
        fid: fid,
        body: {
          type: UserDataType.USERNAME,
          value: newUsername,
        },
      },
    ]);
    const derivedResultReplay = await db
      .selectFrom("userData")
      .selectAll()
      .where("fid", "=", fid)
      .where("type", "=", UserDataType.USERNAME)
      .where("value", "=", newUsername)
      .where("deletedAt", "is", null)
      .execute();
    expect(derivedResultReplay).toHaveLength(1);
    expect(log.error).not.toHaveBeenCalled();
  });
  it("should update the derived row on delete message", async () => {
    fid = 43;
    const time = getFarcasterTime()._unsafeUnwrap() - 10;
    const username = `test${fid}`;
    const message = await Factories.UserDataAddMessage.create({
      data: { fid, timestamp: time, userDataBody: { type: UserDataType.USERNAME, value: username } },
    });
    await executeTx(db, async (trx) => {
      await storeMessage(message, "merge", trx, log);
      await processUserDataMessage(message, "merge", trx);
    });
    const messagesResult = await db
      .selectFrom("messages")
      .selectAll()
      .where("fid", "=", fid)
      .where("type", "=", MessageType.USER_DATA_ADD)
      .where("deletedAt", "is", null)
      .execute();
    expect(messagesResult).toHaveLength(1);
    await executeTx(db, async (trx) => {
      await storeMessage(message, "delete", trx, log);
      await processUserDataMessage(message, "delete", trx);
    });
    const messagesResultReplay = await db
      .selectFrom("messages")
      .selectAll()
      .where("fid", "=", fid)
      .where("type", "=", MessageType.USER_DATA_ADD)
      .where("deletedAt", "is", null)
      .execute();
    expect(messagesResultReplay).toHaveLength(0);
  });
});
