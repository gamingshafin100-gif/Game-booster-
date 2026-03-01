import React, { useState, useEffect, useCallback } from 'react';
import { 
  Cpu, 
  Zap, 
  Activity, 
  ShieldCheck, 
  Settings, 
  Power, 
  Terminal,
  Database,
  Wind,
  Layers,
  Sparkles,
  Battery,
  Gauge,
  Rocket,
  List,
  Trash2,
  ArrowUpDown,
  X,
  Home,
  Volume2,
  VolumeX,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { speak, analyzeSystem } from './services/geminiService';
import { AiChat } from './components/AiChat';
import { cn } from './lib/utils';

type BoosterMode = 'power-save' | 'medium' | 'performance' | 'ultra';

interface ModeConfig {
  name: string;
  color: string;
  ultraColor: string;
  icon: React.ElementType;
  description: string;
  themeClass: string;
  accentColor: string;
  bgImage?: string;
}

const MODES: Record<BoosterMode, ModeConfig> = {
  'power-save': {
    name: 'Power Save',
    color: 'bg-blue-500',
    ultraColor: 'bg-blue-600',
    icon: Battery,
    description: 'Minimal resource usage for maximum battery life.',
    themeClass: 'from-blue-950/20 via-zinc-950 to-zinc-950',
    accentColor: 'text-blue-500',
  },
  'medium': {
    name: 'Balanced',
    color: 'bg-amber-500',
    ultraColor: 'bg-amber-600',
    icon: Gauge,
    description: 'Optimal balance between performance and efficiency.',
    themeClass: 'from-zinc-950 via-zinc-950 to-zinc-950',
    accentColor: 'text-amber-500',
  },
  'performance': {
    name: 'Performance',
    color: 'bg-emerald-500',
    ultraColor: 'bg-emerald-600',
    icon: Rocket,
    description: 'High performance for intensive gaming and tasks.',
    themeClass: 'from-emerald-950/30 via-zinc-950 to-zinc-950',
    accentColor: 'text-emerald-500',
  },
  'ultra': {
    name: 'Ultra Mod',
    color: 'bg-red-600',
    ultraColor: 'bg-red-700',
    icon: Zap,
    description: 'BEAST MODE: Maximum hardware output unlocked.',
    themeClass: 'from-red-950/40 via-zinc-950 to-zinc-950',
    accentColor: 'text-red-600',
    bgImage: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop',
  }
};

/**
 * Simulated Performance Metric Component
 */
const Metric = ({ label, value, unit, color, accentColor, isUltra }: { label: string; value: number; unit: string; color: string; accentColor: string; isUltra: boolean }) => (
  <div className="bg-zinc-900/50 border border-zinc-800 p-3 sm:p-4 rounded-xl flex flex-col gap-0.5 sm:gap-1 backdrop-blur-sm">
    <div className="flex justify-between items-center">
      <span className="text-[10px] sm:text-xs font-mono text-zinc-500 uppercase tracking-wider">{label}</span>
      <div className={cn("w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-pulse", color)} />
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-xl sm:text-2xl font-mono font-bold text-white tracking-tighter">{value}</span>
      <span className="text-[10px] sm:text-xs font-mono text-zinc-500">{unit}</span>
    </div>
    <div className="w-full bg-zinc-800 h-1 mt-1 sm:mt-2 rounded-full overflow-hidden">
      <motion.div 
        className={cn("h-full transition-colors duration-700", color)}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.5 }}
      />
    </div>
  </div>
);

const VoiceVisualizer = ({ active, color }: { active: boolean; color: string }) => (
  <div className="flex items-center gap-0.5 h-4 px-2">
    {[...Array(5)].map((_, i) => (
      <motion.div
        key={i}
        animate={active ? {
          height: [4, 12, 6, 16, 4][i % 5],
          opacity: [0.3, 1, 0.5, 1, 0.3][i % 5]
        } : { height: 4, opacity: 0.2 }}
        transition={{
          repeat: Infinity,
          duration: 0.6,
          delay: i * 0.1,
          ease: "easeInOut"
        }}
        className={cn("w-0.5 rounded-full", color)}
      />
    ))}
  </div>
);

/**
 * Main App Component
 */
