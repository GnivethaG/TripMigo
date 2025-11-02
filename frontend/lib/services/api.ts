import {
    Activity,
    ApiResponse,
    Destination,
    EssentialItem,
    Hotel,
    Itinerary,
    TravelMode,
    Trip
} from '@/lib/types/api'

// Configuration for API endpoints
const API_CONFIG = {
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
    timeout: 30000, // Default timeout
    hotelTimeout: 90000, // Extended timeout for hotel requests with Google Maps integration
    retryAttempts: 3,
    useMockData: false, // Use real backend by default
}

// Base API client with error handling and retries
class ApiClient {
    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        const url = `${API_CONFIG.baseUrl}${endpoint}`

        // If using mock data, return mock response
        if (API_CONFIG.useMockData) {
            return this.getMockResponse<T>(endpoint)
        }

        const controller = new AbortController()
        // Use extended timeout for hotel requests due to Google Maps integration
        const timeout = endpoint.includes('/hotels') ? API_CONFIG.hotelTimeout : API_CONFIG.timeout
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            })

            clearTimeout(timeoutId)

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const data = await response.json()
            return data
        } catch (error) {
            clearTimeout(timeoutId)
            console.error(`API request failed for ${endpoint}:`, error)
            console.error('Full error details:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : 'No stack trace',
                url: url,
                endpoint: endpoint
            })

            // Fallback to mock data on error (now with proper images)
            return this.getMockResponse<T>(endpoint)
        }
    }

    private async getMockResponse<T>(endpoint: string): Promise<ApiResponse<T>> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))

        // Route to appropriate mock data based on endpoint
        const mockData = await this.getMockData<T>(endpoint)

        return {
            data: mockData,
            success: true,
            message: 'Mock data response'
        }
    }

    private async getMockData<T>(endpoint: string): Promise<T> {
        // Import mock data dynamically based on endpoint
        if (endpoint.includes('/hotels')) {
            const { mockHotels } = await import('../mock/hotels')
            return mockHotels as T
        }

        if (endpoint.includes('/destinations')) {
            const { mockDestinations } = await import('../mock/destinations')
            return mockDestinations as T
        }

        if (endpoint.includes('/transportation')) {
            const { mockTravelModes } = await import('../mock/transportation')
            return mockTravelModes as T
        }

        if (endpoint.includes('/essentials')) {
            const { mockEssentials } = await import('../mock/essentials')
            return mockEssentials as T
        }

        if (endpoint.includes('/activities')) {
            const { mockActivities } = await import('../mock/activities')
            return mockActivities as T
        }

        // Default empty response
        return [] as T
    }

    async get<T>(endpoint: string): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'GET' })
    }

    async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        })
    }

    async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        })
    }

    async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'DELETE' })
    }
}

// Create singleton instance
const apiClient = new ApiClient()

// Service layer for different data types
export const destinationService = {
    async searchDestinations(query: string, filters?: any): Promise<ApiResponse<Destination[]>> {
        const params = new URLSearchParams({
            q: query,
            ...filters
        }).toString()
        return apiClient.get<Destination[]>(`/destinations/search?${params}`)
    },

    async getDestinationById(id: string): Promise<ApiResponse<Destination>> {
        return apiClient.get<Destination>(`/destinations/${id}`)
    },

    async getPopularDestinations(): Promise<ApiResponse<Destination[]>> {
        return apiClient.get<Destination[]>('/destinations/popular')
    },
}

export const hotelService = {
    async searchHotels(
        destination: string,
        filters?: {
            budget?: string
            guests?: number
            duration?: number
            preferences?: string[]
        }
    ): Promise<ApiResponse<Hotel[]>> {
        const params: Record<string, string> = { destination }

        if (filters) {
            if (filters.budget) params.budget = filters.budget
            if (filters.guests) params.guests = filters.guests.toString()
            if (filters.duration) params.duration = filters.duration.toString()
            if (filters.preferences) params.preferences = filters.preferences.join(',')
        }

        const queryString = new URLSearchParams(params).toString()
        return apiClient.get<Hotel[]>(`/hotels/recommendations?${queryString}`)
    },

    async getHotelById(id: string): Promise<ApiResponse<Hotel>> {
        return apiClient.get<Hotel>(`/hotels/${id}`)
    },

    async getHotelSummaries(): Promise<ApiResponse<Record<string, any>>> {
        return apiClient.get<Record<string, any>>(`/hotels/summaries`)
    },

    async checkAvailability(
        hotelId: string,
        dates: { start: string, end: string }
    ): Promise<ApiResponse<boolean>> {
        return apiClient.post<boolean>(`/hotels/${hotelId}/availability`, dates)
    },
}

