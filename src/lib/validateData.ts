import type { CampaignSection, MasterDb, RewardContainer } from '../types/masterDb'

const interludeTitleMap: Record<string, string> = {
  interlude_1_curse_of_holten: 'Interlude 1: Curse of Holten',
  interlude_2_the_stolen_barya: 'Interlude 2: The Stolen Barya',
  interlude_3_doryanis_contingency: "Interlude 3: Doryani's Contingency",
}

const permanentPowerRegex = /permanent\s+(buff|power)/i

const buildRewardIndex = (
  containers: Record<string, RewardContainer> | undefined,
  formatter: (key: string) => string,
): Map<string, RewardContainer> => {
  if (!containers) return new Map()

  return new Map<string, RewardContainer>(
    Object.entries(containers).map(([key, value]) => [formatter(key), value]),
  )
}

const buildChapterRewardMap = (db: MasterDb) => {
  const actRewards = buildRewardIndex(db.acts, (key) => {
    const suffix = key.replace('act_', '')
    return `Act ${suffix}`
  })

  const interludeRewards = buildRewardIndex(db.interludes, (key) => {
    return interludeTitleMap[key] ?? key
  })

  return new Map<string, RewardContainer>([...actRewards, ...interludeRewards])
}

const resolveZoneDisplayNames = (
  zoneIds: string[] | undefined,
  zoneMap: Map<string, string>,
): string[] => {
  if (!zoneIds) return []
  return zoneIds.map((id) => zoneMap.get(id) ?? id)
}

const warn = (message: string) => console.warn(`[validateData] ${message}`)

export const validateMasterData = (db: MasterDb) => {
  const zonesDb = db.zones_db ?? {}
  const zoneIds = new Set(Object.keys(zonesDb))
  const zoneDisplayMap = new Map<string, string>(
    Object.entries(zonesDb).map(([id, info]) => [id, info.display_name ?? id]),
  )

  const checklistOverrides = (db as unknown as {
    checklist_overrides?: { key_kinds?: Record<string, string> }
  }).checklist_overrides
  const keyKinds = checklistOverrides?.key_kinds ?? {}

  const chapterRewards = buildChapterRewardMap(db)

  const validateZones = (section: CampaignSection) => {
    const sectionZoneIds = section.zone_ids ?? section.zones ?? []
    sectionZoneIds
      .filter((id) => !zoneIds.has(id))
      .forEach((id) => warn(`Section ${section.id} references missing zone_id "${id}"`))

    const implied = section.completion_rule?.subzones_implied ?? []
    implied
      .filter((id) => !zoneIds.has(id))
      .forEach((id) => warn(`Section ${section.id} references missing implied subzone "${id}"`))
  }

  const validateLevelRange = (section: CampaignSection) => {
    const range = section.common_level_range
    const hasRangeDisplay = Boolean(section.common_level_range_display)
    const hasRange = hasRangeDisplay || (range && (range.min !== undefined || range.max !== undefined))
    if (!hasRange) {
      warn(`Section ${section.id} is missing a level range`)
    }

    if (range?.min !== undefined && range?.max !== undefined && range.min > range.max) {
      warn(`Section ${section.id} has malformed level range: min (${range.min}) > max (${range.max})`)
    }
  }

  const validateRewardKeys = (container: RewardContainer, containerId: string) => {
    container.zones?.forEach((entry) => {
      entry.key?.forEach((key) => {
        if (!(key in keyKinds)) {
          warn(`Reward key "${key}" in ${containerId} is missing from checklist_overrides.key_kinds`)
        }
      })
    })
  }

  const validatePermanentPowerNotes = (section: CampaignSection) => {
    const rewardSource = chapterRewards.get(section.chapter)
    if (!rewardSource) return

    const sectionZones = resolveZoneDisplayNames(section.zone_ids ?? section.zones, zoneDisplayMap)
    const matchingEntries = rewardSource.zones?.filter((entry) =>
      sectionZones.includes(entry.zone),
    )
    if (!matchingEntries || matchingEntries.length === 0) return

    const bossCount = matchingEntries.reduce(
      (total, entry) => total + (entry.key?.length ?? 0),
      0,
    )

    matchingEntries.forEach((entry) => {
      entry.reward_notes?.forEach((note) => {
        if (permanentPowerRegex.test(note) && bossCount === 0) {
          warn(
            `Section ${section.id} has permanent power note without bosses: "${note}" (zone ${entry.zone})`,
          )
        }
      })
    })
  }

  const sections = db.campaign_progression_sections?.sections ?? []
  sections.forEach((section) => {
    validateZones(section)
    validateLevelRange(section)
    validatePermanentPowerNotes(section)
  })

  const allRewardContainers = [
    ...Array.from(chapterRewards.entries()).map(([id, container]) => ({ id, container })),
  ]

  allRewardContainers.forEach(({ id, container }) => validateRewardKeys(container, id))
}

export default validateMasterData
