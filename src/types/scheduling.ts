export type AppMode = 'landing' | 'config' | 'visualizer' | 'analytics'

export type ScheduleMode = 'cpu' | 'disk'

export type CpuAlgorithm = 'fcfs' | 'sjf' | 'srtf' | 'rr' | 'priority'

export type DiskAlgorithm = 'fcfs' | 'sstf' | 'scan' | 'cscan' | 'look' | 'clook'

export interface Process {
  pid: string
  arrival: number
  burst: number
  priority: number
}

export interface CpuTimelineInterval {
  pid: string
  start: number
  end: number
}

export interface CpuProcessResult {
  pid: string
  arrival: number
  burst: number
  priority: number
  finish: number
  turnaround: number
  waiting: number
}

export interface CpuResult {
  timeline: CpuTimelineInterval[]
  processes: CpuProcessResult[]
  metrics: {
    avg_waiting: number
    avg_turnaround: number
  }
}

export interface DiskResult {
  sequence: number[]
  seek_steps: number[]
  total_seek: number
}
