import * as XLSX from 'xlsx'
import { Schedule, Personnel, Config } from '@/types'
import { format, getDaysInMonth } from 'date-fns'

export class ExcelExporter {
  constructor(
    private schedule: Schedule,
    private personnel: Personnel[],
    private config: Config
  ) {}

  /**
   * Export schedule to Excel file
   */
  exportToExcel(): void {
    const workbook = XLSX.utils.book_new()
    const worksheet = this.createWorksheet()
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Schedule')
    
    // Generate filename with month/year
    const filename = `Schedule_${this.config.month.replace('-', '_')}.xlsx`
    
    // Download file
    XLSX.writeFile(workbook, filename)
  }

  /**
   * Create worksheet with schedule data
   */
  private createWorksheet(): XLSX.WorkSheet {
    const [year, month] = this.config.month.split("-").map(Number)
    const daysInMonth = getDaysInMonth(new Date(year, month - 1))
    
    // Create header row with dates and day names
    const headerRow1: string[] = ['NO', 'NAMA']
    const headerRow2: string[] = ['', '']
    
    // Add date headers
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day)
      const dayName = format(date, 'EEE') // Mon, Tue, Wed, etc.
      
      headerRow1.push(day.toString())
      headerRow2.push(dayName)
    }

    // Prepare data rows
    const dataRows: (string | number)[][] = []
    
    // Add shift personnel first
    const shiftPersonnel = this.personnel.filter(p => p.role === 'shift')
    const nonShiftPersonnel = this.personnel.filter(p => p.role === 'non_shift')
    
    // Add shift personnel rows
    shiftPersonnel.forEach((person, index) => {
      const row: (string | number)[] = [index + 1, person.name]
      
      // Add assignments for each day
      for (let day = 1; day <= daysInMonth; day++) {
        const dateString = format(new Date(year, month - 1, day), "yyyy-MM-dd")
        const daySchedule = this.schedule[dateString]
        
        let assignment = ''
        
        if (daySchedule) {
          // Check which shift this person is assigned to
          if (daySchedule.P.includes(person.id)) {
            assignment = 'P'
          } else if (daySchedule.S.includes(person.id)) {
            assignment = 'S'
          } else if (daySchedule.M.includes(person.id)) {
            assignment = 'M'
          }
        }
        
        // If no shift assignment, check for leaves
        if (!assignment) {
          if (person.requestedLeaves.includes(day)) {
            assignment = 'L'
          } else if (person.requestedExtraLeaves.includes(day)) {
            assignment = 'LT'
          } else if (person.requestedAnnualLeaves.includes(day)) {
            assignment = 'CT'
          } else {
            // Fill gaps with 'L' (leave)
            assignment = 'L'
          }
        }
        
        row.push(assignment)
      }
      
      dataRows.push(row)
    })
    
    // Add non-shift personnel rows
    nonShiftPersonnel.forEach((person, index) => {
      const row: (string | number)[] = ['', `NON SHIFT ${index + 1}`]
      
      // Add assignments for each day
      for (let day = 1; day <= daysInMonth; day++) {
        const dateString = format(new Date(year, month - 1, day), "yyyy-MM-dd")
        const daySchedule = this.schedule[dateString]
        
        let assignment = ''
        
        if (daySchedule && daySchedule.P.includes(person.id)) {
          assignment = 'P'
        } else {
          // Fill non-shift personnel gaps with empty string or 'P' only
          assignment = ''
        }
        
        row.push(assignment)
      }
      
      dataRows.push(row)
    })
    
    // Combine all rows
    const allRows = [headerRow1, headerRow2, ...dataRows]
    
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(allRows)
    
    // Set column widths
    const columnWidths = [
      { wch: 5 },  // NO column
      { wch: 20 }, // NAMA column (increased for "NON SHIFT X")
    ]
    
    // Add width for each day column
    for (let day = 1; day <= daysInMonth; day++) {
      columnWidths.push({ wch: 4 })
    }
    
    worksheet['!cols'] = columnWidths
    
    // Apply formatting
    this.applyFormatting(worksheet, year, month, daysInMonth, shiftPersonnel.length, nonShiftPersonnel.length)
    
    return worksheet
  }

  /**
   * Apply formatting to the worksheet
   */
  private applyFormatting(
    worksheet: XLSX.WorkSheet, 
    year: number, 
    month: number, 
    daysInMonth: number,
    shiftPersonnelCount: number,
    nonShiftPersonnelCount: number
  ): void {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
    
    // Define styles
    const orangeFill = {
      patternType: 'solid',
      fgColor: { rgb: 'FFA500' }
    }
    
    const redFont = {
      color: { rgb: 'FF0000' }
    }
    
    // Apply formatting to cells
    for (let row = 2; row <= range.e.r; row++) { // Start from row 2 (after headers)
      for (let col = 2; col <= range.e.c; col++) { // Start from column 2 (after NO and NAMA)
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
        const cell = worksheet[cellAddress]
        
        if (cell) {
          const day = col - 1 // Convert column to day (col 2 = day 1)
          const date = new Date(year, month - 1, day)
          const dayOfWeek = date.getDay() // 0 = Sunday, 6 = Saturday
          
          // Check if it's weekend
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
          
          // Check if it's a public holiday
          const isHoliday = this.config.publicHolidays.includes(day)
          
          // Initialize cell style if it doesn't exist
          if (!cell.s) cell.s = {}
          
          // Apply orange background for leaves (L, LT, CT)
          if (cell.v === 'L' || cell.v === 'LT' || cell.v === 'CT') {
            cell.s.fill = orangeFill
          }
          
          // Apply red font for weekends and holidays
          if (isWeekend || isHoliday) {
            cell.s.font = redFont
          }
        }
      }
    }
    
    // Also format header cells for weekends/holidays
    for (let col = 2; col <= range.e.c; col++) {
      const day = col - 1
      const date = new Date(year, month - 1, day)
      const dayOfWeek = date.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const isHoliday = this.config.publicHolidays.includes(day)
      
      if (isWeekend || isHoliday) {
        // Format header row 1 (day numbers)
        const headerCell1 = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })]
        if (headerCell1) {
          if (!headerCell1.s) headerCell1.s = {}
          headerCell1.s.font = redFont
        }
        
        // Format header row 2 (day names)
        const headerCell2 = worksheet[XLSX.utils.encode_cell({ r: 1, c: col })]
        if (headerCell2) {
          if (!headerCell2.s) headerCell2.s = {}
          headerCell2.s.font = redFont
        }
      }
    }
  }
}

export default ExcelExporter
