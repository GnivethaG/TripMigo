import {
  destinationService,
  essentialsService,
  hotelService,
  itineraryService,
  transportationService
} from '@/lib/services/api';
import {
  Activity,
  ApiResponse,
  Destination,
  EssentialItem,
  Hotel,
  Itinerary,
  TravelMode
} from '@/lib/types/api';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Cache for API responses to prevent unnecessary re-fetching
const apiCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Generic hook for API calls with loading states
interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// Helper function to create cache key
function createCacheKey(endpoint: string, params: any[]): string {
  return `${endpoint}_${JSON.stringify(params)}`
}

// Helper function to check if cached data is still valid
function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_DURATION
}

// Generic API hook with caching and debouncing
function useApi<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  dependencies: any[] = [],
  cacheKey?: string
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController>()
  const timeoutRef = useRef<NodeJS.Timeout>()

  // Memoize dependencies to prevent unnecessary re-renders
  const memoizedDeps = useMemo(() => dependencies, dependencies)
  const dependencyString = JSON.stringify(memoizedDeps)

  const fetchData = useCallback(async () => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Check cache first if cache key is provided
    if (cacheKey) {
      const cached = apiCache.get(cacheKey)
      if (cached && isCacheValid(cached.timestamp)) {
        setData(cached.data)
        setLoading(false)
        setError(null)
        return
      }
    }

    // Debounce API calls by 300ms
    timeoutRef.current = setTimeout(async () => {
      try {
        setLoading(true)
        setError(null)

        abortControllerRef.current = new AbortController()
        const response = await apiCall()

        // Only update if this request wasn't aborted
        if (!abortControllerRef.current.signal.aborted) {
          setData(response.data)

          // Cache the response if cache key is provided
          if (cacheKey) {
            apiCache.set(cacheKey, {
              data: response.data,
              timestamp: Date.now()
            })
          }
        }
      } catch (err) {
        if (!abortControllerRef.current?.signal.aborted) {
          setError(err instanceof Error ? err.message : 'An error occurred')
        }
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          setLoading(false)
        }
      }
    }, 300)
  }, [apiCall, cacheKey])

  useEffect(() => {
    fetchData()

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [dependencyString])

  const refetch = useCallback(async () => {
    // Clear cache for this key
    if (cacheKey) {
      apiCache.delete(cacheKey)
    }
    await fetchData()
  }, [fetchData, cacheKey])

  return { data, loading, error, refetch }
}

// Specific hooks for different data types with caching
export const useHotels = (destinationId: string = '', filters?: any): UseApiResult<Hotel[]> => {
  const filterString = JSON.stringify(filters || {})
  const cacheKey = `hotels_${destinationId}_${filterString}`

  return useApi(
    () => hotelService.searchHotels(destinationId, filters),
    [destinationId, filterString],
    cacheKey
  )
}

export const useDestinations = (query: string = ''): UseApiResult<Destination[]> => {
  const cacheKey = `destinations_${query}`

  return useApi(
    () => destinationService.searchDestinations(query),
    [query],
    cacheKey
  )
}

export const useTransportation = (from: string = '', to: string = ''): UseApiResult<TravelMode[]> => {
  const cacheKey = `transportation_${from}_${to}`

  return useApi(
    () => transportationService.getTravelModes(from, to),
    [from, to],
    cacheKey
  )
}

export const useEssentials = (destination: string = '', climate: string = '', activities: string[] = []): UseApiResult<EssentialItem[]> => {
  const activitiesString = JSON.stringify(activities)
  const cacheKey = `essentials_${destination}_${climate}_${activitiesString}`

  return useApi(
    () => essentialsService.getRecommendedEssentials(destination, climate, activities),
    [destination, climate, activitiesString],
    cacheKey
  )
}

export const useActivities = (destinationId: string = ''): UseApiResult<Activity[]> => {
  const cacheKey = `activities_${destinationId}`

  return useApi(
    () => itineraryService.getActivities(destinationId),
    [destinationId],
    cacheKey
  )
}

export const useHotelSummaries = (): UseApiResult<Record<string, any>> => {
  const cacheKey = `hotel_summaries`

  return useApi(
    () => hotelService.getHotelSummaries(),
    [],
    cacheKey
  )
}

// Special hook for itinerary generation with longer cache and manual trigger
export const useItinerary = (tripData: any, autoFetch: boolean = false): UseApiResult<Itinerary> & { generateItinerary: () => void } => {
  const [manualTrigger, setManualTrigger] = useState(0)
  const tripDataString = JSON.stringify(tripData || {})
  const cacheKey = `itinerary_${tripDataString}`

  const result = useApi(
    () => itineraryService.generateItinerary(tripData),
    autoFetch ? [tripDataString, manualTrigger] : [manualTrigger], // Only depend on manual trigger if autoFetch is false
    cacheKey
  )

  const generateItinerary = useCallback(() => {
    setManualTrigger(prev => prev + 1)
  }, [])

  return {
    ...result,
    generateItinerary
  }
}

// Hook with optimistic updates
interface UseOptimisticResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  optimisticUpdate: (newData: T, updateFn: (data: T) => Promise<ApiResponse<T>>) => void
}

export function useOptimisticApi<T>(
  initialData: T | null = null
): UseOptimisticResult<T> {
  const [data, setData] = useState<T | null>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOptimistic, setIsOptimistic] = useState(false)

  const optimisticUpdate = useCallback((
    newData: T,
    updateFn: (data: T) => Promise<ApiResponse<T>>
  ) => {
    // Optimistically update the UI
    const previousData = data
    setData(newData)
    setIsOptimistic(true)

    // Perform the actual update
    updateFn(newData)
      .then((response) => {
        if (response.success) {
          setData(response.data)
        } else {
          // Revert on failure
          setData(previousData)
        }
      })
      .catch(() => {
        // Revert on error
        setData(previousData)
      })
      .finally(() => {
        setIsOptimistic(false)
      })
  }, [data])

  return { data, loading, error, optimisticUpdate }
}