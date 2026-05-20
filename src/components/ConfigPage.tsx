import React, { useState } from 'react'
import { ArrowLeft, Plus, Trash2, ShieldAlert, Cpu, HardDrive } from 'lucide-react'
import type { ScheduleMode, CpuAlgorithm, DiskAlgorithm, Process } from '../types/scheduling'
import { runCpuSchedulerClient, runDiskSchedulerClient } from '../utils/scheduler'

interface ConfigPageProps {
  mode: ScheduleMode
  onBack: () => void
  onInitCpu: (algo: CpuAlgorithm, quantum: number, processes: Process[], result: any) => void
  onInitDisk: (algo: DiskAlgorithm, head: number, size: number, requests: number[], result: any) => void
}

export const ConfigPage: React.FC<ConfigPageProps> = ({
  mode,
  onBack,
  onInitCpu,
  onInitDisk,
}) => {
  const isCpu = mode === 'cpu'

  // CPU Configuration State
  const [cpuAlgo, setCpuAlgo] = useState<CpuAlgorithm>('fcfs')
  const [timeQuantum, setTimeQuantum] = useState<number>(2)
  const [processes, setProcesses] = useState<Process[]>([
    { pid: 'P1', arrival: 0, burst: 5, priority: 2 },
    { pid: 'P2', arrival: 2, burst: 3, priority: 1 },
    { pid: 'P3', arrival: 4, burst: 1, priority: 3 },
  ])

  // Disk Configuration State
  const [diskAlgo, setDiskAlgo] = useState<DiskAlgorithm>('fcfs')
  const [initialHead, setInitialHead] = useState<number>(50)
  const [maxTrack, setMaxTrack] = useState<number>(199)
  const [diskRequests, setDiskRequests] = useState<string>('98, 183, 37, 122, 14, 124, 65, 67')

  // UI States
  const [loading, setLoading] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Handlers for CPU Process list
  const addProcess = () => {
    const nextId = processes.length + 1
    setProcesses([
      ...processes,
      { pid: `P${nextId}`, arrival: 0, burst: 4, priority: 2 },
    ])
  }

  const removeProcess = (index: number) => {
    if (processes.length <= 1) {
      setErrorMsg('You must have at least one process.')
      return
    }
    setErrorMsg(null)
    setProcesses(processes.filter((_, i) => i !== index))
  }

  const updateProcessField = (index: number, field: keyof Process, value: any) => {
    const updated = [...processes]
    if (field === 'pid') {
      updated[index].pid = value
    } else {
      updated[index][field] = Math.max(0, parseInt(value) || 0) as never
    }
    setProcesses(updated)
  }

  // Pre-configured Presets
  const loadCpuPreset = (type: 'standard' | 'competing' | 'priority') => {
    setErrorMsg(null)
    if (type === 'standard') {
      setProcesses([
        { pid: 'P1', arrival: 0, burst: 5, priority: 2 },
        { pid: 'P2', arrival: 2, burst: 3, priority: 1 },
        { pid: 'P3', arrival: 4, burst: 1, priority: 3 },
      ])
    } else if (type === 'competing') {
      setProcesses([
        { pid: 'P1', arrival: 0, burst: 8, priority: 2 },
        { pid: 'P2', arrival: 1, burst: 2, priority: 2 },
        { pid: 'P3', arrival: 2, burst: 1, priority: 1 },
        { pid: 'P4', arrival: 3, burst: 4, priority: 3 },
      ])
    } else {
      setProcesses([
        { pid: 'P1', arrival: 0, burst: 6, priority: 3 },
        { pid: 'P2', arrival: 1, burst: 4, priority: 1 },
        { pid: 'P3', arrival: 2, burst: 8, priority: 4 },
        { pid: 'P4', arrival: 3, burst: 3, priority: 2 },
      ])
    }
  }

  const loadDiskPreset = (type: 'textbook' | 'alternating' | 'random') => {
    setErrorMsg(null)
    if (type === 'textbook') {
      setInitialHead(53)
      setMaxTrack(199)
      setDiskRequests('98, 183, 37, 122, 14, 124, 65, 67')
    } else if (type === 'alternating') {
      setInitialHead(100)
      setMaxTrack(199)
      setDiskRequests('190, 10, 180, 20, 170, 30, 160, 40')
    } else {
      setInitialHead(Math.floor(Math.random() * 100) + 10)
      setMaxTrack(199)
      const randomTracks = Array.from({ length: 8 }, () => Math.floor(Math.random() * 190) + 5)
      setDiskRequests(randomTracks.join(', '))
    }
  }

  // logic initializer
  const handleInitialize = async () => {
    setErrorMsg(null)
    setLoading(true)

    try {
      if (isCpu) {
        // Validate CPU inputs
        if (processes.some((p) => p.burst <= 0)) {
          throw new Error('All processes must have a Burst Time greater than 0.')
        }

        // Format processes for C++ input: "arr,burst,priority,pid;arr,burst,priority,pid..."
        const procString = processes
          .map((p) => `${p.arrival},${p.burst},${p.priority},${p.pid}`)
          .join(';')

        let result;
        try {
          const response = await fetch(
            `/api/schedule?mode=cpu&algo=${cpuAlgo}&quantum=${timeQuantum}&processes=${encodeURIComponent(
              procString
            )}`
          )

          if (!response.ok) {
            const errData = await response.json()
            throw new Error(errData.details || 'C++ execution failed')
          }

          result = await response.json()
        } catch (fetchErr) {
          console.warn('API Endpoint failed. Falling back to native-equivalent TypeScript logic.', fetchErr)
          result = runCpuSchedulerClient(cpuAlgo, timeQuantum, processes)
        }

        onInitCpu(cpuAlgo, timeQuantum, processes, result)
      } else {
        // Validate Disk inputs
        const parsedRequests = diskRequests
          .split(',')
          .map((r) => r.trim())
          .filter((r) => r !== '')
          .map((r) => parseInt(r))
          
        if (parsedRequests.length === 0 || parsedRequests.some(isNaN)) {
          throw new Error('Disk requests must be a valid, comma-separated list of numbers.')
        }

        if (initialHead < 0 || initialHead > maxTrack) {
          throw new Error(`Initial head position must be between 0 and maximum track (${maxTrack}).`)
        }

        if (parsedRequests.some((r) => r < 0 || r > maxTrack)) {
          throw new Error(`All disk track requests must be between 0 and maximum track (${maxTrack}).`)
        }

        const requestsString = parsedRequests.join(',')
        const calculatedDiskSize = maxTrack + 1

        let result;
        try {
          const response = await fetch(
            `/api/schedule?mode=disk&algo=${diskAlgo}&head=${initialHead}&size=${calculatedDiskSize}&requests=${encodeURIComponent(
              requestsString
            )}`
          )

          if (!response.ok) {
            const errData = await response.json()
            throw new Error(errData.details || 'C++ execution failed')
          }

          result = await response.json()
        } catch (fetchErr) {
          console.warn('API Endpoint failed. Falling back to native-equivalent TypeScript logic.', fetchErr)
          result = runDiskSchedulerClient(diskAlgo, initialHead, calculatedDiskSize, parsedRequests)
        }

        onInitDisk(diskAlgo, initialHead, calculatedDiskSize, parsedRequests, result)
      }
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'An unexpected error occurred during logic calculations.')
    } finally {
      setLoading(false)
    }
  }

  const activeColorClass = isCpu ? 'text-cyan-400' : 'text-purple-400'
  const activeBorderClass = isCpu ? 'border-cyan-500/30' : 'border-purple-500/30'
  const activeBgClass = isCpu ? 'bg-cyan-500/10' : 'bg-purple-500/10'
  const activeFocusClass = isCpu ? 'focus:border-cyan-400' : 'focus:border-purple-400'
  const activeGlowButton = isCpu
    ? 'bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 shadow-glow-cyan animate-pulse-cyan'
    : 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 shadow-glow-purple animate-pulse-purple'

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 relative z-10 select-none">
      {/* Back button and title */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors duration-200 mb-6 group cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Return to Lab Terminal</span>
      </button>

      {/* Control panel header */}
      <div className="flex items-center gap-4 mb-8">
        <div className={`p-4 rounded-2xl ${activeBgClass} border ${activeBorderClass}`}>
          {isCpu ? (
            <Cpu className={`w-8 h-8 ${activeColorClass}`} />
          ) : (
            <HardDrive className={`w-8 h-8 ${activeColorClass}`} />
          )}
        </div>
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-wider uppercase">
            {isCpu ? 'CPU Scheduling' : 'Disk Scheduling'} Control Panel
          </h2>
          <p className="text-gray-400 text-sm uppercase tracking-wide">
            Configure Logic Parameters & Boot Engine
          </p>
        </div>
      </div>

      {/* Validation Message Display */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-950/20 text-red-400 text-sm flex items-start gap-3 animate-pulse">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold uppercase tracking-wider">Engine Blocked</p>
            <p className="mt-1 opacity-90">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Main glass panel */}
      <div className={`p-6 md:p-8 ${isCpu ? 'glass-panel-cyan' : 'glass-panel-purple'} mb-8 relative overflow-hidden`}>
        {/* Subtle decorative grid */}
        <div className="absolute inset-0 grid-overlay opacity-10 pointer-events-none" />

        {/* Algorithm selection row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Select Logic Algorithm
            </label>
            {isCpu ? (
              <select
                value={cpuAlgo}
                onChange={(e) => setCpuAlgo(e.target.value as CpuAlgorithm)}
                className={`w-full px-4 py-3 bg-slate-950/60 border ${activeBorderClass} rounded-xl text-white outline-none ${activeFocusClass} transition-colors cursor-pointer text-sm`}
              >
                <option value="fcfs">First Come First Served (FCFS)</option>
                <option value="sjf">Shortest Job First (SJF - Non-Preemptive)</option>
                <option value="srtf">Shortest Remaining Time First (SRTF - Preemptive)</option>
                <option value="rr">Round Robin (RR)</option>
                <option value="priority">Priority Scheduling (Non-Preemptive)</option>
              </select>
            ) : (
              <select
                value={diskAlgo}
                onChange={(e) => setDiskAlgo(e.target.value as DiskAlgorithm)}
                className={`w-full px-4 py-3 bg-slate-950/60 border ${activeBorderClass} rounded-xl text-white outline-none ${activeFocusClass} transition-colors cursor-pointer text-sm`}
              >
                <option value="fcfs">First Come First Served (FCFS)</option>
                <option value="sstf">Shortest Seek Time First (SSTF)</option>
                <option value="scan">SCAN (Elevator)</option>
                <option value="cscan">Circular SCAN (C-SCAN)</option>
                <option value="look">LOOK Scheduling</option>
                <option value="clook">C-LOOK Scheduling</option>
              </select>
            )}
          </div>

          {/* Time Quantum (Conditionally shown if Round Robin CPU) */}
          {isCpu && cpuAlgo === 'rr' && (
            <div className="transition-all duration-500 animate-float">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 flex justify-between">
                <span>Time Quantum</span>
                <span className={`${activeColorClass} font-bold`}>{timeQuantum} cycles</span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={timeQuantum}
                  onChange={(e) => setTimeQuantum(parseInt(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-900 accent-cyan-400"
                />
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={timeQuantum}
                  onChange={(e) => setTimeQuantum(Math.max(1, parseInt(e.target.value) || 1))}
                  className={`w-16 px-2 py-1.5 bg-slate-950/60 border ${activeBorderClass} rounded-lg text-center text-white outline-none text-sm`}
                />
              </div>
            </div>
          )}
        </div>

        {/* CPU Mode: Interactive Process Table */}
        {isCpu ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">
                Process Execution Table
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Presets:</span>
                <button
                  onClick={() => loadCpuPreset('standard')}
                  className="text-xs px-2.5 py-1 bg-slate-900 border border-slate-800 text-gray-300 hover:text-white rounded-md cursor-pointer transition-colors"
                >
                  Standard
                </button>
                <button
                  onClick={() => loadCpuPreset('competing')}
                  className="text-xs px-2.5 py-1 bg-slate-900 border border-slate-800 text-gray-300 hover:text-white rounded-md cursor-pointer transition-colors"
                >
                  High Arrival
                </button>
                <button
                  onClick={() => loadCpuPreset('priority')}
                  className="text-xs px-2.5 py-1 bg-slate-900 border border-slate-800 text-gray-300 hover:text-white rounded-md cursor-pointer transition-colors"
                >
                  Priority Set
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-950/40">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-950/80 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <th className="p-3.5">PID</th>
                    <th className="p-3.5">Arrival Time</th>
                    <th className="p-3.5">Burst Time</th>
                    {cpuAlgo === 'priority' && <th className="p-3.5">Priority</th>}
                    <th className="p-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {processes.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/30 transition-colors">
                      <td className="p-3">
                        <input
                          type="text"
                          value={p.pid}
                          onChange={(e) => updateProcessField(idx, 'pid', e.target.value)}
                          className={`w-20 px-2 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-white text-center outline-none ${activeFocusClass} font-semibold`}
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          value={p.arrival}
                          onChange={(e) => updateProcessField(idx, 'arrival', e.target.value)}
                          className={`w-24 px-2 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-white text-center outline-none ${activeFocusClass}`}
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="1"
                          value={p.burst}
                          onChange={(e) => updateProcessField(idx, 'burst', e.target.value)}
                          className={`w-24 px-2 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-white text-center outline-none ${activeFocusClass}`}
                        />
                      </td>
                      {cpuAlgo === 'priority' && (
                        <td className="p-3">
                          <input
                            type="number"
                            min="1"
                            value={p.priority}
                            onChange={(e) => updateProcessField(idx, 'priority', e.target.value)}
                            className={`w-24 px-2 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-white text-center outline-none ${activeFocusClass}`}
                          />
                        </td>
                      )}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => removeProcess(idx)}
                          className="p-2 text-gray-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add process row button */}
            <button
              onClick={addProcess}
              className={`mt-4 flex items-center gap-2 px-4 py-2 border ${activeBorderClass} rounded-xl text-xs font-bold uppercase tracking-wider text-white hover:bg-slate-900 transition-colors cursor-pointer`}
            >
              <Plus className={`w-4 h-4 ${activeColorClass}`} />
              <span>Add Process Node</span>
            </button>
          </div>
        ) : (
          /* Disk Mode parameters */
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Initial Cylinder Head Position
                </label>
                <input
                  type="number"
                  min="0"
                  max={maxTrack}
                  value={initialHead}
                  onChange={(e) => setInitialHead(Math.max(0, parseInt(e.target.value) || 0))}
                  className={`w-full px-4 py-3 bg-slate-950/60 border ${activeBorderClass} rounded-xl text-white outline-none ${activeFocusClass} transition-colors text-sm`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Maximum Cylinder / Track Number (e.g., 199)
                </label>
                <input
                  type="number"
                  min="9"
                  value={maxTrack}
                  onChange={(e) => setMaxTrack(Math.max(9, parseInt(e.target.value) || 199))}
                  className={`w-full px-4 py-3 bg-slate-950/60 border ${activeBorderClass} rounded-xl text-white outline-none ${activeFocusClass} transition-colors text-sm`}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Cylinder Tracks Queue (Comma Separated)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest">Presets:</span>
                  <button
                    onClick={() => loadDiskPreset('textbook')}
                    className="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-800 text-gray-300 hover:text-white rounded cursor-pointer transition-colors"
                  >
                    OS Textbook
                  </button>
                  <button
                    onClick={() => loadDiskPreset('alternating')}
                    className="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-800 text-gray-300 hover:text-white rounded cursor-pointer transition-colors"
                  >
                    Oscillating
                  </button>
                  <button
                    onClick={() => loadDiskPreset('random')}
                    className="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-800 text-gray-300 hover:text-white rounded cursor-pointer transition-colors"
                  >
                    Random
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={diskRequests}
                onChange={(e) => setDiskRequests(e.target.value)}
                placeholder="e.g. 98, 183, 37, 122, 14, 124, 65, 67"
                className={`w-full px-4 py-3.5 bg-slate-950/60 border ${activeBorderClass} rounded-xl text-white outline-none ${activeFocusClass} transition-colors text-sm font-mono tracking-wide`}
              />
              <p className="mt-2 text-[10px] text-gray-500 uppercase tracking-wider">
                Note: Standard inputs should fit within [0, {maxTrack}] boundaries.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Initialize pulsing submit button */}
      <div className="flex justify-center">
        <button
          onClick={handleInitialize}
          disabled={loading}
          className={`flex items-center gap-3 px-8 py-4 rounded-xl text-sm font-bold uppercase tracking-widest text-white cursor-pointer transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed ${activeGlowButton}`}
        >
          {loading ? (
            <>
              <span className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              <span>Engaging Logic Core...</span>
            </>
          ) : (
            <>
              <span>Initialize Logic Engine</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
