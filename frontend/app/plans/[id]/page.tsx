"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Clock, Plus, TriangleAlert, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import MapPlaceholder from "@/components/MapPlaceholder";
import PlanItemModal from "@/components/PlanItemModal";
import ConfirmModal from "@/components/ConfirmModal";
import {
  usePlan,
  useDeletePlan,
  useUpdatePlanItem,
  useCreatePlanItem,
  useDeletePlanItem,
  useConvertPlanToTrip,
  planKeys,
  type Plan,
  type PlanItem,
} from "@/lib/queries/plans";
import { apiFetch } from "@/lib/api";
import toast from "react-hot-toast";

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;

  // Queries & mutations
  const { data: fetchedPlan, isLoading } = usePlan(id);
  const deletePlanMutation = useDeletePlan();
  const updateItemMutation = useUpdatePlanItem(id);
  const createItemMutation = useCreatePlanItem(id);
  const deleteItemMutation = useDeletePlanItem(id);
  const convertMutation = useConvertPlanToTrip(id);

  // Local state for optimistic drag-and-drop
  const [plan, setPlan] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeDragItem, setActiveDragItem] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Sync fetched plan to local state
  useEffect(() => {
    if (fetchedPlan) {
      setPlan(fetchedPlan);
    }
  }, [fetchedPlan]);

  const handleDeletePlan = async () => {
    try {
      await deletePlanMutation.mutateAsync(id);
      router.push("/plans");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete plan");
    } finally {
      setIsDeleting(false);
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, item: any, source: "scratchpad" | "day", sourceId: string | null) => {
    setActiveDragItem(item);
    e.dataTransfer.setData("text/plain", JSON.stringify({ item, source, sourceId }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, target: "scratchpad" | "day", targetId: string | null) => {
    e.preventDefault();
    setActiveDragItem(null);

    try {
      const dataStr = e.dataTransfer.getData("text/plain");
      if (!dataStr) return;
      const { item, source, sourceId } = JSON.parse(dataStr);

      if (source === target && sourceId === targetId) return;

      // Optimistic UI update - fully immutable deep copy for arrays and objects involved
      const newPlan = {
        ...plan,
        unassigned: [...(plan.unassigned || [])],
        days: (plan.days || []).map((d: any) => ({
          ...d,
          items: [...(d.items || [])],
        }))
      };

      // 1. Remove from source
      if (source === "scratchpad") {
        newPlan.unassigned = newPlan.unassigned.filter((i: any) => i.id !== item.id);
      } else {
        const sourceDayIndex = newPlan.days.findIndex((d: any) => d.id === sourceId);
        if (sourceDayIndex !== -1) {
          newPlan.days[sourceDayIndex].items = newPlan.days[sourceDayIndex].items.filter((i: any) => i.id !== item.id);
        } else {
          console.warn("Could not find source day:", sourceId);
        }
      }

      // 2. Add to target
      const updatedItem = { ...item, planDayId: target === "scratchpad" ? null : targetId };
      if (target === "scratchpad") {
        newPlan.unassigned = [...newPlan.unassigned, updatedItem];
      } else {
        const targetDayIndex = newPlan.days.findIndex((d: any) => d.id === targetId);
        if (targetDayIndex !== -1) {
          newPlan.days[targetDayIndex].items = [...newPlan.days[targetDayIndex].items, updatedItem];
        } else {
          console.warn("Could not find target day:", targetId);
        }
      }

      setPlan(newPlan);

      // Persist via mutation
      await updateItemMutation.mutateAsync(updatedItem);
    } catch (error) {
      console.error("Drop failed:", error);
      // Rollback by re-fetching
      queryClient.invalidateQueries({ queryKey: planKeys.detail(id) });
    }
  };

  const handleSaveItem = async (updatedFields: any) => {
    if (!editingItem) return;

    try {
      const isNew = !editingItem.id;
      const updatedItem = { ...editingItem, ...updatedFields };

      if (isNew) {
        const savedItem = await createItemMutation.mutateAsync(updatedItem);
        const newPlan = {
          ...plan,
          unassigned: [...(plan.unassigned || []), savedItem]
        };
        setPlan(newPlan);
      } else {
        await updateItemMutation.mutateAsync(updatedItem);

        // Properly immutable update for existing item in modal
        const newPlan = {
          ...plan,
          unassigned: plan.unassigned.map((i: any) => i.id === editingItem.id ? updatedItem : i),
          days: plan.days.map((d: any) => ({
            ...d,
            items: d.items ? d.items.map((i: any) => i.id === editingItem.id ? updatedItem : i) : []
          }))
        };
        setPlan(newPlan);
      }
      setEditingItem(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save changes");
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteItemMutation.mutateAsync(itemId);
      const newPlan = { ...plan };
      newPlan.unassigned = newPlan.unassigned.filter((i: any) => i.id !== itemId);
      newPlan.days = newPlan.days.map((day: any) => ({
        ...day,
        items: day.items ? day.items.filter((i: any) => i.id !== itemId) : []
      }));
      setPlan(newPlan);
      setEditingItem(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete item");
    }
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "";
    let timePart = timeStr;
    if (timeStr.includes("T")) {
      timePart = timeStr.split("T")[1].slice(0, 5);
    } else {
      timePart = timeStr.slice(0, 5);
    }

    const [hStr, mStr] = timePart.split(":");
    const h = parseInt(hStr);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${mStr.padStart(2, "0")}${ampm}`;
  };

  const getEndTime = (item: any) => {
    if (!item.startTime || !item.duration) return null;
    const startInMinutes = getTimeInMinutes(item.startTime);
    if (startInMinutes === null) return "Invalid Date";

    const endMinutes = startInMinutes + parseInt(item.duration);
    const h = Math.floor(endMinutes / 60) % 24;
    const m = endMinutes % 60;
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, "0")}${ampm}`;
  };

  const getTimeInMinutes = (timeStr: string | null) => {
    if (!timeStr) return null;
    let timePart = timeStr;
    if (timeStr.includes("T")) {
      timePart = timeStr.split("T")[1];
    }
    const [h, m] = timePart.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  };

  const sortItems = (items: any[]) => {
    return [...items].sort((a, b) => {
      const timeA = getTimeInMinutes(a.startTime);
      const timeB = getTimeInMinutes(b.startTime);

      if (timeA === null && timeB === null) return a.orderIndex - b.orderIndex;
      if (timeA === null) return 1;
      if (timeB === null) return -1;
      return timeA - timeB;
    });
  };

  const calculateGap = (item1: any, item2: any) => {
    const start1 = getTimeInMinutes(item1.startTime);
    const start2 = getTimeInMinutes(item2.startTime);
    if (start1 === null || start2 === null) return null;

    const end1 = start1 + parseInt(item1.duration || 0);
    return start2 - end1;
  };

  const formatGap = (minutes: number) => {
    if (minutes < 0) return `⚠️ ${Math.abs(minutes)}m Overlap`;
    if (minutes === 0) return null;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m > 0 ? `${m}m ` : ""}free`;
    return `${m}m free`;
  };

  const handleAddIdea = () => {
    setEditingItem({
      planId: id,
      planDayId: null,
      name: "",
      description: "",
      location: "",
      latitude: null,
      longitude: null,
      orderIndex: (plan.unassigned?.length || 0),
      duration: 0,
      startTime: null
    });
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

      const createdDays: any[] = [];
      for (const date of days) {
        const newDay = await apiFetch<any>(`/api/plans/${id}/days`, {
          method: "POST",
          body: JSON.stringify({ date: date.toISOString() }),
        });
        createdDays.push({ ...newDay, items: [] });
      }

      setPlan((prev: any) => ({
        ...prev,
        days: createdDays,
      }));
      queryClient.invalidateQueries({ queryKey: planKeys.detail(id) });
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate days");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConvert = async () => {
    try {
      const data = await convertMutation.mutateAsync();
      router.push(`/trip/${data.tripId}`);
      router.refresh();
    } catch (error: any) {
      if (error?.status === 501) {
        toast("Feature coming soon!");
      } else {
        console.error(error);
        toast.error("Failed to convert plan to trip");
      }
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading plan details...</p>
      </main>
    );
  }

  if (!plan) {
    return null;
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
          <button
            onClick={() => setIsDeleting(true)}
            className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Delete Plan"
          >
            <Trash2 size={20} />
          </button>
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
              <button
                onClick={handleAddIdea}
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 text-sm normal-case font-medium"
              >
                + Add Idea
              </button>
            </h2>

            {/* Scratchpad Drop Zone */}
            <div
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4 min-h-[120px] mb-8 transition-colors ${activeDragItem ? "border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/10" : "border-gray-200 dark:border-gray-700"
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
                      onClick={() => setEditingItem(item)}
                      className="p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-100 dark:border-gray-600 shadow-sm flex items-start gap-3 cursor-grab active:cursor-grabbing hover:border-primary-300 dark:hover:border-primary-500 transition-colors group"
                    >
                      <MapPin className="text-gray-400 mt-0.5 shrink-0" size={16} />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate">{item.name}</h4>
                          {item.duration > 0 && (
                            <span className="text-[10px] bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300 font-bold ml-2 shrink-0">
                              {item.duration}m
                            </span>
                          )}
                        </div>
                        {item.location && <p className="text-xs text-gray-500 mt-1 truncate">{item.location}</p>}
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
                        Day {i + 1} - {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </h3>
                      {day.notes && <span className="text-xs text-gray-500 truncate max-w-[200px]">{day.notes}</span>}
                    </div>
                    <div
                      className={`p-4 min-h-[100px] transition-colors ${activeDragItem ? "bg-gray-50 dark:bg-gray-800/80 outline outline-2 outline-dashed outline-gray-300 dark:outline-gray-600 outline-offset-[-4px]" : ""
                        }`}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, "day", day.id)}
                    >
                      {day.items && day.items.length > 0 ? (
                        <div className="space-y-4">
                          {sortItems(day.items).map((item: any, idx: number, sortedArray: any[]) => {
                            const gap = idx < sortedArray.length - 1 ? calculateGap(item, sortedArray[idx + 1]) : null;
                            const hasTime = !!item.startTime;

                            return (
                              <div key={item.id}>
                                <div
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, item, "day", day.id)}
                                  onDragEnd={() => setActiveDragItem(null)}
                                  onClick={() => setEditingItem(item)}
                                  className={`p-3 rounded border shadow-sm flex items-start gap-3 cursor-grab active:cursor-grabbing hover:border-primary-300 dark:hover:border-primary-500 transition-colors group ${!hasTime
                                      ? "bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800"
                                      : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                                    }`}
                                >
                                  {hasTime ? (
                                    <Clock className="text-primary-400 mt-0.5 shrink-0" size={16} />
                                  ) : (
                                    <TriangleAlert className="text-orange-500 mt-0.5 shrink-0" size={16} />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                      <h4 className={`font-bold text-sm truncate ${!hasTime ? "text-orange-900 dark:text-orange-200" : "text-gray-800 dark:text-gray-200"}`}>
                                        {item.name}
                                      </h4>
                                      <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                        {item.startTime && (
                                          <span className="text-[10px] bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 px-1.5 py-0.5 rounded font-bold">
                                            {formatTime(item.startTime)}
                                          </span>
                                        )}
                                        {item.duration > 0 && (
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${!hasTime ? "bg-orange-100 dark:bg-orange-800/40 text-orange-700 dark:text-orange-300" : "bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300"}`}>
                                            {item.duration}m
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {item.location && <p className={`text-xs mt-0.5 truncate ${!hasTime ? "text-orange-700/70 dark:text-orange-300/70" : "text-gray-500"}`}>{item.location}</p>}

                                    {!hasTime && (
                                      <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 mt-1 flex items-center gap-1">
                                        ⚠️ Missing Start Time
                                      </p>
                                    )}

                                    {item.startTime && item.duration > 0 && (
                                      <p className="text-[10px] text-gray-400 mt-1">Ends at {getEndTime(item)}</p>
                                    )}
                                  </div>
                                </div>

                                {/* Gap Indicator */}
                                {gap !== null && (
                                  <div className="flex flex-col items-center py-2 relative">
                                    <div className="w-px h-10 border-l-2 border-dashed border-gray-300 dark:border-gray-600 mb-1" />
                                    <div className={`px-3 py-1 rounded-full text-[11px] font-bold shadow-sm border ${gap < 0
                                        ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50"
                                        : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700"
                                      }`}>
                                      {formatGap(gap)}
                                    </div>
                                    <div className="w-px h-10 border-l-2 border-dashed border-gray-300 dark:border-gray-600 mt-1" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
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

      {/* Item Configuration Modal */}
      {editingItem && (
        <PlanItemModal
          item={editingItem}
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveItem}
          onDelete={handleDeleteItem}
        />
      )}

      <ConfirmModal
        isOpen={isDeleting}
        title="Delete Plan"
        message="Are you sure you want to delete this entire plan? This will permanently remove all itinerary items and days. This action cannot be undone."
        onConfirm={handleDeletePlan}
        onCancel={() => setIsDeleting(false)}
      />
    </main>
  );
}
