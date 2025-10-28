"use client"

import type { ExtendedTripData } from "@/app/planning/page";
import { GoogleMapsWrapper } from "@/components/google-maps-wrapper";
import { useItineraryStorage } from "@/components/itinerary-storage-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Car, Clock, CreditCard, Download, Hotel, MapPin, RefreshCw, Save, Utensils } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface PlanningStep6Props {
  tripData: ExtendedTripData
  updateTripData: (data: Partial<ExtendedTripData>) => void
  onPrev: () => void
}

interface ItineraryItem {
  time: string
  title: string
  description: string
  type: "travel" | "accommodation" | "food" | "activity" | "transport"
  icon: string
  duration?: string
  location?: string
}

interface DayItinerary {
  day: number
  date: string
  title: string
  items: ItineraryItem[]
}

export function PlanningStep6({ tripData, updateTripData, onPrev }: PlanningStep6Props) {
  const [itinerary, setItinerary] = useState<DayItinerary[]>([])
  const [isGenerating, setIsGenerating] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [itineraryName, setItineraryName] = useState("")
  const [nameError, setNameError] = useState("")
  const [hasUserEditedName, setHasUserEditedName] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)
  const { saveItinerary, savedItineraries } = useItineraryStorage()

  // Check if name already exists
  const checkDuplicateName = (name: string) => {
    return savedItineraries.some(itinerary =>
      itinerary.name.toLowerCase().trim() === name.toLowerCase().trim()
    )
  }

  // Handle name change with validation
  const handleNameChange = (value: string) => {
    setItineraryName(value)
    setNameError("")
    setHasUserEditedName(true)

    if (value.trim() && checkDuplicateName(value)) {
      setNameError("An itinerary with this name already exists")
    }
  }

  useEffect(() => {
    // Only set default name if user hasn't edited it yet
    if (!hasUserEditedName) {
      let defaultName = `Trip to ${tripData.destination || 'Unknown'} - ${new Date().toLocaleDateString()}`

      // Ensure unique default name
      let counter = 1
      while (checkDuplicateName(defaultName)) {
        defaultName = `Trip to ${tripData.destination || 'Unknown'} - ${new Date().toLocaleDateString()} (${counter})`
        counter++
      }

      setItineraryName(defaultName)
    }
  }, [tripData.destination, hasUserEditedName, savedItineraries])

  const generateItinerary = useCallback(async () => {
    if (hasGenerated) return;

    // Prepare request payload outside try block for error logging
    const requestPayload = {
      destination: tripData.destination,
      source: tripData.sourceLocation || "Current Location", // Better fallback
      duration_days: tripData.numberOfDays || 3,
      budget: typeof tripData.budget === 'number'
        ? (tripData.budget < 500 ? 'budget' : tripData.budget < 1500 ? 'mid-range' : 'luxury')
        : 'mid-range',
      interests: tripData.interests || ['sightseeing'],
      travel_style: tripData.travelStyle || 'moderate',
      travelers: tripData.numberOfPeople === 1 ? 'solo' : tripData.numberOfPeople === 2 ? 'couple' : 'group',
      numberOfPeople: tripData.numberOfPeople,
      foodPreference: tripData.foodPreference,
      selectedHotel: tripData.selectedHotel,
      travelMode: tripData.travelMode,
      selectedEssentials: tripData.selectedEssentials,
      sourceLocation: tripData.sourceLocation
    }

    try {
      setIsGenerating(true)
      setHasGenerated(true)

      // Prepare comprehensive trip data for AI backend
      const aiRequestData = {
        destination: {
          name: tripData.destination,
          id: tripData.placeDetails?.place_id || 'destination_id'
        },
        duration: tripData.numberOfDays || 3,
        participants: {
          adults: tripData.numberOfPeople || 1,
          children: 0,
          infants: 0,
          foodPreference: tripData.foodPreference
        },
        budget: {
          currency: 'USD',
          total: tripData.budget || 1000,
          breakdown: {
            accommodation: Math.round((tripData.budget || 1000) * 0.4),
            transportation: Math.round((tripData.budget || 1000) * 0.2),
            activities: Math.round((tripData.budget || 1000) * 0.2),
            meals: Math.round((tripData.budget || 1000) * 0.15),
            shopping: Math.round((tripData.budget || 1000) * 0.03),
            emergency: Math.round((tripData.budget || 1000) * 0.02)
          }
        },
        preferences: {
          travelStyle: tripData.travelStyle || 'mid-range',
          pace: 'moderate',
          interests: tripData.interests || [],
          dietary: [tripData.foodPreference]
        },
        selectedOptions: {
          hotel: tripData.selectedHotel,
          travelMode: tripData.travelMode,
          essentials: tripData.selectedEssentials
        },
        sourceLocation: tripData.sourceLocation
      }

      console.log('Generating itinerary with comprehensive trip data:', tripData)

      console.log('🚀 Request payload being sent to AI backend:', requestPayload)
      console.log('🗺️ Source Location:', tripData.sourceLocation)
      console.log('📍 Destination:', tripData.destination)

      // Call AI backend for itinerary generation using direct API call
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/itinerary/generate`
      console.log('🌐 Making request to API URL:', apiUrl)
      console.log('🔧 API Base URL from env:', process.env.NEXT_PUBLIC_API_BASE_URL)

      // Test if the API is reachable first
      try {
        const healthCheck = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/health`, {
          method: 'GET',
          signal: controller.signal
        })
        console.log('💚 Health check response:', healthCheck.status)
      } catch (healthError) {
        console.warn('⚠️ Health check failed:', healthError)
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify(requestPayload)
      })

      clearTimeout(timeoutId)

      console.log('Response status:', response.status)
      console.log('Response headers:', response.headers)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API Error Response:', errorText)
        console.error('❌ Request that failed:', requestPayload)
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
      }

      const data = await response.json()
      console.log('✅ Successful AI Response data:', data)
      console.log('✅ AI Response type:', typeof data)
      console.log('✅ AI Response has itinerary:', !!data.itinerary)
      console.log('✅ AI Response itinerary length:', data.itinerary?.length)

      if (data && data.itinerary) {
        // Convert backend response to local format - the response has itinerary directly
        const backendItinerary = data.itinerary
        console.log('🤖 Raw AI itinerary data:', backendItinerary)
        console.log('🤖 Raw AI itinerary type:', typeof backendItinerary)
        console.log('🤖 Raw AI itinerary is array:', Array.isArray(backendItinerary))

        const convertedItinerary: DayItinerary[] = backendItinerary?.map((day: any, index: number) => ({
          day: index + 1,
          date: day.date || `Day ${index + 1}`,
          title: day.title || `Day ${index + 1} - Exploring ${tripData.destination}`,
          items: day.items?.map((item: any) => ({
            time: item.time || "9:00 AM",
            title: item.title,
            description: item.description,
            type: item.type || "activity",
            icon: item.icon || "activity",
            duration: item.duration || "2 hours",
            location: item.location ? item.location.trim() : `${tripData.destination}`
          })) || []
        })) || []

        console.log('✨ Converted itinerary data:', convertedItinerary)

        // Fallback to mock data if backend returns empty or invalid data
        if (convertedItinerary.length === 0) {
          console.warn('⚠️ Backend returned empty itinerary, using fallback')
          console.warn('⚠️ Original backend data:', backendItinerary)
          throw new Error('Backend returned empty itinerary')
        }

        setItinerary(convertedItinerary)
        updateTripData({
          itinerary: convertedItinerary,
          aiResponse: `AI-generated ${tripData.numberOfDays}-day ${data.travel_tips ? 'personalized' : ''} itinerary for ${tripData.destination}`,
          placeDetails: tripData.placeDetails || {
            place_id: data.place_details?.place_id || 'ai_generated',
            rating: data.place_details?.rating || 4.5,
            address: tripData.destination || 'AI Generated Location'
          }
        })

      } else {
        console.error('❌ Invalid response format from backend')
        console.error('❌ Response data:', data)
        console.error('❌ Has data:', !!data)
        console.error('❌ Has itinerary:', !!data?.itinerary)
        throw new Error('Invalid response format from backend')
      }

    } catch (err) {
      console.error("❌ Error generating itinerary:", err)
      console.error("❌ Error details:", {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        name: err instanceof Error ? err.name : undefined,
        tripData: tripData,
        requestPayload: requestPayload
      })

      let errorMessage = "AI backend unavailable. Using sample itinerary."
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = "AI request timed out (30s). Using sample itinerary."
        } else if (err.message.includes('Failed to fetch')) {
          errorMessage = "Network error: Cannot connect to AI backend. Using sample itinerary."
        } else if (err.message.includes('CORS')) {
          errorMessage = "CORS error: AI backend configuration issue. Using sample itinerary."
        } else {
          errorMessage = `AI backend error: ${err.message}. Using sample itinerary.`
        }
      }

      console.warn("🔄 Falling back to sample data due to:", errorMessage)
      setNameError(errorMessage)

      // Fallback to local mock data generation
      const days = tripData.numberOfDays || 3
      const fallbackItinerary: DayItinerary[] = []

      for (let i = 1; i <= days; i++) {
        const destination = tripData.destination || 'Your Destination'

        fallbackItinerary.push({
          day: i,
          date: `Day ${i}`,
          title: `Day ${i} - Exploring ${destination}`,
          items: [
            {
              time: "9:00 AM",
              title: "Morning exploration",
              description: `Discover the highlights of ${destination}`,
              type: "activity",
              icon: "activity",
              duration: "3 hours",
              location: `Main attractions, ${destination}`
            },
            {
              time: "2:00 PM",
              title: "Local dining experience",
              description: "Enjoy authentic local cuisine",
              type: "food",
              icon: "food",
              duration: "2 hours",
              location: `Local restaurant, ${destination}`
            },
            {
              time: "7:00 PM",
              title: "Evening leisure",
              description: "Relax and enjoy the local atmosphere",
              type: "activity",
              icon: "activity",
              duration: "2-3 hours",
              location: `City center, ${destination}`
            }
          ]
        })
      }

      setItinerary(fallbackItinerary)
      updateTripData({
        itinerary: fallbackItinerary,
        aiResponse: `Sample ${days}-day itinerary for ${tripData.destination} (AI backend unavailable)`,
        placeDetails: tripData.placeDetails || {
          place_id: 'fallback_123',
          rating: 4.5,
          address: tripData.destination || 'Sample Location'
        }
      })
    } finally {
      setIsGenerating(false)
    }
  }, [tripData, updateTripData, hasGenerated])

  // Regenerate function that bypasses the hasGenerated check
  const regenerateItinerary = useCallback(async () => {
    try {
      setIsGenerating(true)
      setHasGenerated(false) // Reset the flag to allow regeneration

      // Prepare comprehensive trip data for AI backend (same as generateItinerary)
      const aiRequestData = {
        destination: {
          name: tripData.destination,
          id: tripData.placeDetails?.place_id || 'destination_id'
        },
        duration: tripData.numberOfDays || 3,
        participants: {
          adults: tripData.numberOfPeople || 1,
          children: 0,
          infants: 0,
          foodPreference: tripData.foodPreference
        },
        budget: {
          currency: 'USD',
          total: tripData.budget || 1000,
          breakdown: {
            accommodation: Math.round((tripData.budget || 1000) * 0.4),
            transportation: Math.round((tripData.budget || 1000) * 0.2),
            activities: Math.round((tripData.budget || 1000) * 0.2),
            meals: Math.round((tripData.budget || 1000) * 0.15),
            shopping: Math.round((tripData.budget || 1000) * 0.03),
            emergency: Math.round((tripData.budget || 1000) * 0.02)
          }
        },
        preferences: {
          travelStyle: tripData.travelStyle || 'mid-range',
          pace: 'moderate',
          interests: tripData.interests || [],
          dietary: [tripData.foodPreference]
        },
        selectedOptions: {
          hotel: tripData.selectedHotel,
          travelMode: tripData.travelMode,
          essentials: tripData.selectedEssentials
        },
        sourceLocation: tripData.sourceLocation
      }

      console.log('Regenerating itinerary with fresh AI call:', tripData)

      const requestPayload = {
        destination: tripData.destination,
        source: tripData.sourceLocation || "Unknown",
        duration_days: tripData.numberOfDays || 3,
        budget: typeof tripData.budget === 'number'
          ? (tripData.budget < 500 ? 'budget' : tripData.budget < 1500 ? 'mid-range' : 'luxury')
          : 'mid-range',
        interests: tripData.interests || ['sightseeing'],
        travel_style: tripData.travelStyle || 'moderate',
        travelers: tripData.numberOfPeople === 1 ? 'solo' : tripData.numberOfPeople === 2 ? 'couple' : 'group',
        numberOfPeople: tripData.numberOfPeople,
        foodPreference: tripData.foodPreference,
        selectedHotel: tripData.selectedHotel,
        travelMode: tripData.travelMode,
        selectedEssentials: tripData.selectedEssentials,
        sourceLocation: tripData.sourceLocation,
        regenerate: true // Flag to indicate this is a regeneration
      }

      console.log('Regeneration request payload:', requestPayload)

      // Call AI backend for fresh itinerary generation
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/itinerary/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify(requestPayload)
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Regeneration API Error Response:', errorText)
        console.error('❌ Regeneration request that failed:', requestPayload)
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
      }

      const data = await response.json()
      console.log('Fresh AI Response:', data)

      if (data && data.itinerary) {
        // Convert backend response to local format - same as original generateItinerary
        const backendItinerary = data.itinerary
        console.log('🤖 Fresh AI itinerary data:', backendItinerary)

        const convertedItinerary: DayItinerary[] = backendItinerary?.map((day: any, index: number) => ({
          day: index + 1,
          date: day.date || `Day ${index + 1}`,
          title: day.title || `Day ${index + 1} - Exploring ${tripData.destination}`,
          items: day.items?.map((item: any) => ({
            time: item.time || "9:00 AM",
            title: item.title,
            description: item.description,
            type: item.type || "activity",
            icon: item.icon || "activity",
            duration: item.duration || "2 hours",
            location: item.location ? item.location.trim() : `${tripData.destination}`
          })) || []
        })) || []

        console.log('✨ Fresh converted itinerary data:', convertedItinerary)

        // Check if we got valid data
        if (convertedItinerary.length === 0) {
          console.warn('⚠️ Backend returned empty fresh itinerary, using fallback')
          throw new Error('Backend returned empty fresh itinerary')
        }

        setItinerary(convertedItinerary)
        updateTripData({
          itinerary: convertedItinerary,
          aiResponse: `Fresh AI-generated ${tripData.numberOfDays}-day itinerary for ${tripData.destination}`,
          placeDetails: tripData.placeDetails || {
            place_id: data.place_details?.place_id || 'ai_regenerated',
            rating: data.place_details?.rating || 4.5,
            address: tripData.destination || 'AI Generated Location'
          }
        })
        setHasGenerated(true) // Set back to true after successful generation
      } else {
        console.error('❌ Invalid fresh response format from backend')
        console.error('❌ Fresh response data:', data)
        throw new Error(data.message || 'Invalid response format from backend')
      }
    } catch (error) {
      console.error('❌ Error regenerating itinerary:', error)
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        tripData: tripData
      })

      // You might want to show user feedback here
      alert(`Failed to regenerate itinerary: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`)

      setHasGenerated(true) // Reset flag even on error
    } finally {
      setIsGenerating(false)
    }
  }, [tripData, updateTripData])

  useEffect(() => {
    generateItinerary()
  }, [generateItinerary])

  const handleSaveItinerary = () => {
    if (!itineraryName.trim()) {
      setNameError("Please enter a name for your itinerary")
      return
    }

    if (checkDuplicateName(itineraryName)) {
      setNameError("An itinerary with this name already exists")
      return
    }

    setIsSaving(true)
    setNameError("")

    // Simulate saving process
    setTimeout(() => {
      const savedId = saveItinerary(tripData, itineraryName)
      console.log("Itinerary saved with ID:", savedId)
      setIsSaving(false)
      setSaveSuccess(true)

      // Hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000)
    }, 1000)
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "travel":
        return "bg-blue-100 text-blue-700"
      case "accommodation":
        return "bg-green-100 text-green-700"
      case "food":
        return "bg-orange-100 text-orange-700"
      case "activity":
        return "bg-purple-100 text-purple-700"
      case "transport":
        return "bg-gray-100 text-gray-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  if (isGenerating) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <CardTitle className="text-xl mb-2">Generating Your Perfect Itinerary</CardTitle>
          <CardDescription>Creating a personalized day-wise plan based on your preferences...</CardDescription>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Your Complete Trip Itinerary</CardTitle>
          <CardDescription>Day-wise plan for your trip to {tripData.destination}</CardDescription>
        </CardHeader>
      </Card>

      {/* Save Itinerary Section */}
      <div className="flex justify-center">
        <Card className="w-full max-w-md bg-card border-border shadow-sm relative z-10">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="itinerary-name" className="text-base font-semibold text-foreground">
                  Save this itinerary
                </Label>
                <Input
                  id="itinerary-name"
                  type="text"
                  value={itineraryName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Enter a name for your itinerary"
                  className={`mt-1 ${nameError ? "border-destructive focus-visible:ring-destructive/20" : ""}`}
                  autoComplete="off"
                />
                {nameError && (
                  <p className="text-sm text-destructive">{nameError}</p>
                )}
              </div>
              <Button
                onClick={handleSaveItinerary}
                disabled={isSaving || !itineraryName.trim() || !!nameError}
                className="w-full flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : saveSuccess ? "Saved!" : "Save Itinerary"}
              </Button>
              {saveSuccess && (
                <p className="text-sm text-green-600 dark:text-green-400 text-center">
                  Itinerary saved successfully! You can view it in your{" "}
                  <a href="/itineraries" className="underline hover:text-green-700 dark:hover:text-green-300">
                    Saved Itineraries
                  </a>
                  .
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trip Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="font-semibold text-lg">{tripData.destination}</div>
              <div className="text-sm text-muted-foreground">Destination</div>
            </div>
            <div>
              <div className="font-semibold text-lg">{tripData.numberOfPeople}</div>
              <div className="text-sm text-muted-foreground">
                {tripData.numberOfPeople === 1 ? "Traveler" : "Travelers"}
              </div>
            </div>
            <div>
              <div className="font-semibold text-lg">${tripData.budget?.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Budget</div>
            </div>
            <div>
              <div className="font-semibold text-lg">{tripData.numberOfDays || 3} Days</div>
              <div className="text-sm text-muted-foreground">Duration</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Itinerary Days */}
      <div className="space-y-6">
        {itinerary.map((day) => {
          console.log(`📅 Rendering Day ${day.day} with ${day.items.length} activities:`,
            day.items.map(item => ({ title: item.title, location: item.location }))
          )

          return (
            <div key={day.day} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Day Details Card - Left Side (2/3 width) */}
              <div className="lg:col-span-2">
                <Card className="overflow-hidden shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      {day.title}
                    </CardTitle>
                    <CardDescription>
                      Day {day.day} {day.date && !day.date.toLowerCase().includes('day') && `• ${day.date}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="space-y-0">
                      {day.items.map((item, index) => {
                        // Icon mapping for activity types
                        const iconMap: { [key: string]: any } = {
                          food: Utensils,
                          accommodation: Hotel,
                          transport: Car,
                          activity: Camera,
                          sightseeing: Camera,
                          restaurant: Utensils,
                          hotel: Hotel,
                          default: Camera
                        };

                        const iconKey = item.icon || 'default';
                        const IconComponent = iconMap[iconKey] || Camera;

                        return (
                          <div
                            key={index}
                            className="flex items-start gap-4 p-4 border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex flex-col items-center">
                              <div className="text-sm font-semibold text-muted-foreground mb-2">{item.time}</div>
                              <div className={`p-2 rounded-lg ${getTypeColor(item.type)}`}>
                                <IconComponent className="h-4 w-4" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold mb-1">{item.title}</h4>
                              <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                              <div className="flex flex-wrap gap-2">
                                {item.duration && (
                                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {item.duration}
                                  </Badge>
                                )}
                                {item.location && (
                                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {item.location}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Activity Map Flow - Right Side (1/3 width) */}
              <div className="lg:col-span-1">
                <div className="mb-2 text-sm font-medium text-gray-600">
                  Day {day.day} Map ({day.items.length} activities)
                </div>
                <GoogleMapsWrapper
                  key={`map-day-${day.day}-${day.items.length}-${day.items.map(i => i.title).join(',')}`}
                  activities={day.items}
                  destination={tripData.destination || ''}
                  dayNumber={day.day}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button variant="outline" onClick={onPrev} className="flex-1 bg-transparent">
          Previous
        </Button>
        <Button
          variant="outline"
          onClick={regenerateItinerary}
          disabled={isGenerating}
          className="flex-1 flex items-center gap-2 bg-transparent"
        >
          <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Regenerating...' : 'Generate New Plan'}
        </Button>
        <Button className="flex-1 flex items-center gap-2">
          <Download className="h-4 w-4" />
          Download Itinerary
        </Button>
        <Button variant="outline" className="flex-1 flex items-center gap-2 bg-transparent">
          <CreditCard className="h-4 w-4" />
          Proceed to Booking
        </Button>
      </div>
    </div>
  )
}
