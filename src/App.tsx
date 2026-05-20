import { useState } from 'react'
import { CanvasBackground } from './components/CanvasBackground'
import { LandingPage } from './components/LandingPage'
import { ConfigPage } from './components/ConfigPage'
import { VisualizerPage } from './components/VisualizerPage'
import { AnalyticsPage } from './components/AnalyticsPage'
import type {
  AppMode,
  ScheduleMode,
  CpuAlgorithm,
  DiskAlgorithm,
  Process,
  CpuResult,
  DiskResult,
} from './types/scheduling'

function App() {
  const [pageState, setPageState] = useState<AppMode>('landing')
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('cpu')

  // CPU scheduling states
  const [cpuAlgo, setCpuAlgo] = useState<CpuAlgorithm>('fcfs')
  const [cpuQuantum, setCpuQuantum] = useState<number>(2)
  const [cpuProcesses, setCpuProcesses] = useState<Process[]>([])
  const [cpuResult, setCpuResult] = useState<CpuResult | null>(null)

  // Disk scheduling states
  const [diskAlgo, setDiskAlgo] = useState<DiskAlgorithm>('fcfs')
  const [initialHead, setInitialHead] = useState<number>(50)
  const [diskSize, setDiskSize] = useState<number>(200)
  const [diskRequests, setDiskRequests] = useState<number[]>([])
  const [diskResult, setDiskResult] = useState<DiskResult | null>(null)

  // Transition handlers
  const handleSelectMode = (mode: ScheduleMode) => {
    setScheduleMode(mode)
    setPageState('config')
  }

  const handleInitCpu = (
    algo: CpuAlgorithm,
    quantum: number,
    processes: Process[],
    result: CpuResult
  ) => {
    setCpuAlgo(algo)
    setCpuQuantum(quantum)
    setCpuProcesses(processes)
    setCpuResult(result)
    setPageState('visualizer')
  }

  const handleInitDisk = (
    algo: DiskAlgorithm,
    head: number,
    size: number,
    requests: number[],
    result: DiskResult
  ) => {
    setDiskAlgo(algo)
    setInitialHead(head)
    setDiskSize(size)
    setDiskRequests(requests)
    setDiskResult(result)
    setPageState('visualizer')
  }

  const getAlgoName = (): string => {
    if (scheduleMode === 'cpu') {
      switch (cpuAlgo) {
        case 'fcfs': return 'First Come First Served'
        case 'sjf': return 'Shortest Job First (Non-Preemptive)'
        case 'srtf': return 'Shortest Remaining Time First (SRTF - Preemptive)'
        case 'rr': return 'Round Robin (Quantum: ' + cpuQuantum + ')'
        case 'priority': return 'Priority Scheduling'
        default: return 'CPU Scheduler'
      }
    } else {
      switch (diskAlgo) {
        case 'fcfs': return 'First Come First Served'
        case 'sstf': return 'Shortest Seek Time First'
        case 'scan': return 'SCAN Elevator'
        case 'cscan': return 'Circular SCAN (C-SCAN)'
        case 'look': return 'LOOK Cylinder Traversal'
        case 'clook': return 'C-LOOK Cylinder Traversal'
        default: return 'Disk Scheduler'
      }
    }
  }

  return (
    <>
      {/* 1. Global Cinematic Animated Background */}
      <CanvasBackground />

      {/* 2. Page viewport layers with standard smooth entries */}
      <main className="relative min-h-screen w-full flex flex-col justify-between py-6 overflow-y-auto">
        
        {/* Navigation Bar Header */}
        <header className="w-full max-w-5xl mx-auto px-6 mb-6 flex justify-between items-center relative z-20">
          <div 
            onClick={() => setPageState('landing')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center font-black text-white text-xs shadow-glow-cyan group-hover:scale-105 transition-transform">
              OS
            </div>
            <span className="font-extrabold text-sm uppercase tracking-widest text-white group-hover:text-cyan-400 transition-colors">
              Core Engine
            </span>
          </div>

          <div className="text-[10px] tracking-widest text-gray-500 font-mono uppercase bg-slate-950/40 px-3 py-1 border border-slate-900 rounded-full select-none">
            Node + C++17 Native Engine
          </div>
        </header>

        {/* Dynamic Page Router */}
        <div className="flex-grow flex items-center justify-center w-full">
          {pageState === 'landing' && (
            <div className="w-full transition-all duration-700 opacity-100 scale-100">
              <LandingPage onSelectMode={handleSelectMode} />
            </div>
          )}

          {pageState === 'config' && (
            <div className="w-full transition-all duration-500 opacity-100 transform translate-y-0">
              <ConfigPage
                mode={scheduleMode}
                onBack={() => setPageState('landing')}
                onInitCpu={handleInitCpu}
                onInitDisk={handleInitDisk}
              />
            </div>
          )}

          {pageState === 'visualizer' && (
            <div className="w-full transition-all duration-500 opacity-100 scale-100">
              <VisualizerPage
                mode={scheduleMode}
                algoName={getAlgoName()}
                cpuResult={cpuResult}
                cpuProcesses={cpuProcesses}
                diskResult={diskResult}
                initialHead={initialHead}
                diskSize={diskSize}
                diskRequests={diskRequests}
                onComplete={() => setPageState('analytics')}
              />
            </div>
          )}

          {pageState === 'analytics' && (
            <div className="w-full transition-all duration-700 opacity-100 scale-100">
              <AnalyticsPage
                mode={scheduleMode}
                algoName={getAlgoName()}
                cpuResult={cpuResult}
                cpuProcesses={cpuProcesses}
                diskResult={diskResult}
                initialHead={initialHead}
                diskSize={diskSize}
                diskRequests={diskRequests}
                onRestart={() => setPageState('landing')}
              />
            </div>
          )}
        </div>
      </main>
    </>
  )
}

export default App
