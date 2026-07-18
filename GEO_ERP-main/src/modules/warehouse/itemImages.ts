// AUTO-GENERATED — item photos extracted from the source workbooks' embedded images.
export const ITEM_IMAGES: Record<string, string[]> = {
  'ITM-AG-159': ['/item-images/ITM-AG-159.jpg'],
  'ITM-AG-162': ['/item-images/ITM-AG-162.jpg'],
  'ITM-AG-168': ['/item-images/ITM-AG-168.jpg', '/item-images/ITM-AG-168-2.jpg'],
  'ITM-AG-175': ['/item-images/ITM-AG-175.jpg'],
  'ITM-AG-217': ['/item-images/ITM-AG-217.jpg'],
  'ITM-AG-228': ['/item-images/ITM-AG-228.jpg'],
}

export function itemImages(code: string): string[] {
  return ITEM_IMAGES[code] ?? []
}
