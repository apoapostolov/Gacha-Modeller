import { contentHash, type Project } from '../project/project.ts';
import { analyzeEvidence } from './analyze.ts';
export async function decisionRecord(project: Project) {
  if (!project.company) throw new Error('Company evidence is required.');
  const report = analyzeEvidence(project.company), requested = project.company.decision.status;
  const adoptionReady = project.company.provenance === 'company-extract' && project.company.contract.approval === 'approved' && report.meetsCriteria && !!project.company.decision.rationale.trim() && !!project.company.decision.nextExperiment.trim();
  const status = requested === 'proposed-adoption' && !adoptionReady ? 'hold' : requested;
  return { format: 'reward-model-decision', version: 1, createdAt: new Date().toISOString(), projectId: project.id, projectName: project.name, baselineHash: project.baseline.hash, candidateHash: project.candidate.hash, evidenceHash: await contentHash(project.company), evidence: project.company, report, decision: { ...project.company.decision, requestedStatus: requested, status, adoptionReady }, limitations: ['Provided assignment groups are assumed independent; identity stitching is not inferred.', 'Aggregate ledgers check conservation, not per-item protection-state reconstruction.', 'Attendance and purchase frequencies do not measure excitement or causal retention.', 'Intervals are fixed-horizon exploratory diagnostics; repeated peeking and multiple decisions require a separate analysis plan.'] };
}
