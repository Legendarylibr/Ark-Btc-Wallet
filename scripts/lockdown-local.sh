#!/usr/bin/env bash
# Optional: block inbound connections to barkd (3535) and Ark Wallet (3000).
# Requires root. Linux example with ufw; macOS use pf or skip.
set -euo pipefail

echo "Ark Wallet local lockdown helper"
echo "Ensure barkd listens on 127.0.0.1 only (never 0.0.0.0)."
echo ""
echo "Manual checks:"
echo "  lsof -i :3535   # barkd should show 127.0.0.1"
echo "  lsof -i :3000   # next should show 127.0.0.1"
echo ""
if command -v ufw >/dev/null 2>&1; then
  echo "Linux ufw: deny public access to wallet ports (optional):"
  echo "  sudo ufw deny in 3000"
  echo "  sudo ufw deny in 3535"
else
  echo "Configure your OS firewall to block LAN/inbound access to ports 3000 and 3535."
fi
