import { executeTx } from "../db";
import { CastId, Factories, MessageType } from "@farcaster/core";
import { log } from "../log";
import { storeMessage } from "./index";
import { cleanDB, db } from "../utils.specs";
import { processCastAdd } from "./cast";

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

let castId: CastId;
const fid = 42;
beforeEach(async () => {
  await cleanDB(db);
});

describe("on verification event", () => {
  it("should insert in database and manage conflict", async () => {
    castId = Factories.CastId.build({ fid: fid });
    const messageToPush = Factories.CastAddMessage.build({
      hash: castId.hash,
      data: {
        fid: castId.fid,
        castAddBody: {
          parentCastId: undefined,
        },
      },
    });
    await executeTx(db, async (trx) => {
      await storeMessage(messageToPush, "merge", trx, log);
      await processCastAdd(messageToPush, "merge", trx);
    });
    const messagesResult = await db
      .selectFrom("messages")
      .selectAll()
      .where("fid", "=", fid)
      .where("type", "=", MessageType.CAST_ADD)
      .execute();
    expect(messagesResult).toHaveLength(1);
    expect(
      messagesResult.map((message) => {
        return {
          fid: message.fid,
          body: {
            ...message.body,
            embeds: messageToPush.data.castAddBody.embeds,
            embedsDeprecated: messageToPush.data.castAddBody.embedsDeprecated,
            parentUrl: messageToPush.data.castAddBody.parentUrl,
            parentCastId: messageToPush.data.castAddBody.parentCastId,
          },
        };
      }),
    ).toStrictEqual([
      {
        fid: fid,
        body: {
          ...messageToPush.data.castAddBody,
        },
      },
    ]);
    const derivedResult = await db.selectFrom("casts").selectAll().where("fid", "=", fid).execute();
    expect(derivedResult).toHaveLength(1);
    await executeTx(db, async (trx) => {
      await storeMessage(messageToPush, "merge", trx, log);
      await processCastAdd(messageToPush, "merge", trx);
    });
    const messagesResultReplay = await db
      .selectFrom("messages")
      .selectAll()
      .where("fid", "=", fid)
      .where("type", "=", MessageType.CAST_ADD)
      .execute();
    expect(messagesResultReplay).toHaveLength(1);
    expect(
      messagesResult.map((message) => {
        return {
          fid: message.fid,
          body: {
            ...message.body,
            embeds: messageToPush.data.castAddBody.embeds,
            embedsDeprecated: messageToPush.data.castAddBody.embedsDeprecated,
            parentUrl: messageToPush.data.castAddBody.parentUrl,
            parentCastId: messageToPush.data.castAddBody.parentCastId,
          },
        };
      }),
    ).toStrictEqual([
      {
        fid: fid,
        body: {
          ...messageToPush.data.castAddBody,
        },
      },
    ]);
    const derivedResultReplay = await db.selectFrom("casts").selectAll().where("fid", "=", fid).execute();
    expect(derivedResultReplay).toHaveLength(1);
    expect(log.error).not.toHaveBeenCalled();
  });
});
