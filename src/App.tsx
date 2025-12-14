import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { normalizeChapters, masterDb } from './lib/normalize'
import type { NormalizedChecklistItem } from './types/masterDb'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './components/ui/accordion'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Separator } from './components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './components/ui/sheet'
import { ToggleGroup, ToggleGroupItem } from './components/ui/toggle-group'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './components/ui/alert-dialog'
import {
  Check,
  ChevronsDown,
  ChevronsUp,
  Link2,
  PanelLeft,
  RotateCcw,
  Search,
  Settings2,
  SkipForward,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from './lib/utils'

type ThemeId =
  | 'poe2-obsidian-gilt'
  | 'poe2-light'
  | 'poe2-dark'
  | 'poe2-oled'
  | 'poe2-vaal-ember'
  | 'poe2-verdant-eldritch'
  | 'poe2-blood-moon'
  | 'poe2-stormsteel'
  | 'poe2-ash-pyrite'

const themeOptions: { label: string; value: ThemeId }[] = [
  { label: 'Obsidian Gilt', value: 'poe2-obsidian-gilt' },
  { label: 'Light', value: 'poe2-light' },
  { label: 'Dark', value: 'poe2-dark' },
  { label: 'OLED', value: 'poe2-oled' },
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

const readInitialPreferences = (): {
  theme: ThemeId
  contrast: '' | 'high'
} => {
  if (typeof localStorage === 'undefined')
    return { theme: defaultTheme, contrast: '' }

  try {
    const storedTheme = localStorage.getItem(themeStorageKey) as ThemeId | null
    const theme =
      storedTheme && themeIds.has(storedTheme) ? storedTheme : defaultTheme
    const contrast =
      localStorage.getItem(contrastStorageKey) === 'high' ? 'high' : ''

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

const uiStorageKey = masterDb.meta?.revision
  ? `poe2-ui-v${masterDb.meta.revision}`
  : 'poe2-ui-v1'

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

const modeFilters: Record<
  'speedrun' | 'full',
  Set<NormalizedChecklistItem['classification']>
> = {
  speedrun: new Set(['required']),
  full: new Set(['required', 'optional']),
}

type UiPrefs = {
  mode: 'speedrun' | 'full'
  stickyHeader: boolean
  compact: boolean
  showOptionalBadges: boolean
  rememberOpenPanels: boolean
  autoCollapseCompleted: boolean
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
  new Map()
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

const computeProgress = (
  chapters = normalizedChapters,
  completed: Set<string> = new Set()
) =>
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
    { done: 0, total: 0 }
  )

const allChapterTitles = normalizedChapters.map((chapter) => chapter.title)

const getDefaultOpenSections = () => []

const getDefaultOpenChapters = () => allChapterTitles

const chapterSectionIdsMap = normalizedChapters.reduce<Map<string, string[]>>(
  (acc, chapter) => {
    acc.set(
      chapter.title,
      chapter.sections.map((section) => section.id)
    )
    return acc
  },
  new Map()
)

type Poe2GameInfo = {
  generated_at?: string
  steam?: {
    appid: number
    latest_version: null | {
      version: string
      title: string
      url: string
      date: number
    }
    current_players: null | { player_count: number; fetched_at: string }
    latest_news: Array<{
      gid: string
      title: string
      url: string
      date: number
      author?: string
      feedlabel?: string
    }>
  }
}

const formatCompactNumber = (value: number) => {
  try {
    return new Intl.NumberFormat(undefined, { notation: 'compact' }).format(
      value
    )
  } catch {
    return String(value)
  }
}

function App() {
  const [theme, setTheme] = useState<ThemeId>(initialPreferences.theme)
  const [contrast, setContrast] = useState(
    initialPreferences.contrast === 'high'
  )
  const [search, setSearch] = useState('')
  const [gameInfo, setGameInfo] = useState<Poe2GameInfo | null>(null)
  const [tocOpen, setTocOpen] = useState(false)
  const storedUiPrefs = loadUiPrefs()
  const initialRememberOpenPanels =
    typeof storedUiPrefs.rememberOpenPanels === 'boolean'
      ? storedUiPrefs.rememberOpenPanels
      : false
  const initialAutoCollapseCompleted =
    typeof storedUiPrefs.autoCollapseCompleted === 'boolean'
      ? storedUiPrefs.autoCollapseCompleted
      : true
  const [mode, setMode] = useState<'speedrun' | 'full'>(() =>
    storedUiPrefs.mode === 'full' || storedUiPrefs.mode === 'speedrun'
      ? storedUiPrefs.mode
      : 'speedrun'
  )
  const [completed, setCompleted] = useState<Set<string>>(() => loadCompleted())
  const [stickyHeader, setStickyHeader] = useState<boolean>(() =>
    typeof storedUiPrefs.stickyHeader === 'boolean'
      ? storedUiPrefs.stickyHeader
      : true
  )
  const [compact, setCompact] = useState<boolean>(() =>
    typeof storedUiPrefs.compact === 'boolean' ? storedUiPrefs.compact : false
  )
  const [showOptionalBadges, setShowOptionalBadges] = useState<boolean>(() =>
    typeof storedUiPrefs.showOptionalBadges === 'boolean'
      ? storedUiPrefs.showOptionalBadges
      : true
  )
  const [rememberOpenPanels, setRememberOpenPanels] = useState<boolean>(
    initialRememberOpenPanels
  )
  const [autoCollapseCompleted, setAutoCollapseCompleted] = useState<boolean>(
    initialAutoCollapseCompleted
  )
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [resetAllOpen, setResetAllOpen] = useState(false)
  const [resetUiOpen, setResetUiOpen] = useState(false)
  const [resetActTarget, setResetActTarget] = useState<string | null>(null)
  const [openChapters, setOpenChapters] = useState<string[]>(() => {
    if (!initialRememberOpenPanels) return getDefaultOpenChapters()
    const all = new Set(allChapterTitles)
    const fromStorage = Array.isArray(storedUiPrefs.openChapters)
      ? storedUiPrefs.openChapters
      : []
    const filtered = fromStorage.filter((title) => all.has(title))
    return filtered.length > 0 ? filtered : getDefaultOpenChapters()
  })
  const [openSections, setOpenSections] = useState<string[]>(() => {
    if (!initialRememberOpenPanels) return getDefaultOpenSections()
    const allSections = new Set<string>()
    normalizedChapters.forEach((chapter) =>
      chapter.sections.forEach((section) => allSections.add(section.id))
    )
    const fromStorage = Array.isArray(storedUiPrefs.openSections)
      ? storedUiPrefs.openSections
      : []
    const filtered = fromStorage.filter((id) => allSections.has(id))
    return filtered.length > 0 ? filtered : getDefaultOpenSections()
  })

  const [activeSectionId, setActiveSectionId] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    return window.location.hash.replace('#', '')
  })

  const headerRef = useRef<HTMLElement | null>(null)
  const [headerHeight, setHeaderHeight] = useState(0)

  useLayoutEffect(() => {
    const headerEl = headerRef.current
    if (!headerEl) return

    const update = () => {
      setHeaderHeight(headerEl.getBoundingClientRect().height)
    }

    update()
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(update)
    observer.observe(headerEl)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    persistCompleted(completed)
  }, [completed])

  useEffect(() => {
    const url = `${import.meta.env.BASE_URL}poe2-game-info.json`
    fetch(url)
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => {
        if (json && typeof json === 'object') {
          setGameInfo(json as Poe2GameInfo)
        }
      })
      .catch(() => {})
  }, [])

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
    const hash = window.location.hash.replace('#', '')
    if (!hash) return
    setActiveSectionId(hash)
    const sectionInfo = sectionItemMap.get(hash)
    if (sectionInfo) {
      setOpenChapters((prev) =>
        Array.from(new Set([...prev, sectionInfo.chapter]))
      )
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
      rememberOpenPanels,
      autoCollapseCompleted,
      openChapters,
      openSections,
    })
  }, [
    mode,
    stickyHeader,
    compact,
    showOptionalBadges,
    rememberOpenPanels,
    autoCollapseCompleted,
    openChapters,
    openSections,
  ])

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
                    `${upgrade.title} ${upgrade.detail ?? ''} ${(upgrade.tags ?? []).join(' ')}`
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
          .filter((section): section is NonNullable<typeof section> =>
            Boolean(section)
          )
        return { ...chapter, sections }
      })
      .filter((chapter) => chapter.sections.length > 0)

    return chapters
  }, [search, mode])

  const totals = useMemo(
    () => computeProgress(filteredChapters, completed),
    [filteredChapters, completed]
  )
  const doneCount = totals.done
  const progressPercent = totals.total
    ? Math.min(100, Math.round((doneCount / totals.total) * 100))
    : 0

  const firstUnchecked = useMemo(() => {
    for (const chapter of filteredChapters) {
      for (const section of chapter.sections) {
        const visibleItems = section.checklist.filter((item) => !item.impliedBy)
        for (const item of visibleItems) {
          if (!completed.has(item.id))
            return {
              itemId: item.id,
              sectionId: section.id,
              chapter: chapter.title,
            }
        }
      }
    }
    return undefined
  }, [filteredChapters, completed])

  const visibleChecklistIdsBySection = useMemo(() => {
    const allowed = modeFilters[mode]
    const map = new Map<string, string[]>()

    normalizedChapters.forEach((chapter) => {
      chapter.sections.forEach((section) => {
        const ids = section.checklist
          .filter((item) => !item.impliedBy && allowed.has(item.classification))
          .map((item) => item.id)
        map.set(section.id, ids)
      })
    })

    return map
  }, [mode])

  const lastToggledSectionIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!autoCollapseCompleted) return
    const sectionId = lastToggledSectionIdRef.current
    if (!sectionId) return
    lastToggledSectionIdRef.current = null

    const ids = visibleChecklistIdsBySection.get(sectionId) ?? []
    if (ids.length === 0) return

    if (ids.every((id) => completed.has(id))) {
      setOpenSections((prev) => prev.filter((id) => id !== sectionId))
    }
  }, [completed, autoCollapseCompleted, visibleChecklistIdsBySection])

  const toggleItem = (item: NormalizedChecklistItem) => {
    const sectionId = item.id.split('__')[0]
    lastToggledSectionIdRef.current = sectionId || null

    setCompleted((prev) => {
      const next = new Set(prev)
      const nextState = !next.has(item.id)
      const idsToSync = [
        item.id,
        ...(item.impliedRewards?.map((reward) => reward.id) ?? []),
      ]

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
    setActiveSectionId(targetSectionId)

    const hash = `#${targetSectionId}`
    if (window.location.hash !== hash) {
      window.history.replaceState(null, '', hash)
    }

    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(
        `[data-item-id="${firstUnchecked.itemId}"]`
      )
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.focus({ preventScroll: true })
      }
    })
  }

  const performResetAll = () => {
    setCompleted(new Set())
    localStorage.removeItem(storageVersion)
    toast.success('Progress reset')
  }

  const performResetUi = () => {
    clearUiPrefs()
    setSettingsOpen(false)
    setSearch('')
    setStickyHeader(true)
    setCompact(false)
    setShowOptionalBadges(true)
    setRememberOpenPanels(false)
    setAutoCollapseCompleted(true)
    setMode('speedrun')
    setOpenChapters(getDefaultOpenChapters())
    setOpenSections(getDefaultOpenSections())
    toast.success('UI settings reset')
  }

  const performResetAct = (chapterTitle: string) => {
    const idsToRemove = chapterItemIds.get(chapterTitle)
    if (!idsToRemove) return
    setCompleted((prev) => {
      const next = new Set(prev)
      idsToRemove.forEach((id) => next.delete(id))
      return next
    })
    toast.success(`${chapterTitle} reset`)
  }

  const navigateToSection = (
    sectionId: string,
    options: { behavior?: ScrollBehavior; closeToc?: boolean } = {}
  ) => {
    const info = sectionItemMap.get(sectionId)
    if (info) {
      setOpenChapters((prev) => Array.from(new Set([...prev, info.chapter])))
      setOpenSections((prev) => Array.from(new Set([...prev, sectionId])))
    }

    setActiveSectionId(sectionId)

    const hash = `#${sectionId}`
    if (window.location.hash !== hash) {
      window.history.replaceState(null, '', hash)
    }

    if (options.closeToc) {
      setTocOpen(false)
    }

    requestAnimationFrame(() => {
      const el = document.getElementById(sectionId)
      el?.scrollIntoView({
        behavior: options.behavior ?? 'smooth',
        block: 'start',
      })
    })
  }

  const handleSectionLink = (sectionId: string) => {
    navigateToSection(sectionId, { behavior: 'smooth' })

    const hash = `#${sectionId}`
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}${hash}`

    const fallback = () => toast.message('Link ready in URL')

    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => toast.success('Link copied'))
        .catch(fallback)
    } else {
      fallback()
    }
  }

  const handleChapterSectionAccordionChange = (
    chapterTitle: string,
    nextValues: string[]
  ) => {
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
    const sectionIds = filteredChapters.flatMap((chapter) =>
      chapter.sections.map((section) => section.id)
    )
    setOpenChapters(chapterTitles)
    setOpenSections(sectionIds)
  }

  const collapseAll = () => {
    setOpenSections([])
    setOpenChapters([])
  }

  const tocTopOffset = stickyHeader ? headerHeight + 16 : 16
  const sectionScrollMarginTop = stickyHeader ? headerHeight + 24 : 24

  const renderTocList = (closeOnNavigate: boolean) => (
    <nav aria-label="Table of contents" className="space-y-4">
      {filteredChapters.map((chapter) => {
        const chapterTotals = computeProgress([chapter], completed)
        return (
          <div key={chapter.title} className="space-y-1">
            <div className="flex items-center justify-between px-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {chapter.title}
              </div>
              <div className="text-xs text-muted-foreground">
                {chapterTotals.done} / {chapterTotals.total}
              </div>
            </div>
            <div className="space-y-1">
              {chapter.sections.map((section) => {
                const visibleIds =
                  visibleChecklistIdsBySection.get(section.id) ?? []
                const sectionComplete =
                  visibleIds.length > 0 &&
                  visibleIds.every((id) => completed.has(id))
                const active = section.id === activeSectionId

                return (
                  <button
                    key={section.id}
                    type="button"
                    aria-current={active ? 'location' : undefined}
                    className={cn(
                      'flex w-full items-start justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                      active
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    onClick={() =>
                      navigateToSection(section.id, {
                        closeToc: closeOnNavigate,
                      })
                    }
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {section.title}
                    </span>
                    {sectionComplete ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </nav>
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AlertDialog open={resetAllOpen} onOpenChange={setResetAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all progress?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears every checklist checkbox on this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:opacity-90"
              onClick={() => {
                performResetAll()
                setResetAllOpen(false)
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetUiOpen} onOpenChange={setResetUiOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset UI settings?</AlertDialogTitle>
            <AlertDialogDescription>
              Restores default UI preferences (mode, layout, open panels).
              Checklist progress is not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:opacity-90"
              onClick={() => {
                performResetUi()
                setResetUiOpen(false)
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={resetActTarget !== null}
        onOpenChange={(open) => {
          if (!open) setResetActTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Reset {resetActTarget ?? 'this act'} progress?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This clears checkboxes for this act only on this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:opacity-90"
              onClick={() => {
                if (resetActTarget) performResetAct(resetActTarget)
                setResetActTarget(null)
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <header
        ref={headerRef}
        className={[
          stickyHeader ? 'sticky top-0' : '',
          'z-20 border-b border-border bg-background backdrop-blur',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-[220px]">
              <div className="flex flex-wrap items-center gap-2">
                <Sheet open={tocOpen} onOpenChange={setTocOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="lg:hidden"
                      title="Table of contents"
                      aria-label="Open table of contents"
                    >
                      <PanelLeft className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="left"
                    className="flex w-[320px] flex-col p-0 sm:max-w-sm"
                  >
                    <div className="border-b border-border px-5 py-4">
                      <div className="text-sm font-semibold">
                        Table of contents
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Jump to any section.
                      </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-auto p-3">
                      {renderTocList(true)}
                    </div>
                  </SheetContent>
                </Sheet>
                <div className="text-lg font-bold leading-tight">
                  Brodfard's Campaign Quickstart Guide
                </div>
                {gameInfo?.steam?.latest_version ? (
                  <a
                    href={gameInfo.steam.latest_version.url}
                    target="_blank"
                    rel="noreferrer"
                    className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Badge variant="outline">
                      v{gameInfo.steam.latest_version.version}
                    </Badge>
                  </a>
                ) : null}
              </div>
              <div className="text-xs text-muted-foreground">
                Acts/Interludes with progress tracking
                {typeof gameInfo?.steam?.current_players?.player_count ===
                'number' ? (
                  <>
                    {' '}
                    · Steam players:{' '}
                    {formatCompactNumber(
                      gameInfo.steam.current_players.player_count
                    )}
                  </>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ToggleGroup
                size="sm"
                type="single"
                value={mode}
                onValueChange={(value) => {
                  if (value === 'speedrun' || value === 'full') setMode(value)
                }}
                aria-label="Mode selection"
              >
                <ToggleGroupItem
                  size="sm"
                  value="speedrun"
                  aria-label="Speedrun mode"
                >
                  Speedrun
                </ToggleGroupItem>
                <ToggleGroupItem size="sm" value="full" aria-label="Full mode">
                  Full
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
              <div className="relative min-w-[220px] max-w-[360px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search sections, zones, route, tips…"
                  className="h-9 pl-9"
                />
              </div>

              <Button
                variant="outline"
                size="icon"
                title="Expand all"
                aria-label="Expand all"
                onClick={expandAll}
                disabled={filteredChapters.length === 0}
              >
                <ChevronsDown className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                title="Collapse all"
                aria-label="Collapse all"
                onClick={collapseAll}
                disabled={filteredChapters.length === 0}
              >
                <ChevronsUp className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                title="Next unchecked"
                aria-label="Next unchecked"
                onClick={handleNextUnchecked}
                disabled={!firstUnchecked}
              >
                <SkipForward className="h-4 w-4" />
              </Button>

              <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Settings"
                    aria-label="Settings"
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[360px] sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle>Settings</SheetTitle>
                    <SheetDescription>
                      Appearance, layout, and reset actions.
                    </SheetDescription>
                  </SheetHeader>

                  <div className="mt-5 space-y-6 text-sm">
                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Appearance
                      </div>
                      <div className="grid gap-3">
                        <label className="grid gap-1">
                          <span className="text-xs text-muted-foreground">
                            Theme
                          </span>
                          <select
                            value={theme}
                            onChange={(event) =>
                              setTheme(event.target.value as ThemeId)
                            }
                            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                          >
                            {themeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={contrast}
                            onChange={(event) =>
                              setContrast(event.target.checked)
                            }
                            className="h-4 w-4 accent-primary"
                          />
                          <span>High contrast</span>
                        </label>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Layout
                      </div>
                      <div className="grid gap-3">
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={stickyHeader}
                            onChange={(event) =>
                              setStickyHeader(event.target.checked)
                            }
                            className="h-4 w-4 accent-primary"
                          />
                          <span>Sticky header</span>
                        </label>

                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={compact}
                            onChange={(event) =>
                              setCompact(event.target.checked)
                            }
                            className="h-4 w-4 accent-primary"
                          />
                          <span>Compact spacing</span>
                        </label>

                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={showOptionalBadges}
                            onChange={(event) =>
                              setShowOptionalBadges(event.target.checked)
                            }
                            className="h-4 w-4 accent-primary"
                          />
                          <span>Show optional badges</span>
                        </label>

                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={rememberOpenPanels}
                            onChange={(event) =>
                              setRememberOpenPanels(event.target.checked)
                            }
                            className="h-4 w-4 accent-primary"
                          />
                          <span>Remember open panels</span>
                        </label>

                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={autoCollapseCompleted}
                            onChange={(event) =>
                              setAutoCollapseCompleted(event.target.checked)
                            }
                            className="h-4 w-4 accent-primary"
                          />
                          <span>Auto-collapse completed sections</span>
                        </label>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Actions
                      </div>
                      <div className="grid gap-2">
                        <Button
                          variant="outline"
                          className="justify-start gap-2"
                          onClick={expandAll}
                          disabled={filteredChapters.length === 0}
                        >
                          <ChevronsDown className="h-4 w-4" />
                          Expand all
                        </Button>
                        <Button
                          variant="outline"
                          className="justify-start gap-2"
                          onClick={collapseAll}
                          disabled={filteredChapters.length === 0}
                        >
                          <ChevronsUp className="h-4 w-4" />
                          Collapse all
                        </Button>
                        <Button
                          variant="outline"
                          className="justify-start gap-2"
                          onClick={handleNextUnchecked}
                          disabled={!firstUnchecked}
                        >
                          <SkipForward className="h-4 w-4" />
                          Next unchecked
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Reset
                      </div>
                      <div className="grid gap-2">
                        <Button
                          variant="outline"
                          className="justify-start gap-2"
                          onClick={() => setResetUiOpen(true)}
                        >
                          <RotateCcw className="h-4 w-4" />
                          Reset UI
                        </Button>
                        <Button
                          variant="destructive"
                          className="justify-start gap-2"
                          onClick={() => setResetAllOpen(true)}
                        >
                          <RotateCcw className="h-4 w-4" />
                          Reset progress
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Progress is stored locally in your browser.
                      </div>
                    </div>

                    {gameInfo?.steam ? (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Game info (Steam)
                          </div>
                          {gameInfo.steam.latest_version ? (
                            <div className="text-xs text-muted-foreground">
                              Latest patch:{' '}
                              <a
                                href={gameInfo.steam.latest_version.url}
                                target="_blank"
                                rel="noreferrer"
                                className="underline underline-offset-2"
                              >
                                v{gameInfo.steam.latest_version.version}
                              </a>
                            </div>
                          ) : null}
                          {gameInfo.generated_at ? (
                            <div className="text-xs text-muted-foreground">
                              Updated:{' '}
                              {new Date(gameInfo.generated_at).toLocaleString()}
                            </div>
                          ) : null}
                          {gameInfo.steam.latest_news?.length ? (
                            <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                              {gameInfo.steam.latest_news
                                .slice(0, 3)
                                .map((item) => (
                                  <li key={item.gid}>
                                    <a
                                      href={item.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="underline underline-offset-2"
                                    >
                                      {item.title}
                                    </a>
                                  </li>
                                ))}
                            </ul>
                          ) : null}
                        </div>
                      </>
                    ) : null}
                  </div>
                </SheetContent>
              </Sheet>
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
          </div>
        </div>
      </header>

      <main
        className={
          compact
            ? 'mx-auto max-w-7xl px-4 py-4'
            : 'mx-auto max-w-7xl px-4 py-6'
        }
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px,minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div
              className="sticky"
              style={{
                top: tocTopOffset,
                height: `calc(100vh - ${tocTopOffset}px)`,
              }}
            >
              <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Contents
                  </div>
                  <Badge variant="outline">
                    {doneCount} / {totals.total}
                  </Badge>
                </div>
                <div className="min-h-0 flex-1 overflow-auto p-3">
                  {renderTocList(false)}
                </div>
              </div>
            </div>
          </aside>

          <div className="min-w-0">
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
                  const chapterSectionIds =
                    chapterSectionIdsMap.get(chapter.title) ?? []
                  const chapterOpenSections = openSections.filter((id) =>
                    chapterSectionIds.includes(id)
                  )

                  return (
                    <AccordionItem
                      key={chapter.title}
                      value={chapter.title}
                      className="rounded-lg border border-border bg-card shadow-sm border-b-0"
                    >
                      <AccordionTrigger className="px-4">
                        <div className="flex w-full flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="text-base font-semibold">
                              {chapter.title}
                            </div>
                            <Badge variant="primary">
                              {chapterTotals.done} / {chapterTotals.total}
                            </Badge>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              setResetActTarget(chapter.title)
                            }}
                          >
                            <RotateCcw className="h-4 w-4" />
                            Reset act
                          </Button>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4">
                        <Accordion
                          type="multiple"
                          value={chapterOpenSections}
                          onValueChange={(values) =>
                            handleChapterSectionAccordionChange(
                              chapter.title,
                              values
                            )
                          }
                          className="rounded-md border border-border"
                        >
                          {chapter.sections.map((section) => {
                            const visibleChecklistItems =
                              section.checklist.filter((item) => !item.impliedBy)
                            const sectionComplete =
                              visibleChecklistItems.length > 0 &&
                              visibleChecklistItems.every((item) =>
                                completed.has(item.id)
                              )

                            return (
                              <AccordionItem
                                key={section.id}
                                value={section.id}
                                id={section.id}
                                style={{
                                  scrollMarginTop: sectionScrollMarginTop,
                                }}
                                className="px-4"
                              >
                                <AccordionTrigger
                                  className={compact ? 'py-3' : 'py-4'}
                                  onClick={() => setActiveSectionId(section.id)}
                                >
                                  <div className="flex w-full flex-col gap-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <div className="text-sm font-semibold">
                                        {section.title}
                                      </div>
                                      {section.levelRange ? (
                                        <Badge variant="secondary">
                                          Level {section.levelRange}
                                        </Badge>
                                      ) : null}
                                      {sectionComplete ? (
                                        <Badge variant="primary">Done</Badge>
                                      ) : null}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label={`Copy link to ${section.title}`}
                                        onPointerDown={(event) =>
                                          event.stopPropagation()
                                        }
                                        onClick={(event) => {
                                          event.preventDefault()
                                          event.stopPropagation()
                                          handleSectionLink(section.id)
                                        }}
                                      >
                                        <Link2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      <span className="font-semibold text-foreground">
                                        Zones:
                                      </span>{' '}
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
                              {(section.routeSummary ||
                                section.routeSteps.length > 0) && (
                                <div className="mb-4 rounded-md border border-border bg-muted p-4">
                                  <div className="mb-2 text-sm font-semibold">
                                    Route
                                  </div>
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

                              {visibleChecklistItems.length > 0 ? (
                                <div className="rounded-md border border-border">
                                  <div className="px-4 py-3">
                                    <div className="text-sm font-semibold">
                                      Checklist
                                    </div>
                                  </div>
                                  <Separator />
                                  <div className="divide-y divide-border">
                                    {visibleChecklistItems.map((item) => {
                                      const checked = completed.has(item.id)
                                      const showOptional =
                                        item.classification === 'optional'

                                      return (
                                        <div
                                          key={item.id}
                                          data-item-id={item.id}
                                          tabIndex={-1}
                                          className={
                                            compact ? 'px-4 py-2' : 'px-4 py-3'
                                          }
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
                                                {showOptional &&
                                                showOptionalBadges ? (
                                                  <Badge variant="outline">
                                                    Optional
                                                  </Badge>
                                                ) : null}
                                              </div>
                                              {item.impliedRewards?.length ? (
                                                <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                                                  {item.impliedRewards.map(
                                                    (reward) => {
                                                      const label =
                                                        reward.text.replace(
                                                          /^Reward:\s*/i,
                                                          ''
                                                        )
                                                      return (
                                                        <div
                                                          key={reward.id}
                                                          className="pl-0.5"
                                                        >
                                                          {label}
                                                        </div>
                                                      )
                                                    }
                                                  )}
                                                </div>
                                              ) : null}
                                            </div>
                                          </label>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              ) : null}

                              {section.sectionRewards.length > 0 ? (
                                <div
                                  className={
                                    visibleChecklistItems.length > 0
                                      ? 'mt-4 rounded-md border border-border bg-muted p-4'
                                      : 'rounded-md border border-border bg-muted p-4'
                                  }
                                >
                                  <div className="mb-2 flex items-center gap-2">
                                    <Badge variant="default">
                                      Section rewards
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      (not checkboxes)
                                    </span>
                                  </div>
                                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                                    {section.sectionRewards.map(
                                      (reward, index) => (
                                        <li key={index}>{reward.text}</li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              ) : null}

                              {(section.tips.length > 0 ||
                                section.upgrades.length > 0) && (
                                <div className="mt-4">
                                  <Accordion
                                    type="multiple"
                                    defaultValue={[]}
                                    className="rounded-md border border-border"
                                  >
                                    {section.tips.length > 0 ? (
                                      <AccordionItem
                                        value={`${section.id}__tips`}
                                        className="px-4"
                                      >
                                        <AccordionTrigger>
                                          Tips
                                        </AccordionTrigger>
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
                                      <AccordionItem
                                        value={`${section.id}__upgrades`}
                                        className="px-4"
                                      >
                                        <AccordionTrigger>
                                          Upgrades
                                        </AccordionTrigger>
                                        <AccordionContent>
                                          <div className="space-y-3">
                                            {section.upgrades.map((upgrade) => (
                                              <div
                                                key={upgrade.id}
                                                className="space-y-1"
                                              >
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
                                                      <Badge
                                                        key={tag}
                                                        variant="default"
                                                      >
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
                            )
                          })}
                        </Accordion>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