export const transportationService = {
    async getTravelModes(
        from: string,
        to: string,
        filters?: any
    ): Promise<ApiResponse<TravelMode[]>> {
        const params = new URLSearchParams({
            from,
            to,
            ...filters
        }).toString()
        return apiClient.get<TravelMode[]>(`/transportation/modes?${params}`)
    },

    async getTravelModeById(id: string): Promise<ApiResponse<TravelMode>> {
        return apiClient.get<TravelMode>(`/transportation/${id}`)
    },
}

export const essentialsService = {
    async getRecommendedEssentials(
        destination: string,
        climate: string,
        activities: string[]
    ): Promise<ApiResponse<EssentialItem[]>> {
        const params = new URLSearchParams({
            destination,
            climate,
            activities: activities.join(',')
        }).toString()
        return apiClient.get<EssentialItem[]>(`/essentials/recommended?${params}`)
    },

    async getEssentialsByCategory(category: string): Promise<ApiResponse<EssentialItem[]>> {
        return apiClient.get<EssentialItem[]>(`/essentials/category/${category}`)
    },
}

export const itineraryService = {
    async generateItinerary(tripData: Partial<Trip>): Promise<ApiResponse<Itinerary>> {
        return apiClient.post<Itinerary>('/itinerary/generate', tripData)
    },

    async optimizeItinerary(
        itinerary: Itinerary,
        preferences: any
    ): Promise<ApiResponse<Itinerary>> {
        return apiClient.post<Itinerary>('/itinerary/optimize', {
            itinerary,
            preferences
        })
    },

    async getActivities(
        destinationId: string,
        filters?: any
    ): Promise<ApiResponse<Activity[]>> {
        const params = new URLSearchParams({
            destination: destinationId,
            ...filters
        }).toString()
        return apiClient.get<Activity[]>(`/activities?${params}`)
    },
}

export const tripService = {
    async createTrip(trip: Omit<Trip, 'id' | 'createdAt' | 'lastModified'>): Promise<ApiResponse<Trip>> {
        return apiClient.post<Trip>('/trips', trip)
    },

    async updateTrip(id: string, updates: Partial<Trip>): Promise<ApiResponse<Trip>> {
        return apiClient.put<Trip>(`/trips/${id}`, updates)
    },

    async getTripById(id: string): Promise<ApiResponse<Trip>> {
        return apiClient.get<Trip>(`/trips/${id}`)
    },

    async getUserTrips(userId: string): Promise<ApiResponse<Trip[]>> {
        return apiClient.get<Trip[]>(`/users/${userId}/trips`)
    },

    async deleteTrip(id: string): Promise<ApiResponse<boolean>> {
        return apiClient.delete<boolean>(`/trips/${id}`)
    },
}

export const aiService = {
    async generateSuggestions(tripData: Partial<Trip>): Promise<ApiResponse<any>> {
        return apiClient.post<any>('/ai/suggestions', tripData)
    },

    async optimizeItinerary(itinerary: Itinerary): Promise<ApiResponse<Itinerary>> {
        return apiClient.post<Itinerary>('/ai/optimize-itinerary', { itinerary })
    },

    async getChatResponse(
        message: string,
        context: Trip
    ): Promise<ApiResponse<string>> {
        return apiClient.post<string>('/ai/chat', { message, context })
    },

    async generatePersonalizedRecommendations(
        preferences: any,
        destination: string
    ): Promise<ApiResponse<any>> {
        return apiClient.post<any>('/ai/recommendations', {
            preferences,
            destination
        })
    },
}

// Export main API client for custom requests
export { apiClient }

// Export configuration for external use
export { API_CONFIG }

