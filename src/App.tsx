import { useEffect, useMemo, useState } from 'react'
import { normalizeChapters, masterDb } from './lib/normalize'
import type { NormalizedChecklistItem } from './types/masterDb'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './components/ui/accordion'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Separator } from './components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from './components/ui/toggle-group'

type ThemeId =
  | 'poe2-obsidian-gilt'
  | 'poe2-vaal-ember'
  | 'poe2-verdant-eldritch'
  | 'poe2-blood-moon'
  | 'poe2-stormsteel'
  | 'poe2-ash-pyrite'

const themeOptions: { label: string; value: ThemeId }[] = [
  { label: 'Obsidian Gilt', value: 'poe2-obsidian-gilt' },
  { label: 'Vaal Ember', value: 'poe2-vaal-ember' },
  { label: 'Eldritch Verdigris', value: 'poe2-verdant-eldritch' },
  { label: 'Blood Moon Brass', value: 'poe2-blood-moon' },
  { label: 'Stormsteel', value: 'poe2-stormsteel' },
  { label: 'Ash & Pyrite', value: 'poe2-ash-pyrite' },
]

const themeIds = new Set(themeOptions.map((option) => option.value))
const defaultTheme: ThemeId = 'poe2-obsidian-gilt'
const themeStorageKey = 'theme'
const contrastStorageKey = 'contrast'

const readInitialPreferences = (): { theme: ThemeId; contrast: '' | 'high' } => {
  if (typeof localStorage === 'undefined')
    return { theme: defaultTheme, contrast: '' }

  try {
    const storedTheme = localStorage.getItem(themeStorageKey) as ThemeId | null
    const theme = storedTheme && themeIds.has(storedTheme) ? storedTheme : defaultTheme
    const contrast = localStorage.getItem(contrastStorageKey) === 'high' ? 'high' : ''

    return { theme, contrast }
  } catch (error) {
    console.warn('Falling back to default theme preferences', error)
    return { theme: defaultTheme, contrast: '' }
  }
}

const applyThemeDataset = (theme: ThemeId) => {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
}

const applyContrastDataset = (contrast: '' | 'high') => {
  if (typeof document === 'undefined') return
  if (contrast === 'high') {
    document.documentElement.dataset.contrast = 'high'
  } else {
    document.documentElement.removeAttribute('data-contrast')
  }
}

const initialPreferences = readInitialPreferences()
if (typeof document !== 'undefined') {
  applyThemeDataset(initialPreferences.theme)
  applyContrastDataset(initialPreferences.contrast)
}

const normalizedChapters = normalizeChapters()
const storageVersion = masterDb.meta?.revision
  ? `poe2-checklist-v${masterDb.meta.revision}`
  : 'poe2-checklist-v1'

const uiStorageKey = masterDb.meta?.revision ? `poe2-ui-v${masterDb.meta.revision}` : 'poe2-ui-v1'

const loadCompleted = (): Set<string> => {
  if (typeof localStorage === 'undefined') return new Set()
  const stored = localStorage.getItem(storageVersion)
  if (!stored) return new Set()
  try {
    const parsed: string[] = JSON.parse(stored)
    return new Set(parsed)
  } catch (error) {
    console.error('Failed to parse stored checklist state', error)
    return new Set()
  }
}

const persistCompleted = (completed: Set<string>) => {
  if (completed.size === 0) {
    localStorage.removeItem(storageVersion)
    return
  }
  const values = Array.from(completed)
  localStorage.setItem(storageVersion, JSON.stringify(values))
}

const modeFilters: Record<'speedrun' | 'full', Set<NormalizedChecklistItem['classification']>> = {
  speedrun: new Set(['required']),
  full: new Set(['required', 'optional']),
}

type UiPrefs = {
  mode: 'speedrun' | 'full'
  stickyHeader: boolean
  compact: boolean
  showOptionalBadges: boolean
  openChapters: string[]
  openSections: string[]
}

