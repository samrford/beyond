import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold text-primary-600 mb-6">
          Beyond
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Catalog and share your traveling adventures.
        </p>
        <Link
          href="/trips"
          className="inline-block bg-primary-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-primary-700 transition-colors"
        >
          View My Trips
        </Link>
      </div>
    </main>
  );
}
