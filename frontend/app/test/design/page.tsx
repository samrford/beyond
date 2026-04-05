"use client";

import { useState } from "react";
import { 
  Palette, 
  Type, 
  Component as ComponentIcon, 
  Box, 
  Layers, 
  Sun, 
  Moon, 
  Check, 
  Settings, 
  Map, 
  Plane, 
  Plus, 
  Trash2, 
  ArrowRight,
  Globe
} from "lucide-react";
import PageTransition from "@/components/PageTransition";

export default function DesignSystemPage() {
  const [activeTab, setActiveTab] = useState<"colors" | "typography" | "components" | "motion">("colors");

  const colors = [
    { name: "Primary", shades: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"], classBase: "bg-primary" },
    { name: "Rose", shades: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"], classBase: "bg-rose" },
    { name: "Gray", shades: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"], classBase: "bg-gray" },
  ];

  return (
    <main className="min-h-screen p-8 lg:p-12 bg-transparent">
      <PageTransition>
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 text-xs font-black rounded-full uppercase tracking-widest">
                Design System v1.1
              </div>
              <h1 className="text-5xl lg:text-7xl font-black text-gray-900 dark:text-white tracking-tight">
                Beyond <span className="text-gradient">Visuals</span>
              </h1>
              <p className="text-xl text-gray-500 dark:text-gray-400 font-medium max-w-2xl">
                The atomic foundations, component patterns, and motion curves that power our travel adventures.
              </p>
            </div>
          </header>

          {/* Navigation */}
          <div className="flex flex-wrap gap-2 p-1 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-gray-800 w-fit">
            {(["colors", "typography", "components", "motion"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all
                  ${activeTab === tab 
                    ? "bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm" 
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                  }
                `}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="pt-8">
            {/* COLORS TAB */}
            {activeTab === "colors" && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {colors.map((palette) => (
                  <section key={palette.name} className="space-y-6">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                       <Palette size={16} className="text-primary-500" />
                       {palette.name} Palette
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-11 gap-4">
                      {palette.shades.map((shade) => (
                        <div key={shade} className="space-y-2">
                          <div className={`aspect-square rounded-2xl ${palette.classBase}-${shade} shadow-sm border border-black/5 dark:border-white/5 transition-transform hover:scale-105`} />
                          <div className="flex flex-col gap-1 px-1">
                            <span className="text-[10px] font-black text-gray-400">{shade}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}

                <section className="space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">Special Gradients</h3>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="h-32 rounded-3xl bg-gradient-to-r from-primary-500 to-rose-500 flex items-center justify-center text-white font-black text-xl shadow-xl shadow-primary-500/20">
                      Primary to Rose
                    </div>
                    <div className="h-32 rounded-3xl bg-gradient-to-br from-white/20 to-white/5 dark:from-white/5 dark:to-white/0 border border-white/40 dark:border-white/10 backdrop-blur-xl flex items-center justify-center text-gray-900 dark:text-white font-black text-xl glass shadow-lg">
                      Glass Overlay
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* TYPOGRAPHY TAB */}
            {activeTab === "typography" && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
                <section className="space-y-8">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-primary-500 uppercase tracking-widest leading-none">Heading 1</p>
                    <h1 className="text-6xl font-black tracking-tight text-gray-900 dark:text-white">The Great Beyond</h1>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-primary-500 uppercase tracking-widest">Heading 2</p>
                    <h2 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Plan your next adventure</h2>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-primary-500 uppercase tracking-widest">Body Large</p>
                    <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                      Beyond is more than just a trip tracker. It's a digital gallery for your travel experiences and a precision tool for mapping out your future expeditions.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-primary-500 uppercase tracking-widest">Body Default</p>
                    <p className="text-base text-gray-500 dark:text-gray-400 leading-relaxed">
                      Explore the world one step at a time. From the peaks of Patagonia to the bustling streets of Tokyo, keep every memory safe and every itinerary sharp.
                    </p>
                  </div>
                </section>
              </div>
            )}

            {/* COMPONENTS TAB */}
            {activeTab === "components" && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid md:grid-cols-2 gap-12 text-gray-900 dark:text-gray-100">
                  {/* Buttons Section */}
                  <section className="space-y-8">
                     <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Core Buttons</h3>
                     <div className="flex flex-wrap gap-4">
                        <button className="px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20 active:scale-95">Primary Solid</button>
                        <button className="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white rounded-xl font-bold hover:border-primary-500 transition-all active:scale-95">Outline</button>
                        <button className="p-3 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-full transition-colors"><Settings size={20} /></button>
                     </div>
                     <div className="flex flex-wrap gap-4 items-center">
                        <button className="flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 rounded-lg font-bold text-xs uppercase tracking-wider">
                           <Plus size={16} /> New Checkpoint
                        </button>
                        <button className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={20} /></button>
                     </div>
                  </section>

                  {/* Cards Section */}
                  <section className="space-y-8">
                     <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Card Variants</h3>
                     <div className="glass-card p-6 rounded-3xl space-y-4">
                        <div className="w-12 h-12 bg-primary-500 rounded-2xl flex items-center justify-center text-white"><Map size={24} /></div>
                        <h4 className="text-xl font-bold">Standard Glass Card</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Uses backdrop-blur and thin borders for depth.</p>
                     </div>
                     <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
                        <h4 className="text-lg font-bold mb-2">Content Container</h4>
                        <div className="space-y-3">
                           <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full w-full" />
                           <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full w-[80%]" />
                        </div>
                     </div>
                  </section>
                </div>
              </div>
            )}

            {/* MOTION TAB */}
            {activeTab === "motion" && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <section className="space-y-8">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Global Animations</h3>
                    <div className="grid md:grid-cols-2 gap-8">
                       <div className="p-8 bg-white/50 dark:bg-gray-900/50 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center gap-6 min-h-[300px]">
                          <Globe size={64} className="text-primary-600 dark:text-primary-400 animate-spin-slow" />
                          <div className="text-center">
                             <h4 className="text-lg font-bold">Orbital Spin</h4>
                             <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">tailwind custom: 8s linear</p>
                          </div>
                       </div>
                       <div className="p-8 bg-white/50 dark:bg-gray-900/50 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center gap-6 min-h-[300px]">
                          <div className="w-24 h-24 bg-primary-500 rounded-3xl shadow-xl shadow-primary-500/30 animate-pulse-slow" />
                          <div className="text-center">
                             <h4 className="text-lg font-bold">Ambient Pulse</h4>
                             <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">tailwind custom: 4s ease-in-out</p>
                          </div>
                       </div>
                    </div>
                 </section>

                 <section className="p-8 bg-primary-600 rounded-[2.5rem] text-white overflow-hidden relative">
                    <div className="relative z-10 space-y-4">
                       <h4 className="text-2xl font-black">The Reveal Curve</h4>
                       <p className="max-w-xl text-primary-100 italic font-medium leading-relaxed">
                          "Premium motion is about weight. We avoid bouncy spring effects in favor of deliberate, high-inertia reveal curves."
                       </p>
                       <div className="font-mono text-xs p-3 bg-black/20 rounded-xl w-fit">
                          cubic-bezier(0.2, 0.8, 0.2, 1)
                       </div>
                    </div>
                    {/* Visual graph representation */}
                    <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-20 pointer-events-none">
                       <div className="h-full w-full border-l-2 border-b-2 border-white flex items-end">
                          <div className="w-full h-full border-t-2 border-primary-100 rounded-br-[100px] transform origin-bottom-left translate-y-[2px]" />
                       </div>
                    </div>
                 </section>
              </div>
            )}
          </div>
        </div>
      </PageTransition>
    </main>
  );
}
