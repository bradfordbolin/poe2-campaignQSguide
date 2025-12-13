import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { normalizeChapters, masterDb } from './lib/normalize'
import type { NormalizedChecklistItem } from './types/masterDb'

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
  const values = Array.from(completed)
  localStorage.setItem(storageVersion, JSON.stringify(values))
}

const modeFilters: Record<'speedrun' | 'full', Set<string>> = {
  speedrun: new Set(['required_progression', 'permanent_buff', 'skill_points', 'key_unlock']),
  full: new Set([
    'required_progression',
    'permanent_buff',
    'skill_points',
    'key_unlock',
    'optional_content',
    'optional_buff',
    'optional_boss',
    'farming_stop',
  ]),
}

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

function App() {
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<'speedrun' | 'full'>('speedrun')
  const [completed, setCompleted] = useState<Set<string>>(() => loadCompleted())

  useEffect(() => {
    persistCompleted(completed)
  }, [completed])

  const filteredChapters = useMemo(() => {
    const query = search.trim().toLowerCase()
    const allowedTags = modeFilters[mode]

    const filterChecklist = (items: NormalizedChecklistItem[]) =>
      items.filter((item) => item.tags.some((tag) => allowedTags.has(tag)))

    const chapters = normalizedChapters
      .map((chapter) => {
        const sections = chapter.sections
          .map((section) => {
            const haystack = [
              section.title,
              ...section.zoneNames,
              ...section.impliedSubzones,
              section.levelRange ?? '',
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
        for (const item of section.checklist) {
          if (!completed.has(item.id)) return item.id
        }
      }
    }
    return undefined
  }, [filteredChapters, completed])

  const toggleItem = (item: NormalizedChecklistItem) => {
    setCompleted((prev) => {
      const next = new Set(prev)
      if (next.has(item.id)) {
        next.delete(item.id)
      } else {
        next.add(item.id)
      }
      return next
    })
  }

  const handleNextUnchecked = () => {
    if (!firstUnchecked) return
    const el = document.querySelector<HTMLElement>(`[data-item-id="${firstUnchecked}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.focus({ preventScroll: true })
    }
  }

  const handleReset = () => {
    const confirmed = window.confirm('Reset all checklist progress?')
    if (confirmed) {
      setCompleted(new Set())
      localStorage.removeItem(storageVersion)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="title-block">
          <h1>POE2 Campaign Checklist</h1>
          <p className="subtitle">Act/Interlude sections with rewards and progress tracking.</p>
        </div>
        <div className="controls">
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
          <div className="progress-block">
            <div className="progress-label">
              Progress: {doneCount} / {totals.total}
            </div>
            <div className="progress-bar" aria-label="overall progress">
              <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
          <div className="button-row">
            <button type="button" onClick={handleNextUnchecked} disabled={!firstUnchecked}>
              Next unchecked
            </button>
            <button type="button" className="secondary" onClick={handleReset}>
              Reset progress
            </button>
          </div>
        </div>
      </header>

      <main className="content">
        {filteredChapters.map((chapter) => (
          <section key={chapter.title} className="chapter">
            <h2>{chapter.title}</h2>
            {chapter.sections.map((section) => (
              <article key={section.id} className="section-card">
                <div className="section-header">
                  <div>
                    <div className="section-title-row">
                      <h3>{section.title}</h3>
                      {section.levelRange && (
                        <span className="pill">Level {section.levelRange}</span>
                      )}
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

                <ul className="checklist">
                  {section.checklist.map((item) => {
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
                      </li>
                    )
                  })}
                </ul>
              </article>
            ))}
          </section>
        ))}

        {filteredChapters.length === 0 && (
          <div className="empty">No sections match your search.</div>
        )}
      </main>
    </div>
  )
}

export default App
