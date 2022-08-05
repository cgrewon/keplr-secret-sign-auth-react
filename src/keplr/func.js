import { SecretNetworkClient } from "secretjs";

import { SCRT_CHAIN_ID, SCRT_GRPC_URL } from "../config/index";

const { toUtf8, fromBase64 } = require("@cosmjs/encoding");
const { bech32 } = require("bech32");
const { ripemd160 } = require("@noble/hashes/ripemd160");
const { sha256 } = require("@noble/hashes/sha256");
const secp256k1 = require("@noble/secp256k1");

export const getAddress = async () => {
  const keplrOfflineSigner = window.getOfflineSignerOnlyAmino(SCRT_CHAIN_ID);
  const [{ address: myAddress }] = await keplrOfflineSigner.getAccounts();
  return myAddress;
};

export const getClient = async () => {
  try {
    await window.keplr.enable(SCRT_CHAIN_ID);
    const myAddress = await getAddress();

    if (
      localStorage.getItem("signature") === null ||
      localStorage.getItem("address") !== myAddress
    ) {
      await getSignature();
      localStorage.setItem("address", myAddress);
    }

    return await SecretNetworkClient.create({
      grpcWebUrl: SCRT_GRPC_URL,
      chainId: SCRT_CHAIN_ID,
      wallet: window.getOfflineSignerOnlyAmino(SCRT_CHAIN_ID),
      walletAddress: myAddress,
      encryptionUtils: window.getEnigmaUtils(SCRT_CHAIN_ID),
    });
  } catch (e) {
    console.error(e.message);
    return undefined;
  }
};

export const getSignature = async () => {
  const myAddress = await getAddress();

  const permit = await window.keplr.signAmino(
    SCRT_CHAIN_ID,
    myAddress,
    {
      chain_id: SCRT_CHAIN_ID,
      account_number: "0",
      sequence: "0",
      fee: {
        amount: [{ denom: "uscrt", amount: "0" }],
        gas: "1",
      },
      msgs: [
        {
          type: "veirfy-memo",
          value:
            "This is a signature request. Accepting this request will allow us to verify ownership of your wallet. ",
        },
      ],
      memo: "Created by keplr",
    },
    {
      preferNoSetFee: true, // Fee must be 0, so hide it from the user
      preferNoSetMemo: false,
    }
  );

  localStorage.setItem("signature", JSON.stringify(permit));
  return permit;
};

/**
 * Verify signature and address
 */

const sortedObject = (obj) => {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortedObject);
  }
  const sortedKeys = Object.keys(obj).sort();
  const result = {};
  sortedKeys.forEach((key) => {
    result[key] = sortedObject(obj[key]);
  });
  return result;
};

const JsonSortedStringify = (obj) => {
  return JSON.stringify(sortedObject(obj));
};
const serializeStdSignDoc = (signDoc) => {
  return toUtf8(JsonSortedStringify(signDoc));
};

export const checkSignature = async (permit, address) => {
  console.log("permit: ", permit);
  // Check signature address matches sending address
  const signature = permit.signature.signature;
  const pubkey = permit.signature.pub_key.value;
  const signed = permit.signed;

  console.log({signature, pubkey, signed, });

  const derivedAddress = bech32.encode(
    "secret",
    bech32.toWords(ripemd160(sha256(fromBase64(pubkey))))
  );

  if (address !== derivedAddress) {
    return false;
  }

  try {
    const messageHash = sha256(serializeStdSignDoc(signed));

    const sig = secp256k1.Signature.fromCompact(fromBase64(signature));

    return secp256k1.verify(sig, messageHash, fromBase64(pubkey));
  } catch (e) {
    console.error(e);
    return false;
  }
};
