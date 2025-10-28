"use client"

import type { ExtendedTripData } from "@/app/planning/page"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useHotels, useHotelSummaries } from "@/hooks/useApi"
import { useEffect, useMemo, useState } from "react"

// SVG icon components unchanged...

interface PlanningStep4Props {
  tripData: ExtendedTripData
  updateTripData: (data: Partial<ExtendedTripData>) => void
  onNext: () => void
  onPrev: () => void
}

// Interface for hotel summary data
interface HotelSummary {
  place_id: string;
  name: string;
  avg_rating: number;
  num_reviews: number;
  summary: string;
}

const amenityIcons: Record<string, any> = {
  "Free WiFi": Wifi,
  Pool: Waves,
  Spa: Star,
  Restaurant: Utensils,
  Gym: Dumbbell,
  Bar: Coffee,
  Parking: Car,
}

export function PlanningStep4({ tripData, updateTripData, onNext, onPrev }: PlanningStep4Props) {
  const [selectedHotelId, setSelectedHotelId] = useState(tripData.selectedHotel)

  // Memoize filters to prevent unnecessary re-renders
  const hotelFilters = useMemo(() => {
    const getBudgetLevel = () => {
      if (!tripData.budget) return 'medium'
      const budget = tripData.budget
      if (budget < 1000) return 'budget'
      if (budget > 3000) return 'luxury'
      return 'medium'
    }

    return {
      budget: getBudgetLevel(),
      guests: tripData.numberOfPeople || 2,
      duration: tripData.numberOfDays || 3,
      preferences: tripData.interests || []
    }
  }, [tripData.budget, tripData.numberOfPeople, tripData.numberOfDays, tripData.interests])

  // Only fetch hotels when destination is available and stable
  const { data: hotels, loading, error } = useHotels(
    tripData.destination || '',
    tripData.destination ? hotelFilters : undefined
  )
  const { data: hotelSummaries } = useHotelSummaries()
  
  // Process summaries data structure
  const summariesData = useMemo(() => {
    const data = (hotelSummaries?.data || {}) as Record<string, HotelSummary>;
    return data;
  }, [hotelSummaries]);

  // Sync local state with prop changes
  useEffect(() => {
    setSelectedHotelId(tripData.selectedHotel)
  }, [tripData.selectedHotel])

  const handleHotelSelect = (hotelId: string) => {
    setSelectedHotelId(hotelId) // Immediate visual feedback
    updateTripData({ selectedHotel: hotelId })
  }

  const handleSubmit = () => {
    if (selectedHotelId) {
      onNext()
    }
  }

  const selectedHotel = hotels?.find((hotel) => hotel.id === selectedHotelId)

  return (
    <div className="space-y-6">
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Choose Your Hotel</CardTitle>
          <CardDescription>
            Select accommodation for your stay in {tripData.destination || "your destination"}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Selected Hotel Display */}
      {selectedHotel && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Selected Hotel:</span>
              <span className="text-primary">{selectedHotel.name}</span>
              <Badge variant="secondary">${selectedHotel.pricePerNight.amount}/night</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hotels Horizontal Scroll */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Available Hotels</h3>
        <div className="flex gap-6 overflow-x-auto overflow-y-hidden pb-6 pt-2 px-4 hotels-scroll">
          {hotels?.map((hotel, index) => {
            const isSelected = selectedHotelId === hotel.id
            const totalPrice = hotel.pricePerNight.amount * 3 // Assuming 3 nights

            return (
              <Card
                key={hotel.id}
                className={`flex-none w-80 cursor-pointer hover:shadow-lg hover:scale-[1.02] ${isSelected ? "ring-2 ring-primary bg-primary/5 shadow-lg scale-[1.01]" : "hover:shadow-md"
                  } ${index === 0 ? "ml-2" : ""} ${index === (hotels?.length || 0) - 1 ? "mr-2" : ""}`}
                style={{
                  transition: 'box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onClick={() => handleHotelSelect(hotel.id)}
              >
                <div className="aspect-video overflow-hidden rounded-t-lg">
                  <img
                    src={hotel.images[0] || "/placeholder.svg"}
                    alt={hotel.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg leading-tight">{hotel.name}</CardTitle>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 fill-current text-yellow-500" />
                      <span className="font-semibold">{hotel.rating}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{hotel.location.city}</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{hotel.description}</p>

                  {/* AI-generated review summary (if available) */}
                  {(() => {
                    // Find matching summary by hotel ID or name
                    const foundSummary = Object.values(summariesData).find((summary) => 
                      summary?.place_id === hotel.id || summary?.name === hotel.name
                    );
                    
                    return foundSummary?.summary ? (
                      <div className="my-3 p-2 bg-primary/5 rounded-md">
                        <p className="text-sm text-muted-foreground italic line-clamp-3">
                          {foundSummary.summary}
                        </p>
                      </div>
                    ) : null;
                  })()}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{hotel.reviewCount} reviews</span>
                      <div className="text-right">
                        <div className="font-semibold">${hotel.pricePerNight.amount}/night</div>
                        <div className="text-sm text-muted-foreground">~${totalPrice} total</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {hotel.amenities.slice(0, 4).map((amenity, index) => {
                        const Icon = amenityIcons[amenity.name]
                        return (
                          <Badge key={index} variant="secondary" className="text-xs flex items-center gap-1">
                            {Icon && <Icon className="h-3 w-3" />}
                            {amenity.name}
                          </Badge>
                        )
                      })}
                      {hotel.amenities.length > 4 && (
                        <Badge variant="secondary" className="text-xs">
                          +{hotel.amenities.length - 4} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-4 max-w-2xl mx-auto">
        <Button type="button" variant="outline" onClick={onPrev} className="flex-1 bg-transparent">
          Previous
        </Button>
        <Button onClick={handleSubmit} className="flex-1" disabled={!selectedHotelId}>
          Continue to Essentials
        </Button>
      </div>
    </div>
  )
}