const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function collectOwners(codeownersContent) {
  const owners = new Set();
  for (const line of codeownersContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    for (const match of trimmed.matchAll(/@[A-Za-z0-9_.-]+/g)) {
      owners.add(match[0]);
    }
  }

  return owners;
}

function workflowUsesPinnedActions(content) {
  const usesLines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('uses: '));

  return usesLines.every((line) => {
    if (line.includes('uses: ./')) {
      return true;
    }

    return /uses:\s+[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)?@[0-9a-f]{40}\b/.test(
      line
    );
  });
}

const codeowners = read('.github/CODEOWNERS');
const security = read('SECURITY.md');
const ciWorkflow = read('.github/workflows/ci.yml');
const codeqlWorkflow = read('.github/workflows/codeql.yml');
const scorecardWorkflow = read('.github/workflows/scorecards.yml');
const owners = collectOwners(codeowners);

const checks = [
  {
    id: 'docs',
    ok:
      exists('README.md') &&
      exists('CONTRIBUTING.md') &&
      exists('SECURITY.md') &&
      exists('RUNBOOK.md') &&
      exists('THREAT_MODEL.md') &&
      exists('OPENSSF.md'),
    evidence: 'core docs present',
  },
  {
    id: 'governance',
    ok: exists('CODE_OF_CONDUCT.md') && exists('MAINTAINERS.md') && exists('.github/CODEOWNERS'),
    evidence: 'conduct, maintainer, and ownership docs present',
  },
  {
    id: 'owners',
    ok: owners.size >= 2,
    evidence: `CODEOWNERS unique owners: ${owners.size}`,
  },
  {
    id: 'security-reporting',
    ok: !security.includes('.local') && /14 days/i.test(security) && /60 days/i.test(security),
    evidence: 'security policy uses repository-based contact path and response targets',
  },
  {
    id: 'dependabot',
    ok: exists('.github/dependabot.yml'),
    evidence: 'dependency update automation configured',
  },
  {
    id: 'workflow-pinning',
    ok:
      workflowUsesPinnedActions(ciWorkflow) &&
      workflowUsesPinnedActions(codeqlWorkflow) &&
      workflowUsesPinnedActions(scorecardWorkflow),
    evidence: 'workflow actions pinned by full commit SHA',
  },
  {
    id: 'scorecard-workflow',
    ok: scorecardWorkflow.includes('ossf/scorecard-action@'),
    evidence: 'official Scorecard workflow configured',
  },
];

let failed = false;

for (const check of checks) {
  const status = check.ok ? 'PASS' : 'FAIL';
  console.log(`${status} ${check.id}: ${check.evidence}`);
  if (!check.ok) {
    failed = true;
  }
}

if (failed) {
  process.exitCode = 1;
}