const loadUiPrefs = (): Partial<UiPrefs> => {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(uiStorageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Partial<UiPrefs>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const persistUiPrefs = (prefs: UiPrefs) => {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(uiStorageKey, JSON.stringify(prefs))
  } catch (error) {
    console.warn('Unable to store UI preferences', error)
  }
}

const clearUiPrefs = () => {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(uiStorageKey)
  } catch (error) {
    console.warn('Unable to clear UI preferences', error)
  }
}

const chapterItemIds = normalizedChapters.reduce<Map<string, Set<string>>>(
  (acc, chapter) => {
    const ids = new Set<string>()
    chapter.sections.forEach((section) => {
      section.checklist.forEach((item) => ids.add(item.id))
    })
    acc.set(chapter.title, ids)
    return acc
  },
  new Map(),
)

const sectionItemMap = normalizedChapters.reduce<
  Map<string, { chapter: string; items: Set<string> }>
>((acc, chapter) => {
  chapter.sections.forEach((section) => {
    const items = new Set(section.checklist.map((item) => item.id))
    acc.set(section.id, { chapter: chapter.title, items })
  })
  return acc
}, new Map())

const computeProgress = (chapters = normalizedChapters, completed: Set<string> = new Set()) =>
  chapters.reduce(
    (totals, chapter) => {
      chapter.sections.forEach((section) => {
        section.checklist.forEach((item) => {
          totals.total += 1
          if (completed.has(item.id)) totals.done += 1
        })
      })
      return totals
    },
    { done: 0, total: 0 },
  )

const isOptionalSection = (section: { checklist: NormalizedChecklistItem[] }) =>
  section.checklist.length > 0 &&
  section.checklist.every((item) => item.classification === 'optional')

const getDefaultOpenSections = (mode: 'speedrun' | 'full') =>
  normalizedChapters.flatMap((chapter) =>
    chapter.sections
      .filter((section) => (mode === 'speedrun' ? true : !isOptionalSection(section)))
      .map((section) => section.id),
  )

const getDefaultOpenChapters = () => normalizedChapters.map((chapter) => chapter.title)

const chapterSectionIdsMap = normalizedChapters.reduce<Map<string, string[]>>((acc, chapter) => {
  acc.set(chapter.title, chapter.sections.map((section) => section.id))
  return acc
}, new Map())

