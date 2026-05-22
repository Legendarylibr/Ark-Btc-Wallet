#!/usr/bin/env node
/**
 * Cross-platform reminders for local firewall / barkd binding.
 */
import { spawnSync } from "node:child_process";
import os from "node:os";

console.log("Ark Wallet local lockdown helper");
console.log("Ensure barkd listens on 127.0.0.1 only (never 0.0.0.0).");
console.log("");
console.log("Check listening ports:");

if (process.platform === "win32") {
  console.log("  netstat -ano | findstr :3535");
  console.log("  netstat -ano | findstr :3000");
  console.log("");
  console.log(
    "Use Windows Defender Firewall to block inbound rules on 3000/3535 if needed.",
  );
} else {
  console.log("  lsof -i :3535   # barkd should show 127.0.0.1");
  console.log("  lsof -i :3000   # Next.js should show 127.0.0.1");
  console.log("");
  if (os.platform() === "linux") {
    const ufw = spawnSync("which", ["ufw"], { encoding: "utf8" });
    if (ufw.status === 0) {
      console.log("Linux ufw (optional):");
      console.log("  sudo ufw deny in 3000");
      console.log("  sudo ufw deny in 3535");
    } else {
      console.log("Configure your firewall to block LAN access to 3000 and 3535.");
    }
  } else {
    console.log(
      "macOS: use pf or System Settings → Firewall; see Apple docs for port rules.",
    );
  }
}
