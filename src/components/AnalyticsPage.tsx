import React, { useState } from 'react'
import { CheckCircle2, MessageSquare, Send, RefreshCw, ExternalLink } from 'lucide-react'
import type {
  ScheduleMode,
  CpuResult,
  DiskResult,
  Process,
} from '../types/scheduling'

interface AnalyticsPageProps {
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
  // Reset
  onRestart: () => void
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  mode,
  algoName,
  cpuResult,
  diskResult,
  diskRequests,
  onRestart,
}) => {
  const isCpu = mode === 'cpu'

  // Feedback Form State
  const [feedback, setFeedback] = useState<string>('')
  const [submitted, setSubmitted] = useState<boolean>(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Asynchronous API submission hook
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    // Keep your length constraint
    if (feedback.trim().length < 10) {
      setFormError('Transmission payload too short. Please provide at least 10 characters of detail.')
      return
    }

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Replace this placeholder string with your actual access key from web3forms.com
          access_key: "dcf0b94b-722e-45cd-a3cd-3b3f8f4540d4", 
          message: feedback,
          subject: `OS Visualizer Feedback [${mode.toUpperCase()} - ${algoName}]`
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSubmitted(true)
        setFeedback('')
      } else {
        setFormError('Transmission failure. Central administrator rejected packets.')
      }
    } catch (error) {
      setFormError('Network routing error. Check local gateway arrays.')
    }
  }

  const activeColorClass = isCpu ? 'text-cyan-400' : 'text-purple-400'
  const activeBorderClass = isCpu ? 'border-cyan-500/20' : 'border-purple-500/20'
  const activeBgClass = isCpu ? 'bg-cyan-500/10' : 'bg-purple-500/10'
  const activeFocusClass = isCpu ? 'focus:border-cyan-400' : 'focus:border-purple-400'

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 relative z-10 select-none">
      {/* Analytics Title */}
      <div className="text-center mb-10">
        <h2 className={`text-4xl font-extrabold tracking-widest uppercase mb-2 ${isCpu ? 'text-glow-cyan text-cyan-400' : 'text-glow-purple text-purple-400'}`}>
          Performance Analytics Hub
        </h2>
        <p className="text-gray-400 text-xs uppercase tracking-widest">
          Comprehensive benchmark diagnostics for {algoName}
        </p>
      </div>

      {/* Grid containing Metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {isCpu && cpuResult ? (
          <>
            {/* CPU Metric 1 */}
            <div className="glass-panel p-6 border-cyan-500/20 flex flex-col justify-between items-center text-center shadow-[0_0_15px_rgba(6,182,212,0.02)]">
              <span className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
                Average Waiting Time
              </span>
              <div className="text-cyan-400 text-5xl font-black font-mono my-4 text-glow-cyan">
                {cpuResult.metrics.avg_waiting.toFixed(3)}
              </div>
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                Total clock cycles spent queueing in ready buffer
              </span>
            </div>

            {/* CPU Metric 2 */}
            <div className="glass-panel p-6 border-cyan-500/20 flex flex-col justify-between items-center text-center shadow-[0_0_15px_rgba(6,182,212,0.02)]">
              <span className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
                Average Turnaround Time
              </span>
              <div className="text-cyan-400 text-5xl font-black font-mono my-4 text-glow-cyan">
                {cpuResult.metrics.avg_turnaround.toFixed(3)}
              </div>
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                Average duration from core arrival to finish registers
              </span>
            </div>
          </>
        ) : diskResult ? (
          <>
            {/* Disk Metric 1 */}
            <div className="glass-panel p-6 border-purple-500/20 flex flex-col justify-between items-center text-center shadow-[0_0_15px_rgba(168,85,247,0.02)]">
              <span className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
                Total Seek Cylinders
              </span>
              <div className="text-purple-400 text-5xl font-black font-mono my-4 text-glow-purple">
                {diskResult.total_seek}
              </div>
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                Total tracks traversed by the magnetic arm head
              </span>
            </div>

            {/* Disk Metric 2 */}
            <div className="glass-panel p-6 border-purple-500/20 flex flex-col justify-between items-center text-center shadow-[0_0_15px_rgba(168,85,247,0.02)]">
              <span className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
                Average Seek Hop
              </span>
              <div className="text-purple-400 text-5xl font-black font-mono my-4 text-glow-purple">
                {(diskResult.total_seek / diskRequests.length).toFixed(2)}
              </div>
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                Average track distance covered per cylinder request
              </span>
            </div>
          </>
        ) : null}
      </div>

      {/* Numerical Data breakdown list / Table */}
      <div className={`p-6 ${isCpu ? 'glass-panel-cyan' : 'glass-panel-purple'} mb-8 relative overflow-hidden`}>
        <div className="absolute inset-0 grid-overlay opacity-10 pointer-events-none" />
        <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-4">
          Detailed Performance Log
        </h3>

        {isCpu && cpuResult ? (
          <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-950/40">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-950/80 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <th className="p-3">Process ID</th>
                  <th className="p-3 text-center">Arrival</th>
                  <th className="p-3 text-center">Burst</th>
                  <th className="p-3 text-center">Finish</th>
                  <th className="p-3 text-center">Turnaround</th>
                  <th className="p-3 text-center">Waiting</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {cpuResult.processes.map((res, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/30 transition-colors">
                    <td className="p-3 font-bold text-white">{res.pid}</td>
                    <td className="p-3 text-center font-mono">{res.arrival}</td>
                    <td className="p-3 text-center font-mono">{res.burst}</td>
                    <td className="p-3 text-center font-mono text-cyan-400 font-bold">{res.finish}</td>
                    <td className="p-3 text-center font-mono">{res.turnaround}</td>
                    <td className="p-3 text-center font-mono">{res.waiting}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : diskResult ? (
          /* Disk traversal hops */
          <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-950/40 max-h-72 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-950/80 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <th className="p-3">Traversing Hop</th>
                  <th className="p-3">Cylinder Traversal Path</th>
                  <th className="p-3 text-center">Traversed Distance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {diskResult.seek_steps.map((step, idx) => {
                  const fromTrack = diskResult.sequence[idx]
                  const toTrack = diskResult.sequence[idx + 1]
                  return (
                    <tr key={idx} className="hover:bg-slate-900/30 transition-colors">
                      <td className="p-3 font-bold text-white">Hop #{idx + 1}</td>
                      <td className="p-3 font-mono text-gray-300">
                        {fromTrack} <span className="text-purple-400">➔</span> {toTrack}
                      </td>
                      <td className="p-3 text-center font-mono text-purple-400 font-bold">
                        +{step} tracks
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {/* Feedback Box Component: "Transmission to Developer" */}
      <div className="glass-panel p-6 md:p-8 border-slate-800/80 backdrop-blur-lg mb-8 relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className={`w-5 h-5 ${activeColorClass}`} />
          <h3 className="text-lg font-bold uppercase tracking-widest text-white">
            Transmission to Developer
          </h3>
        </div>

        {submitted ? (
          <div className="p-6 border border-emerald-500/20 bg-emerald-950/20 rounded-2xl flex flex-col items-center justify-center text-center animate-float">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-3 filter drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            <h4 className="text-white font-extrabold uppercase tracking-wider text-sm mb-1">
              Transmission Confirmed
            </h4>
            <p className="text-gray-400 text-xs max-w-sm leading-relaxed">
              Your logs and diagnostics reports have been packeted and routed to the central administrator hub. Thank you!
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-4 text-xs font-bold text-emerald-400 hover:underline uppercase tracking-wider cursor-pointer"
            >
              Send Another Transmission
            </button>
          </div>
        ) : (
          <form onSubmit={handleFeedbackSubmit} className="space-y-4">
            <div>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Leave your feedback or bug reports here..."
                rows={4}
                className={`w-full px-4 py-3 bg-slate-950/60 border ${activeBorderClass} rounded-xl text-white outline-none ${activeFocusClass} transition-all text-sm resize-none`}
              />
              {formError && (
                <p className="mt-2 text-xs font-bold text-red-400 uppercase tracking-widest">
                  {formError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className={`flex items-center gap-2 px-6 py-3 border ${activeBorderClass} ${activeBgClass} hover:bg-slate-900 rounded-xl text-xs font-bold uppercase tracking-widest text-white cursor-pointer transition-all duration-300`}
            >
              <span>Send Message</span>
              <Send className={`w-3.5 h-3.5 ${activeColorClass}`} />
            </button>
          </form>
        )}
      </div>

      {/* Main actions footer */}
      <div className="flex justify-center mb-16">
        <button
          onClick={onRestart}
          className={`flex items-center gap-2 px-8 py-3.5 border ${activeBorderClass} ${activeBgClass} hover:bg-slate-950 rounded-xl text-xs font-bold uppercase tracking-widest text-white cursor-pointer transition-all duration-300`}
        >
          <RefreshCw className={`w-4 h-4 ${activeColorClass}`} />
          <span>Launch Another Simulation</span>
        </button>
      </div>

      {/* Developer Attribution Link */}
      <div className="text-center text-xs tracking-widest text-gray-500 uppercase flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 select-none pt-4 border-t border-slate-900/60">
        <div className="flex items-center gap-1.5">
          <span>Engineered by</span>
          <span className="text-gray-300 font-bold">Gaurav Raj Lakshkar</span>
        </div>

        {/* Divider line visible only on desktop */}
        <span className="hidden sm:inline text-slate-800">|</span>

        {/* Social Links Container */}
        <div className="flex items-center gap-4 lowercase tracking-normal normal-case">
          {/* GitHub Link */}
          <a
            href="https://github.com/GauravRaj-01"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-cyan-400 font-medium transition-all duration-300 flex items-center gap-1 group text-xs"
          >
            <span>GitHub</span>
            <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-cyan-400 group-hover:scale-110 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </a>

          {/* LinkedIn Link */}
          <a
            href="https://www.linkedin.com/in/gaurav-raj-lakshkar-7772252b2"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-blue-400 font-medium transition-all duration-300 flex items-center gap-1 group text-xs"
          >
            <span>LinkedIn</span>
            <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-blue-400 group-hover:scale-110 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </a>
          {/* Telegram Link */}
          <a
            href="https://t.me/Iamgauravvv"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-blue-400 font-medium transition-all duration-300 flex items-center gap-1 group text-xs"
          >
            <span>Telegram</span>
            <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-blue-400 group-hover:scale-110 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </a>
        </div>
      </div>
    </div>
  )
}