function App() {
  const [theme, setTheme] = useState<ThemeId>(initialPreferences.theme)
  const [contrast, setContrast] = useState(initialPreferences.contrast === 'high')
  const [search, setSearch] = useState('')
  const storedUiPrefs = loadUiPrefs()
  const [mode, setMode] = useState<'speedrun' | 'full'>(() =>
    storedUiPrefs.mode === 'full' || storedUiPrefs.mode === 'speedrun' ? storedUiPrefs.mode : 'speedrun',
  )
  const [completed, setCompleted] = useState<Set<string>>(() => loadCompleted())
  const [stickyHeader, setStickyHeader] = useState<boolean>(() =>
    typeof storedUiPrefs.stickyHeader === 'boolean' ? storedUiPrefs.stickyHeader : true,
  )
  const [compact, setCompact] = useState<boolean>(() =>
    typeof storedUiPrefs.compact === 'boolean' ? storedUiPrefs.compact : false,
  )
  const [showOptionalBadges, setShowOptionalBadges] = useState<boolean>(() =>
    typeof storedUiPrefs.showOptionalBadges === 'boolean' ? storedUiPrefs.showOptionalBadges : true,
  )
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [openChapters, setOpenChapters] = useState<string[]>(() => {
    const all = new Set(getDefaultOpenChapters())
    const fromStorage = Array.isArray(storedUiPrefs.openChapters) ? storedUiPrefs.openChapters : []
    const filtered = fromStorage.filter((title) => all.has(title))
    return filtered.length > 0 ? filtered : getDefaultOpenChapters()
  })
  const [openSections, setOpenSections] = useState<string[]>(() => {
    const allSections = new Set<string>()
    normalizedChapters.forEach((chapter) => chapter.sections.forEach((section) => allSections.add(section.id)))
    const fromStorage = Array.isArray(storedUiPrefs.openSections) ? storedUiPrefs.openSections : []
    const filtered = fromStorage.filter((id) => allSections.has(id))
    return filtered.length > 0 ? filtered : getDefaultOpenSections(mode)
  })

  useEffect(() => {
    persistCompleted(completed)
  }, [completed])

  useEffect(() => {
    applyThemeDataset(theme)
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(themeStorageKey, theme)
      } catch (error) {
        console.warn('Unable to store theme preference', error)
      }
    }
  }, [theme])

  useEffect(() => {
    applyContrastDataset(contrast ? 'high' : '')
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(contrastStorageKey, contrast ? 'high' : '')
      } catch (error) {
        console.warn('Unable to store contrast preference', error)
      }
    }
  }, [contrast])

  useEffect(() => {
    setSettingsOpen(false)
    setOpenChapters(getDefaultOpenChapters())
    setOpenSections(getDefaultOpenSections(mode))
  }, [mode])

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (!hash) return
    const sectionInfo = sectionItemMap.get(hash)
    if (sectionInfo) {
      setOpenChapters((prev) => Array.from(new Set([...prev, sectionInfo.chapter])))
      setOpenSections((prev) => Array.from(new Set([...prev, hash])))
    }
    requestAnimationFrame(() => {
      const el = document.getElementById(hash)
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  useEffect(() => {
    persistUiPrefs({
      mode,
      stickyHeader,
      compact,
      showOptionalBadges,
      openChapters,
      openSections,
    })
  }, [mode, stickyHeader, compact, showOptionalBadges, openChapters, openSections])

  const filteredChapters = useMemo(() => {
    const query = search.trim().toLowerCase()
    const allowedClassifications = modeFilters[mode]

    const filterChecklist = (items: NormalizedChecklistItem[]) =>
      items.filter((item) => allowedClassifications.has(item.classification))

    const chapters = normalizedChapters
      .map((chapter) => {
        const sections = chapter.sections
          .map((section) => {
            const haystack = [
              section.title,
              ...section.zoneNames,
              ...section.impliedSubzones,
              section.levelRange ?? '',
              section.routeSummary ?? '',
              section.routeSteps.join(' '),
              section.tips.join(' '),
              section.upgrades
                .map(
                  (upgrade) =>
                    `${upgrade.title} ${upgrade.detail ?? ''} ${(upgrade.tags ?? []).join(' ')}`,
                )
                .join(' '),
              section.sectionRewards.map((reward) => reward.text).join(' '),
            ]
              .join(' ')
              .toLowerCase()
            if (query && !haystack.includes(query)) return null
            const checklist = filterChecklist(section.checklist)
            return { ...section, checklist }
          })
          .filter((section): section is NonNullable<typeof section> => Boolean(section))
        return { ...chapter, sections }
      })
      .filter((chapter) => chapter.sections.length > 0)

    return chapters
  }, [search, mode])

  const totals = useMemo(() => computeProgress(filteredChapters, completed), [filteredChapters, completed])
  const doneCount = totals.done
  const progressPercent = totals.total
    ? Math.min(100, Math.round((doneCount / totals.total) * 100))
    : 0

  const firstUnchecked = useMemo(() => {
    for (const chapter of filteredChapters) {
      for (const section of chapter.sections) {
        const visibleItems = section.checklist.filter((item) => !item.impliedBy)
        for (const item of visibleItems) {
          if (!completed.has(item.id)) return { itemId: item.id, sectionId: section.id, chapter: chapter.title }
        }
      }
    }
    return undefined
  }, [filteredChapters, completed])

  const toggleItem = (item: NormalizedChecklistItem) => {
    setCompleted((prev) => {
      const next = new Set(prev)
      const nextState = !next.has(item.id)
      const idsToSync = [item.id, ...(item.impliedRewards?.map((reward) => reward.id) ?? [])]

      idsToSync.forEach((id) => {
        if (nextState) {
          next.add(id)
        } else {
          next.delete(id)
        }
      })

      return next
    })
  }

  const handleNextUnchecked = () => {
    if (!firstUnchecked) return
    const targetSectionId = firstUnchecked.sectionId
    const targetChapter = firstUnchecked.chapter

    setOpenChapters((prev) => Array.from(new Set([...prev, targetChapter])))
    setOpenSections((prev) => Array.from(new Set([...prev, targetSectionId])))

    const hash = `#${targetSectionId}`
    if (window.location.hash !== hash) {
      window.history.replaceState(null, '', hash)
    }

    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-item-id="${firstUnchecked.itemId}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.focus({ preventScroll: true })
      }
    })
  }

  const handleResetAll = () => {
    const confirmed = window.confirm('Reset all checklist progress?')
    if (confirmed) {
      setCompleted(new Set())
      localStorage.removeItem(storageVersion)
    }
  }

  const handleResetAct = (chapterTitle: string) => {
    const confirmed = window.confirm(`Reset progress for ${chapterTitle}?`)
    if (!confirmed) return
    const idsToRemove = chapterItemIds.get(chapterTitle)
    if (!idsToRemove) return
    setCompleted((prev) => {
      const next = new Set(prev)
      idsToRemove.forEach((id) => next.delete(id))
      return next
    })
  }

  const handleSectionLink = (sectionId: string) => {
    const info = sectionItemMap.get(sectionId)
    if (info) {
      setOpenChapters((prev) => Array.from(new Set([...prev, info.chapter])))
      setOpenSections((prev) => Array.from(new Set([...prev, sectionId])))
    }

    const hash = `#${sectionId}`
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}${hash}`

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).catch(() => {
        window.history.replaceState(null, '', hash)
      })
    } else {
      window.history.replaceState(null, '', hash)
    }

    window.history.replaceState(null, '', hash)
    const el = document.getElementById(sectionId)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleChapterSectionAccordionChange = (chapterTitle: string, nextValues: string[]) => {
    const chapterSectionIds = chapterSectionIdsMap.get(chapterTitle) ?? []
    setOpenSections((prev) => {
      const nextSet = new Set(prev)
      chapterSectionIds.forEach((id) => nextSet.delete(id))
      nextValues.forEach((id) => nextSet.add(id))
      return Array.from(nextSet)
    })
  }

  const expandAll = () => {
    const chapterTitles = filteredChapters.map((chapter) => chapter.title)
    const sectionIds = filteredChapters.flatMap((chapter) => chapter.sections.map((section) => section.id))
    setOpenChapters(chapterTitles)
    setOpenSections(sectionIds)
  }

  const collapseAll = () => {
    setOpenSections([])
    setOpenChapters([])
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header
        className={[
          stickyHeader ? 'sticky top-0' : '',
          'z-20 border-b border-border bg-background backdrop-blur',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-[220px]">
              <div className="text-lg font-bold leading-tight">POE2 Campaign Checklist</div>
              <div className="text-xs text-muted-foreground">
                Acts/Interludes with progress tracking
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ToggleGroup
                type="single"
                value={mode}
                onValueChange={(value) => {
                  if (value === 'speedrun' || value === 'full') setMode(value)
                }}
                aria-label="Mode selection"
              >
                <ToggleGroupItem value="speedrun" aria-label="Speedrun mode">
                  Speedrun
                </ToggleGroupItem>
                <ToggleGroupItem value="full" aria-label="Full mode">
                  Full
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
              <div className="min-w-[220px] max-w-[360px] flex-1">
                <Input
                  id="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search sections, zones, route, tips…"
                />
              </div>

              <Button variant="outline" onClick={expandAll} disabled={filteredChapters.length === 0}>
                Expand all
              </Button>
              <Button variant="outline" onClick={collapseAll} disabled={filteredChapters.length === 0}>
                Collapse all
              </Button>
              <Button variant="outline" onClick={handleNextUnchecked} disabled={!firstUnchecked}>
                Next unchecked
              </Button>
              <Button variant="secondary" onClick={handleResetAll}>
                Reset all
              </Button>
              <Button variant="ghost" onClick={() => setSettingsOpen((prev) => !prev)}>
                Settings
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Overall: {doneCount} / {totals.total}
              </span>
              <div className="h-2 w-40 overflow-hidden rounded-full border border-border bg-muted">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-muted-foreground" htmlFor="theme">
                Theme
              </label>
              <select
                id="theme"
                value={theme}
                onChange={(event) => setTheme(event.target.value as ThemeId)}
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {themeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={contrast}
                  onChange={(event) => setContrast(event.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                High contrast
              </label>
            </div>
          </div>

          {settingsOpen && (
            <div className="rounded-md border border-border bg-card p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="font-semibold">UI settings</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    clearUiPrefs()
                    setStickyHeader(true)
                    setCompact(false)
                    setShowOptionalBadges(true)
                    setMode('speedrun')
                    setOpenChapters(getDefaultOpenChapters())
                    setOpenSections(getDefaultOpenSections('speedrun'))
                  }}
                >
                  Reset UI
                </Button>
              </div>
              <Separator className="my-3" />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={stickyHeader}
                    onChange={(event) => setStickyHeader(event.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span>Sticky header</span>
                </label>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={compact}
                    onChange={(event) => setCompact(event.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span>Compact spacing</span>
                </label>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showOptionalBadges}
                    onChange={(event) => setShowOptionalBadges(event.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span>Show optional badges</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className={compact ? 'mx-auto max-w-5xl px-4 py-4' : 'mx-auto max-w-5xl px-4 py-6'}>
        {filteredChapters.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No sections match your search.
          </div>
        ) : (
          <Accordion
            type="multiple"
            value={openChapters}
            onValueChange={setOpenChapters}
            className="space-y-4"
          >
            {filteredChapters.map((chapter) => {
              const chapterTotals = computeProgress([chapter], completed)
              const chapterSectionIds = chapterSectionIdsMap.get(chapter.title) ?? []
              const chapterOpenSections = openSections.filter((id) => chapterSectionIds.includes(id))

              return (
                <AccordionItem
                  key={chapter.title}
                  value={chapter.title}
                  className="rounded-lg border border-border bg-card shadow-sm border-b-0"
                >
                  <AccordionTrigger className="px-4">
                    <div className="flex w-full flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="text-base font-semibold">{chapter.title}</div>
                        <Badge variant="primary">
                          {chapterTotals.done} / {chapterTotals.total}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          handleResetAct(chapter.title)
                        }}
                      >
                        Reset Act
                      </Button>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4">
                    <Accordion
                      type="multiple"
                      value={chapterOpenSections}
                      onValueChange={(values) =>
                        handleChapterSectionAccordionChange(chapter.title, values)
                      }
                      className="rounded-md border border-border"
                    >
                      {chapter.sections.map((section) => (
                        <AccordionItem
                          key={section.id}
                          value={section.id}
                          id={section.id}
                          className="px-4"
                        >
                          <AccordionTrigger className={compact ? 'py-3' : 'py-4'}>
                            <div className="flex w-full flex-col gap-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-sm font-semibold">{section.title}</div>
                                {section.levelRange ? (
                                  <Badge variant="secondary">Level {section.levelRange}</Badge>
                                ) : null}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Copy link to ${section.title}`}
                                  onPointerDown={(event) => event.stopPropagation()}
                                  onClick={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    handleSectionLink(section.id)
                                  }}
                                >
                                  🔗
                                </Button>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                <span className="font-semibold text-foreground">Zones:</span>{' '}
                                {section.zoneNames.join(', ')}
                              </div>
                              {section.impliedSubzones.length > 0 ? (
                                <div className="text-xs text-muted-foreground">
                                  <span className="font-semibold text-foreground">
                                    Implied:
                                  </span>{' '}
                                  {section.impliedSubzones.join(', ')}
                                </div>
                              ) : null}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-0">
                            {(section.routeSummary || section.routeSteps.length > 0) && (
                              <div className="mb-4 rounded-md border border-border bg-muted p-4">
                                <div className="mb-2 text-sm font-semibold">Route</div>
                                {section.routeSummary ? (
                                  <div className="text-sm text-muted-foreground">
                                    {section.routeSummary}
                                  </div>
                                ) : null}
                                {section.routeSteps.length > 0 ? (
                                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                                    {section.routeSteps.map((step, index) => (
                                      <li key={index}>{step}</li>
                                    ))}
                                  </ul>
                                ) : null}
                              </div>
                            )}

                            <div className="rounded-md border border-border">
                              <div className="px-4 py-3">
                                <div className="text-sm font-semibold">Checklist</div>
                              </div>
                              <Separator />
                              <div className="divide-y divide-border">
                                {section.checklist
                                  .filter((item) => !item.impliedBy)
                                  .map((item) => {
                                    const checked = completed.has(item.id)
                                    const showOptional = item.classification === 'optional'

                                    return (
                                      <div
                                        key={item.id}
                                        data-item-id={item.id}
                                        tabIndex={-1}
                                        className={compact ? 'px-4 py-2' : 'px-4 py-3'}
                                      >
                                        <label className="flex cursor-pointer items-start gap-3">
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleItem(item)}
                                            className="mt-0.5 h-4 w-4 accent-primary"
                                          />
                                          <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <span
                                                className={
                                                  checked
                                                    ? 'text-sm line-through opacity-60'
                                                    : 'text-sm'
                                                }
                                              >
                                                {item.text}
                                              </span>
                                              {showOptional && showOptionalBadges ? (
                                                <Badge variant="outline">Optional</Badge>
                                              ) : null}
                                            </div>
                                            {item.impliedRewards?.length ? (
                                              <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                                                {item.impliedRewards.map((reward) => {
                                                  const label = reward.text.replace(/^Reward:\s*/i, '')
                                                  return (
                                                    <div key={reward.id} className="pl-0.5">
                                                      {label}
                                                    </div>
                                                  )
                                                })}
                                              </div>
                                            ) : null}
                                          </div>
                                        </label>
                                      </div>
                                    )
                                  })}
                              </div>
                            </div>

                            {section.sectionRewards.length > 0 ? (
                              <div className="mt-4 rounded-md border border-border bg-muted p-4">
                                <div className="mb-2 flex items-center gap-2">
                                  <Badge variant="default">Section rewards</Badge>
                                  <span className="text-xs text-muted-foreground">
                                    (not checkboxes)
                                  </span>
                                </div>
                                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                                  {section.sectionRewards.map((reward, index) => (
                                    <li key={index}>{reward.text}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}

                            {(section.tips.length > 0 || section.upgrades.length > 0) && (
                              <div className="mt-4">
                                <Accordion
                                  type="multiple"
                                  defaultValue={[]}
                                  className="rounded-md border border-border"
                                >
                                  {section.tips.length > 0 ? (
                                    <AccordionItem value={`${section.id}__tips`} className="px-4">
                                      <AccordionTrigger>Tips</AccordionTrigger>
                                      <AccordionContent>
                                        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                                          {section.tips.map((tip, index) => (
                                            <li key={index}>{tip}</li>
                                          ))}
                                        </ul>
                                      </AccordionContent>
                                    </AccordionItem>
                                  ) : null}

                                  {section.upgrades.length > 0 ? (
                                    <AccordionItem value={`${section.id}__upgrades`} className="px-4">
                                      <AccordionTrigger>Upgrades</AccordionTrigger>
                                      <AccordionContent>
                                        <div className="space-y-3">
                                          {section.upgrades.map((upgrade) => (
                                            <div key={upgrade.id} className="space-y-1">
                                              <div className="text-sm font-semibold">
                                                {upgrade.title}
                                              </div>
                                              {upgrade.detail ? (
                                                <div className="text-sm text-muted-foreground">
                                                  {upgrade.detail}
                                                </div>
                                              ) : null}
                                              {upgrade.tags?.length ? (
                                                <div className="flex flex-wrap gap-2">
                                                  {upgrade.tags.map((tag) => (
                                                    <Badge key={tag} variant="default">
                                                      {tag}
                                                    </Badge>
                                                  ))}
                                                </div>
                                              ) : null}
                                            </div>
                                          ))}
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  ) : null}
                                </Accordion>
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        )}
      </main>
    </div>
  )
}

export default App
