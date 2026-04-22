"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Pencil, Trash2, X, ArrowLeft, Maximize2, Minimize2 } from "lucide-react";
import { getImageUrl } from "@/lib/api";

interface Checkpoint {
  id: string;
  name: string;
  location: string;
  timestamp: string;
  description: string;
  photos: string[];
  journal: string;
  heroPhoto?: string;
}

interface CheckpointCardProps {
  checkpoint: Checkpoint;
  index: number;
  tripId: string;
  onDelete: (id: string) => void;
  onEdit: (checkpoint: Checkpoint) => void;
}

export default function CheckpointCard({ checkpoint, index, tripId, onDelete, onEdit }: CheckpointCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [fitToScreen, setFitToScreen] = useState(true);

  const openPhoto = (photo: string) => { setSelectedPhoto(photo); setFitToScreen(true); };
  const closePhoto = () => { setSelectedPhoto(null); setFitToScreen(true); };
  // photo path -> aspect ratio (w/h), populated by preloading when modal opens
  const [aspectRatios, setAspectRatios] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    document.body.style.overflow = photoModalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [photoModalOpen]);

  useEffect(() => {
    if (!photoModalOpen) return;
    photos.forEach(photo => {
      if (aspectRatios.has(photo)) return;
      const img = new window.Image();
      img.onload = () => {
        setAspectRatios(prev => new Map(prev).set(photo, img.naturalWidth / img.naturalHeight));
      };
      img.src = getImageUrl(photo, 400);
    });
  }, [photoModalOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pack photos into rows so each row's total aspect ratio stays near `target`.
  // The last row uses fixed widths instead of flex-grow to avoid stretching sparse rows.
  function buildRows(photos: string[], ratios: Map<string, number>, target = 3.5): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let sum = 0;
    for (const photo of photos) {
      const r = ratios.get(photo) ?? 1;
      if (row.length > 0 && sum + r > target) {
        rows.push(row);
        row = [photo];
        sum = r;
      } else {
        row.push(photo);
        sum += r;
      }
    }
    if (row.length > 0) rows.push(row);
    return rows;
  }

  const stripHtml = (html: string) => {
    if (!html) return "";
    const clean = html.replace(/<[^>]*>?/gm, ' ');
    return clean
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .split(/\s+/)
      .join(' ')
      .trim();
  };

  const plainJournal = stripHtml(checkpoint.journal);
  const isLong = plainJournal.length > 120;
  const photos = checkpoint.photos || [];
  const totalPhotos = photos.length;
  // photos[0..2] are always shown; slot 4 is overflow if there are more than 4
  const overflowCount = totalPhotos > 4 ? totalPhotos - 3 : 0;
  // Hero is the designated heroPhoto, falling back to the first photo
  const heroPhoto = checkpoint.heroPhoto || photos[0];

  return (
    <div className="relative pl-8 border-l-2 border-primary-200 dark:border-primary-800">
      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary-500 dark:bg-primary-400 cursor-pointer hover:bg-primary-600 dark:hover:bg-primary-500 transition-colors" />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{checkpoint.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{checkpoint.location}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 text-gray-400">
              <button
                onClick={() => onEdit(checkpoint)}
                className="hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 p-1.5 rounded-full transition-colors"
                title="Edit Checkpoint"
              >
                <Pencil size={18} />
              </button>
              <button
                onClick={() => onDelete(checkpoint.id)}
                className="hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-full transition-colors"
                title="Delete Checkpoint"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <span className="text-sm text-gray-400 dark:text-gray-500">
              {new Date(checkpoint.timestamp).toLocaleDateString()}
            </span>
          </div>
        </div>

        <p className="text-gray-600 dark:text-gray-300 mb-3">{checkpoint.description}</p>

        {totalPhotos > 0 && (
          <div className="flex gap-1.5 rounded-xl overflow-hidden mb-3">
            {/* Hero — aspect ratio driven by natural image dimensions, no cropping */}
            <div
              className="relative overflow-hidden"
              style={{
                flex: "3",
                aspectRatio: String(aspectRatios.get(heroPhoto) ?? 4 / 3),
              }}
            >
              <Image
                src={getImageUrl(heroPhoto, 1600)}
                alt={`${checkpoint.name} 1`}
                fill
                className="object-cover"
                onLoad={(e) => {
                  const { naturalWidth, naturalHeight } = e.currentTarget;
                  if (naturalWidth && naturalHeight)
                    setAspectRatios(prev => new Map(prev).set(heroPhoto, naturalWidth / naturalHeight));
                }}
                unoptimized
              />
            </div>

            {/* Sidebar — three stacked thumbnails */}
            {totalPhotos > 1 && (
              <div className="flex flex-col flex-[2] gap-1.5">
                {[1, 2].map((i) =>
                  photos[i] ? (
                    <div key={i} className="relative flex-1 overflow-hidden">
                      <Image
                        src={getImageUrl(photos[i], 400)}
                        alt={`${checkpoint.name} ${i + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div key={i} className="flex-1" />
                  )
                )}

                {totalPhotos > 3 && (
                  overflowCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => setPhotoModalOpen(true)}
                      className="relative flex-1 overflow-hidden"
                    >
                      <Image
                        src={getImageUrl(photos[3], 400)}
                        alt={`${checkpoint.name} 4`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">+{overflowCount}</span>
                      </div>
                    </button>
                  ) : (
                    <div className="relative flex-1 overflow-hidden">
                      <Image
                        src={getImageUrl(photos[3], 400)}
                        alt={`${checkpoint.name} 4`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}

        <div className="relative group/journal">
          {isExpanded ? (
            <div
              className="text-gray-600 dark:text-gray-300 mb-4 text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none animate-fadeIn"
              dangerouslySetInnerHTML={{ __html: checkpoint.journal }}
            />
          ) : (
            <p className="text-gray-500 dark:text-gray-400 italic mb-3 text-sm leading-relaxed">
              {isLong
                ? `${plainJournal.substring(0, 120)}...`
                : plainJournal}
            </p>
          )}
        </div>

        {isLong && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium flex items-center gap-1 transition-colors"
          >
            {isExpanded ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Show less
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Show more
              </>
            )}
          </button>
        )}
      </div>

      {/* Photo gallery modal — rendered via portal to escape ancestor transforms */}
      {photoModalOpen && createPortal(
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => { setPhotoModalOpen(false); closePhoto(); }}
        >
          <div
            className={`bg-white dark:bg-gray-900 rounded-2xl w-full overflow-hidden flex flex-col transition-all duration-200 ${selectedPhoto ? "max-w-[95vw] max-h-[95vh]" : "max-w-5xl max-h-[90vh]"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              {selectedPhoto ? (
                <button
                  onClick={closePhoto}
                  className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  <ArrowLeft size={16} />
                  All Photos
                </button>
              ) : (
                <h3 className="font-bold text-gray-900 dark:text-white">{checkpoint.name} — All Photos</h3>
              )}
              <div className="flex items-center gap-1">
                {selectedPhoto && (
                  <button
                    onClick={() => setFitToScreen(f => !f)}
                    className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title={fitToScreen ? "View full size" : "Fit to screen"}
                  >
                    {fitToScreen ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
                  </button>
                )}
                <button
                  onClick={() => { setPhotoModalOpen(false); closePhoto(); }}
                  className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className={selectedPhoto && fitToScreen ? "flex items-center justify-center p-4 min-h-0 flex-1" : "overflow-y-auto p-4"}>
              {selectedPhoto ? (
                <Image
                  src={getImageUrl(selectedPhoto, 2400)}
                  alt={checkpoint.name}
                  width={0}
                  height={0}
                  sizes="95vw"
                  className={fitToScreen ? "max-h-[calc(95vh-80px)] w-auto max-w-full rounded-lg object-contain" : "w-full h-auto rounded-lg"}
                  unoptimized
                />
              ) : (
                <div className="flex flex-col gap-1.5">
                  {buildRows(photos, aspectRatios).map((row, ri) => {
                    const rowSum = row.reduce((s, p) => s + (aspectRatios.get(p) ?? 1), 0);
                    // Distribute gap evenly across items so percentages add to 100%
                    const gapDeduct = (row.length - 1) * 6 / row.length;
                    return (
                      <div key={ri} className="flex gap-1.5">
                        {row.map((photo, i) => {
                          const ratio = aspectRatios.get(photo) ?? 1;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => openPhoto(photo)}
                              style={{
                                flex: `0 0 calc(${(ratio / rowSum) * 100}% - ${gapDeduct}px)`,
                                aspectRatio: String(ratio),
                              }}
                              className="relative overflow-hidden rounded-lg hover:opacity-90 transition-opacity"
                            >
                              <Image
                                src={getImageUrl(photo, 800)}
                                alt={`${checkpoint.name} ${i + 1}`}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
