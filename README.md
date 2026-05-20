# 🚀 OS Scheduling Lab Visualizer

A hybrid Operating System Scheduling Simulator built using **React + TypeScript + C++17**, designed to visualize and analyze **CPU Scheduling** and **Disk Scheduling** algorithms with high-performance computation and interactive rendering.

The application supports both:

- **Native execution mode** using a compiled C++ binary (`engine.exe`)
- **Web-native fallback mode** using a TypeScript scheduling engine

This architecture enables efficient local execution while maintaining compatibility with static hosting platforms like GitHub Pages and Vercel.

---

## 🏗 Architecture Overview

```text
+---------------------------------------+
|         React Web Dashboard           |
| (App.tsx, Config, Canvas Visualizer)  |
+---------------------------------------+
                    |
      +-------------+--------------+
      |                            |
(Local Development)         (Production Build)
      |                            |
      v                            v

+----------------------+   +----------------------+
| Express/Vite Layer   |   | Browser Client Engine|
| JSON/stdout Bridge   |   | TypeScript Scheduler |
+----------------------+   +----------------------+
          |
          v

+----------------------+
|  C++ Native Engine   |
|     engine.exe       |
+----------------------+

```

---

## ⚙ Hybrid Computation Model

### 1. Native Binary Engine (`engine.cpp`)

Built with **C++17** for high-performance execution.

Workflow:

1. React serializes scheduling parameters
2. Middleware forwards parameters to `engine.exe`
3. C++ engine performs computations
4. Results returned as JSON through `stdout`
5. React renders analytics and visualization

---

### 2. Web-Native Scheduling Engine (`scheduler.ts`)

A TypeScript implementation mirroring the C++ scheduling logic.

Advantages:

- Serverless deployment compatibility
- Zero backend infrastructure
- Instant browser computation
- Static hosting support

Automatically activated when executable binaries are unavailable.

---

# 📂 Project Structure

```text
OS_PROJECT/
│
├── dist/
├── node_modules/
├── public/
│   └── favicon.svg
│
├── src/
│   ├── components/
│   │   ├── AnalyticsPage.tsx
│   │   ├── CanvasBackground.tsx
│   │   ├── ConfigPage.tsx
│   │   ├── LandingPage.tsx
│   │   └── VisualizerPage.tsx
│   │
│   ├── types/
│   │   └── scheduling.ts
│   │
│   ├── utils/
│   │   └── scheduler.ts
│   │
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
│
├── engine.cpp
├── engine.exe
├── vite.config.ts
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── eslint.config.js
├── .gitignore
└── index.html
```

---

# 🧠 CPU Scheduling Algorithms

### FCFS (First Come First Served)

- Non-preemptive
- FIFO execution model

### SJF (Shortest Job First)

- Non-preemptive
- Executes shortest burst first

### SRTF (Shortest Remaining Time First)

- Preemptive SJF variation
- Dynamic burst evaluation

### Round Robin (RR)

- Time quantum scheduling
- Cyclic process execution

### Priority Scheduling

- Non-preemptive
- Priority-ranked execution

---

# 💿 Disk Scheduling Algorithms

### FCFS

Sequential request servicing.

### SSTF

Shortest seek distance first.

### SCAN

Elevator-style bidirectional traversal.

### C-SCAN

Circular scanning model.

### LOOK

Boundary-aware optimized SCAN.

### C-LOOK

Circular LOOK traversal strategy.

---

# 🎨 Frontend Modules

## App.tsx

Application controller.

Responsibilities:

- State management
- Routing
- Scheduling orchestration

---

## ConfigPage.tsx

Configuration dashboard.

Handles:

- Burst times
- Priorities
- Time quantum
- Disk parameters
- Presets

---

## VisualizerPage.tsx

Simulation rendering module.

Features:

- Canvas timeline rendering
- CPU execution visualization
- Disk seek path visualization

---

## AnalyticsPage.tsx

Performance analysis engine.

Metrics:

### CPU

- Waiting Time
- Turnaround Time
- Average Performance Metrics

### Disk

- Total Seek Distance
- Cylinder Movement Analysis

---

## CanvasBackground.tsx

Ambient rendering system.

Features:

- Particle animation
- Glassmorphic visual effects

---

# 💻 Technology Stack

### Core

- C++17
- TypeScript

### Frontend

- React 18+
- Vite

### UI

- Tailwind CSS
- Glassmorphism Design

### Visualization

- HTML5 Canvas API

### Feedback System

- Web3Forms REST Integration

---

# 📋 Prerequisites

Install:

### Node.js

Version:

```bash
v18+
```

### npm

Included with Node.js

### GCC / G++

C++17 compatible compiler

---

# 🔧 Installation

Clone repository:

```bash
git clone <repository-url>
```

Move into project:

```bash
cd OS_PROJECT
```

Install dependencies:

```bash
npm install
```

---

# 🔨 Compile Native Engine

If `engine.cpp` changes:

```bash
g++ -std=c++17 engine.cpp -o engine.exe
```

---

# 🚀 Run Development Environment

Start local development:

```bash
npm run dev
```

Development flow:

```
React
 ↓
Vite Middleware
 ↓
engine.exe
 ↓
JSON Response
 ↓
Canvas + Analytics
```

---

# 📦 Production Build

Create deployment build:

```bash
npm run build
```

Generated bundle:

```text
dist/
```

Production execution automatically switches:

```
Native Binary Engine
        ↓ unavailable
TypeScript Scheduler Fallback
```

Project online on :
- Vercel - https://os-project-gaurav.vercel.app/


---

# 🌟 Features

✅ CPU Scheduling Visualization  
✅ Disk Scheduling Visualization  
✅ Native C++ Performance Engine  
✅ Browser-Only Fallback Engine  
✅ Interactive Canvas Rendering  
✅ Analytics Dashboard  
✅ Preset Configurations  
✅ Glassmorphic UI  
✅ Dark Theme Interface  
✅ Static Hosting Compatible  

---

# 📈 Future Enhancements

- Multi-core CPU scheduling
- Gantt chart export
- CSV analytics export
- Benchmark comparisons
- Real-time scheduling playback controls

---

# 📜 License

Open-source educational project intended for learning Operating System scheduling concepts.

---

Built with ❤️ using React + TypeScript + C++17