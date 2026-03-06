Generate all required project agents using `.motherlode/schemas/agent-instruction.schema.json`.

Required agent set:
- Architect Agent
- Refactor Agent
- Security Agent
- Test Agent
- Performance Agent
- Docs Agent
- Release Agent

For each agent, produce:
1. one valid JSON specification matching the schema,
2. one short markdown runbook with examples,
3. one acceptance checklist tied to `MOTHERLODE.md`.

Cross-agent rules:
- Keep responsibilities distinct and non-overlapping.
- Define escalation handoff points between agents.
- Require evidence output for every task.
- Include rollback and risk logging behavior.
