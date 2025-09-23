import { Worker } from 'worker_threads';
import { EventEmitter } from 'events';
import os from 'os';
import path from 'path';

/**
 * Worker pool for parallel processing
 * Manages multiple worker threads for CPU-intensive tasks
 */
export class WorkerPool extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.maxWorkers = options.maxWorkers || Math.max(2, Math.floor(os.cpus().length / 2));
    this.workerScript = options.workerScript || path.join(process.cwd(), 'utils', 'audioWorker.js');
    this.taskTimeout = options.taskTimeout || 300000; // 5 minutes
    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
    this.activeTasks = new Map();
    this.taskCounter = 0;
    this.isShuttingDown = false;
    
    console.log(`🏭 Initializing worker pool with ${this.maxWorkers} workers`);
    this.initializeWorkers();
  }

  /**
   * Initialize worker threads
   */
  initializeWorkers() {
    for (let i = 0; i < this.maxWorkers; i++) {
      this.createWorker(i);
    }
  }

  /**
   * Create a single worker thread
   */
  createWorker(workerId) {
    try {
      const worker = new Worker(this.workerScript, {
        workerData: { workerId }
      });

      worker.workerId = workerId;
      worker.isAvailable = true;
      worker.currentTaskId = null;

      worker.on('message', (result) => {
        this.handleWorkerMessage(worker, result);
      });

      worker.on('error', (error) => {
        console.error(`❌ Worker ${workerId} error:`, error);
        this.handleWorkerError(worker, error);
      });

      worker.on('exit', (code) => {
        console.log(`🔄 Worker ${workerId} exited with code ${code}`);
        this.handleWorkerExit(worker, code);
      });

      this.workers.push(worker);
      this.availableWorkers.push(worker);

      console.log(`✅ Worker ${workerId} created and ready`);
      
    } catch (error) {
      console.error(`❌ Failed to create worker ${workerId}:`, error);
    }
  }

  /**
   * Execute a task using available worker
   */
  async executeTask(taskType, taskData, options = {}) {
    return new Promise((resolve, reject) => {
      const taskId = ++this.taskCounter;
      const task = {
        id: taskId,
        type: taskType,
        data: taskData,
        options,
        resolve,
        reject,
        createdAt: Date.now(),
        timeout: options.timeout || this.taskTimeout
      };

      console.log(`📋 Queuing task ${taskId} (${taskType})`);
      
      this.taskQueue.push(task);
      this.processQueue();
    });
  }

  /**
   * Process the task queue
   */
  processQueue() {
    if (this.isShuttingDown || this.taskQueue.length === 0 || this.availableWorkers.length === 0) {
      return;
    }

    const task = this.taskQueue.shift();
    const worker = this.availableWorkers.shift();

    if (!worker || !task) {
      // Put task back if no worker available
      if (task) this.taskQueue.unshift(task);
      if (worker) this.availableWorkers.unshift(worker);
      return;
    }

    this.assignTaskToWorker(worker, task);
    
    // Continue processing if more tasks and workers available
    setTimeout(() => this.processQueue(), 10);
  }

  /**
   * Assign a task to a specific worker
   */
  assignTaskToWorker(worker, task) {
    worker.isAvailable = false;
    worker.currentTaskId = task.id;
    
    this.activeTasks.set(task.id, {
      task,
      worker,
      startTime: Date.now()
    });

    console.log(`🔄 Assigning task ${task.id} to worker ${worker.workerId}`);

    // Set up timeout
    const timeoutHandle = setTimeout(() => {
      this.handleTaskTimeout(task.id);
    }, task.timeout);

    this.activeTasks.get(task.id).timeoutHandle = timeoutHandle;

    // Send task to worker
    worker.postMessage({
      taskId: task.id,
      type: task.type,
      data: task.data,
      options: task.options
    });

    this.emit('taskStarted', {
      taskId: task.id,
      workerId: worker.workerId,
      type: task.type
    });
  }

  /**
   * Handle worker message (task completion)
   */
  handleWorkerMessage(worker, message) {
    const { taskId, success, result, error, progress } = message;

    if (progress) {
      // Handle progress updates
      this.emit('taskProgress', {
        taskId,
        workerId: worker.workerId,
        progress: progress.percentage,
        message: progress.message
      });
      return;
    }

    const activeTask = this.activeTasks.get(taskId);
    if (!activeTask) {
      console.warn(`⚠️ Received result for unknown task ${taskId}`);
      return;
    }

    const { task, timeoutHandle } = activeTask;
    
    // Clear timeout
    clearTimeout(timeoutHandle);
    
    // Mark worker as available
    worker.isAvailable = true;
    worker.currentTaskId = null;
    this.availableWorkers.push(worker);
    
    // Remove from active tasks
    this.activeTasks.delete(taskId);

    const duration = Date.now() - activeTask.startTime;
    
    if (success) {
      console.log(`✅ Task ${taskId} completed by worker ${worker.workerId} in ${duration}ms`);
      task.resolve(result);
      
      this.emit('taskCompleted', {
        taskId,
        workerId: worker.workerId,
        duration,
        type: task.type
      });
    } else {
      console.error(`❌ Task ${taskId} failed on worker ${worker.workerId}:`, error);
      task.reject(new Error(error));
      
      this.emit('taskFailed', {
        taskId,
        workerId: worker.workerId,
        duration,
        error,
        type: task.type
      });
    }

    // Process next task in queue
    this.processQueue();
  }

  /**
   * Handle worker errors
   */
  handleWorkerError(worker, error) {
    console.error(`❌ Worker ${worker.workerId} encountered error:`, error);
    
    // Fail current task if any
    if (worker.currentTaskId) {
      const activeTask = this.activeTasks.get(worker.currentTaskId);
      if (activeTask) {
        activeTask.task.reject(new Error(`Worker error: ${error.message}`));
        this.activeTasks.delete(worker.currentTaskId);
      }
    }

    // Remove from available workers
    const index = this.availableWorkers.indexOf(worker);
    if (index > -1) {
      this.availableWorkers.splice(index, 1);
    }

    // Restart worker
    this.restartWorker(worker);
  }

  /**
   * Handle worker exit
   */
  handleWorkerExit(worker, code) {
    console.log(`🔄 Worker ${worker.workerId} exited with code ${code}`);
    
    if (!this.isShuttingDown) {
      // Restart worker if not shutting down
      this.restartWorker(worker);
    }
  }

  /**
   * Handle task timeout
   */
  handleTaskTimeout(taskId) {
    const activeTask = this.activeTasks.get(taskId);
    if (!activeTask) return;

    const { task, worker } = activeTask;
    
    console.error(`⏰ Task ${taskId} timed out on worker ${worker.workerId}`);
    
    // Reject the task
    task.reject(new Error(`Task timeout after ${task.timeout}ms`));
    
    // Remove from active tasks
    this.activeTasks.delete(taskId);
    
    // Terminate and restart the worker
    this.restartWorker(worker);
    
    this.emit('taskTimeout', {
      taskId,
      workerId: worker.workerId,
      type: task.type
    });
  }

  /**
   * Restart a worker
   */
  restartWorker(oldWorker) {
    const workerId = oldWorker.workerId;
    
    console.log(`🔄 Restarting worker ${workerId}`);
    
    // Remove old worker
    const workerIndex = this.workers.indexOf(oldWorker);
    if (workerIndex > -1) {
      this.workers.splice(workerIndex, 1);
    }
    
    const availableIndex = this.availableWorkers.indexOf(oldWorker);
    if (availableIndex > -1) {
      this.availableWorkers.splice(availableIndex, 1);
    }
    
    // Terminate old worker
    try {
      oldWorker.terminate();
    } catch (error) {
      console.warn(`⚠️ Error terminating worker ${workerId}:`, error);
    }
    
    // Create new worker
    this.createWorker(workerId);
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      totalWorkers: this.workers.length,
      availableWorkers: this.availableWorkers.length,
      activeWorkers: this.workers.length - this.availableWorkers.length,
      queuedTasks: this.taskQueue.length,
      activeTasks: this.activeTasks.size,
      isShuttingDown: this.isShuttingDown
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🛑 Shutting down worker pool...');
    
    this.isShuttingDown = true;
    
    // Reject all queued tasks
    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      task.reject(new Error('Worker pool shutting down'));
    }
    
    // Wait for active tasks to complete or timeout
    const shutdownTimeout = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (this.activeTasks.size > 0 && (Date.now() - startTime) < shutdownTimeout) {
      console.log(`⏳ Waiting for ${this.activeTasks.size} active tasks to complete...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Force terminate remaining tasks
    for (const [taskId, activeTask] of this.activeTasks) {
      console.log(`⚠️ Force terminating task ${taskId}`);
      activeTask.task.reject(new Error('Forced shutdown'));
      clearTimeout(activeTask.timeoutHandle);
    }
    this.activeTasks.clear();
    
    // Terminate all workers
    const terminationPromises = this.workers.map(worker => {
      return new Promise((resolve) => {
        worker.once('exit', resolve);
        worker.terminate();
      });
    });
    
    await Promise.all(terminationPromises);
    
    console.log('✅ Worker pool shutdown complete');
  }
}

export default WorkerPool;