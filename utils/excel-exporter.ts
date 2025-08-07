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
          }
        }
        
        row.push(assignment)
      }
      
      dataRows.push(row)
    })
    
    // Add separator row if there are non-shift personnel
    if (nonShiftPersonnel.length > 0) {
      const separatorRow: (string | number)[] = ['', 'NON SHIFT']
      for (let day = 1; day <= daysInMonth; day++) {
        separatorRow.push('')
      }
      dataRows.push(separatorRow)
      
      // Add non-shift personnel rows
      nonShiftPersonnel.forEach(person => {
        const row: (string | number)[] = ['', person.name]
        
        // Add assignments for each day
        for (let day = 1; day <= daysInMonth; day++) {
          const dateString = format(new Date(year, month - 1, day), "yyyy-MM-dd")
          const daySchedule = this.schedule[dateString]
          
          let assignment = ''
          
          if (daySchedule && daySchedule.P.includes(person.id)) {
            assignment = 'P'
          }
          
          row.push(assignment)
        }
        
        dataRows.push(row)
      })
    }
    
    // Combine all rows
    const allRows = [headerRow1, headerRow2, ...dataRows]
    
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(allRows)
    
    // Set column widths
    const columnWidths = [
      { wch: 5 },  // NO column
      { wch: 15 }, // NAMA column
    ]
    
    // Add width for each day column
    for (let day = 1; day <= daysInMonth; day++) {
      columnWidths.push({ wch: 4 })
    }
    
    worksheet['!cols'] = columnWidths
    
    // Add some basic styling (merge header cells)
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
    
    // Merge cells for header row
    const merges = []
    for (let col = 2; col < range.e.c + 1; col++) { // Start from column C (index 2)
      merges.push({
        s: { r: 0, c: col }, // Start row 0 (first header)
        e: { r: 0, c: col }  // End same cell (no actual merge needed for single cells)
      })
    }
    
    worksheet['!merges'] = merges
    
    return worksheet
  }

  /**
   * Get schedule summary for debugging
   */
  getScheduleSummary(): { [key: string]: any } {
    const [year, month] = this.config.month.split("-").map(Number)
    const daysInMonth = getDaysInMonth(new Date(year, month - 1))
    
    const summary: { [key: string]: any } = {}
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = format(new Date(year, month - 1, day), "yyyy-MM-dd")
      const daySchedule = this.schedule[dateString]
      
      if (daySchedule) {
        summary[dateString] = {
          P: daySchedule.P.length,
          S: daySchedule.S.length,
          M: daySchedule.M.length,
          total: daySchedule.P.length + daySchedule.S.length + daySchedule.M.length
        }
      }
    }
    
    return summary
  }
}

export default ExcelExporter
