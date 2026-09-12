import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold">Group Trip Decision Engine</h1>
      <p className="text-gray-500 max-w-md">
        Set a budget, share your preferences, and get live destination recommendations your whole group can agree on.
      </p>
      <div className="flex gap-4">
        <Link href="/create" className="bg-black text-white rounded px-5 py-2">
          Create a Group
        </Link>
        <Link href="/join" className="border rounded px-5 py-2">
          Join a Group
        </Link>
      </div>
    </main>
  );
}