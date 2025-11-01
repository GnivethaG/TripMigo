"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { useState } from "react"
import { useItineraryStorage } from "./itinerary-storage-manager"

const Calendar = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const MapPin = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)

const Users = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const Trash2 = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <polyline points="3,6 5,6 21,6" />
    <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
)

const Eye = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)


// New Icon for Chatbot Button
const MessageSquare = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

// --- New Chatbot Button Component ---

const ChatbotButton = () => {
  return (
    <Button
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl z-50"
      size="icon"
      // The original request was to navigate to another page, which this line handles:
      onClick={() => window.location.href = '/assistant_chat.html'}
    >
      <MessageSquare className="h-6 w-6" />
    </Button>
  )
}

interface SavedItinerariesPageProps {
  onLoadItinerary: (itineraryId: string) => void
}

export function SavedItinerariesPage({ onLoadItinerary }: SavedItinerariesPageProps) {
  const { savedItineraries, deleteItinerary, mounted } = useItineraryStorage()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading saved itineraries...</div>
      </div>
    )
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    deleteItinerary(id)
    setDeletingId(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (savedItineraries.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No saved itineraries</h3>
        <p className="text-muted-foreground mb-6">Create your first trip itinerary to see it saved here.</p>
        <Button asChild>
          <Link href="/planning">Plan Your First Trip</Link>
        </Button>
         {/* ADDED CHATBOT BUTTON HERE */}
        <ChatbotButton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Saved Itineraries</h2>
          <p className="text-muted-foreground">
            You have {savedItineraries.length} saved trip{savedItineraries.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/planning">Create New Trip</Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {savedItineraries.map((itinerary) => (
          <Card key={itinerary.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                {itinerary.name}
              </CardTitle>
              <CardDescription>
                Created {formatDate(itinerary.createdAt)}
                {itinerary.updatedAt !== itinerary.createdAt && (
                  <span className="block">Updated {formatDate(itinerary.updatedAt)}</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {itinerary.tripData.numberOfPeople} people
                </div>
                <Badge variant="secondary">{itinerary.tripData.foodPreference}</Badge>
              </div>

              <div className="text-sm">
                <p>
                  <strong>Destination:</strong> {itinerary.tripData.destination}
                </p>
                <p>
                  <strong>Travel:</strong> {itinerary.tripData.travelMode}
                </p>
                <p>
                  <strong>Budget:</strong> ${itinerary.tripData.budget}
                </p>
                {itinerary.tripData.selectedHotel && (
                  <p>
                    <strong>Hotel:</strong> {itinerary.tripData.selectedHotel}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-transparent"
                  onClick={() => onLoadItinerary(itinerary.id)}
                >
                  {/* FIX: Wrap the icon and text in a Fragment to satisfy Radix Slot component */}
                  <>
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(itinerary.id)}
                  disabled={deletingId === itinerary.id}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
