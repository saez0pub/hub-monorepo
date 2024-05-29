import { executeTx } from "../db";
import { processLinkAdd } from "./link";
import { Factories, MessageType } from "@farcaster/core";
import { log } from "../log";
import { storeMessage } from "./index";
import { cleanDB, db } from "../utils.specs";

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

beforeEach(async () => {
  await cleanDB(db);
});

describe("on link event", () => {
  it("should insert in database and manage conflict", async () => {
    const fid = 42;
    const targetFid = 4242;

    const linkBody = Factories.LinkBody.build({
      type: "follow",
      targetFid,
    });

    const message = await Factories.LinkAddMessage.create({
      data: { fid, linkBody },
    });
    await executeTx(db, async (trx) => {
      await storeMessage(message, "merge", trx, log);
      await processLinkAdd(message, "merge", trx);
    });
    const messagesResult = await db
      .selectFrom("messages")
      .selectAll()
      .where("fid", "=", fid)
      .where("type", "=", MessageType.LINK_ADD)
      .execute();
    expect(messagesResult).toHaveLength(1);
    expect(
      messagesResult.map((link) => {
        return { fid: link.fid, body: { ...link.body, displayTimestamp: undefined } };
      }),
    ).toStrictEqual([{ fid: fid, body: linkBody }]);
    const linksResult = await db
      .selectFrom("links")
      .selectAll()
      .where("fid", "=", fid)
      .where("targetFid", "=", targetFid)
      .execute();
    expect(linksResult).toHaveLength(1);
    await executeTx(db, async (trx) => {
      await storeMessage(message, "merge", trx, log);
      await processLinkAdd(message, "merge", trx);
    });
    const messagesResultReplay = await db
      .selectFrom("messages")
      .selectAll()
      .where("fid", "=", fid)
      .where("type", "=", MessageType.LINK_ADD)
      .execute();
    expect(messagesResultReplay).toHaveLength(1);
    expect(
      messagesResultReplay.map((link) => {
        return { fid: link.fid, body: { ...link.body, displayTimestamp: undefined } };
      }),
    ).toStrictEqual([{ fid: fid, body: linkBody }]);
    const linksResultReplay = await db
      .selectFrom("links")
      .selectAll()
      .where("fid", "=", fid)
      .where("targetFid", "=", targetFid)
      .execute();
    expect(linksResultReplay).toHaveLength(1);
  });
});