export default function App() {
  const [currentMode, setCurrentMode] = useState<BoosterMode>('performance');
  const [metrics, setMetrics] = useState({ cpu: 42, gpu: 38, ram: 55, temp: 45 });
  const [systemInfo, setSystemInfo] = useState({ ram: '16GB', cpu: '8', storage: '512GB' });
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [isAutoOptimizationEnabled, setIsAutoOptimizationEnabled] = useState(false);
  const [aiReason, setAiReason] = useState<string | null>(null);
  const [systemHealth, setSystemHealth] = useState<'optimal' | 'warning' | 'critical'>('optimal');
  const [activeView, setActiveView] = useState<'dashboard' | 'tasks'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: 'usage' | 'ram', direction: 'asc' | 'desc' }>({ key: 'usage', direction: 'desc' });
  const [processes, setProcesses] = useState([
    { id: 1, name: 'System Core', usage: 12, ram: 450, status: 'optimized' },
    { id: 2, name: 'Background Sync', usage: 8, ram: 120, status: 'running' },
    { id: 3, name: 'Browser Engine', usage: 24, ram: 1200, status: 'running' },
    { id: 4, name: 'Game Overlay', usage: 4, ram: 85, status: 'optimized' },
    { id: 5, name: 'Discord', usage: 5, ram: 250, status: 'running' },
    { id: 6, name: 'Steam Client', usage: 3, ram: 180, status: 'running' },
    { id: 7, name: 'NVIDIA Overlay', usage: 2, ram: 95, status: 'running' },
  ]);
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const lastAnnouncementTime = React.useRef<number>(0);

  const safeSpeak = useCallback(async (text: string, force: boolean = false) => {
    if (!isVoiceEnabled) return;
    
    const now = Date.now();
    // Increased cooldown to 15 seconds to prevent rate limiting
    if (!force && now - lastAnnouncementTime.current < 15000) return;
    
    lastAnnouncementTime.current = now;
    await speak(
      text, 
      () => setIsSpeaking(true), 
      () => setIsSpeaking(false)
    );
  }, [isVoiceEnabled]);

  const toggleGameSimulation = () => {
    setIsGameRunning(!isGameRunning);
    if (!isGameRunning) {
      setProcesses(prev => [...prev, { id: 99, name: 'Cyberpunk 2077 (Game)', usage: 85, ram: 4200, status: 'running' }]);
    } else {
      setProcesses(prev => prev.filter(p => p.id !== 99));
    }
  };

  // Detect system info
  useEffect(() => {
    const ram = (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory}GB` : '16GB';
    const cpu = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency}` : '8';
    
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(estimate => {
        if (estimate.quota) {
          const quotaGB = Math.round(estimate.quota / (1024 * 1024 * 1024));
          setSystemInfo(prev => ({ ...prev, ram, cpu, storage: `${quotaGB}GB` }));
        }
      });
    } else {
      setSystemInfo(prev => ({ ...prev, ram, cpu }));
    }
  }, []);

  // Simulate metric fluctuations based on mode
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => {
        let baseCpu = prev.cpu;
        let baseGpu = prev.gpu;
        let baseTemp = prev.temp;

        switch (currentMode) {
          case 'power-save':
            baseCpu = 20; baseGpu = 15; baseTemp = 30;
            break;
          case 'medium':
            baseCpu = 45; baseGpu = 40; baseTemp = 45;
            break;
          case 'performance':
            baseCpu = 75; baseGpu = 70; baseTemp = 60;
            break;
          case 'ultra':
            baseCpu = 15; baseGpu = 95; baseTemp = 35; // Optimized CPU, Max GPU, Active Cooling
            break;
        }

        return {
          cpu: Math.min(100, Math.max(0, baseCpu + (Math.random() * 10 - 5))),
          gpu: Math.min(100, Math.max(0, baseGpu + (Math.random() * 8 - 4))),
          ram: Math.min(100, Math.max(0, prev.ram + (Math.random() * 4 - 2))),
          temp: Math.min(100, Math.max(0, baseTemp + (Math.random() * 6 - 3))),
        };
      });

      // Fluctuate individual processes
      setProcesses(prev => prev.map(p => ({
        ...p,
        usage: Math.max(0, Math.min(100, p.usage + (Math.random() * 2 - 1))),
        ram: Math.max(10, Math.min(16000, p.ram + (Math.random() * 10 - 5)))
      })));
    }, 2000);
    return () => clearInterval(interval);
  }, [currentMode]);

  // Update system health status
  useEffect(() => {
    if (metrics.temp > 85 || metrics.cpu > 90) setSystemHealth('critical');
    else if (metrics.temp > 75 || metrics.cpu > 75) setSystemHealth('warning');
    else setSystemHealth('optimal');
  }, [metrics]);

  // Auto-optimization logic
  useEffect(() => {
    if (!isAutoOptimizationEnabled || isAiAnalyzing) return;

    const interval = setInterval(() => {
      // Proactive health check
      const isCritical = metrics.temp > 80 || metrics.cpu > 85 || metrics.gpu > 90;
      const isGameDetected = isGameRunning;
      
      // Only run if health is not optimal or a game is running
      if (isCritical || isGameDetected) {
        runAiOptimization(true);
      }
    }, 12000); // Check every 12 seconds

    return () => clearInterval(interval);
  }, [isAutoOptimizationEnabled, isAiAnalyzing, metrics, isGameRunning]);

  const switchMode = useCallback(async (mode: BoosterMode, silent: boolean = false) => {
    if (mode === currentMode) return;
    
    setCurrentMode(mode);
    
    if (silent) return;

    if (mode === 'ultra') {
      await safeSpeak("Beast Mode: Second Formation. All systems overdriven.", true);
      setProcesses(prev => prev.map(p => ({ ...p, status: 'optimized', usage: Math.floor(p.usage * 0.4) })));
    } else if (mode === 'performance') {
      await safeSpeak("High Performance mode engaged. Hardware limits expanded.", true);
      setProcesses(prev => prev.map(p => ({ ...p, status: 'running', usage: Math.floor(p.usage * 1.2) })));
    } else if (mode === 'medium') {
      // Balanced mode is silent as requested
      setProcesses(prev => prev.map(p => ({ ...p, status: 'running', usage: Math.floor(p.usage * 1.5) })));
    } else {
      await safeSpeak(`${mode.toUpperCase()} mode engaged.`, true);
      setProcesses(prev => prev.map(p => ({ ...p, status: 'running', usage: Math.floor(p.usage * 1.5) })));
    }
  }, [currentMode, safeSpeak]);

  const runAiOptimization = async (isAuto: boolean = false) => {
    setIsAiAnalyzing(true);
    setAiReason(null);
    
    try {
      const result = await analyzeSystem(metrics, processes.map(p => ({ name: p.name, usage: p.usage, status: p.status })));
      
      if (result && result.mode) {
        const targetMode = result.mode as BoosterMode;
        
        // If it's an auto-switch and the mode is different, announce the reason
        if (isAuto && targetMode !== currentMode) {
          setAiReason(`AUTO-OPTIMIZE: ${result.reason}`);
          await safeSpeak(`System health alert. ${result.reason}. Switching to ${MODES[targetMode].name} mode.`);
          await switchMode(targetMode, true); // Switch silently since we already spoke the reason
        } else {
          setAiReason(result.reason);
          await switchMode(targetMode);
        }
      } else {
        setAiReason("AI analysis failed. Please check your connection or try again.");
      }
    } catch (err) {
      console.error("Optimization error:", err);
      setAiReason("An unexpected error occurred during optimization.");
    } finally {
      setTimeout(() => setIsAiAnalyzing(false), 3000);
    }
  };

  const sortedProcesses = [...processes]
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];
      return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
    });

  const killProcess = (id: number) => {
    setProcesses(prev => prev.filter(p => p.id !== id));
    if (id === 99) setIsGameRunning(false);
  };

  const killAllNonEssential = () => {
    setProcesses(prev => prev.filter(p => p.name === 'System Core' || p.id === 99));
    safeSpeak("Terminating all non-essential background processes. System resources reclaimed.", true);
  };

  const toggleSort = (key: 'usage' | 'ram') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const modeConfig = MODES[currentMode];

  return (
    <div className={cn(
      "min-h-screen bg-black text-zinc-300 font-sans transition-all duration-1000 relative overflow-x-hidden flex flex-col",
      currentMode === 'ultra' ? "selection:bg-red-500/30" : 
      currentMode === 'performance' ? "selection:bg-emerald-500/30" :
      currentMode === 'power-save' ? "selection:bg-blue-500/30" : "selection:bg-amber-500/30"
    )}>
      {/* Background Grid/Atmosphere */}
      <div className={cn(
        "fixed inset-0 pointer-events-none overflow-hidden z-0 transition-all duration-1000 bg-gradient-to-b",
        modeConfig.themeClass
      )}>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
        <AnimatePresence mode="wait">
          {modeConfig.bgImage && (
            <motion.div 
              key={modeConfig.bgImage}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ 
                backgroundImage: `url("${modeConfig.bgImage}")`,
                filter: 'brightness(0.3) contrast(1.2)'
              }}
            />
          )}
        </AnimatePresence>
        
        {/* Battery Saver Overlay */}
        {currentMode === 'power-save' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/40 backdrop-grayscale-[0.5] pointer-events-none"
          />
        )}

        <div className={cn(
          "absolute inset-0 transition-all duration-1000",
          currentMode === 'ultra' ? "bg-red-600/10" : 
          currentMode === 'power-save' ? "bg-blue-600/5" :
          currentMode === 'medium' ? "bg-amber-600/5" : "bg-emerald-600/5"
        )} />
      </div>

      <main className="relative z-10 flex-grow max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-12 mb-20 sm:mb-0">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8 sm:mb-12">
          <div className="flex justify-between items-center w-full sm:w-auto">
            <div>
              <div className="flex items-center gap-2 mb-1 sm:mb-2">
                <div className={cn(
                  "w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-colors duration-700",
                  modeConfig.color
                )}>
                  <modeConfig.icon className="w-4 h-4 sm:w-5 sm:h-5 text-black fill-current" />
                </div>
                <h1 className="text-lg sm:text-xl font-mono font-bold text-white tracking-widest uppercase">Apex Booster</h1>
                <VoiceVisualizer active={isSpeaking} color={modeConfig.color} />
                <div className={cn(
                  "px-2 py-0.5 rounded text-[8px] sm:text-[10px] font-black uppercase tracking-tighter ml-1 sm:ml-2",
                  systemHealth === 'optimal' ? "bg-emerald-500 text-black" :
                  systemHealth === 'warning' ? "bg-amber-500 text-black animate-pulse" :
                  "bg-red-600 text-white animate-bounce"
                )}>
                  {systemHealth}
                </div>
              </div>
              <p className="text-[10px] sm:text-xs font-mono text-zinc-500 uppercase tracking-widest">System Optimization Interface v2.4.0</p>
            </div>
            <button className="sm:hidden p-2 text-zinc-400 hover:text-white">
              <Settings className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsChatOpen(true)}
              className="p-2 text-zinc-400 hover:text-white transition-colors relative group"
            >
              <Bot className={cn("w-5 h-5", isChatOpen && modeConfig.accentColor)} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping opacity-75 group-hover:opacity-100" />
            </button>
          </div>
          
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button 
                onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                className={cn(
                  "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-none font-mono text-[10px] sm:text-xs uppercase tracking-wider transition-all border-2",
                  "shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
                  isVoiceEnabled 
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 hover:bg-emerald-500/20" 
                    : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-white"
                )}
                title={isVoiceEnabled ? "Disable Voice" : "Enable Voice"}
              >
                {isVoiceEnabled ? <Volume2 className="w-3 h-3 sm:w-4 sm:h-4" /> : <VolumeX className="w-3 h-3 sm:w-4 sm:h-4" />}
                {isVoiceEnabled ? "VOICE" : "MUTE"}
              </button>
              <button 
                onClick={toggleGameSimulation}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-none font-mono text-[10px] sm:text-xs uppercase tracking-wider transition-all border-2",
                "shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
                isGameRunning 
                  ? "bg-red-500/10 border-red-500 text-red-500 hover:bg-red-500/20" 
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              )}
            >
              <Rocket className={cn("w-3 h-3 sm:w-4 sm:h-4", isGameRunning && "animate-bounce")} />
              {isGameRunning ? "CLOSE" : "LAUNCH"}
            </button>
            <button 
              onClick={() => setIsAutoOptimizationEnabled(!isAutoOptimizationEnabled)}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-none font-mono text-[10px] sm:text-xs uppercase tracking-wider transition-all border-2",
                "shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
                isAutoOptimizationEnabled 
                  ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 hover:bg-emerald-500/20" 
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              )}
            >
              <ShieldCheck className={cn("w-3 h-3 sm:w-4 sm:h-4", isAutoOptimizationEnabled && "animate-pulse")} />
              {isAutoOptimizationEnabled ? "AUTO: ON" : "AUTO: OFF"}
            </button>
            <button 
              onClick={() => setActiveView(activeView === 'dashboard' ? 'tasks' : 'dashboard')}
              className="hidden sm:block p-3 bg-zinc-900 border-2 border-zinc-800 hover:bg-zinc-800 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
              title={activeView === 'dashboard' ? "Task Manager" : "Dashboard"}
            >
              {activeView === 'dashboard' ? <List className="w-5 h-5" /> : <Gauge className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <AnimatePresence mode="wait">
          {activeView === 'dashboard' ? (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              {/* AI Reason Notification */}
        <AnimatePresence>
          {aiReason && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8 p-4 bg-white/5 border border-white/10 rounded-xl backdrop-blur-md"
            >
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-400 mt-0.5" />
                <div>
                  <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider mb-1">AI Recommendation</h3>
                  <p className="text-sm text-zinc-400">{aiReason}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Left Column: Metrics */}
          <div className="space-y-6">
            <Metric label="CPU Usage" value={Math.round(metrics.cpu)} unit="%" color={modeConfig.color} accentColor={modeConfig.accentColor} isUltra={currentMode === 'ultra'} />
            <Metric label="GPU Load" value={Math.round(metrics.gpu)} unit="%" color={modeConfig.color} accentColor={modeConfig.accentColor} isUltra={currentMode === 'ultra'} />
            <Metric label="Memory Usage" value={Math.round(metrics.ram)} unit="%" color={modeConfig.color} accentColor={modeConfig.accentColor} isUltra={currentMode === 'ultra'} />
            <Metric label="Core Temp" value={Math.round(metrics.temp)} unit="°C" color={modeConfig.color} accentColor={modeConfig.accentColor} isUltra={currentMode === 'ultra'} />
          </div>

          {/* Center Column: Main Control */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center relative overflow-hidden group backdrop-blur-md">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-zinc-700 to-transparent opacity-50" />
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-zinc-700 to-transparent opacity-50" />
              
              <motion.div 
                animate={currentMode === 'ultra' ? { scale: [1, 1.05, 1], rotate: [0, 1, -1, 0] } : 
                         currentMode === 'performance' ? { scale: [1, 1.02, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
                className="relative z-10 mb-8"
              >
                <div className={cn(
                  "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-700",
                  currentMode === 'ultra' 
                    ? "border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.3)] bg-red-600/5" :
                  currentMode === 'performance'
                    ? "border-emerald-600 shadow-[0_0_30px_rgba(16,185,129,0.2)] bg-emerald-600/5"
                    : "border-zinc-800 bg-zinc-900/50"
                )}>
                  <modeConfig.icon className={cn(
                    "w-20 h-20 transition-all duration-700",
                    currentMode === 'ultra' ? "text-red-600 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]" : 
                    currentMode === 'performance' ? "text-emerald-500 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" :
                    currentMode === 'power-save' ? "text-blue-400 opacity-50" : "text-white/20"
                  )} />
                </div>
              </motion.div>

              <div className="text-center space-y-4 relative z-10">
                <h2 className={cn(
                  "text-3xl font-mono font-black uppercase tracking-tighter transition-colors duration-700",
                  modeConfig.accentColor
                )}>
                  {modeConfig.name} Active
                </h2>
                <p className="text-sm text-zinc-500 max-w-xs mx-auto">
                  {modeConfig.description}
                </p>
                
                {/* Mode Selector */}
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-3 sm:gap-4 mt-8 w-full max-w-md mx-auto">
                  {(Object.keys(MODES) as BoosterMode[]).map(mode => {
                    const config = MODES[mode];
                    return (
                      <button
                        key={mode}
                        onClick={() => switchMode(mode)}
                        className={cn(
                          "px-4 sm:px-8 py-3 sm:py-4 rounded-none font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.1em] sm:tracking-[0.2em] transition-all relative border-2",
                          "shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
                          currentMode === mode 
                            ? cn("text-black font-black", config.color, "border-white/20") 
                            : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:bg-zinc-800/80 hover:text-zinc-300"
                        )}
                      >
                        {config.name}
                      </button>
                    );
                  })}
                </div>

                {/* Main Action Buttons */}
                <div className="flex flex-col gap-4 mt-10 w-full max-w-md mx-auto">
                  <button 
                    onClick={() => runAiOptimization(false)}
                    disabled={isAiAnalyzing}
                    className={cn(
                      "w-full flex items-center justify-center gap-3 px-8 py-4 rounded-none font-mono text-sm uppercase tracking-[0.3em] transition-all border-2",
                      "shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
                      isAiAnalyzing ? "bg-zinc-800 text-zinc-500 border-zinc-900" : "bg-white text-black font-black border-white/20 hover:bg-zinc-200"
                    )}
                  >
                    <Sparkles className={cn("w-5 h-5", isAiAnalyzing && "animate-spin")} />
                    {isAiAnalyzing ? "SYSTEM ANALYZING..." : "INITIALIZE OPTIMIZATION"}
                  </button>
                  
                  <button 
                    onClick={() => setIsChatOpen(true)}
                    className={cn(
                      "w-full flex items-center justify-center gap-3 px-8 py-4 rounded-none font-mono text-sm uppercase tracking-[0.3em] transition-all border-2",
                      "shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
                      "bg-zinc-900 text-white font-bold border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700"
                    )}
                  >
                    <Bot className="w-5 h-5" />
                    OPEN AI COMMAND CORE
                  </button>
                </div>
              </div>

              {/* Scanline Effect */}
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_2px,3px_100%] opacity-20" />
            </div>

            {/* Bottom Grid: Process List & Logs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4 border-b border-zinc-800 pb-2">
                  <Layers className="w-4 h-4 text-zinc-500" />
                  <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Active Processes</span>
                </div>
                <div className="space-y-3">
                  {processes.slice(0, 4).map(proc => (
                    <div key={proc.id} className="flex justify-between items-center text-xs font-mono">
                      <span className="text-zinc-400">{proc.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-zinc-600">{proc.usage}%</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] uppercase",
                          proc.status === 'optimized' ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-800 text-zinc-500"
                        )}>
                          {proc.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4 border-b border-zinc-800 pb-2">
                  <Terminal className="w-4 h-4 text-zinc-500" />
                  <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">System Logs</span>
                </div>
                <div className="space-y-2 font-mono text-[10px] text-zinc-600 overflow-hidden">
                  <p className="animate-pulse">{">"} Initializing system scan...</p>
                  <p>{">"} CPU cores: {systemInfo.cpu} detected</p>
                  <p>{">"} GPU driver: v546.12 (Stable)</p>
                  <p>{">"} Available ROM: {systemInfo.storage}</p>
                  <p className={cn("transition-colors duration-700", modeConfig.color.replace('bg-', 'text-'))}>
                    {">"} MODE: {modeConfig.name.toUpperCase()}
                  </p>
                  {currentMode === 'ultra' && (
                    <>
                      <p className="text-red-500/70">{">"} BEAST MODE ENGAGED</p>
                      <p className="text-red-500/70">{">"} SECOND FORMATION ACTIVE</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
            </motion.div>
          ) : (
            <motion.div 
              key="tasks"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="relative bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 sm:p-8 overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-zinc-700 to-transparent opacity-50" />
              
              {/* Task Manager Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                  <h2 className="text-2xl font-mono font-bold text-white uppercase tracking-widest flex items-center gap-3">
                    <List className="w-6 h-6 text-emerald-500" />
                    Task Manager
                  </h2>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1">Manage active system processes</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <div className="relative flex-grow sm:flex-grow-0">
                    <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                    <input 
                      type="text"
                      placeholder="SEARCH PROCESS..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-black/40 border border-zinc-800 rounded-lg pl-8 pr-4 py-1.5 text-[10px] font-mono text-white focus:border-white/20 outline-none w-full sm:w-48 uppercase"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={() => toggleSort('usage')}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono border rounded transition-all",
                      sortConfig.key === 'usage' ? "bg-white text-black border-white" : "text-zinc-500 border-zinc-800 hover:border-zinc-700"
                    )}
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    CPU {sortConfig.key === 'usage' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
                  </button>
                  <button 
                    onClick={() => toggleSort('ram')}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono border rounded transition-all",
                      sortConfig.key === 'ram' ? "bg-white text-black border-white" : "text-zinc-500 border-zinc-800 hover:border-zinc-700"
                    )}
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    RAM {sortConfig.key === 'ram' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
                  </button>
                  <button 
                    onClick={killAllNonEssential}
                    className="flex items-center gap-2 px-4 py-1.5 text-[10px] font-mono border border-red-500 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                  >
                    <Trash2 className="w-3 h-3" />
                    PURGE ALL
                  </button>
                </div>
              </div>

              {/* System Summary Mini-Dashboard */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
                  <p className="text-[8px] font-mono text-zinc-500 uppercase mb-1">Total Processes</p>
                  <p className="text-xl font-mono font-bold text-white">{processes.length}</p>
                </div>
                <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
                  <p className="text-[8px] font-mono text-zinc-500 uppercase mb-1">CPU Overhead</p>
                  <p className="text-xl font-mono font-bold text-emerald-500">{Math.round(processes.reduce((acc, p) => acc + p.usage, 0))}%</p>
                </div>
                <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
                  <p className="text-[8px] font-mono text-zinc-500 uppercase mb-1">RAM Committed</p>
                  <p className="text-xl font-mono font-bold text-blue-500">{(processes.reduce((acc, p) => acc + p.ram, 0) / 1024).toFixed(1)}GB</p>
                </div>
                <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
                  <p className="text-[8px] font-mono text-zinc-500 uppercase mb-1">System Health</p>
                  <p className="text-xl font-mono font-bold text-emerald-500">OPTIMAL</p>
                </div>
              </div>

              {/* Task Manager GUI: Tile Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar pb-8">
                {sortedProcesses.map(process => (
                  <motion.div 
                    layout
                    key={process.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => killProcess(process.id)}
                    className={cn(
                      "relative aspect-square flex flex-col items-center justify-center p-2 bg-black/40 border rounded-2xl transition-all cursor-pointer group",
                      process.status === 'optimized' ? "border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "border-white/5 hover:border-white/20"
                    )}
                  >
                    {/* CPU Usage Ring */}
                    <div className="absolute inset-1 pointer-events-none">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle 
                          cx="50" cy="50" r="45" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          className="text-zinc-800/30"
                        />
                        <motion.circle 
                          cx="50" cy="50" r="45" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeDasharray="283"
                          animate={{ strokeDashoffset: 283 - (283 * process.usage) / 100 }}
                          className={cn(
                            "transition-colors duration-1000",
                            process.usage > 70 ? "text-red-500" : process.usage > 40 ? "text-amber-500" : "text-emerald-500"
                          )}
                        />
                      </svg>
                    </div>

                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center bg-zinc-900/80 border border-white/5 mb-2 transition-colors relative z-10",
                      process.status === 'optimized' ? "text-emerald-500 border-emerald-500/20" : "text-zinc-500"
                    )}>
                      <Cpu className="w-5 h-5" />
                    </div>

                    <p className="text-[10px] font-mono font-bold text-white uppercase truncate w-full text-center px-1 relative z-10">
                      {process.name.split(' ')[0]}
                    </p>
                    <p className="text-[8px] font-mono text-zinc-500 uppercase tracking-tighter relative z-10">
                      {process.usage}%
                    </p>

                    {/* Hover Kill Overlay */}
                    <div className="absolute inset-0 bg-red-600/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center rounded-2xl z-20">
                      <Trash2 className="w-6 h-6 text-white mb-1" />
                      <span className="text-[8px] font-black text-white uppercase">PURGE</span>
                    </div>

                    {process.status === 'optimized' && (
                      <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Scanline Effect */}
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_2px,3px_100%] opacity-10" />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-zinc-950/80 backdrop-blur-xl border-t border-white/5 z-50 px-12 py-3 flex justify-between items-center">
        <button 
          onClick={() => setActiveView('dashboard')}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            activeView === 'dashboard' ? modeConfig.accentColor : "text-zinc-500"
          )}
        >
          <Home className="w-6 h-6" />
          <span className="text-[8px] font-mono font-bold uppercase tracking-widest">Home</span>
        </button>
        <div className="w-12 h-12 -mt-10 bg-zinc-900 border-4 border-black rounded-full flex items-center justify-center shadow-xl">
          <div className={cn("w-8 h-8 rounded-full animate-pulse", modeConfig.color)} />
        </div>
        <button 
          onClick={() => setActiveView('tasks')}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            activeView === 'tasks' ? modeConfig.accentColor : "text-zinc-500"
          )}
        >
          <List className="w-6 h-6" />
          <span className="text-[8px] font-mono font-bold uppercase tracking-widest">Tasks</span>
        </button>
      </nav>
      <AiChat 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        accentColor={modeConfig.color}
        onSpeakStart={() => setIsSpeaking(true)}
        onSpeakEnd={() => setIsSpeaking(false)}
      />
    </div>
  );
}
