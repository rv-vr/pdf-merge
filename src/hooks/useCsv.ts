import { useState } from "react"
import type { ChangeEvent } from "react"
import Papa from "papaparse"

export function useCsv() {
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
  const [csvFileName, setCsvFileName] = useState<string>("")
  const [filenameColumn, setFilenameColumn] = useState<string>("")

  const handleCsvUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const headers = Object.keys(results.data[0] as Record<string, string>)
          setCsvHeaders(headers)
          setCsvRows(results.data as Record<string, string>[])
          setCsvFileName(file.name)
          setFilenameColumn(headers[0] || "")
        }
      },
      error: (error) => {
        console.error("Error parsing CSV:", error)
      },
    })
  }

  return {
    csvHeaders,
    csvRows,
    csvFileName,
    filenameColumn,
    setFilenameColumn,
    handleCsvUpload,
  }
}
