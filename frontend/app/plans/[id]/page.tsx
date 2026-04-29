"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Clock, Plus, TriangleAlert, Trash2, Pencil, Download, Grid, ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import InteractiveMap from "@/components/InteractiveMap";
import PlanItemModal from "@/components/PlanItemModal";
import ConfirmModal from "@/components/ConfirmModal";
import GridModal from "@/components/GridModal";
import ShareModal from "@/components/ShareModal";
import {
  usePlan,
  useDeletePlan,
  useUpdatePlanItem,
  useCreatePlanItem,
  useDeletePlanItem,
  useConvertPlanToTrip,
  planKeys,
  Plan,
  PlanDay,
  PlanItem,
} from "@/lib/queries/plans";
import { apiFetch, ApiError } from "@/lib/api";
import toast from "react-hot-toast";
import PageTransition from "@/components/PageTransition";
import QueryBoundary from "@/components/QueryBoundary";

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;

  // Queries & mutations
  const { data: fetchedPlan, isLoading, isError, error, refetch } = usePlan(id);
  const deletePlanMutation = useDeletePlan();
  const updateItemMutation = useUpdatePlanItem(id);
  const createItemMutation = useCreatePlanItem(id);
  const deleteItemMutation = useDeletePlanItem(id);
  const convertMutation = useConvertPlanToTrip(id);

  // Local state
  const [plan, setPlan] = useState<Plan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeDragItem, setActiveDragItem] = useState<PlanItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingItem, setEditingItem] = useState<PlanItem | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);
  const [isGridModalOpen, setIsGridModalOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const isProgrammaticScroll = useRef(false);

  // Sync scroll with selectedDayId
  useEffect(() => {
    if (selectedDayId) {
      const el = document.getElementById(`day-container-${selectedDayId}`);
      if (el && el.parentElement) {
        isProgrammaticScroll.current = true;
        el.parentElement.scrollTo({ left: el.offsetLeft - el.parentElement.offsetLeft, behavior: 'smooth' });
        setTimeout(() => {
          isProgrammaticScroll.current = false;
        }, 800);
      }
    }
  }, [selectedDayId]);

  const handleMapClick = (lat: number, lng: number) => {
    if (isSelectingLocation && editingItem) {
      setEditingItem({
        ...editingItem,
        latitude: lat,
        longitude: lng
      });
      setIsSelectingLocation(false);
      toast.success("Location captured!");
    }
  };

  // Sync fetched plan to local state
  useEffect(() => {
    if (fetchedPlan) {
      setPlan(fetchedPlan);
      if (fetchedPlan.days && fetchedPlan.days.length > 0 && !selectedDayId) {
        setSelectedDayId(fetchedPlan.days[0].id);
      }
    }
  }, [fetchedPlan, selectedDayId]);

  // Scroll to selected item if chosen from map
  useEffect(() => {
    if (selectedItemId) {
      const element = document.getElementById(`item-${selectedItemId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedItemId]);

  const handleMarkerClick = (itemId: string) => {
    setSelectedItemId(itemId);
    // Find which day this item belongs to and select it if necessary
    if (plan?.days) {
      const day = plan.days.find((d: PlanDay) => d.items?.some((i: PlanItem) => i.id === itemId));
      if (day) setSelectedDayId(day.id);
    }
  };

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
  const handleDragStart = (e: React.DragEvent, item: PlanItem, source: "scratchpad" | "day", sourceId: string | null) => {
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

      const newPlan = {
        ...plan,
        unassigned: [...(plan.unassigned || [])],
        days: (plan.days || []).map((d: PlanDay) => ({
          ...d,
          items: [...(d.items || [])],
        }))
      };

      if (source === "scratchpad") {
        newPlan.unassigned = newPlan.unassigned.filter((i: PlanItem) => i.id !== item.id);
      } else {
        const sourceDayIndex = newPlan.days.findIndex((d: PlanDay) => d.id === sourceId);
        if (sourceDayIndex !== -1) {
          newPlan.days[sourceDayIndex].items = newPlan.days[sourceDayIndex].items.filter((i: PlanItem) => i.id !== item.id);
        }
      }

      const updatedItem = { ...item, planDayId: target === "scratchpad" ? null : targetId };
      if (target === "scratchpad") {
        newPlan.unassigned = [...newPlan.unassigned, updatedItem];
      } else {
        const targetDayIndex = newPlan.days.findIndex((d: PlanDay) => d.id === targetId);
        if (targetDayIndex !== -1) {
          newPlan.days[targetDayIndex].items = [...newPlan.days[targetDayIndex].items, updatedItem];
        }
      }

      setPlan(newPlan);
      await updateItemMutation.mutateAsync(updatedItem);
    } catch (error) {
      console.error("Drop failed:", error);
      queryClient.invalidateQueries({ queryKey: planKeys.detail(id) });
    }
  };

  const handleSaveItem = async (updatedFields: Partial<PlanItem>) => {
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
        const newPlan = {
          ...plan,
          unassigned: plan.unassigned.map((i: PlanItem) => i.id === editingItem.id ? updatedItem : i),
          days: plan.days.map((d: PlanDay) => ({
            ...d,
            items: d.items ? d.items.map((i: PlanItem) => i.id === editingItem.id ? updatedItem : i) : []
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
      newPlan.unassigned = newPlan.unassigned.filter((i: PlanItem) => i.id !== itemId);
      newPlan.days = newPlan.days.map((day: PlanDay) => ({
        ...day,
        items: day.items ? day.items.filter((i: PlanItem) => i.id !== itemId) : []
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

  const getEndTime = (item: PlanItem) => {
    if (!item.startTime || !item.duration) return null;
    const startInMinutes = getTimeInMinutes(item.startTime);
    if (startInMinutes === null) return "Invalid Date";

    const endMinutes = startInMinutes + item.duration;
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

  const sortItems = (items: PlanItem[]) => {
    return [...items].sort((a, b) => {
      const timeA = getTimeInMinutes(a.startTime);
      const timeB = getTimeInMinutes(b.startTime);

      if (timeA === null && timeB === null) return a.orderIndex - b.orderIndex;
      if (timeA === null) return 1;
      if (timeB === null) return -1;
      return timeA - timeB;
    });
  };

  const calculateGap = (item1: PlanItem, item2: PlanItem) => {
    const start1 = getTimeInMinutes(item1.startTime);
    const start2 = getTimeInMinutes(item2.startTime);
    if (start1 === null || start2 === null) return null;

    const end1 = start1 + (item1.duration || 0);
    return start2 - end1;
  };

  const formatGap = (minutes: number) => {
    if (minutes < 0) return `⚠️ ${Math.abs(minutes)}m Overlap`;
    if (minutes === 0) return "No gap";
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

      const createdDays: PlanDay[] = [];
      for (const date of days) {
        const newDay = await apiFetch<PlanDay>(`/v1/plans/${id}/days`, {
          method: "POST",
          body: JSON.stringify({ date: date.toISOString() }),
        });
        createdDays.push({ ...newDay, items: [] });
      }

      setPlan((prev: Plan | null) => ({
        ...prev,
        days: createdDays,
      } as Plan));
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
    } catch (error) {
      if (error instanceof ApiError && error.status === 501) {
        toast("Feature coming soon!");
      } else {
        console.error(error);
        toast.error("Failed to convert plan to trip");
      }
    }
  };

  if (isLoading || isError || !fetchedPlan || !plan) {
    return (
      <QueryBoundary
        isLoading={isLoading || (!!fetchedPlan && !plan)}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        loadingMessage="Building your itinerary..."
        notFound={!isLoading && !isError && !fetchedPlan}
        notFoundMessage="We couldn't find that plan."
        backHref="/plans"
        backLabel="Back to plans"
      />
    );
  }

  const isOwner = plan.isOwner;
  const canEdit = plan.role === "owner" || plan.role === "contributor";

  return (
    <main className="h-screen flex flex-col bg-transparent overflow-hidden">
      <PageTransition>
        <div className="flex flex-col h-full overflow-hidden">
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
                  {new Date(plan.startDate).toLocaleDateString()} - {new Date(plan.endDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-center">
              {!isOwner && canEdit && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                  Contributor
                </span>
              )}
              {!isOwner && !canEdit && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  Viewer
                </span>
              )}
              {isOwner && (
                <button
                  onClick={() => setShareOpen(true)}
                  className="p-2 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 rounded-md hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                  title="Share Plan"
                >
                  <Share2 size={20} />
                </button>
              )}
              {isOwner && (
                <button
                  onClick={() => setIsDeleting(true)}
                  className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Delete Plan"
                >
                  <Trash2 size={20} />
                </button>
              )}
              {canEdit && (
                <Link
                  href={`/plans/${id}/edit`}
                  className="px-4 py-2 bg-white text-gray-700 border border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 font-medium text-sm transition-colors shadow-sm"
                >
                  Edit Plan Info
                </Link>
              )}
              <button
                onClick={() => {
                  const exportData = JSON.stringify(plan, null, 2);
                  const blob = new Blob([exportData], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `plan-${plan.name.toLowerCase().replace(/\s+/g, "-")}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  toast.success("Plan exported successfully!");
                }}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 font-medium text-sm transition-colors shadow-sm flex items-center gap-2"
              >
                <Download size={16} />
                Export JSON
              </button>
              {isOwner && (
                <button
                  onClick={handleConvert}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium text-sm transition-colors shadow-sm"
                >
                  Convert to Trip
                </button>
              )}
            </div>
          </header>

          {/* Split Screen Layout */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Side: Itinerary & Scratchpad */}
            <div className="w-1/2 min-w-[500px] border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                <div className="p-6">
                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 tracking-wide uppercase text-sm flex items-center justify-between">
                    <span>Scratchpad / Ideas</span>
                    {canEdit && (
                      <button
                        onClick={handleAddIdea}
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-700 text-sm normal-case font-medium"
                      >
                        + Add Idea
                      </button>
                    )}
                  </h2>

                  <div
                    className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4 min-h-[120px] mb-8 transition-colors ${activeDragItem ? "border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/10" : "border-gray-200 dark:border-gray-700"}`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, "scratchpad", null)}
                  >
                    {plan.unassigned && plan.unassigned.length > 0 ? (
                      <div className="space-y-3">
                        {plan.unassigned.map((item: PlanItem) => (
                          <div
                            key={item.id}
                            id={`item-${item.id}`}
                            draggable={canEdit}
                            onDragStart={(e) => handleDragStart(e, item, "scratchpad", null)}
                            onDragEnd={() => setActiveDragItem(null)}
                            onClick={() => setSelectedItemId(item.id)}
                            className={`p-3 bg-gray-50 dark:bg-gray-700 rounded border shadow-sm flex items-start gap-3 ${canEdit ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} hover:border-primary-300 dark:hover:border-primary-500 transition-colors group relative ${selectedItemId === item.id ? 'ring-2 ring-primary-500 border-primary-500 bg-white dark:bg-gray-600' : 'border-gray-100 dark:border-gray-600'}`}
                          >
                            <MapPin className={`${selectedItemId === item.id ? 'text-primary-500' : 'text-gray-400'} mt-0.5 shrink-0 transition-colors`} size={16} />
                            <div className="flex-1 min-w-0 pr-8">
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
                            {canEdit && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingItem(item);
                                }}
                                className="absolute right-3 top-3 p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 opacity-0 group-hover:opacity-100 transition-all rounded hover:bg-gray-200 dark:hover:bg-gray-800"
                                title="Edit Item"
                              >
                                <Pencil size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full py-4 text-center pointer-events-none">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">{canEdit ? "Drop items here to unassign them, or add new ideas!" : "No unassigned items."}</p>
                      </div>
                    )}
                  </div>

                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 tracking-wide uppercase text-sm flex items-center justify-between">
                    <div>Itinerary</div>
                    <div className="flex gap-2">
                       <button
                         onClick={() => setIsGridModalOpen(true)}
                         className="px-3 py-1.5 flex items-center gap-2 text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/20 rounded-md hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors font-medium text-sm border border-primary-100 dark:border-primary-800"
                       >
                         <Grid size={16} />
                         Jump to specific day
                       </button>
                    </div>
                  </h2>

                  <div className="pb-20">
                    {plan.days && plan.days.length > 0 ? (
                      <div className="relative">
                        {/* Scrollable Container */}
                        <div 
                          className="flex overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden gap-4 pb-4"
                          onScroll={(e) => {
                            if (isProgrammaticScroll.current) return;
                            const container = e.currentTarget;
                            const scrollPosition = container.scrollLeft;
                            const index = Math.round(scrollPosition / container.clientWidth);
                            if (plan.days[index] && plan.days[index].id !== selectedDayId) {
                               setSelectedDayId(plan.days[index].id);
                            }
                          }}
                        >
                          {plan.days.map((day: PlanDay, i: number) => (
                            <div 
                              key={day.id} 
                              id={`day-container-${day.id}`}
                              className="min-w-full w-full snap-center flex-shrink-0 self-start bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
                            >
                          <div className="bg-gray-100 dark:bg-gray-700/50 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => {
                                  if (i > 0) setSelectedDayId(plan.days[i-1].id);
                                }}
                                disabled={i === 0}
                                className="p-1 text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 disabled:opacity-30 transition-colors"
                              >
                                <ChevronLeft size={18} />
                              </button>
                              <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                                Day {i + 1} - {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                              </h3>
                              <button
                                onClick={() => {
                                  if (i < plan.days.length - 1) setSelectedDayId(plan.days[i+1].id);
                                }}
                                disabled={i === plan.days.length - 1}
                                className="p-1 text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 disabled:opacity-30 transition-colors"
                              >
                                <ChevronRight size={18} />
                              </button>
                            </div>
                            {day.notes && <span className="text-xs text-gray-500 truncate max-w-[200px]">{day.notes}</span>}
                          </div>
                          <div
                            className={`p-4 min-h-[100px] transition-colors ${activeDragItem ? "bg-gray-50 dark:bg-gray-800/80 outline outline-2 outline-dashed outline-gray-300 dark:outline-gray-600 outline-offset-[-4px]" : ""}`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, "day", day.id)}
                          >
                            {day.items && day.items.length > 0 ? (
                              <div className="space-y-4">
                                {sortItems(day.items).map((item: PlanItem, idx: number, sortedArray: PlanItem[]) => {
                                  const gap = idx < sortedArray.length - 1 ? calculateGap(item, sortedArray[idx + 1]) : null;
                                  const hasTime = !!item.startTime;
                                  return (
                                    <div key={item.id}>
                                      <div
                                        id={`item-${item.id}`}
                                        draggable={canEdit}
                                        onDragStart={(e) => handleDragStart(e, item, "day", day.id)}
                                        onDragEnd={() => setActiveDragItem(null)}
                                        onClick={() => setSelectedItemId(item.id)}
                                        className={`p-3 rounded border shadow-sm flex items-start gap-3 ${canEdit ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} hover:border-primary-300 dark:hover:border-primary-500 transition-colors group relative ${selectedItemId === item.id ? 'ring-2 ring-primary-500 border-primary-500 bg-white dark:bg-gray-600' : !hasTime ? "bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800" : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600"}`}
                                      >
                                        {hasTime ? (
                                          <Clock className={`${selectedItemId === item.id ? 'text-primary-500' : 'text-primary-400'} mt-0.5 shrink-0 transition-colors`} size={16} />
                                        ) : (
                                          <TriangleAlert className="text-orange-500 mt-0.5 shrink-0" size={16} />
                                        )}
                                        <div className="flex-1 min-w-0 pr-8">
                                          <div className="flex justify-between items-start">
                                            <h4 className={`font-bold text-sm truncate ${selectedItemId === item.id ? 'text-gray-900 dark:text-white' : !hasTime ? "text-orange-900 dark:text-orange-200" : "text-gray-800 dark:text-gray-200"}`}>
                                              {item.name}
                                            </h4>
                                            <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                              {item.startTime && (
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${selectedItemId === item.id ? 'bg-primary-500 text-white' : 'bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400'}`}>
                                                  {formatTime(item.startTime)}
                                                </span>
                                              )}
                                              {item.duration > 0 && (
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${selectedItemId === item.id ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-800' : !hasTime ? "bg-orange-100 dark:bg-orange-800/40 text-orange-700 dark:text-orange-300" : "bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300"}`}>
                                                  {item.duration}m
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          {item.location && <p className={`text-xs mt-0.5 truncate ${selectedItemId === item.id ? 'text-gray-600 dark:text-gray-300' : !hasTime ? "text-orange-700/70 dark:text-orange-300/70" : "text-gray-500"}`}>{item.location}</p>}
                                          {item.startTime && item.duration > 0 && (
                                            <p className="text-[10px] text-gray-400 mt-1">Ends at {getEndTime(item)}</p>
                                          )}
                                        </div>
                                        {canEdit && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingItem(item);
                                            }}
                                            className="absolute right-3 top-3 p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 opacity-0 group-hover:opacity-100 transition-all rounded hover:bg-gray-200 dark:hover:bg-gray-800"
                                            title="Edit Activity"
                                          >
                                            <Pencil size={14} />
                                          </button>
                                        )}
                                      </div>

                                      {gap !== null && (
                                        <div className="flex flex-col items-center py-2 relative">
                                          <div className="w-px h-10 border-l-2 border-dashed border-gray-300 dark:border-gray-600 mb-1" />
                                          <div className={`px-3 py-1 rounded-full text-[11px] font-bold shadow-sm border ${gap < 0 ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50" : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700"}`}>
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
                               <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm italic py-4 pointer-events-none">Drag items here</div>
                             )}
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 ) : (
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
                        <p className="text-gray-500 dark:text-gray-400 mb-4">No days added to this itinerary yet.</p>
                        {canEdit && (
                          <button
                            onClick={handleGenerateDays}
                            disabled={isGenerating}
                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 font-medium text-sm transition-colors disabled:opacity-50"
                          >
                            {isGenerating ? "Generating..." : "+ Generate Days from Dates"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Item Configuration Modal */}
              {editingItem && (
                <PlanItemModal
                  item={editingItem}
                  isOpen={!!editingItem}
                  onClose={() => {
                    setEditingItem(null);
                    setIsSelectingLocation(false);
                  }}
                  onSave={handleSaveItem}
                  onDelete={handleDeleteItem}
                  onStartLocationSelection={() => setIsSelectingLocation(!isSelectingLocation)}
                  isSelectingLocation={isSelectingLocation}
                />
              )}
            </div>

            {/* Right Side: InteractiveMap */}
            <div className="flex-1 bg-white dark:bg-gray-900 p-6 relative">
              <InteractiveMap 
                plan={plan} 
                selectedDayId={selectedDayId} 
                selectedItemId={selectedItemId} 
                isSelectingLocation={isSelectingLocation}
                onMapClick={handleMapClick}
                onItemSelect={handleMarkerClick}
              />
            </div>
          </div>
        </div>
      </PageTransition>

      <ConfirmModal
        isOpen={isDeleting}
        title="Delete Plan"
        message="Are you sure you want to delete this entire plan? This will permanently remove all itinerary items and days. This action cannot be undone."
        onConfirm={handleDeletePlan}
        onCancel={() => setIsDeleting(false)}
      />

      <GridModal
        isOpen={isGridModalOpen}
        onClose={() => setIsGridModalOpen(false)}
        days={plan.days || []}
        onSelectDay={(dayId) => setSelectedDayId(dayId)}
        selectedDayId={selectedDayId}
      />

      {shareOpen && (
        <ShareModal kind="plan" resourceId={plan.id} onClose={() => setShareOpen(false)} />
      )}
    </main>
  );
}
