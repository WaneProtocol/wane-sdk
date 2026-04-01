// Read the antibody registry on Base before an agent signs. Free view call,
// no wallet needed. Run with: tsx examples/base-check.ts <address>
import { Wane } from "wane-sdk";

async function main() {
  const target = (process.argv[2] ??
    "0x1465E33f687C557BF275D6d692eC1316126d8e9e") as `0x${string}`;

  const wane = Wane.base();

  const verdict = await wane.checkAddress(target);
  if (verdict.flagged) {
    console.log(`blocked: ${target} is flagged by antibody #${verdict.antibodyId}`);
  } else {
    console.log(`clear: ${target} carries no active antibody`);
  }

  // herd feed: what the swarm learned recently
  const total = await wane.count();
  const recent = await wane.recent(5);
  console.log(`registry knows ${total} antibodies; latest ${recent.length}:`);
  for (const ab of recent) {
    console.log(`  #${ab.id} kind=${ab.kind} subject=${ab.subject} block=${ab.blockNumber}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
