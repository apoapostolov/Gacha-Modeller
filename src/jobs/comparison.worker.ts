import { compareProject } from './compare.ts';
import type { WorkerJob, WorkerEvent } from './runner.ts';
const scope = self as unknown as { onmessage: ((event: MessageEvent<WorkerJob>) => void) | null; postMessage(event: WorkerEvent): void };
scope.onmessage = async ({ data }) => {
  const { jobId, project, settings } = data;
  try {
    const report = await compareProject(project, settings, (completed, total) => scope.postMessage({ type: 'progress', jobId, completed, total }));
    scope.postMessage({ type: 'result', jobId, report });
  } catch (error) { scope.postMessage({ type: 'error', jobId, message: error instanceof Error ? error.message : 'Background simulation failed.' }); }
};
