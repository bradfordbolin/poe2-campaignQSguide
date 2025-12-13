import data from '../data/poe2_master_db.json'
import type {
  CampaignSection,
  MasterDb,
  NormalizedChapter,
  NormalizedChecklistItem,
  NormalizedSection,
  RewardContainer,
} from '../types/masterDb'

const canonicalChapterOrder = [
  'Act 1',
  'Act 2',
  'Act 3',
  'Act 4',
  "Interlude 1: Curse of Holten",
  'Interlude 2: The Stolen Barya',
  "Interlude 3: Doryani's Contingency",
]

const interludeTitleMap: Record<string, string> = {
  interlude_1_curse_of_holten: 'Interlude 1: Curse of Holten',
  interlude_2_the_stolen_barya: 'Interlude 2: The Stolen Barya',
  interlude_3_doryanis_contingency: "Interlude 3: Doryani's Contingency",
}

export const masterDb: MasterDb = data

const buildRewardIndex = (
  containers: Record<string, RewardContainer>,
  formatter: (key: string) => string,
): Record<string, RewardContainer> => {
  return Object.entries(containers).reduce<Record<string, RewardContainer>>(
    (acc, [key, value]) => {
      acc[formatter(key)] = value
      return acc
    },
    {},
  )
}

const actRewards = buildRewardIndex(masterDb.acts, (key) => {
  const suffix = key.replace('act_', '')
  return `Act ${suffix}`
})

const interludeRewards = buildRewardIndex(masterDb.interludes, (key) => {
  return interludeTitleMap[key] ?? key
})

const hashChecklistId = (sectionId: string, text: string) => {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ')
  const slug = normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const base = `${sectionId}__${slug}`
  const checksum = Array.from(base).reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return `${base}-${checksum.toString(36)}`
}

const isSectionActive = (section: CampaignSection) => {
  if (section.id === 'sec_07') return false
  if (section.deprecated) return false
  if (section.is_active === false) return false
  return true
}

const formatLevelRange = (section: CampaignSection) => {
  if (section.common_level_range_display) return section.common_level_range_display
  const range = section.common_level_range
  if (!range?.min && !range?.max) return undefined
  if (range?.min !== undefined && range?.max !== undefined) {
    return `${range.min}-${range.max}`
  }
  if (range?.min !== undefined) return `${range.min}+`
  if (range?.max !== undefined) return `Up to ${range.max}`
  return undefined
}

const resolveZoneDisplayNames = (zoneIds: string[], zoneMap: Map<string, string>) =>
  zoneIds.map((id) => zoneMap.get(id) ?? id)

const buildChecklistItems = (
  sectionId: string,
  resolvedZones: string[],
  rewards: RewardContainer | undefined,
): NormalizedChecklistItem[] => {
  const items: NormalizedChecklistItem[] = []

  const candidates = rewards?.zones ?? []
  candidates
    .filter((entry) => resolvedZones.includes(entry.zone))
    .forEach((entry) => {
      entry.key?.forEach((boss) => {
        const text = `Defeat: ${boss}`
        const tags = /optional/i.test(boss) ? ['optional_content'] : ['required_progression']
        items.push({ id: hashChecklistId(sectionId, text), text, tags })
      })

      entry.reward_notes?.forEach((note) => {
        const lower = note.toLowerCase()
        const tags: string[] = []
        if (lower.includes('permanent buff')) tags.push('permanent_buff')
        if (lower.includes('skill point') || lower.includes('skill points') || lower.includes('passive') || lower.includes('book')) {
          tags.push('skill_points')
        }
        if (lower.includes('unlock') || lower.includes('key') || lower.includes('access') || lower.includes('gate')) {
          tags.push('key_unlock')
        }

        if (tags.length > 0) {
          const text = `Reward: ${note}`
          items.push({ id: hashChecklistId(sectionId, text), text, tags })
        }
      })
    })

  return items
}

export const normalizeChapters = (): NormalizedChapter[] => {
  const zoneMap = new Map<string, string>(
    Object.entries(masterDb.zones_db).map(([id, info]) => [id, info.display_name]),
  )

  const sections = masterDb.campaign_progression_sections.sections
    .filter(isSectionActive)
    .sort((a, b) => a.order - b.order)

  return canonicalChapterOrder
    .map((chapterTitle) => {
      const chapterSections = sections
        .filter((section) => section.chapter === chapterTitle)
        .map<NormalizedSection>((section) => {
          const zoneNames = resolveZoneDisplayNames(section.zone_ids, zoneMap)
          const impliedSubzones = resolveZoneDisplayNames(
            section.completion_rule?.subzones_implied ?? [],
            zoneMap,
          )

          const rewardsSource =
            actRewards[chapterTitle] ?? interludeRewards[chapterTitle]
          const checklist = buildChecklistItems(section.id, zoneNames, rewardsSource)

          return {
            id: section.id,
            title: section.section_title,
            order: section.order,
            chapter: section.chapter,
            levelRange: formatLevelRange(section),
            zoneNames,
            impliedSubzones,
            checklist,
          }
        })

      return { title: chapterTitle, sections: chapterSections }
    })
    .filter((chapter) => chapter.sections.length > 0)
}
