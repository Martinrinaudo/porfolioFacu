import type { Database } from './database.types'

export type Category = Database['public']['Tables']['categories']['Row']
export type Photo = Database['public']['Tables']['photos']['Row']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type PhotoInsert = Database['public']['Tables']['photos']['Insert']

export type PhotoWithCategory = Photo & {
  categories: Category | null
}
