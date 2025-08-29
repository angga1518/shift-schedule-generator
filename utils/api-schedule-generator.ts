import { Config, Personnel, Schedule } from "@/types"

export interface ApiScheduleRequest {
    personnel: Array<{
        id: number
        name: string
        role: string
        requested_leaves: number[]
        extra_leaves: number[]
        annual_leaves: number[]
    }>
    config: {
        month: string
        public_holidays: number[]
        special_dates: Record<string, {
            P: number
            S: number
            M: number
        }>
        max_night_shifts: number
        max_default_leaves: number
        max_non_shift?: number | null
    }
}

export interface ApiScheduleResponse {
    schedule: Schedule
}

export interface ApiErrorResponse {
    detail: {
        error: string
        message: string
        suggestions: string[]
    }
}

export class ApiScheduleGenerator {
    private readonly BASE_URL = 'http://127.0.0.1:8000'
    private readonly API_URL = `${this.BASE_URL}/api/generate-schedule`

    constructor(
        private config: Config,
        private personnel: Personnel[]
    ) { }

    /**
     * Convert internal config and personnel data to API format
     */
    private prepareApiRequest(): ApiScheduleRequest {
        // Convert personnel to API format
        const apiPersonnel = this.personnel.map(person => ({
            id: person.id,
            name: person.name,
            role: person.role,
            requested_leaves: person.requestedLeaves || [],
            extra_leaves: person.requestedExtraLeaves || [],
            annual_leaves: person.requestedAnnualLeaves || []
        }))

        // Convert special dates to API format
        const apiSpecialDates: Record<string, { P: number, S: number, M: number }> = {}
        this.config.specialDates.forEach(specialDate => {
            apiSpecialDates[specialDate.date] = {
                P: specialDate.P,
                S: specialDate.S,
                M: specialDate.M
            }
        })

        return {
            personnel: apiPersonnel,
            config: {
                month: this.config.month,
                public_holidays: this.config.publicHolidays,
                special_dates: apiSpecialDates,
                max_night_shifts: this.config.maxNightShifts,
                max_default_leaves: this.config.maxDefaultLeaves,
                max_non_shift: this.config.maxNonShift
            }
        }
    }

    /**
     * Generate schedule using external API
     */
    async generateSchedule(): Promise<Schedule> {
        const requestData = this.prepareApiRequest()

        try {
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            })

            if (!response.ok) {
                if (response.status === 422) {
                    // Handle infeasible case
                    const errorData: ApiErrorResponse = await response.json()
                    throw new Error(`${errorData.detail.message}\n\nSuggestions:\n${errorData.detail.suggestions.join('\n')}`)
                } else {
                    throw new Error(`API request failed with status ${response.status}`)
                }
            }

            const data: ApiScheduleResponse = await response.json()
            return data.schedule

        } catch (error) {
            if (error instanceof Error) {
                throw error
            } else {
                throw new Error('Failed to generate schedule via API')
            }
        }
    }

    async wakeUpApi(): Promise<void> {
        try {
            const response = await fetch(this.BASE_URL, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            })

            if (!response.ok) {
                throw new Error(`Failed to wake up API: ${response.statusText}`)
            }
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error waking up API:', error.message)
            } else {
                console.error('Unknown error waking up API')
            }
        }
    }
}

export default ApiScheduleGenerator
