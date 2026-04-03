import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold text-primary-600 dark:text-primary-400 mb-6 transition-colors">
          Beyond
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 transition-colors">
          Catalog and share your traveling adventures.
        </p>
        <Link
          href="/trips"
          className="inline-block bg-primary-600 text-white dark:bg-primary-500 px-8 py-3 rounded-lg text-lg font-medium hover:bg-primary-700 dark:hover:bg-primary-400 transition-colors shadow-sm hover:shadow-md"
        >
          View My Trips
        </Link>
      </div>
    </main>
  );
}
