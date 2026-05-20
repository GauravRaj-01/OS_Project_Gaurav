import React, { useState } from 'react'
import { Cpu, HardDrive } from 'lucide-react'
import type { ScheduleMode } from '../types/scheduling'

interface LandingPageProps {
  onSelectMode: (mode: ScheduleMode) => void
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectMode }) => {
  const [tiltCpu, setTiltCpu] = useState({ rx: 0, ry: 0, shadowX: 0, shadowY: 0 })
  const [tiltDisk, setTiltDisk] = useState({ rx: 0, ry: 0, shadowX: 0, shadowY: 0 })

  const handleMouseMove = (
    e: React.MouseEvent<HTMLDivElement>,
    card: 'cpu' | 'disk'
  ) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left // Mouse position within card
    const y = e.clientY - rect.top

    // Calculate normalized coords (-0.5 to 0.5)
    const px = x / rect.width - 0.5
    const py = y / rect.height - 0.5

    // Multipliers for tilt angle and shadow glow displacement
    const maxTilt = 12
    const rx = -py * maxTilt
    const ry = px * maxTilt

    const shadowX = px * 15
    const shadowY = py * 15

    if (card === 'cpu') {
      setTiltCpu({ rx, ry, shadowX, shadowY })
    } else {
      setTiltDisk({ rx, ry, shadowX, shadowY })
    }
  }

  const handleMouseLeave = (card: 'cpu' | 'disk') => {
    if (card === 'cpu') {
      setTiltCpu({ rx: 0, ry: 0, shadowX: 0, shadowY: 0 })
    } else {
      setTiltDisk({ rx: 0, ry: 0, shadowX: 0, shadowY: 0 })
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] px-4 py-8 select-none relative z-10">
      {/* Cinematic Title Group */}
      <div className="text-center mb-16 max-w-3xl animate-float">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-widest text-white uppercase text-center leading-tight">
          UNLEASH THE <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-400 to-purple-500 text-glow-cyan">
            CORE SYSTEM
          </span>
        </h1>
        <p className="mt-4 text-gray-400 text-sm md:text-base tracking-wider uppercase">
          Next-Gen Operating System Scheduling Visualizer Lab
        </p>
        <div className="h-[2px] w-32 bg-gradient-to-r from-cyan-500 to-purple-500 mx-auto mt-6 rounded-full opacity-60 shadow-glow-cyan" />
      </div>

      {/* Lab Cards Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 w-full max-w-4xl px-4">
        {/* Card A: CPU Scheduling Lab */}
        <div
          onClick={() => onSelectMode('cpu')}
          onMouseMove={(e) => handleMouseMove(e, 'cpu')}
          onMouseLeave={() => handleMouseLeave('cpu')}
          style={{
            transform: `perspective(1000px) rotateX(${tiltCpu.rx}deg) rotateY(${tiltCpu.ry}deg)`,
            boxShadow: `${tiltCpu.shadowX}px ${tiltCpu.shadowY}px 35px rgba(6, 182, 212, 0.18)`,
          }}
          className="glass-panel-cyan glow-hover-cyan cursor-pointer p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group select-none h-[380px]"
        >
          {/* Subtle Scanning Grid Lines in background */}
          <div className="absolute inset-0 grid-overlay opacity-30 pointer-events-none" />
          <div className="sweep-line" />

          {/* Glowing Aura behind Icon */}
          <div className="absolute w-36 h-36 rounded-full bg-cyan-500/10 blur-3xl group-hover:bg-cyan-500/20 transition-all duration-500 pointer-events-none" />

          {/* Premium Chip Icon */}
          <div className="relative p-6 bg-cyan-950/40 border border-cyan-500/30 rounded-2xl mb-6 shadow-[0_0_15px_rgba(6,182,212,0.1)] group-hover:scale-110 transition-transform duration-500">
            <Cpu className="w-16 h-16 text-cyan-400 filter drop-shadow-[0_0_8px_rgba(6,182,212,0.5)] animate-pulse" />
          </div>

          <h2 className="text-2xl font-bold text-white tracking-widest uppercase mb-3">
            CPU SCHEDULING LAB
          </h2>
          <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
            Configure, compute, and visualize processes executing through multi-core registers using standard algorithmic context-switching.
          </p>

          {/* Action indicator at card footer */}
          <div className="mt-6 flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span>Access Processor Lab</span>
            <span className="animate-ping w-2 h-2 rounded-full bg-cyan-400" />
          </div>
        </div>

        {/* Card B: Disk Scheduling Lab */}
        <div
          onClick={() => onSelectMode('disk')}
          onMouseMove={(e) => handleMouseMove(e, 'disk')}
          onMouseLeave={() => handleMouseLeave('disk')}
          style={{
            transform: `perspective(1000px) rotateX(${tiltDisk.rx}deg) rotateY(${tiltDisk.ry}deg)`,
            boxShadow: `${tiltDisk.shadowX}px ${tiltDisk.shadowY}px 35px rgba(168, 85, 247, 0.18)`,
          }}
          className="glass-panel-purple glow-hover-purple cursor-pointer p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group select-none h-[380px]"
        >
          {/* Subtle Scanning Grid Lines in background */}
          <div className="absolute inset-0 grid-overlay opacity-30 pointer-events-none" />
          <div className="sweep-line" style={{ animationDelay: '2s' }} />

          {/* Glowing Aura behind Icon */}
          <div className="absolute w-36 h-36 rounded-full bg-purple-500/10 blur-3xl group-hover:bg-purple-500/20 transition-all duration-500 pointer-events-none" />

          {/* Premium Disk Platter Icon */}
          <div className="relative p-6 bg-purple-950/40 border border-purple-500/30 rounded-2xl mb-6 shadow-[0_0_15px_rgba(168,85,247,0.1)] group-hover:scale-110 transition-transform duration-500">
            <HardDrive className="w-16 h-16 text-purple-400 filter drop-shadow-[0_0_8px_rgba(168,85,247,0.5)] animate-pulse" />
          </div>

          <h2 className="text-2xl font-bold text-white tracking-widest uppercase mb-3">
            DISK SCHEDULING LAB
          </h2>
          <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
            Coordinate magnetic cylinder read/write head movements and plot total seek operation pathways in glowing neon traces.
          </p>

          {/* Action indicator at card footer */}
          <div className="mt-6 flex items-center gap-2 text-purple-400 text-xs font-semibold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span>Access Platter Lab</span>
            <span className="animate-ping w-2 h-2 rounded-full bg-purple-400" />
          </div>
        </div>
      </div>
    </div>
  )
}
