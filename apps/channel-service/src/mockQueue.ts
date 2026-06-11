import { EventEmitter } from 'events';
import { CallbackJobData } from './queue';

export class MockQueue extends EventEmitter {
  private jobs: any[] = [];
  private _completedCount = 0;
  private _failedCount = 0;
  private _activeCount = 0;
  private jobIdCounter = 0;

  constructor(public name: string) {
    super();
  }

  async add(_name: string, data: CallbackJobData, _opts?: any) {
    const jobId = String(++this.jobIdCounter);
    const job = { id: jobId, name: _name, data };
    this.jobs.push(job);
    process.nextTick(() => this.emit('job-added', job));
    return job;
  }

  async getWaitingCount() { return this.jobs.length; }
  async getActiveCount()  { return this._activeCount; }
  async getCompletedCount() { return this._completedCount; }
  async getFailedCount()  { return this._failedCount; }

  _removeJob(job: any) { this.jobs = this.jobs.filter(j => j.id !== job.id); }
  _incCompleted() { this._completedCount++; }
  _incFailed()    { this._failedCount++; }
  _incActive(v: number) { this._activeCount += v; }
}

export const mockQueueInstance = new MockQueue('channel-callbacks');

export class MockWorker extends EventEmitter {
  constructor(
    public name: string,
    private processor: (job: any) => Promise<void>
  ) {
    super();

    mockQueueInstance.on('job-added', async (job) => {
      mockQueueInstance._removeJob(job);
      mockQueueInstance._incActive(1);
      
      const maxAttempts = 3;
      let success = false;
      let lastError = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        job.attemptsMade = attempt;
        try {
          await this.processor(job);
          success = true;
          break;
        } catch (err: any) {
          lastError = err;
          if (attempt < maxAttempts) {
            this.emit('failed-attempt', job, err);
            // Wait 1.5 seconds before retrying
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        }
      }

      if (success) {
        mockQueueInstance._incCompleted();
        this.emit('completed', job);
      } else {
        mockQueueInstance._incFailed();
        this.emit('failed', job, lastError);
      }
      mockQueueInstance._incActive(-1);
    });
  }
}
