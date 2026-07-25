import { useEffect, useState } from "react";
import { SOCKET_URL } from "../config";

export default function HistoryTab({ deploymentId }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    fetch(`${SOCKET_URL}/api/deployments/${deploymentId}/history`, {
      credentials: "include",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setRows)
      .catch(console.error);
  }, [deploymentId]);

  if (!rows.length) {
    return <div className="text-zinc-400">No deployment history found.</div>;
  }

  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div
          key={r.revision}
          className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Revision #{r.revision}</h3>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                r.status === "RUNNING"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-yellow-500/20 text-yellow-400"
              }`}
            >
              {r.status}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-zinc-500">Commit</p>
              <p className="font-mono">{r.commitSha?.slice(0, 8)}</p>
            </div>

            <div>
              <p className="text-zinc-500">Branch</p>
              <p>{r.branch}</p>
            </div>

            <div>
              <p className="text-zinc-500">Author</p>
              <p>{r.commitAuthor}</p>
            </div>

            <div>
              <p className="text-zinc-500">Deployed</p>
              <p>
                {r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}
              </p>
            </div>

            <div className="col-span-2">
              <p className="text-zinc-500">Message</p>
              <p>{r.commitMessage}</p>
            </div>

            <div className="col-span-2">
              <p className="text-zinc-500">Kubernetes Change Cause</p>
              <p>{r.changeCause}</p>
            </div>
            <button
              className="mt-4 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              onClick={async () => {
                const res = await fetch(
                  `${SOCKET_URL}/api/deployments/${deploymentId}/rollback/${r.revision}`,
                  {
                    method: "POST",
                    credentials: "include",
                  },
                );

                if (!res.ok) {
                  alert("Rollback failed");
                  return;
                }

                alert(`Rolled back to revision ${r.revision}`);
              }}
            >
              Rollback to Revision {r.revision}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
