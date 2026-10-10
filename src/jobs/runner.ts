import type { Project, RunSettings } from '../project/project.ts';
import type { ComparisonReport } from './compare.ts';
export type WorkerEvent = { type: 'progress'; jobId: number; completed: number; total: number } | { type: 'result'; jobId: number; report: ComparisonReport } | { type: 'error'; jobId: number; message: string };
export interface WorkerJob { jobId: number; project: Project; settings: RunSettings }
export class ComparisonRunner {
  private worker: Worker | null = null;
  private sequence = 0;
  constructor(private readonly factory: () => Worker) {}
  start(project: Project, settings: RunSettings, receive: (event: WorkerEvent) => void): void {
    this.cancel();
    const jobId = ++this.sequence;
    const worker = this.factory(); this.worker = worker;
    worker.onmessage = (event: MessageEvent<WorkerEvent>) => {
      if (this.worker !== worker || this.sequence !== jobId || event.data.jobId !== jobId) return;
      if (event.data.type !== 'progress') { this.worker = null; worker.terminate(); }
      receive(event.data);
    };
    worker.onerror = (event) => {
      if (this.worker !== worker || this.sequence !== jobId) return;
      this.worker = null; worker.terminate(); receive({ type: 'error', jobId, message: event.message || 'Background simulation could not finish.' });
    };
    try { worker.postMessage({ jobId, project, settings } satisfies WorkerJob); }
    catch (failure) { this.worker = null; worker.terminate(); throw failure; }
  }
  cancel(): void { this.sequence++; this.worker?.terminate(); this.worker = null; }
}
