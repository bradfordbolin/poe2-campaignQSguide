import data from '../data/poe2_master_db.json'
import { validateMasterData } from './validateData'
import type {
  CampaignSection,
  ChecklistClassification,
  ChecklistOverrides,
  MasterDb,
  NormalizedChapter,
  NormalizedChecklistItem,
  NormalizedSection,
  RewardContainer,
  UpgradeRule,
} from '../types/masterDb'

const interludeTitleMap: Record<string, string> = {
  interlude_1_curse_of_holten: 'Interlude 1: Curse of Holten',
  interlude_2_the_stolen_barya: 'Interlude 2: The Stolen Barya',
  interlude_3_doryanis_contingency: "Interlude 3: Doryani's Contingency",
}

export const masterDb: MasterDb = data

if (import.meta.env.DEV) {
  validateMasterData(masterDb)
}

const isChecklistClassification = (
  value: unknown,
): value is ChecklistClassification =>
  value === 'required' || value === 'optional' || value === 'never_checklist'

const checklistOverrides: ChecklistOverrides = masterDb.checklist_overrides ?? {}

const classificationByKey = new Map<string, ChecklistClassification>()
Object.entries(checklistOverrides.key_classifications ?? {}).forEach(([key, value]) => {
  if (isChecklistClassification(value)) {
    classificationByKey.set(key, value)
  } else if (import.meta.env.DEV) {
    console.warn(`Ignoring invalid checklist classification "${value}" for key "${key}"`)
  }
})

const classificationDefault: ChecklistClassification =
  isChecklistClassification(checklistOverrides.classification_default)
    ? checklistOverrides.classification_default
    : 'optional'

const optionalKeyRegex = (() => {
  const pattern = checklistOverrides.optional_key_suffix_regex
  if (!pattern) return undefined
  const inlineInsensitive = pattern.startsWith('(?i)')
  const source = pattern.replace(/^\(\?i\)/, '')
  const flags = inlineInsensitive ? 'i' : undefined
  try {
    return new RegExp(source, flags)
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Invalid checklist_overrides.optional_key_suffix_regex; ignoring', error)
    }
    return undefined
  }
})()

const permanentPowerTags = new Set(
  checklistOverrides.permanent_power_tags ?? ['permanent_buff', 'skill_points', 'ascendancy', 'key_unlock'],
)

const classifyRewardTags = (tags: string[]): ChecklistClassification =>
  tags.some((tag) => permanentPowerTags.has(tag)) ? 'required' : 'optional'

const classifyKey = (key: string): ChecklistClassification => {
  const override = classificationByKey.get(key)
  if (override) return override
  if (optionalKeyRegex?.test(key)) return 'optional'
  return classificationDefault
}

const ensureBossRequired = (item: NormalizedChecklistItem) => {
  if (item.classification === 'required') return
  item.classification = 'required'
  const tags = new Set(item.tags.filter((tag) => tag !== 'optional_content'))
  tags.add('required_progression')
  item.tags = Array.from(tags)
}

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

const upgradeRules: UpgradeRule[] = masterDb.upgrade_rules ?? []

const overlapsLevelRange = (
  sectionRange: { min?: number; max?: number },
  ruleRange: { min?: number; max?: number },
) => {
  const sectionMin = sectionRange.min ?? Number.NEGATIVE_INFINITY
  const sectionMax = sectionRange.max ?? Number.POSITIVE_INFINITY
  const ruleMin = ruleRange.min ?? Number.NEGATIVE_INFINITY
  const ruleMax = ruleRange.max ?? Number.POSITIVE_INFINITY
  return sectionMin <= ruleMax && sectionMax >= ruleMin
}

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

const rewardTagMatchers = [
  { tag: 'permanent_buff', test: (text: string) => /permanent\s+(buff|power)/i.test(text) },
  {
    tag: 'skill_points',
    test: (text: string) => /skill\s*points?|passive|book/i.test(text),
  },
  { tag: 'ascendancy', test: (text: string) => /ascendancy/i.test(text) },
  { tag: 'key_unlock', test: (text: string) => /(unlock|key|access|gate)/i.test(text) },
]

