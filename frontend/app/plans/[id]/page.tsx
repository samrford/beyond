"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Search } from "lucide-react";
import MapPlaceholder from "@/components/MapPlaceholder";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Drag state
  const [activeDragItem, setActiveDragItem] = useState<any>(null);

  // New idea state
  const [isAddingIdea, setIsAddingIdea] = useState(false);
  const [newIdeaName, setNewIdeaName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/plans/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            router.push('/plans');
            return;
          }
          throw new Error("Failed to fetch plan");
        }
        const data = await response.json();
        setPlan(data);
      } catch (error) {
        console.error("Error fetching plan:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [id, router]);

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, item: any, source: "scratchpad" | "day", sourceId: string | null) => {
    setActiveDragItem(item);
    e.dataTransfer.setData("text/plain", JSON.stringify({ item, source, sourceId }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, target: "scratchpad" | "day", targetId: string | null) => {
    e.preventDefault();
    setActiveDragItem(null);
    
    try {
      const dataStr = e.dataTransfer.getData("text/plain");
      if (!dataStr) return;
      const { item, source, sourceId } = JSON.parse(dataStr);

      // Don't do anything if dropped in the same place
      if (source === target && sourceId === targetId) return;

      // Optimistic UI update
      const newPlan = { ...plan };
      
      // Remove from source
      if (source === "scratchpad") {
        newPlan.unassigned = newPlan.unassigned.filter((i: any) => i.id !== item.id);
      } else {
        const sourceDayIndex = newPlan.days.findIndex((d: any) => d.id === sourceId);
        if (sourceDayIndex !== -1) {
          newPlan.days[sourceDayIndex].items = newPlan.days[sourceDayIndex].items.filter((i: any) => i.id !== item.id);
        }
      }

      // Add to target
      const updatedItem = { ...item, planDayId: targetId };
      if (target === "scratchpad") {
        newPlan.unassigned = [...(newPlan.unassigned || []), updatedItem];
      } else {
        const targetDayIndex = newPlan.days.findIndex((d: any) => d.id === targetId);
        if (targetDayIndex !== -1) {
          const dayItems = newPlan.days[targetDayIndex].items || [];
          newPlan.days[targetDayIndex].items = [...dayItems, updatedItem];
        }
      }

      setPlan(newPlan);

      // Persist to backend
      const response = await fetch(`${API_BASE_URL}/api/plans/items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedItem),
      });

      if (!response.ok) {
        throw new Error("Failed to update item");
      }
    } catch (error) {
      console.error("Drop failed:", error);
      // Ideally rollback optimistic update here by re-fetching
      router.refresh();
    }
  };

  const handleAddIdea = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newIdeaName.trim()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/plans/${id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newIdeaName,
          orderIndex: (plan.unassigned?.length || 0),
        }),
      });

      if (!response.ok) throw new Error("Failed to add idea");
      
      const newItem = await response.json();
      setPlan((prev: any) => ({
        ...prev,
        unassigned: [...(prev.unassigned || []), newItem],
      }));
      setNewIdeaName("");
      setIsAddingIdea(false);
    } catch (error) {
      console.error(error);
      alert("Error adding idea");
    }
  };

  const handleGenerateDays = async () => {
    if (!plan.startDate || !plan.endDate) return;
    
    setIsGenerating(true);
    try {
      const start = new Date(plan.startDate);
      const end = new Date(plan.endDate);
      const days = [];
      
      let curr = new Date(start);
      while (curr <= end) {
        days.push(new Date(curr));
        curr.setDate(curr.getDate() + 1);
      }

      // Create each day in the backend
      const createdDays: any[] = [];
      for (const date of days) {
        const response = await fetch(`${API_BASE_URL}/api/plans/${id}/days`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: date.toISOString(),
          }),
        });
        if (response.ok) {
          const newDay = await response.json();
          createdDays.push({ ...newDay, items: [] });
        }
      }

      setPlan((prev: any) => ({
        ...prev,
        days: createdDays,
      }));
    } catch (error) {
      console.error(error);
      alert("Error generating days");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConvert = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/plans/${id}/convert`, {
        method: "POST",
      });
      
      if (response.status === 501) {
        alert("Not Yet Implemented: This feature is still in development on the backend.");
        return;
      }

      if (!response.ok) throw new Error("Failed to convert plan to trip");
      const data = await response.json();
      router.push(`/trip/${data.tripId}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Error converting plan to trip");
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading plan details...</p>
      </main>
    );
  }

  if (!plan) {
    return null; // Handled by redirect above
  }

  return (
    <main className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm z-10 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/plans"
            className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
              {plan.name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
              <Calendar size={14} />
              {new Date(plan.startDate).toLocaleDateString()} -{" "}
              {new Date(plan.endDate).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
           <Link 
             href={`/plans/${id}/edit`}
             className="px-4 py-2 bg-white text-gray-700 border border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 font-medium text-sm transition-colors shadow-sm"
           >
             Edit Plan Info
           </Link>
           <button 
             onClick={handleConvert}
             className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium text-sm transition-colors shadow-sm"
           >
             Convert to Trip
           </button>
        </div>
      </header>

      {/* Split Screen Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Itinerary & Scratchpad */}
        <div className="w-1/2 min-w-[500px] border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-900 overflow-y-auto">
          
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 tracking-wide uppercase text-sm flex items-center justify-between">
              <span>Scratchpad / Ideas</span>
              {!isAddingIdea && (
                <button 
                  onClick={() => setIsAddingIdea(true)}
                  className="text-primary-600 dark:text-primary-400 hover:text-primary-700 text-sm normal-case font-medium"
                >
                  + Add Idea
                </button>
              )}
            </h2>
            
            {isAddingIdea && (
              <form onSubmit={handleAddIdea} className="mb-4 flex gap-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="New idea name..."
                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                  value={newIdeaName}
                  onChange={(e) => setNewIdeaName(e.target.value)}
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-primary-600 text-white rounded-md text-xs font-medium hover:bg-primary-700 transition-colors"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingIdea(false)}
                  className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md text-xs font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </form>
            )}
            
            {/* Scratchpad Drop Zone */}
            <div 
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4 min-h-[120px] mb-8 transition-colors ${
                activeDragItem ? "border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/10" : "border-gray-200 dark:border-gray-700"
              }`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, "scratchpad", null)}
            >
               {plan.unassigned && plan.unassigned.length > 0 ? (
                 <div className="space-y-3">
                   {plan.unassigned.map((item: any) => (
                     <div 
                       key={item.id} 
                       draggable
                       onDragStart={(e) => handleDragStart(e, item, "scratchpad", null)}
                       onDragEnd={() => setActiveDragItem(null)}
                       className="p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-100 dark:border-gray-600 shadow-sm flex items-start gap-3 cursor-grab active:cursor-grabbing hover:border-primary-300 dark:hover:border-primary-500 transition-colors"
                     >
                       <MapPin className="text-gray-400 mt-0.5 shrink-0" size={16} />
                       <div>
                         <h4 className="font-medium text-gray-800 dark:text-gray-200 text-sm">{item.name}</h4>
                         {item.location && <p className="text-xs text-gray-500 mt-1">{item.location}</p>}
                       </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center h-full py-4 text-center pointer-events-none">
                   <p className="text-gray-500 dark:text-gray-400 text-sm">
                     Drop items here to unassign them, or add new ideas!
                   </p>
                 </div>
               )}
            </div>

            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 tracking-wide uppercase text-sm">
              Itinerary
            </h2>
            
            <div className="space-y-6 pb-20">
              {plan.days && plan.days.length > 0 ? (
                plan.days.map((day: any, i: number) => (
                  <div key={day.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="bg-gray-100 dark:bg-gray-700/50 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                        Day {i + 1} - {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric'})}
                      </h3>
                      {day.notes && <span className="text-xs text-gray-500 truncate max-w-[200px]">{day.notes}</span>}
                    </div>
                    <div 
                      className={`p-4 min-h-[100px] transition-colors ${
                        activeDragItem ? "bg-gray-50 dark:bg-gray-800/80 outline outline-2 outline-dashed outline-gray-300 dark:outline-gray-600 outline-offset-[-4px]" : ""
                      }`}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, "day", day.id)}
                    >
                      {day.items && day.items.length > 0 ? (
                        <div className="space-y-2">
                           {day.items.map((item: any) => (
                             <div 
                               key={item.id} 
                               draggable
                               onDragStart={(e) => handleDragStart(e, item, "day", day.id)}
                               onDragEnd={() => setActiveDragItem(null)}
                               className="p-3 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 shadow-sm flex items-start gap-3 cursor-grab active:cursor-grabbing hover:border-primary-300 dark:hover:border-primary-500 transition-colors"
                             >
                               <MapPin className="text-gray-400 mt-0.5 shrink-0" size={16} />
                               <div>
                                 <h4 className="font-medium text-gray-800 dark:text-gray-200 text-sm">{item.name}</h4>
                                 {item.location && <p className="text-xs text-gray-500 mt-1">{item.location}</p>}
                               </div>
                             </div>
                           ))}
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm italic py-4 pointer-events-none">
                          Drag items here
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">No days added to this itinerary yet.</p>
                  <button 
                    onClick={handleGenerateDays}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    {isGenerating ? "Generating..." : "+ Generate Days from Dates"}
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Right Side: Map Placeholder */}
        <div className="flex-1 bg-gray-100 dark:bg-gray-900 p-6 relative">
           <MapPlaceholder />
        </div>
        
      </div>
    </main>
  );
}
