import type { Process, CpuAlgorithm, DiskAlgorithm, CpuResult, DiskResult } from '../types/scheduling'

// Helper to clone objects
const clone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj))

/**
 * CPU Scheduler Simulator
 */
export const runCpuSchedulerClient = (
  algo: CpuAlgorithm,
  quantum: number,
  processes: Process[]
): CpuResult => {
  const n = processes.length
  const timeline: { pid: string; start: number; end: number }[] = []
  
  // Initialize results
  const results = processes.map((p) => ({
    pid: p.pid,
    arrival: p.arrival,
    burst: p.burst,
    priority: p.priority,
    finish: 0,
    turnaround: 0,
    waiting: 0,
  }))

  const inputs = processes.map((p, idx) => ({
    ...p,
    original_index: idx,
  }))

  if (algo === 'fcfs') {
    const sortedInputs = clone(inputs).sort((a, b) => {
      if (a.arrival !== b.arrival) return a.arrival - b.arrival
      return a.original_index - b.original_index
    })

    let t = 0
    for (const p of sortedInputs) {
      if (t < p.arrival) {
        timeline.push({ pid: 'IDLE', start: t, end: p.arrival })
        t = p.arrival
      }
      const start = t
      const end = t + p.burst
      timeline.push({ pid: p.pid, start, end })
      t = end

      // Find matching index in results
      const resIdx = results.findIndex((r) => r.pid === p.pid)
      if (resIdx !== -1) {
        results[resIdx].finish = end
        results[resIdx].turnaround = end - p.arrival
        results[resIdx].waiting = results[resIdx].turnaround - p.burst
      }
    }
  } 
  else if (algo === 'sjf') {
    const completed = new Array(n).fill(false)
    let completedCount = 0
    let t = 0

    while (completedCount < n) {
      let selectedIdx = -1
      let minBurst = 1e9

      for (let i = 0; i < n; i++) {
        if (!completed[i] && inputs[i].arrival <= t) {
          if (inputs[i].burst < minBurst) {
            minBurst = inputs[i].burst
            selectedIdx = i
          } else if (inputs[i].burst === minBurst) {
            // Tie breaker: arrival time, then index
            if (inputs[i].arrival < inputs[selectedIdx].arrival) {
              selectedIdx = i
            } else if (inputs[i].arrival === inputs[selectedIdx].arrival) {
              if (inputs[i].original_index < inputs[selectedIdx].original_index) {
                selectedIdx = i
              }
            }
          }
        }
      }

      if (selectedIdx === -1) {
        let nextArrival = 1e9
        for (let i = 0; i < n; i++) {
          if (!completed[i]) {
            nextArrival = Math.min(nextArrival, inputs[i].arrival)
          }
        }
        timeline.push({ pid: 'IDLE', start: t, end: nextArrival })
        t = nextArrival
      } else {
        const start = t
        const end = t + inputs[selectedIdx].burst
        timeline.push({ pid: inputs[selectedIdx].pid, start, end })
        t = end

        results[selectedIdx].finish = end
        results[selectedIdx].turnaround = end - inputs[selectedIdx].arrival
        results[selectedIdx].waiting = results[selectedIdx].turnaround - inputs[selectedIdx].burst

        completed[selectedIdx] = true
        completedCount++
      }
    }
  } 
  else if (algo === 'srtf') {
    const remainingBurst = inputs.map((p) => p.burst)
    const completed = new Array(n).fill(false)
    let completedCount = 0
    let t = 0

    const sortedInputs = clone(inputs).sort((a, b) => {
      if (a.arrival !== b.arrival) return a.arrival - b.arrival
      return a.original_index - b.original_index
    })
    let arrivalPtr = 0

    while (completedCount < n) {
      let selectedIdx = -1
      let minRemaining = 1e9

      for (let i = 0; i < n; i++) {
        if (!completed[i] && inputs[i].arrival <= t) {
          if (remainingBurst[i] < minRemaining) {
            minRemaining = remainingBurst[i]
            selectedIdx = i
          } else if (remainingBurst[i] === minRemaining) {
            // Tie breaker: arrival time, then original index
            if (inputs[i].arrival < inputs[selectedIdx].arrival) {
              selectedIdx = i
            } else if (inputs[i].arrival === inputs[selectedIdx].arrival) {
              if (inputs[i].original_index < inputs[selectedIdx].original_index) {
                selectedIdx = i
              }
            }
          }
        }
      }

      if (selectedIdx === -1) {
        // CPU is IDLE: jump to the next arrival time
        const nextArrival = sortedInputs[arrivalPtr].arrival
        timeline.push({ pid: 'IDLE', start: t, end: nextArrival })
        t = nextArrival
        while (arrivalPtr < n && sortedInputs[arrivalPtr].arrival <= t) {
          arrivalPtr++
        }
      } else {
        // We have a process to execute
        // Determine duration of this execution slice
        let slice = remainingBurst[selectedIdx]
        let nextArrivalTime = 1e9

        for (let i = 0; i < n; i++) {
          if (inputs[i].arrival > t) {
            if (inputs[i].arrival < nextArrivalTime) {
              nextArrivalTime = inputs[i].arrival
            }
          }
        }

        if (nextArrivalTime < t + slice) {
          slice = nextArrivalTime - t
        }

        // Add to timeline or merge if contiguous
        if (timeline.length > 0 && timeline[timeline.length - 1].pid === inputs[selectedIdx].pid) {
          timeline[timeline.length - 1].end = t + slice
        } else {
          timeline.push({ pid: inputs[selectedIdx].pid, start: t, end: t + slice })
        }

        t += slice
        remainingBurst[selectedIdx] -= slice

        if (remainingBurst[selectedIdx] === 0) {
          results[selectedIdx].finish = t
          results[selectedIdx].turnaround = t - inputs[selectedIdx].arrival
          results[selectedIdx].waiting = results[selectedIdx].turnaround - inputs[selectedIdx].burst
          completed[selectedIdx] = true
          completedCount++
        }

        while (arrivalPtr < n && sortedInputs[arrivalPtr].arrival <= t) {
          arrivalPtr++
        }
      }
    }
  }
  else if (algo === 'priority') {
    const completed = new Array(n).fill(false)
    let completedCount = 0
    let t = 0

    while (completedCount < n) {
      let selectedIdx = -1
      let bestPriority = 1e9

      for (let i = 0; i < n; i++) {
        if (!completed[i] && inputs[i].arrival <= t) {
          if (inputs[i].priority < bestPriority) {
            bestPriority = inputs[i].priority
            selectedIdx = i
          } else if (inputs[i].priority === bestPriority) {
            // Tie breaker: burst time, then arrival, then index
            if (inputs[i].arrival < inputs[selectedIdx].arrival) {
              selectedIdx = i
            } else if (inputs[i].arrival === inputs[selectedIdx].arrival) {
              if (inputs[i].original_index < inputs[selectedIdx].original_index) {
                selectedIdx = i
              }
            }
          }
        }
      }

      if (selectedIdx === -1) {
        let nextArrival = 1e9
        for (let i = 0; i < n; i++) {
          if (!completed[i]) {
            nextArrival = Math.min(nextArrival, inputs[i].arrival)
          }
        }
        timeline.push({ pid: 'IDLE', start: t, end: nextArrival })
        t = nextArrival
      } else {
        const start = t
        const end = t + inputs[selectedIdx].burst
        timeline.push({ pid: inputs[selectedIdx].pid, start, end })
        t = end

        results[selectedIdx].finish = end
        results[selectedIdx].turnaround = end - inputs[selectedIdx].arrival
        results[selectedIdx].waiting = results[selectedIdx].turnaround - inputs[selectedIdx].burst

        completed[selectedIdx] = true
        completedCount++
      }
    }
  } 
  else if (algo === 'rr') {
    const sortedInputs = inputs.slice().sort((a, b) => {
      if (a.arrival !== b.arrival) return a.arrival - b.arrival
      return a.original_index - b.original_index
    })

    const remainingBurst = inputs.map((p) => p.burst)
    const q: number[] = []
    let arrivalPtr = 0
    let t = 0
    let completedCount = 0

    const enqueueArrivals = (currentTime: number) => {
      while (arrivalPtr < n && sortedInputs[arrivalPtr].arrival <= currentTime) {
        q.push(sortedInputs[arrivalPtr].original_index)
        arrivalPtr++
      }
    }

    enqueueArrivals(t)

    while (completedCount < n) {
      if (q.length === 0) {
        const nextArrival = sortedInputs[arrivalPtr].arrival
        timeline.push({ pid: 'IDLE', start: t, end: nextArrival })
        t = nextArrival
        enqueueArrivals(t)
        continue
      }

      const currIdx = q.shift()!
      const slice = Math.min(remainingBurst[currIdx], quantum)
      const start = t
      const end = t + slice
      timeline.push({ pid: inputs[currIdx].pid, start, end })
      t = end
      remainingBurst[currIdx] -= slice

      enqueueArrivals(t)

      if (remainingBurst[currIdx] > 0) {
        q.push(currIdx)
      } else {
        results[currIdx].finish = t
        results[currIdx].turnaround = t - inputs[currIdx].arrival
        results[currIdx].waiting = results[currIdx].turnaround - inputs[currIdx].burst
        completedCount++
      }
    }
  }

  // Calculate averages
  let totalWaiting = 0
  let totalTurnaround = 0
  for (let i = 0; i < n; i++) {
    totalWaiting += results[i].waiting
    totalTurnaround += results[i].turnaround
  }
  const avg_waiting = parseFloat((totalWaiting / n).toFixed(3))
  const avg_turnaround = parseFloat((totalTurnaround / n).toFixed(3))

  return {
    timeline,
    processes: results,
    metrics: {
      avg_waiting,
      avg_turnaround,
    },
  }
}

