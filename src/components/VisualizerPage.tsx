import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, ArrowRight, Cpu, HardDrive } from 'lucide-react'
import type {
  ScheduleMode,
  Process,
  CpuResult,
  DiskResult,
} from '../types/scheduling'

interface VisualizerPageProps {
  mode: ScheduleMode
  algoName: string
  // CPU data
  cpuResult: CpuResult | null
  cpuProcesses: Process[]
  // Disk data
  diskResult: DiskResult | null
  initialHead: number
  diskSize: number
  diskRequests: number[]
  // Navigation
  onComplete: () => void
}

export const VisualizerPage: React.FC<VisualizerPageProps> = ({
  mode,
  algoName,
  cpuResult,
  cpuProcesses,
  diskResult,
  diskSize,
  diskRequests,
  onComplete,
}) => {
  const isCpu = mode === 'cpu'

  // Playback Control States
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [speed, setSpeed] = useState<number>(1) // Speed multiplier: 1x, 2x, 3x

  // Animation Timers
  const [clock, setClock] = useState<number>(0) // CPU clock tick or Disk step index
  const [finished, setFinished] = useState<boolean>(false)

  // Maximum limits
  const maxCpuTime = cpuResult ? cpuResult.timeline[cpuResult.timeline.length - 1]?.end || 0 : 0
  const maxDiskSteps = diskResult ? diskResult.sequence.length - 1 : 0

  // Disk Canvas Ref
  const diskCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Reset function
  const handleReset = () => {
    setClock(0)
    setFinished(false)
    setIsPlaying(true)
  }

  // Ticker Effect
  useEffect(() => {
    if (!isPlaying || finished) return

    const baseInterval = 1000 // 1 second per step at 1x
    const intervalTime = baseInterval / speed

    const timer = setInterval(() => {
      if (isCpu) {
        if (clock >= maxCpuTime) {
          setFinished(true)
          setIsPlaying(false)
          clearInterval(timer)
        } else {
          setClock((prev) => prev + 1)
        }
      } else {
        if (clock >= maxDiskSteps) {
          setFinished(true)
          setIsPlaying(false)
          clearInterval(timer)
        } else {
          setClock((prev) => prev + 1)
        }
      }
    }, intervalTime)

    return () => clearInterval(timer)
  }, [isPlaying, clock, speed, isCpu, maxCpuTime, maxDiskSteps, finished])

  // Canvas Drawing Effect for Disk Seeker Plot
  useEffect(() => {
    if (isCpu || !diskResult || !diskCanvasRef.current) return

    const canvas = diskCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set high display quality
    const width = canvas.width
    const height = canvas.height
    ctx.clearRect(0, 0, width, height)

    // Draw background cylinder reference lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)'
    ctx.lineWidth = 1
    const cols = 10
    for (let i = 0; i <= cols; i++) {
      const x = (i / cols) * width
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()

      // Small tick label at top
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
      ctx.font = '9px monospace'
      ctx.fillText(Math.floor((i / cols) * diskSize).toString(), x - 8, 12)
    }

    const sequence = diskResult.sequence
    const totalSteps = sequence.length - 1

    if (totalSteps <= 0) return

    // Draw the seek paths up to current clock step
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const stepHeight = (height - 30) / totalSteps // Vertical gap per hop

    for (let i = 0; i < clock; i++) {
      const fromX = (sequence[i] / diskSize) * width
      const fromY = 25 + i * stepHeight
      const toX = (sequence[i + 1] / diskSize) * width
      const toY = 25 + (i + 1) * stepHeight

      // Draw completed segments in solid cyber purple
      ctx.beginPath()
      ctx.moveTo(fromX, fromY)
      ctx.lineTo(toX, toY)
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.85)'
      ctx.shadowBlur = 8
      ctx.shadowColor = 'rgba(168, 85, 247, 0.5)'
      ctx.stroke()
      ctx.shadowBlur = 0 // Reset

      // Draw small circles at landing points
      ctx.beginPath()
      ctx.arc(toX, toY, 3.5, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.shadowBlur = 4
      ctx.shadowColor = '#ffffff'
      ctx.fill()
      ctx.shadowBlur = 0

      // Write text label for track number
      ctx.fillStyle = 'rgba(168, 85, 247, 0.9)'
      ctx.font = '10px Outfit, sans-serif'
      ctx.fillText(`t=${sequence[i + 1]}`, toX + 8, toY + 3)
    }

    // Draw initial node circle
    const initX = (sequence[0] / diskSize) * width
    ctx.beginPath()
    ctx.arc(initX, 25, 4.5, 0, Math.PI * 2)
    ctx.fillStyle = '#a855f7'
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = '10px Outfit, sans-serif'
    ctx.fillText(`start=${sequence[0]}`, initX + 8, 28)

  }, [clock, isCpu, diskResult, diskSize])

  // --- CPU SIMULATION LOGIC RESOLUTION FOR FRONTEND ---
  // Find currently active interval in timeline
  const activeInterval = isCpu && cpuResult
    ? cpuResult.timeline.find((t) => clock > t.start && clock <= t.end) ||
      cpuResult.timeline.find((t) => clock === t.start) // fallback
    : null

  const activePid = activeInterval ? activeInterval.pid : 'IDLE'

  // Calculate current execution stats
  const activeIntervalDetails = cpuResult?.timeline.find((t) => clock >= t.start && clock <= t.end)
  
  // Calculate remaining burst time for active process at clock time
  let remainingSlice = 0
  if (activeIntervalDetails && activePid !== 'IDLE') {
    remainingSlice = activeIntervalDetails.end - clock
  }

  // Calculate dynamic Ready Queue
  const getReadyQueue = (): string[] => {
    if (!isCpu || !cpuResult) return []
    // A process is in the ready queue if:
    // 1. It has arrived (arrival <= clock)
    // 2. It has remaining burst time (i.e. finish time is after clock, or finish time not set yet)
    // 3. It is NOT the currently executing process (p.pid !== activePid)
    const queue: string[] = []
    cpuProcesses.forEach((p) => {
      // Find matching result finish time
      const res = cpuResult.processes.find((r) => r.pid === p.pid)
      if (res && p.arrival <= clock && res.finish > clock && p.pid !== activePid) {
        queue.push(p.pid)
      }
    })
    // Sort ready queue. Typically FCFS order of arrival, breaking ties by PID/index
    return queue.sort((a, b) => {
      const pa = cpuProcesses.find((p) => p.pid === a)!
      const pb = cpuProcesses.find((p) => p.pid === b)!
      return pa.arrival - pb.arrival
    })
  }

  const readyQueue = getReadyQueue()

  // Color mapper for CPU processes
  const getProcessColor = (pid: string): string => {
    if (pid === 'IDLE') return 'bg-slate-900 border-slate-700 text-gray-500'
    const colors = [
      'bg-cyan-500/20 border-cyan-400 text-cyan-300',
      'bg-emerald-500/20 border-emerald-400 text-emerald-300',
      'bg-amber-500/20 border-amber-400 text-amber-300',
      'bg-rose-500/20 border-rose-400 text-rose-300',
      'bg-indigo-500/20 border-indigo-400 text-indigo-300',
    ]
    const idx = cpuProcesses.findIndex((p) => p.pid === pid)
    return colors[idx % colors.length]
  }

  const getProcessBgGlow = (pid: string): string => {
    if (pid === 'IDLE') return 'rgba(30, 41, 59, 0.4)'
    const colors = [
      'rgba(6, 182, 212, 0.45)', // Cyan
      'rgba(16, 185, 129, 0.45)', // Emerald
      'rgba(245, 158, 11, 0.45)', // Amber
      'rgba(244, 63, 94, 0.45)',  // Rose
      'rgba(99, 102, 241, 0.45)', // Indigo
    ]
    const idx = cpuProcesses.findIndex((p) => p.pid === pid)
    return colors[idx % colors.length]
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative z-10 select-none">
      {/* Simulation Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-cyan-400">
            {isCpu ? <Cpu className="w-6 h-6 animate-spin" style={{ animationDuration: '6s' }} /> : <HardDrive className="w-6 h-6 animate-pulse" />}
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-white uppercase tracking-wider">
              Simulation Lab Terminal
            </h2>
            <p className="text-gray-400 text-xs uppercase tracking-widest mt-0.5">
              Algorithm: <span className={isCpu ? 'text-cyan-400 font-bold' : 'text-purple-400 font-bold'}>{algoName}</span>
            </p>
          </div>
        </div>

        {/* Dashboard Controls */}
        <div className="flex items-center flex-wrap gap-4 bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80 backdrop-blur-md">
          {/* Clock Info */}
          <div className="px-4 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-center">
            <span className="text-[10px] text-gray-500 uppercase font-semibold block tracking-wider">
              {isCpu ? 'CLOCK CYCLE' : 'SEEK STEP'}
            </span>
            <span className="text-white font-mono font-bold text-sm tracking-wide">
              {isCpu ? `${clock} / ${maxCpuTime}` : `${clock} / ${maxDiskSteps}`}
            </span>
          </div>

          {/* Speed slider */}
          <div className="flex items-center gap-2 px-3 border-l border-slate-800">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Speed:</span>
            <select
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="bg-transparent text-white text-xs outline-none border border-slate-800 rounded px-1 py-0.5 cursor-pointer font-bold"
            >
              <option value="0.5">0.5x</option>
              <option value="1">1.0x</option>
              <option value="2">2.0x</option>
              <option value="3">3.0x</option>
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={finished}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isPlaying
                  ? 'border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                  : isCpu
                  ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
                  : 'border-purple-500/20 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={handleReset}
              className="p-2 border border-slate-800 text-gray-400 hover:text-white rounded-xl hover:bg-slate-900 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Complete simulation alert and navigation */}
      {finished && (
        <div className="mb-8 p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/15 text-emerald-400 text-sm flex items-center justify-between gap-4 animate-float">
          <div>
            <p className="font-extrabold uppercase tracking-wider text-xs">Simulation Success</p>
            <p className="opacity-90 mt-0.5">Computational path fully drawn. Engage metric analytics engine below.</p>
          </div>
          <button
            onClick={onComplete}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest text-white cursor-pointer ${
              isCpu
                ? 'bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 shadow-glow-cyan'
                : 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 shadow-glow-purple'
            }`}
          >
            <span>Complete Analysis</span>
            <ArrowRight className="w-4 h-4 animate-ping" />
          </button>
        </div>
      )}

      {/* Simulation Screen */}
      <div className={`p-6 ${isCpu ? 'glass-panel-cyan' : 'glass-panel-purple'} relative overflow-hidden min-h-[460px] flex flex-col justify-between`}>
        <div className="absolute inset-0 grid-overlay opacity-10 pointer-events-none" />

        {isCpu ? (
          /* ================== CPU VISUALIZER SCREEN ================== */
          <div className="space-y-8 flex-grow flex flex-col justify-between">
            {/* Top Row: Ready Queue & CPU Register */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center flex-grow">
              {/* Ready Queue column (2 cols wide on medium) */}
              <div className="md:col-span-2 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <span>Ready Queue Register</span>
                  <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded-md text-[10px] text-cyan-400 font-mono">
                    {readyQueue.length} Queueing
                  </span>
                </h3>
                <div className="flex items-center gap-3 p-4 bg-slate-950/60 border border-cyan-500/10 rounded-2xl min-h-[96px] overflow-x-auto select-none scrollbar-thin">
                  {readyQueue.length === 0 ? (
                    <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold mx-auto">
                      Ready Queue Empty
                    </span>
                  ) : (
                    readyQueue.map((pid, idx) => (
                      <div
                        key={idx}
                        className={`px-5 py-3 border rounded-xl flex flex-col items-center gap-1 min-w-[75px] text-center select-none shadow-[0_0_15px_rgba(6,182,212,0.03)] ${getProcessColor(
                          pid
                        )}`}
                      >
                        <span className="font-extrabold text-sm tracking-wide">{pid}</span>
                        <span className="text-[9px] opacity-75 uppercase">
                          arr={cpuProcesses.find((p) => p.pid === pid)?.arrival}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Centered Active CPU Core */}
              <div className="flex flex-col items-center justify-center">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
                  Processor Core Registers
                </h3>
                <div
                  className={`w-44 h-44 border-2 rounded-3xl flex flex-col items-center justify-center relative select-none transition-all duration-300 ${
                    activePid === 'IDLE'
                      ? 'border-slate-800 bg-slate-950/40 text-gray-500 shadow-inner'
                      : 'border-cyan-400/70 bg-cyan-950/20 text-white shadow-glow-cyan'
                  }`}
                  style={{
                    boxShadow: activePid !== 'IDLE' ? `0 0 25px ${getProcessBgGlow(activePid)}` : undefined,
                  }}
                >
                  {/* Decorative orbital line */}
                  <div className={`absolute inset-1.5 border border-dashed rounded-full pointer-events-none ${activePid !== 'IDLE' ? 'border-cyan-500/30 animate-spin' : 'border-slate-800'}`} style={{ animationDuration: '15s' }} />

                  {activePid === 'IDLE' ? (
                    <div className="text-center">
                      <span className="font-extrabold text-lg uppercase tracking-widest block animate-pulse">IDLE</span>
                      <span className="text-[9px] text-gray-600 uppercase tracking-wide">Ready for input</span>
                    </div>
                  ) : (
                    <div className="text-center z-10">
                      <span className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-widest block mb-1">
                        EXECUTING
                      </span>
                      <span className="font-black text-4xl tracking-wider block text-white filter drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
                        {activePid}
                      </span>
                      {remainingSlice > 0 && (
                        <div className="mt-2 px-2.5 py-0.5 bg-cyan-500/20 border border-cyan-400/30 rounded-full text-[10px] text-cyan-300 font-bold font-mono tracking-widest inline-block uppercase">
                          {remainingSlice} CYCLES
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Row: Gantt Chart */}
            <div className="space-y-3 pt-6 border-t border-slate-900">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Gantt Timeline Chart Drawing
              </h3>
              <div className="relative w-full h-12 bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden flex select-none">
                {cpuResult?.timeline.map((interval, idx) => {
                  const duration = interval.end - interval.start
                  const percentWidth = (duration / maxCpuTime) * 100

                  // If we are currently inside this interval, show partially
                  let revealWidth = percentWidth
                  if (clock > interval.start && clock < interval.end) {
                    revealWidth = ((clock - interval.start) / maxCpuTime) * 100
                  } else if (clock <= interval.start) {
                    revealWidth = 0
                  }

                  if (revealWidth <= 0) return null

                  const isIdle = interval.pid === 'IDLE'
                  const colorClass = isIdle
                    ? 'bg-slate-900 border-slate-800 text-gray-600'
                    : getProcessColor(interval.pid)

                  return (
                    <div
                      key={idx}
                      style={{ width: `${revealWidth}%` }}
                      className={`h-full border-r border-slate-950 flex items-center justify-center font-bold text-xs transition-all duration-300 select-none overflow-hidden ${colorClass}`}
                    >
                      <span className="text-[10px] truncate px-1">{interval.pid}</span>
                    </div>
                  )
                })}
              </div>

              {/* Ticks underneath the Gantt chart */}
              <div className="flex justify-between text-[10px] font-mono text-gray-500 px-1">
                <span>0</span>
                {Array.from({ length: 5 }, (_, i) => {
                  const tickVal = Math.floor(((i + 1) / 5) * maxCpuTime)
                  return <span key={i}>{tickVal}</span>
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ================== DISK VISUALIZER SCREEN ================== */
          <div className="space-y-6 flex-grow flex flex-col justify-between select-none">
            {/* Top: Cylinder Axis scale & Moving needle head */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Disk Cylinder Track Assembly
              </h3>

              {/* The slider scale */}
              <div className="relative h-10 bg-slate-950/60 border border-purple-500/10 rounded-2xl select-none px-4 flex items-center">
                {/* Ticks and scale marks */}
                <div className="absolute inset-x-4 h-[1px] bg-slate-800" />

                {/* Plot existing requested track dots */}
                {diskRequests.map((track, idx) => {
                  const leftPercent = (track / diskSize) * 100
                  return (
                    <div
                      key={idx}
                      style={{ left: `calc(${leftPercent}% - 4px)` }}
                      className="absolute w-2 h-2 rounded-full bg-purple-900/60 border border-purple-500/30 hover:scale-125 transition-transform"
                      title={`Request track ${track}`}
                    />
                  )
                })}

                {/* Live Head Pointer Pointer */}
                {diskResult && (
                  <div
                    style={{
                      left: `calc(${(diskResult.sequence[clock] / diskSize) * 100}% - 8px)`,
                      transition: `left ${600 / speed}ms cubic-bezier(0.25, 1, 0.5, 1)`,
                    }}
                    className="absolute w-4 h-8 flex flex-col items-center justify-between z-20 pointer-events-none"
                  >
                    <div className="w-[2px] h-4 bg-purple-400 shadow-glow-purple" />
                    {/* Glowing head node */}
                    <div className="w-4 h-4 rounded-full border-2 border-white bg-purple-500 shadow-glow-purple" />
                  </div>
                )}
              </div>

              {/* Head stats details */}
              {diskResult && (
                <div className="flex justify-between items-center text-xs px-2 select-none">
                  <span className="text-gray-400 font-semibold uppercase tracking-wider">
                    Current Cylinder Position:{' '}
                    <span className="text-purple-400 font-extrabold font-mono text-sm">
                      {diskResult.sequence[clock]}
                    </span>
                  </span>
                  {clock > 0 && (
                    <span className="text-gray-400 font-semibold uppercase tracking-wider">
                      Seek Step Hop:{' '}
                      <span className="text-purple-400 font-extrabold font-mono text-sm">
                        +{diskResult.seek_steps[clock - 1]} tracks
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Bottom: Custom Seeker Line Plot Canvas */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                2D Cylinder Head Movement Path Plot
              </h3>
              <div className="bg-slate-950/80 border border-purple-500/10 rounded-2xl p-2 select-none">
                <canvas
                  ref={diskCanvasRef}
                  width={800}
                  height={250}
                  className="w-full h-[220px] bg-slate-950 rounded-xl"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
