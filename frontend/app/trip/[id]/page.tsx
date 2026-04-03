"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CheckpointCard from "@/components/CheckpointCard";

// Get API base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

interface Checkpoint {
  id: string;
  name: string;
  location: string;
  timestamp: string;
  description: string;
  photos: string[];
  journal: string;
}

interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  headerPhoto: string;
  summary: string;
  checkpoints: Checkpoint[] | null;
}

export default function TripPage({ params }: { params: { id: string } }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrip();
  }, [params.id]);

  const fetchTrip = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/trips/${params.id}`);
      if (!response.ok) throw new Error("Failed to fetch trip");
      const data = await response.json();
      console.log("Fetched trip data:", data);
      
      // Ensure we map the casing if necessary, though the API seems to return Uppercase
      const normalizedTrip: Trip = {
        id: data.id || data.ID,
        name: data.name || data.Name,
        startDate: data.startDate || data.StartDate,
        endDate: data.endDate || data.EndDate,
        headerPhoto: data.headerPhoto || data.HeaderPhoto,
        summary: data.summary || data.Summary,
        checkpoints: (data.checkpoints || data.Checkpoints || []).map((cp: any) => ({
          id: cp.id || cp.ID,
          name: cp.name || cp.Name,
          location: cp.location || cp.Location,
          timestamp: cp.timestamp || cp.Timestamp,
          description: cp.description || cp.Description,
          photos: cp.photos || cp.Photos,
          journal: cp.journal || cp.Journal,
        })),
      };
      
      setTrip(normalizedTrip);

    } catch (error) {
      console.error("Error fetching trip:", error);
      setTrip(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Loading trip...</p>
        </div>
      </main>
    );
  }

  if (!trip) {
    return (
      <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Trip not found.</p>
          <Link href="/trips" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
            Back to trips
          </Link>
        </div>
      </main>
    );
  }

  // Helper function to get image from backend
  const getImageUrl = (photoPath: string) => {
    if (photoPath.startsWith("/api/image")) {
      return `${API_BASE_URL}${photoPath}`;
    }
    return photoPath;
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header Section */}
      <div className="relative h-64 bg-gray-300 dark:bg-gray-800">
        <img
          src={getImageUrl(trip.headerPhoto)}
          alt={trip.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-50 dark:from-gray-900 to-transparent h-16" />
      </div>


      {/* Trip Info */}
      <div className="max-w-4xl mx-auto -mt-10 relative px-4 text-gray-800 dark:text-gray-100">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold mb-2">{trip.name}</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
          </p>
          <p className="text-gray-600 dark:text-gray-300">{trip.summary}</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-6">Trip Timeline</h2>
        <div className="space-y-8">
          {trip.checkpoints?.map((checkpoint, index) => (
            <CheckpointCard
              key={checkpoint.id}
              checkpoint={checkpoint}
              index={index}
            />
          ))}
        </div>
      </div>

      {/* Back Link */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/trips"
          className="inline-block text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
        >
          ← Back to all trips
        </Link>
      </div>
    </main>
  );
}
