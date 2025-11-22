import fetch from "node-fetch";
import { ethers } from "ethers";

const ALCHEMY_KEY = process.env.ALCHEMY_KEY; // put full key here via Vercel env
const ALCHEMY_RPC_URL = process.env.ALCHEMY_RPC_URL || `https://gensyn-testnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;

export default async function handler(req, res) {
  const address = (req.query.address || "").toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(address)) {
    res.status(400).json({ error: "Invalid address" });
    return;
  }
  if (!ALCHEMY_KEY) {
    res.status(500).json({ error: "ALCHEMY_KEY not configured on server" });
    return;
  }

  try {
    // 1) get transaction count (nonce) via eth_getTransactionCount
    const rpcPayload = {
      id: 1,
      jsonrpc: "2.0",
      method: "eth_getTransactionCount",
      params: [address, "latest"]
    };
    const rpcResp = await fetch(ALCHEMY_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rpcPayload)
    });
    const rpcJson = await rpcResp.json();
    const txCountHex = rpcJson.result;
    const txCount = txCountHex ? parseInt(txCountHex, 16) : 0;

    // 2) try Alchemy asset transfers (may be paginated)
    // We'll request first page of transfers involving the address (both from and to) and return count & sample.
    // NOTE: alchemy_getAssetTransfers params object supports categories array and fromBlock/toBlock and address filters.
    const transfersPayload = {
      id: 1,
      jsonrpc: "2.0",
      method: "alchemy_getAssetTransfers",
      params: [
        {
          fromBlock: "0x0",
          toBlock: "latest",
          // both directions: we'll include both fromAddress and toAddress by making 2 requests OR use addresses filter if supported.
          // Many Alchemy networks support fromAddress or toAddress. We'll call twice (from and to) and merge results.
          fromAddress: address,
          category: ["external", "internal", "erc20", "erc721"]
        },
        { maxCount: "0x3e8" } // optional: request up to 1000 (hex) results for page (may be limited)
      ]
    };

    // call for outgoing transfers
    const tOutResp = await fetch(ALCHEMY_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transfersPayload)
    });
    const tOutJson = await tOutResp.json();
    const outTransfers = (tOutJson.result && tOutJson.result.transfers) || [];

    // call for incoming transfers (toAddress)
    const transfersPayloadIn = {
      id: 1,
      jsonrpc: "2.0",
      method: "alchemy_getAssetTransfers",
      params: [
        {
          fromBlock: "0x0",
          toBlock: "latest",
          toAddress: address,
          category: ["external", "internal", "erc20", "erc721"]
        },
        { maxCount: "0x3e8" }
      ]
    };
    const tInResp = await fetch(ALCHEMY_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transfersPayloadIn)
    });
    const tInJson = await tInResp.json();
    const inTransfers = (tInJson.result && tInJson.result.transfers) || [];

    // Merge unique tx hashes
    const allTransfersMap = new Map();
    for (const t of outTransfers) allTransfersMap.set(t.hash + (t.category||""), t);
    for (const t of inTransfers) allTransfersMap.set(t.hash + (t.category||""), t);
    const allTransfers = Array.from(allTransfersMap.values());

    res.status(200).json({
      address,
      txCount,
      assetTransfersCount: allTransfers.length,
      sampleTransfers: allTransfers.slice(0, 10)
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
}