const buildChecklistItems = (
  sectionId: string,
  resolvedZones: string[],
  rewards: RewardContainer | undefined,
): { checklist: NormalizedChecklistItem[]; sectionRewards: { text: string; tags: string[] }[] } => {
  const bossItems: { item: NormalizedChecklistItem; name: string }[] = []
  const rewardItems: { item: NormalizedChecklistItem; note: string }[] = []
  const sectionRewards: { text: string; tags: string[] }[] = []

  const candidates = rewards?.zones ?? []
  candidates
    .filter((entry) => resolvedZones.includes(entry.zone))
    .forEach((entry) => {
      entry.key?.forEach((boss) => {
        const classification = classifyKey(boss)
        if (classification === 'never_checklist') return

        const text = `Defeat: ${boss}`
        const tags = classification === 'optional' ? ['optional_content'] : ['required_progression']
        const item: NormalizedChecklistItem = {
          id: hashChecklistId(sectionId, text),
          text,
          tags,
          kind: 'boss',
          classification,
        }
        bossItems.push({ item, name: boss })
      })

      entry.reward_notes?.forEach((note) => {
        const lower = note.toLowerCase()
        const tags = rewardTagMatchers
          .filter((matcher) => matcher.test(lower))
          .map((matcher) => matcher.tag)

        if (tags.length > 0) {
          const text = `Reward: ${note}`
          const classification = classifyRewardTags(tags)
          const item: NormalizedChecklistItem = {
            id: hashChecklistId(sectionId, text),
            text,
            tags,
            kind: 'reward',
            classification,
          }
          rewardItems.push({ item, note })
        }
      })
    })

  const bossCount = bossItems.length
  const impliedByMap = new Map<string, string>()

  if (bossCount === 1 && rewardItems.length > 0) {
    const boss = bossItems[0]
    const impliedRewards = rewardItems.map((reward) => ({ ...reward.item, impliedBy: boss.item.id }))
    if (impliedRewards.some((reward) => reward.classification === 'required')) {
      ensureBossRequired(boss.item)
    }
    boss.item.impliedRewards = impliedRewards
    rewardItems.forEach((reward) => impliedByMap.set(reward.item.id, boss.item.id))
  }

  if (bossCount > 1) {
    rewardItems.forEach((reward) => {
      const match = bossItems.find((boss) =>
        reward.note.toLowerCase().includes(boss.name.toLowerCase()),
      )
      if (match) {
        const implied = { ...reward.item, impliedBy: match.item.id }
        impliedByMap.set(reward.item.id, match.item.id)
        match.item.impliedRewards = [...(match.item.impliedRewards ?? []), implied]
        if (implied.classification === 'required') {
          ensureBossRequired(match.item)
        }
      }
    })
  }

  rewardItems.forEach((reward) => {
    if (impliedByMap.has(reward.item.id)) return
    sectionRewards.push({ text: reward.note, tags: reward.item.tags })
  })

  const items: NormalizedChecklistItem[] = bossItems.map((entry) => entry.item)

  return { checklist: items, sectionRewards }
}

export const normalizeChapters = (): NormalizedChapter[] => {
  const zoneMap = new Map<string, string>(
    Object.entries(masterDb.zones_db ?? {}).map(([id, info]) => [id, info.display_name]),
  )

  const normalizeSection = (section: CampaignSection): NormalizedSection => {
    const zoneIds = section.zone_ids ?? section.zones ?? []
    const zoneNames = resolveZoneDisplayNames(zoneIds, zoneMap)
    const impliedSubzones = resolveZoneDisplayNames(
      section.completion_rule?.subzones_implied ?? [],
      zoneMap,
    )

    const levelRangeValues = section.common_level_range ?? {}
    const hasLevelRange = levelRangeValues.min !== undefined || levelRangeValues.max !== undefined
    const upgrades = hasLevelRange
      ? upgradeRules.filter((rule) =>
          overlapsLevelRange(levelRangeValues, { min: rule.min_level, max: rule.max_level }),
        )
      : []

    const rewardsSource = actRewards[section.chapter] ?? interludeRewards[section.chapter]
    const { checklist, sectionRewards } = buildChecklistItems(section.id, zoneNames, rewardsSource)

    return {
      id: section.id,
      title: section.section_title,
      order: section.order,
      chapter: section.chapter,
      levelRange: formatLevelRange(section),
      levelRangeValues,
      zoneNames,
      impliedSubzones,
      routeSummary: section.route_summary,
      routeSteps: section.route_steps ?? [],
      tips: section.tips ?? [],
      upgrades,
      sectionRewards,
      checklist,
    }
  }

  const buildChaptersFromSections = (sections: CampaignSection[]): NormalizedChapter[] => {
    const chapters = new Map<string, CampaignSection[]>()

    sections.filter(isSectionActive).forEach((section) => {
      const bucket = chapters.get(section.chapter) ?? []
      bucket.push(section)
      chapters.set(section.chapter, bucket)
    })

    return Array.from(chapters.entries())
      .map(([title, chapterSections]) => {
        const sortedSections = [...chapterSections].sort((a, b) => a.order - b.order)
        const normalizedSections = sortedSections.map(normalizeSection)
        const minOrder = normalizedSections[0]?.order ?? Number.POSITIVE_INFINITY
        return { title, sections: normalizedSections, order: minOrder }
      })
      .sort((a, b) => a.order - b.order)
      .map(({ title, sections }) => ({ title, sections }))
      .filter((chapter) => chapter.sections.length > 0)
  }

  const sections = masterDb.campaign_progression_sections?.sections ?? []
  if (sections.length > 0) {
    return buildChaptersFromSections(sections)
  }

  const legacyChapters = (masterDb as unknown as { campaign_progression_chapters?: unknown })
    .campaign_progression_chapters

  if (legacyChapters && typeof legacyChapters === 'object') {
    const legacySections: CampaignSection[] = []

    if (Array.isArray((legacyChapters as { sections?: unknown }).sections)) {
      legacySections.push(...(((legacyChapters as { sections: CampaignSection[] }).sections ?? [])
        .filter(Boolean) as CampaignSection[]))
    } else {
      Object.values(legacyChapters).forEach((value) => {
        if (Array.isArray(value)) {
          legacySections.push(...(value.filter(Boolean) as CampaignSection[]))
        }
      })
    }

    if (legacySections.length > 0) {
      return buildChaptersFromSections(legacySections)
    }
  }

  return []
}
