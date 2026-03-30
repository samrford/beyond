"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  headerPhoto: string;
  summary: string;
}

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/trips");
      if (!response.ok) throw new Error("Failed to fetch trips");
      const data = await response.json();
      
      const normalizedTrips: Trip[] = data.map((t: any) => ({
        id: t.id || t.ID,
        name: t.name || t.Name,
        startDate: t.startDate || t.StartDate,
        endDate: t.endDate || t.EndDate,
        headerPhoto: t.headerPhoto || t.HeaderPhoto,
        summary: t.summary || t.Summary,
      }));
      
      setTrips(normalizedTrips);

    } catch (error) {
      console.error("Error fetching trips:", error);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <div className="text-center">
          <p className="text-gray-600">Loading trips...</p>
        </div>
      </main>
    );
  }

  if (trips.length === 0) {
    return (
      <main className="min-h-screen p-8">
        <div className="text-center">
          <p className="text-gray-600">No trips found.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">My Trips</h1>
        <div className="grid gap-6">
          {trips.map((trip) => (
            <Link
              key={trip.id}
              href={`/trip/${trip.id}`}
              className="block bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="h-48 bg-gray-200 relative overflow-hidden">
                <img
                  src={trip.headerPhoto}
                  alt={trip.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>


              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  {trip.name}
                </h2>
                <p className="text-sm text-gray-500 mb-2">
                  {new Date(trip.startDate).toLocaleDateString()} -{" "}
                  {new Date(trip.endDate).toLocaleDateString()}
                </p>
                <p className="text-gray-600 line-clamp-2">{trip.summary}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
