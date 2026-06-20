export interface Guide {
  id: string
  orientation: "horizontal" | "vertical"
  position: number // PDF-native points
  page: number
}
