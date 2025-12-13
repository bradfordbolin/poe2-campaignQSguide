export interface CompletionRule {
  subzones_implied?: string[]
}

export interface CampaignSection {
  id: string
  order: number
  chapter: string
  section_title: string
  common_level_range?: {
    min?: number
    max?: number
  }
  common_level_range_display?: string
  zone_ids: string[]
  is_active?: boolean
  deprecated?: boolean
  replaced_by?: string
  completion_rule?: CompletionRule
}

export interface ZonesDbEntry {
  zone_id: string
  display_name: string
  chapter?: string
  zone_kind?: string
  parent_zone_id?: string | null
  return_to_parent?: boolean
}

export interface RewardEntry {
  zone: string
  key?: string[]
  reward_notes?: string[]
}

export interface RewardContainer {
  zones: RewardEntry[]
  town?: string
  title?: string
}

export interface MasterDb {
  meta?: {
    revision?: number
    [key: string]: unknown
  }
  campaign_progression_sections: {
    sections: CampaignSection[]
  }
  zones_db: Record<string, Omit<ZonesDbEntry, 'zone_id'>>
  acts: Record<string, RewardContainer>
  interludes: Record<string, RewardContainer>
}

export interface NormalizedChecklistItem {
  id: string
  text: string
  tags: string[]
}

export interface NormalizedSection {
  id: string
  title: string
  order: number
  chapter: string
  levelRange?: string
  zoneNames: string[]
  impliedSubzones: string[]
  checklist: NormalizedChecklistItem[]
}

export interface NormalizedChapter {
  title: string
  sections: NormalizedSection[]
}
