"use client";
export default function ErrorBoundary({ error }: { error: Error }) {
    return <div className="p-4 bg-red-500 text-white  ">Error: {error.message}</div>;
}