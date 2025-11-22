import { useState } from "react";

export default function Home() {
  const [addr, setAddr] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");

  async function check() {
    setErr("");
    setRes(null);
    if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      setErr("Enter a valid EVM address (0x...)");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/check?address=" + addr);
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || "Unknown error");
      } else {
        setRes(j);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: "Inter,system-ui,Arial", padding: 40, background: "#0b0b0f", color: "#fff", minHeight: "100vh" }}>
      <h1 style={{ textAlign: "center", marginBottom: 20 }}>Gensyn Testnet Tx Checker</h1>

      <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
        <input
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          placeholder="paste EVM address (0x...)"
          style={{ width: "100%", padding: "14px 12px", fontSize: 16, borderRadius: 10, border: "1px solid #333", marginBottom: 12 }}
        />
        <button onClick={check} style={{ padding: "10px 18px", borderRadius: 8, background: "#7b3cff", color: "#fff", border: "none" }}>
          {loading ? "Checking..." : "Check"}
        </button>

        <div style={{ marginTop: 18, color: "#faa" }}>{err}</div>

        {res && (
          <div style={{ marginTop: 22, textAlign: "left", background: "#0f0f12", padding: 18, borderRadius: 8, border: "1px solid #222" }}>
            <h3>Results for {res.address}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ background: "#15151a", padding: 10, borderRadius: 6 }}>
                <div style={{ fontSize: 12, color: "#aaa" }}>Txs (sent, nonce)</div>
                <div style={{ fontSize: 20 }}>{res.txCount}</div>
              </div>

              <div style={{ background: "#15151a", padding: 10, borderRadius: 6 }}>
                <div style={{ fontSize: 12, color: "#aaa" }}>Transfers found (alchemy_getAssetTransfers)</div>
                <div style={{ fontSize: 20 }}>{res.assetTransfersCount}</div>
              </div>

              <div style={{ gridColumn: "1 / -1", background: "#15151a", padding: 10, borderRadius: 6 }}>
                <div style={{ fontSize: 12, color: "#aaa" }}>Optional details (first page sample)</div>
                <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "#ddd" }}>{JSON.stringify(res.sampleTransfers || [], null, 2)}</pre>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer style={{ opacity: 0.6, marginTop: 40, textAlign: "center" }}>
        Note: Alchemy free key may have rate limits. If results are empty, try again later.
      </footer>
    </div>
  );
}
