# Runbook: Using GitHub Copilot to build Pilma Identity Firewall

1) Open repo in VS Code
2) Enable Copilot Chat + (if available) Agent Mode
3) Give Copilot this instruction:
   - "Use the file agents/IdentityFirewallBuilder.agent.md as your system spec.
      Create PR0 exactly as defined. Do not jump ahead."

4) For each PR:
   - Ask Copilot: "Show me the plan + the exact file diffs + how to test."
   - Run tests locally
   - Only then merge

5) If Copilot proposes bundling a model:
   - Reject. Remind it: user-download only (license + size).
