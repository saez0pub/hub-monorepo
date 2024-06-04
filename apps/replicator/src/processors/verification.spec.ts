import { executeTx } from "../db";
import { Factories, MessageType } from "@farcaster/core";
import { log } from "../log";
import { storeMessage } from "./index";
import { cleanDB, db } from "../utils.spec.helper";
import { bytesToHex } from "../util";
import { processVerificationAddEthAddress } from "./verification";

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

const fid = 42;
beforeEach(async () => {
  await cleanDB(db);
});

describe("on verification event", () => {
  it("should insert in database and manage conflict", async () => {
    const message = await Factories.VerificationAddEthAddressMessage.create({
      data: { fid },
    });
    const ethVerificationAdd = message.data.verificationAddAddressBody;
    await executeTx(db, async (trx) => {
      await storeMessage(message, "merge", trx, log);
      await processVerificationAddEthAddress(message, "merge", trx);
    });
    const messagesResult = await db
      .selectFrom("messages")
      .selectAll()
      .where("fid", "=", fid)
      .where("type", "=", MessageType.VERIFICATION_ADD_ETH_ADDRESS)
      .execute();
    expect(messagesResult).toHaveLength(1);
    expect(
      messagesResult.map((message) => {
        return {
          fid: message.fid,
          body: {
            ...message.body,
            chainId: 0,
            verificationType: 0,
          },
        };
      }),
    ).toStrictEqual([
      {
        fid: fid,
        body: {
          ...ethVerificationAdd,
          address: bytesToHex(ethVerificationAdd.address),
          blockHash: bytesToHex(ethVerificationAdd.blockHash),
          claimSignature: bytesToHex(ethVerificationAdd.claimSignature),
        },
      },
    ]);
    const derivedResult = await db
      .selectFrom("verifications")
      .selectAll()
      .where("fid", "=", fid)
      .where("signerAddress", "=", ethVerificationAdd.address)
      .execute();
    expect(derivedResult).toHaveLength(1);
    await executeTx(db, async (trx) => {
      await storeMessage(message, "merge", trx, log);
      await processVerificationAddEthAddress(message, "merge", trx);
    });
    const messagesResultReplay = await db
      .selectFrom("messages")
      .selectAll()
      .where("fid", "=", fid)
      .where("type", "=", MessageType.VERIFICATION_ADD_ETH_ADDRESS)
      .execute();
    expect(messagesResultReplay).toHaveLength(1);
    expect(
      messagesResultReplay.map((message) => {
        return {
          fid: message.fid,
          body: {
            ...message.body,
            chainId: 0,
            verificationType: 0,
          },
        };
      }),
    ).toStrictEqual([
      {
        fid: fid,
        body: {
          ...ethVerificationAdd,
          address: bytesToHex(ethVerificationAdd.address),
          blockHash: bytesToHex(ethVerificationAdd.blockHash),
          claimSignature: bytesToHex(ethVerificationAdd.claimSignature),
        },
      },
    ]);
    const derivedResultReplay = await db
      .selectFrom("verifications")
      .selectAll()
      .where("fid", "=", fid)
      .where("signerAddress", "=", ethVerificationAdd.address)
      .execute();
    expect(derivedResultReplay).toHaveLength(1);
    expect(log.error).not.toHaveBeenCalled();
  });
});
