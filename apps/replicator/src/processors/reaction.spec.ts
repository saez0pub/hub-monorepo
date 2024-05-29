import { executeTx } from "../db";
import { CastId, Factories, MessageType, ReactionType } from "@farcaster/core";
import { log } from "../log";
import { storeMessage } from "./index";
import { cleanDB, db } from "../utils.specs";
import { processReactionAdd } from "./reaction";
import { processCastAdd } from "./cast";
import { bytesToHex } from "../util";

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
const targetFid = 4242;
beforeEach(async () => {
  await cleanDB(db);
  castId = Factories.CastId.build({ fid: targetFid });
  const CastMessage = Factories.CastAddMessage.build({
    hash: castId.hash,
    data: {
      fid: castId.fid,
      castAddBody: {
        parentCastId: undefined,
      },
    },
  });
  await executeTx(db, async (trx) => {
    await processCastAdd(CastMessage, "merge", trx);
  });
});

describe("on reaction event", () => {
  it("should insert in database and manage conflict", async () => {
    const reactionBody = Factories.ReactionBody.build({
      type: ReactionType.LIKE,
      targetCastId: castId,
    });

    const message = await Factories.ReactionAddMessage.create({
      data: { fid, reactionBody: reactionBody },
    });
    await executeTx(db, async (trx) => {
      await storeMessage(message, "merge", trx, log);
      await processReactionAdd(message, "merge", trx);
    });
    const messagesResult = await db
      .selectFrom("messages")
      .selectAll()
      .where("fid", "=", fid)
      .where("type", "=", MessageType.REACTION_ADD)
      .execute();
    expect(messagesResult).toHaveLength(1);
    expect(
      messagesResult.map((reaction) => {
        return { fid: reaction.fid, body: { ...reaction.body, targetUrl: undefined } };
      }),
    ).toStrictEqual([
      {
        fid: fid,
        body: { ...reactionBody, targetCastId: { fid: targetFid, hash: bytesToHex(reactionBody.targetCastId?.hash) } },
      },
    ]);
    const reactionResult = await db
      .selectFrom("reactions")
      .selectAll()
      .where("fid", "=", fid)
      .where("targetCastFid", "=", targetFid)
      .execute();
    expect(reactionResult).toHaveLength(1);
    await executeTx(db, async (trx) => {
      await storeMessage(message, "merge", trx, log);
      await processReactionAdd(message, "merge", trx);
    });
    const messagesResultReplay = await db
      .selectFrom("messages")
      .selectAll()
      .where("fid", "=", fid)
      .where("type", "=", MessageType.REACTION_ADD)
      .execute();
    expect(messagesResultReplay).toHaveLength(1);
    expect(
      messagesResultReplay.map((reaction) => {
        return { fid: reaction.fid, body: { ...reaction.body, targetUrl: undefined } };
      }),
    ).toStrictEqual([
      {
        fid: fid,
        body: { ...reactionBody, targetCastId: { fid: targetFid, hash: bytesToHex(reactionBody.targetCastId?.hash) } },
      },
    ]);
    const reactionResultReplay = await db
      .selectFrom("reactions")
      .selectAll()
      .where("fid", "=", fid)
      .where("targetCastFid", "=", targetFid)
      .execute();
    expect(reactionResultReplay).toHaveLength(1);
  });
});
