import AsyncStorage from '@react-native-async-storage/async-storage';

export type UploadState = 'PENDING' | 'UPLOADING' | 'PAUSED' | 'DONE' | 'FAILED';

export interface UploadJob {
  id: string;
  fileUri: string;
  fileName: string;
  mimeType: string;
  uploadUrl: string;
  headers: Record<string, string>;
  totalChunks: number;
  uploadedChunks: number;
  chunkSize: number;
  state: UploadState;
  createdAt: string;
  updatedAt: string;
  error?: string;
}

const JOBS_KEY = '@mana/upload_jobs';
const DEFAULT_CHUNK_SIZE = 512 * 1024;

let jobMutex: Promise<void> = Promise.resolve();

function atomicJobUpdate(fn: (jobs: UploadJob[]) => UploadJob[]): Promise<void> {
  jobMutex = jobMutex.then(async () => {
    try {
      const raw = await AsyncStorage.getItem(JOBS_KEY);
      const jobs: UploadJob[] = raw ? JSON.parse(raw) : [];
      await AsyncStorage.setItem(JOBS_KEY, JSON.stringify(fn(jobs)));
    } catch { /* silent */ }
  });
  return jobMutex;
}

async function readJobs(): Promise<UploadJob[]> {
  try {
    const raw = await AsyncStorage.getItem(JOBS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export const uploadRecovery = {
  async register(
    fileUri: string,
    fileName: string,
    mimeType: string,
    uploadUrl: string,
    headers: Record<string, string>,
    totalSize: number,
    chunkSize = DEFAULT_CHUNK_SIZE
  ): Promise<string> {
    const id = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const job: UploadJob = {
      id,
      fileUri,
      fileName,
      mimeType,
      uploadUrl,
      headers,
      totalChunks: Math.ceil(totalSize / chunkSize),
      uploadedChunks: 0,
      chunkSize,
      state: 'PENDING',
      createdAt: now,
      updatedAt: now,
    };
    await atomicJobUpdate((jobs) => [...jobs, job]);
    return id;
  },

  async markChunkDone(id: string, chunkIndex: number): Promise<void> {
    await atomicJobUpdate((jobs) =>
      jobs.map((j) => {
        if (j.id !== id) return j;
        const uploadedChunks = Math.max(j.uploadedChunks, chunkIndex + 1);
        const done = uploadedChunks >= j.totalChunks;
        return {
          ...j,
          uploadedChunks,
          state: done ? 'DONE' : 'UPLOADING',
          updatedAt: new Date().toISOString(),
        };
      })
    );
  },

  async pause(id: string): Promise<void> {
    await atomicJobUpdate((jobs) =>
      jobs.map((j) =>
        j.id === id ? { ...j, state: 'PAUSED', updatedAt: new Date().toISOString() } : j
      )
    );
  },

  async resume(id: string): Promise<void> {
    await atomicJobUpdate((jobs) =>
      jobs.map((j) =>
        j.id === id ? { ...j, state: 'UPLOADING', updatedAt: new Date().toISOString() } : j
      )
    );
  },

  async fail(id: string, error: string): Promise<void> {
    await atomicJobUpdate((jobs) =>
      jobs.map((j) =>
        j.id === id
          ? { ...j, state: 'FAILED', error, updatedAt: new Date().toISOString() }
          : j
      )
    );
  },

  async remove(id: string): Promise<void> {
    await atomicJobUpdate((jobs) => jobs.filter((j) => j.id !== id));
  },

  async getPending(): Promise<UploadJob[]> {
    const jobs = await readJobs();
    return jobs.filter((j) => j.state === 'PENDING' || j.state === 'PAUSED');
  },

  async getAll(): Promise<UploadJob[]> {
    return readJobs();
  },

  progressPercent(job: UploadJob): number {
    if (job.totalChunks === 0) return 0;
    return Math.round((job.uploadedChunks / job.totalChunks) * 100);
  },
};
