"use client"

import { useHotelSummaries } from "@/hooks/useApi"

export default function TestSummaries() {
  const { data: summaries, loading, error } = useHotelSummaries();
  
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Hotel Summaries Debug</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="font-semibold">Raw Response:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
            {JSON.stringify(summaries, null, 2)}
          </pre>
        </div>
        
        {summaries?.data && (
          <div>
            <h2 className="font-semibold">Processed Summaries:</h2>
            {Object.entries(summaries.data).map(([id, summary]) => (
              <div key={id} className="mt-4 p-4 border rounded">
                <h3 className="font-medium">Hotel ID: {id}</h3>
                <p>Name: {(summary as any).name}</p>
                <p>Summary: {(summary as any).summary}</p>
              </div>
            ))}
          </div>
        )}
        
        {loading && <p>Loading summaries...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
      </div>
    </div>
  );
}