/**
 * Disk Scheduler Simulator
 */
export const runDiskSchedulerClient = (
  algo: DiskAlgorithm,
  initialHead: number,
  diskSize: number,
  requests: number[]
): DiskResult => {
  const sequence: number[] = [initialHead]
  const seek_steps: number[] = []
  let total_seek = 0
  let currentHead = initialHead

  if (algo === 'fcfs') {
    for (const req of requests) {
      const dist = Math.abs(req - currentHead)
      total_seek += dist
      seek_steps.push(dist)
      sequence.push(req)
      currentHead = req
    }
  } 
  else if (algo === 'sstf') {
    const remaining = [...requests]
    while (remaining.length > 0) {
      let closestIdx = -1
      let minDist = 1e9
      for (let i = 0; i < remaining.length; i++) {
        const dist = Math.abs(remaining[i] - currentHead)
        if (dist < minDist) {
          minDist = dist
          closestIdx = i
        }
      }
      const nextTrack = remaining[closestIdx]
      total_seek += minDist
      seek_steps.push(minDist)
      sequence.push(nextTrack)
      currentHead = nextTrack
      remaining.splice(closestIdx, 1)
    }
  } 
  else if (algo === 'scan') {
    const left: number[] = []
    const right: number[] = []
    for (const req of requests) {
      if (req < initialHead) left.push(req)
      else right.push(req)
    }
    left.sort((a, b) => a - b)
    right.sort((a, b) => a - b)

    // Process right side
    for (const req of right) {
      const dist = Math.abs(req - currentHead)
      total_seek += dist
      seek_steps.push(dist)
      sequence.push(req)
      currentHead = req
    }

    // Boundary reverse
    if (left.length > 0) {
      const boundary = diskSize - 1
      if (currentHead !== boundary) {
        const dist = Math.abs(boundary - currentHead)
        total_seek += dist
        seek_steps.push(dist)
        sequence.push(boundary)
        currentHead = boundary
      }

      // Process left descending
      for (let i = left.length - 1; i >= 0; i--) {
        const req = left[i]
        const dist = Math.abs(req - currentHead)
        total_seek += dist
        seek_steps.push(dist)
        sequence.push(req)
        currentHead = req
      }
    }
  } 
  else if (algo === 'cscan') {
    const left: number[] = []
    const right: number[] = []
    for (const req of requests) {
      if (req < initialHead) left.push(req)
      else right.push(req)
    }
    left.sort((a, b) => a - b)
    right.sort((a, b) => a - b)

    // Process right side
    for (const req of right) {
      const dist = Math.abs(req - currentHead)
      total_seek += dist
      seek_steps.push(dist)
      sequence.push(req)
      currentHead = req
    }

    // Boundary reverse and jump to 0
    if (left.length > 0) {
      const boundary = diskSize - 1
      if (currentHead !== boundary) {
        const dist = Math.abs(boundary - currentHead)
        total_seek += dist
        seek_steps.push(dist)
        sequence.push(boundary)
        currentHead = boundary
      }

      // Jump to 0
      const distToStart = boundary // jump cost
      total_seek += distToStart
      seek_steps.push(distToStart)
      sequence.push(0)
      currentHead = 0

      // Process left ascending
      for (const req of left) {
        const dist = Math.abs(req - currentHead)
        total_seek += dist
        seek_steps.push(dist)
        sequence.push(req)
        currentHead = req
      }
    }
  } 
  else if (algo === 'look') {
    const left: number[] = []
    const right: number[] = []
    for (const req of requests) {
      if (req < initialHead) left.push(req)
      else right.push(req)
    }
    left.sort((a, b) => a - b)
    right.sort((a, b) => a - b)

    // Process right side
    for (const req of right) {
      const dist = Math.abs(req - currentHead)
      total_seek += dist
      seek_steps.push(dist)
      sequence.push(req)
      currentHead = req
    }

    // Reverse immediately without going to boundary
    if (left.length > 0) {
      for (let i = left.length - 1; i >= 0; i--) {
        const req = left[i]
        const dist = Math.abs(req - currentHead)
        total_seek += dist
        seek_steps.push(dist)
        sequence.push(req)
        currentHead = req
      }
    }
  }
  else if (algo === 'clook') {
    const left: number[] = []
    const right: number[] = []
    for (const req of requests) {
      if (req < initialHead) left.push(req)
      else right.push(req)
    }
    left.sort((a, b) => a - b)
    right.sort((a, b) => a - b)

    // Process right side
    for (const req of right) {
      const dist = Math.abs(req - currentHead)
      total_seek += dist
      seek_steps.push(dist)
      sequence.push(req)
      currentHead = req
    }

    // Jump to the lowest request on the left side and process ascending
    if (left.length > 0) {
      for (const req of left) {
        const dist = Math.abs(req - currentHead)
        total_seek += dist
        seek_steps.push(dist)
        sequence.push(req)
        currentHead = req
      }
    }
  }

  return {
    sequence,
    seek_steps,
    total_seek,
  }
}
