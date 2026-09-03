import { normalizeColumn, parseMarkdownTable } from './markdown-table.mjs';
import { functionalMatrixContent } from './markdown-section.mjs';
import { idsFromText, normalizeId } from './gherkin-validate.mjs';
import { NFR_ATTRIBUTES, parseNfrTraceabilityTable } from './nfr-coverage.mjs';

const REQUIRED_FUNCTIONAL_COLUMNS = [
  'Requirement Source',
  'RF',
  'Feature File',
  'Test Management Case ID',
  'Type',
  'Priority',
  'Automation Status'
];

function normalizeAutomationStatus(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function isProposalOnly(status) {
  const normalized = normalizeAutomationStatus(status);
  return normalized === 'proposal-only' || normalized === 'proposed';
}

function isAutomated(status) {
  const normalized = normalizeAutomationStatus(status);
  return ['automated', 'partial', 'ready'].includes(normalized);
}

function isManual(status) {
  const normalized = normalizeAutomationStatus(status);
  return normalized === 'manual' || normalized === 'manual-only';
}

function extractRFIds(row) {
  const ids = idsFromText(row.cells.join(' '));
  return ids.filter((id) => /^RF[-_]/i.test(id)).map((id) => normalizeId(id));
}

function parseFunctionalRows(content) {
  const table = parseMarkdownTable(functionalMatrixContent(content), {
    label: 'Traceability metrics',
    requiredColumns: REQUIRED_FUNCTIONAL_COLUMNS
  });
  return table.rows;
}

function parseNFRRows(content) {
  const table = parseNfrTraceabilityTable(content);
  if (!table.exists || !table.rows) return [];
  return table.rows;
}

export function computeTraceabilityMetrics(matrixContent) {
  const functionalRows = parseFunctionalRows(matrixContent);
  const nfrRows = parseNFRRows(matrixContent);

  const rfIds = new Set();
  const coveredRFs = new Set();
  const uncoveredRFs = new Set();
  let totalTests = 0;
  let automatedTests = 0;
  let manualTests = 0;
  let proposalOnlyTests = 0;
  let completeTraceability = 0;
  let partialTraceability = 0;
  let missingTraceability = 0;

  for (const row of functionalRows) {
    const rfIdValues = extractRFIds(row);
    const featureFile = String(row.values[normalizeColumn('Feature File')] || '').trim();
    const caseId = String(row.values[normalizeColumn('Test Management Case ID')] || '').trim();
    const automationStatus = String(row.values[normalizeColumn('Automation Status')] || '').trim();

    for (const rfId of rfIdValues) {
      rfIds.add(rfId);
    }

    totalTests++;

    if (isProposalOnly(automationStatus)) {
      proposalOnlyTests++;
    } else if (isAutomated(automationStatus)) {
      automatedTests++;
    } else if (isManual(automationStatus)) {
      manualTests++;
    }

    const hasFeature = Boolean(featureFile);
    const hasCaseId = Boolean(caseId);
    const hasRF = rfIdValues.length > 0;

    if (hasFeature && hasCaseId && hasRF) {
      completeTraceability++;
      for (const rfId of rfIdValues) {
        coveredRFs.add(rfId);
      }
    } else if (hasFeature || hasCaseId || hasRF) {
      partialTraceability++;
      if (hasFeature && hasRF) {
        for (const rfId of rfIdValues) {
          coveredRFs.add(rfId);
        }
      }
    } else {
      missingTraceability++;
    }
  }

  for (const rfId of rfIds) {
    if (!coveredRFs.has(rfId)) {
      uncoveredRFs.add(rfId);
    }
  }

  const nfrByAttribute = {};
  for (const attr of NFR_ATTRIBUTES) {
    nfrByAttribute[attr] = { total: 0, covered: 0, planned: 0, blocked: 0, residualRisk: 0, notApplicable: 0 };
  }

  let totalNFRs = 0;
  let nfrsWithEvidence = 0;

  for (const row of nfrRows) {
    const attribute = String(row.values[normalizeColumn('Attribute')] || '')
      .trim()
      .toLowerCase();
    const evidenceType = String(row.values[normalizeColumn('Evidence type')] || '').trim();
    const status = String(row.values[normalizeColumn('Status')] || '')
      .trim()
      .toLowerCase();

    totalNFRs++;

    if (attribute && nfrByAttribute[attribute]) {
      nfrByAttribute[attribute].total++;
    }

    const hasEvidence = Boolean(evidenceType) && evidenceType !== '-' && evidenceType.toLowerCase() !== 'none';

    if (hasEvidence) {
      nfrsWithEvidence++;
    }

    if (attribute && nfrByAttribute[attribute]) {
      if (status === 'covered' || status === 'planned') {
        if (hasEvidence) nfrByAttribute[attribute].covered++;
        if (status === 'planned') nfrByAttribute[attribute].planned++;
      } else if (status === 'blocked') {
        nfrByAttribute[attribute].blocked++;
      } else if (status === 'residual-risk') {
        nfrByAttribute[attribute].residualRisk++;
      } else if (status === 'not-applicable') {
        nfrByAttribute[attribute].notApplicable++;
      }
    }
  }

  const totalRFs = rfIds.size;
  const rfCoveragePercent = totalRFs > 0 ? Math.round((coveredRFs.size / totalRFs) * 100) : 0;
  const nfrCoveragePercent = totalNFRs > 0 ? Math.round((nfrsWithEvidence / totalNFRs) * 100) : 0;
  const automationPercent = totalTests > 0 ? Math.round((automatedTests / totalTests) * 100) : 0;
  const completeTraceabilityPercent = totalTests > 0 ? Math.round((completeTraceability / totalTests) * 100) : 0;

  return {
    summary: {
      totalRFs,
      coveredRFs: coveredRFs.size,
      uncoveredRFs: uncoveredRFs.size,
      rfCoveragePercent,
      totalNFRs,
      nfrsWithEvidence,
      nfrCoveragePercent,
      totalTests,
      automatedTests,
      manualTests,
      proposalOnlyTests,
      automationPercent,
      completeTraceability,
      partialTraceability,
      missingTraceability,
      completeTraceabilityPercent
    },
    nfrByAttribute,
    uncoveredRFList: [...uncoveredRFs].sort(),
    functionalRowCount: functionalRows.length,
    nfrRowCount: nfrRows.length
  };
}

export function formatMetricsReport(metrics) {
  const s = metrics.summary;
  const lines = [];

  lines.push('# Traceability Metrics Report');
  lines.push('');
  lines.push('## Coverage Summary');
  lines.push('');
  lines.push('| Metric | Value | Status |');
  lines.push('| ------ | ----- | ------ |');
  lines.push(
    `| RF Coverage | ${s.coveredRFs}/${s.totalRFs} (${s.rfCoveragePercent}%) | ${statusIcon(s.rfCoveragePercent, 90)} |`
  );
  lines.push(
    `| NFR Coverage | ${s.nfrsWithEvidence}/${s.totalNFRs} (${s.nfrCoveragePercent}%) | ${statusIcon(s.nfrCoveragePercent, 80)} |`
  );
  lines.push(
    `| Automation Rate | ${s.automatedTests}/${s.totalTests} (${s.automationPercent}%) | ${statusIcon(s.automationPercent, 70)} |`
  );
  lines.push(
    `| Complete Traceability | ${s.completeTraceability}/${s.totalTests} (${s.completeTraceabilityPercent}%) | ${statusIcon(s.completeTraceabilityPercent, 100)} |`
  );

  lines.push('');
  lines.push('## Detailed Breakdown');
  lines.push('');
  lines.push('### Functional Coverage');
  lines.push('');
  lines.push(`- Total RFs: ${s.totalRFs}`);
  lines.push(`- Covered RFs: ${s.coveredRFs}`);
  if (metrics.uncoveredRFList.length > 0) {
    lines.push(`- Uncovered RFs: ${metrics.uncoveredRFList.join(', ')}`);
  } else {
    lines.push('- Uncovered RFs: none');
  }

  lines.push('');
  lines.push('### NFR Coverage by Attribute');
  lines.push('');
  lines.push('| Attribute | Total | Covered | Planned | Blocked | Residual Risk |');
  lines.push('| --------- | ----- | ------- | ------- | ------- | ------------- |');
  for (const attr of NFR_ATTRIBUTES) {
    const nfr = metrics.nfrByAttribute[attr];
    if (nfr.total > 0) {
      lines.push(`| ${attr} | ${nfr.total} | ${nfr.covered} | ${nfr.planned} | ${nfr.blocked} | ${nfr.residualRisk} |`);
    }
  }

  lines.push('');
  lines.push('### Automation Status');
  lines.push('');
  lines.push(`- Automated: ${s.automatedTests} tests`);
  lines.push(`- Manual: ${s.manualTests} tests`);
  lines.push(`- Proposal-only: ${s.proposalOnlyTests} tests`);

  lines.push('');
  lines.push('### Traceability Completeness');
  lines.push('');
  lines.push(`- Complete (RF + Feature + Case ID): ${s.completeTraceability}`);
  lines.push(`- Partial: ${s.partialTraceability}`);
  lines.push(`- Missing: ${s.missingTraceability}`);

  return lines.join('\n');
}

function statusIcon(percent, threshold) {
  if (percent >= threshold) return 'PASS';
  if (percent >= threshold - 15) return 'WARNING';
  return 'FAIL';
}
