import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { normalizeChapters, masterDb } from './lib/normalize'
import type { NormalizedChecklistItem } from './types/masterDb'

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

const getDefaultSectionExpansion = (mode: 'speedrun' | 'full') => {
  const entries = normalizedChapters.flatMap((chapter) =>
    chapter.sections.map((section) => [section.id, mode === 'speedrun' ? true : !isOptionalSection(section)]),
  )
  return Object.fromEntries(entries) as Record<string, boolean>
}

function App() {
  const [theme, setTheme] = useState<ThemeId>(initialPreferences.theme)
  const [contrast, setContrast] = useState(initialPreferences.contrast === 'high')
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<'speedrun' | 'full'>('speedrun')
  const [completed, setCompleted] = useState<Set<string>>(() => loadCompleted())
  const [expandedActs, setExpandedActs] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(normalizedChapters.map((chapter) => [chapter.title, true])),
  )
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() =>
    getDefaultSectionExpansion('speedrun'),
  )

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
    setExpandedSections(getDefaultSectionExpansion(mode))
  }, [mode])

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (!hash) return
    const sectionInfo = sectionItemMap.get(hash)
    if (sectionInfo) {
      setExpandedActs((prev) => ({ ...prev, [sectionInfo.chapter]: true }))
      setExpandedSections((prev) => ({ ...prev, [hash]: true }))
    }
    requestAnimationFrame(() => {
      const el = document.getElementById(hash)
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

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

    setExpandedActs((prev) => ({ ...prev, [targetChapter]: true }))
    setExpandedSections((prev) => ({ ...prev, [targetSectionId]: true }))

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
      setExpandedActs((prev) => ({ ...prev, [info.chapter]: true }))
      setExpandedSections((prev) => ({ ...prev, [sectionId]: true }))
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

  return (
    <div className="app">
      <header className="app-header">
        <div className="title-block">
          <h1>POE2 Campaign Checklist</h1>
          <p className="subtitle">Act/Interlude sections with rewards and progress tracking.</p>
        </div>
        <div className="sticky-controls">
          <div className="controls" role="region" aria-label="Checklist controls">
            <div className="search-group">
              <label htmlFor="search">Search</label>
              <input
                id="search"
                type="text"
                placeholder="Search sections or zones"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="mode-toggle">
              <span className="mode-label">Mode:</span>
              <div className="mode-buttons" role="group" aria-label="Mode selection">
                <button
                  type="button"
                  className={mode === 'speedrun' ? 'active' : ''}
                  onClick={() => setMode('speedrun')}
                >
                  Speedrun
                </button>
                <button
                  type="button"
                  className={mode === 'full' ? 'active' : ''}
                  onClick={() => setMode('full')}
                >
                  Full
                </button>
              </div>
            </div>
            <div className="theme-controls">
              <label htmlFor="theme">Theme</label>
              <select
                id="theme"
                value={theme}
                onChange={(event) => setTheme(event.target.value as ThemeId)}
              >
                {themeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <label className="contrast-toggle">
                <input
                  type="checkbox"
                  checked={contrast}
                  onChange={(event) => setContrast(event.target.checked)}
                />
                High Contrast
              </label>
            </div>
            <div className="progress-block">
              <div className="progress-label">
                Overall: {doneCount} / {totals.total}
              </div>
              <div className="progress-bar" aria-label="overall progress">
                <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
            <div className="button-row">
              <button type="button" onClick={handleNextUnchecked} disabled={!firstUnchecked}>
                Next unchecked
              </button>
              <button type="button" className="secondary" onClick={handleResetAll}>
                Reset all
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="content">
        {filteredChapters.map((chapter) => {
          const chapterTotals = computeProgress([chapter], completed)
          const actExpanded = expandedActs[chapter.title] ?? true
          return (
            <section key={chapter.title} className="chapter">
              <div className="chapter-header">
                <button
                  type="button"
                  className="collapse-toggle"
                  aria-expanded={actExpanded}
                  onClick={() =>
                    setExpandedActs((prev) => ({ ...prev, [chapter.title]: !actExpanded }))
                  }
                >
                  {actExpanded ? '▾' : '▸'}
                </button>
                <div className="chapter-title-block">
                  <h2>{chapter.title}</h2>
                  <span className="chapter-progress">
                    {chapterTotals.done} / {chapterTotals.total}
                  </span>
                </div>
                <div className="chapter-actions">
                  <button type="button" className="secondary" onClick={() => handleResetAct(chapter.title)}>
                    Reset Act
                  </button>
                </div>
              </div>
              {actExpanded &&
                chapter.sections.map((section) => {
                  const expanded = expandedSections[section.id] ?? true
                  return (
                    <article key={section.id} className="section-card" id={section.id}>
                      <div className="section-header">
                        <button
                          type="button"
                          className="collapse-toggle"
                          aria-expanded={expanded}
                          onClick={() =>
                            setExpandedSections((prev) => ({ ...prev, [section.id]: !expanded }))
                          }
                        >
                          {expanded ? '▾' : '▸'}
                        </button>
                        <div>
                          <div className="section-title-row">
                            <h3>{section.title}</h3>
                            {section.levelRange && (
                              <span className="pill">Level {section.levelRange}</span>
                            )}
                            <button
                              type="button"
                              className="link-button"
                              aria-label={`Copy link to ${section.title}`}
                              onClick={() => handleSectionLink(section.id)}
                            >
                              🔗
                            </button>
                          </div>
                          <p className="zones">
                            <strong>Zones:</strong> {section.zoneNames.join(', ')}
                          </p>
                          {section.impliedSubzones.length > 0 && (
                            <p className="subzones">
                              <strong>Implied subzones:</strong>{' '}
                              {section.impliedSubzones.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>

                      {expanded && (
                        <>
                          {(section.routeSummary || section.routeSteps.length > 0) && (
                            <details className="section-block" open>
                              <summary>Route</summary>
                              {section.routeSummary && (
                                <p className="route-summary">{section.routeSummary}</p>
                              )}
                              {section.routeSteps.length > 0 && (
                                <ul className="bullet-list">
                                  {section.routeSteps.map((step, index) => (
                                    <li key={index}>{step}</li>
                                  ))}
                                </ul>
                              )}
                            </details>
                          )}

                          <ul className="checklist">
                            {section.checklist
                              .filter((item) => !item.impliedBy)
                              .map((item) => {
                                const checked = completed.has(item.id)
                                return (
                                  <li key={item.id} data-item-id={item.id}>
                                    <label>
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleItem(item)}
                                      />
                                      <span className={checked ? 'checked' : ''}>{item.text}</span>
                                    </label>
                                    {item.impliedRewards?.length ? (
                                      <div className="reward-lines">
                                        {item.impliedRewards.map((reward) => {
                                          const label = reward.text.replace(/^Reward:\s*/i, '')
                                          return (
                                            <div key={reward.id} className="reward-line">
                                              {label}
                                            </div>
                                          )
                                        })}
                                      </div>
                                    ) : null}
                                  </li>
                                )
                              })}
                          </ul>

                          {section.sectionRewards.length > 0 && (
                            <div className="section-block section-rewards">
                              <div className="section-block-title">Section rewards</div>
                              <ul className="bullet-list">
                                {section.sectionRewards.map((reward, index) => (
                                  <li key={index}>{reward.text}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {section.tips.length > 0 && (
                            <details className="section-block" key="tips">
                              <summary>Tips</summary>
                              <ul className="bullet-list">
                                {section.tips.map((tip, index) => (
                                  <li key={index}>{tip}</li>
                                ))}
                              </ul>
                            </details>
                          )}

                          {section.upgrades.length > 0 && (
                            <details className="section-block" key="upgrades">
                              <summary>Upgrades</summary>
                              <ul className="bullet-list">
                                {section.upgrades.map((upgrade) => (
                                  <li key={upgrade.id} className="upgrade-item">
                                    <div className="upgrade-title">{upgrade.title}</div>
                                    {upgrade.detail && (
                                      <div className="upgrade-detail">{upgrade.detail}</div>
                                    )}
                                    {upgrade.tags?.length ? (
                                      <div className="upgrade-tags">
                                        {upgrade.tags.map((tag) => (
                                          <span key={tag} className="mini-pill">
                                            {tag}
                                          </span>
                                        ))}
                                      </div>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            </details>
                          )}
                        </>
                      )}
                    </article>
                  )
                })}
            </section>
          )
        })}

        {filteredChapters.length === 0 && (
          <div className="empty">No sections match your search.</div>
        )}
      </main>
    </div>
  )
}

export default App
