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
  zone_ids?: string[]
  zones?: string[]
  is_active?: boolean
  deprecated?: boolean
  replaced_by?: string
  completion_rule?: CompletionRule
  route_summary?: string
  route_steps?: string[]
  tips?: string[]
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

export interface UpgradeRule {
  id: string
  min_level?: number
  max_level?: number
  title: string
  detail?: string
  tags?: string[]
}

export type ChecklistClassification = 'required' | 'optional' | 'never_checklist'

export type ChecklistItemKind = 'boss' | 'reward' | 'other'

export interface ChecklistOverrides {
  key_classifications?: Record<string, ChecklistClassification | string>
  classification_default?: ChecklistClassification | string
  optional_key_suffix_regex?: string
  permanent_power_tags?: string[]
}

export interface MasterDb {
  meta?: {
    revision?: number
    [key: string]: unknown
  }
  campaign_progression_sections: {
    sections: CampaignSection[]
  }
  zones_db?: Record<string, Omit<ZonesDbEntry, 'zone_id'>>
  acts: Record<string, RewardContainer>
  interludes: Record<string, RewardContainer>
  checklist_overrides?: ChecklistOverrides
  upgrade_rules?: UpgradeRule[]
}

export interface NormalizedChecklistItem {
  id: string
  text: string
  tags: string[]
  kind: ChecklistItemKind
  classification: ChecklistClassification
  impliedBy?: string
  impliedRewards?: NormalizedChecklistItem[]
}

export interface NormalizedSection {
  id: string
  title: string
  order: number
  chapter: string
  levelRange?: string
  levelRangeValues?: { min?: number; max?: number }
  zoneNames: string[]
  impliedSubzones: string[]
  routeSummary?: string
  routeSteps: string[]
  tips: string[]
  upgrades: UpgradeRule[]
  sectionRewards: { text: string; tags: string[] }[]
  checklist: NormalizedChecklistItem[]
}

export interface NormalizedChapter {
  title: string
  sections: NormalizedSection[]
}
