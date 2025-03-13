import loadWasm from './utils/wasmload';

/**
 * WorkDispatcher is a class that manages a queue of jobs to be dispatched
 * to a WebAssembly module written in Zig, allowing for workload distribution
 * to another language.
 */
class WorkDispatcher {
  private cur_job: string | '' = '';
  private job_queue: (() => Promise<void>)[] = [];
  private isProcessing: boolean = false;

  constructor() {}

  /**
   * Calls the specified job by dispatching it to the WebAssembly module.
   * @param job - The name of the job to be dispatched.
   * @returns A Promise that resolves when the job has been processed.
   */
  async call(job: string): Promise<void> {
    const jobFunction = async () => {
      const startTime = performance.now();

      try {
        const exports = await loadWasm();
        // @ts-ignore
        const result = exports.dispatch(job);
        console.log(result);
      } catch (error) {
        console.error('Error loading WASM or dispatching job: ', error);
      } finally {
        const endTime = performance.now();
        console.log(`Function call for job "${job}" took ${endTime - startTime}ms`);
      }
    };

    this.addCall(jobFunction);
  }

  /**
   * Processes the job queue sequentially, executing each job in order.
   * @returns A Promise that resolves when all jobs in the queue have been processed.
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    while (this.job_queue.length > 0) {
      const currentJob = this.job_queue.shift();
      if (currentJob) {
        try {
          await currentJob();
        } catch (error) {
          console.error('Error processing job: ', error);
        }
      }
    }
  }

  /**
   * Adds a new job to the job queue and starts processing the queue.
   * @param job - A function that returns a Promise, representing the job to be added.
   */
  private addCall(job: () => Promise<void>): void {
    this.job_queue.push(job);
    this.processQueue();
  }
}

export default WorkDispatcher;
