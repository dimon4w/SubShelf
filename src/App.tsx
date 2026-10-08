import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckCheck, ListChecks, Plus, Settings2, Trash2, X } from 'lucide-react'
import { Toaster, toast } from 'sonner'
import { App as CapApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { StatusBar, Style } from '@capacitor/status-bar'
import { daysUntil, localYmd, nextCharge, type Status, type Sub } from '@/lib/dates'
import { I18nContext, makeI18n, resolveLang } from '@/lib/i18n'
import { ensureChannel, isNative, notifState, requestNotifs, reschedule } from '@/lib/notify'
import {
  defaultSettings,
  loadSettings,
  loadSubs,
  nextId,
  saveSettings,
  saveSubs,
  type Settings,
} from '@/lib/store'
import { cn } from '@/lib/cn'
import { Aurora, GlassFilter } from '@/components/Glass'
import { Segmented } from '@/components/Segmented'
import { Sheet } from '@/components/Sheet'
import { SubCard } from '@/components/SubCard'
import { SubForm, draftFrom } from '@/components/SubForm'
import { SettingsPanel } from '@/components/SettingsPanel'
import { Summary } from '@/components/Summary'

type Filter = 'all' | Status

function useDark(theme: Settings['theme']): boolean {
  const query = '(prefers-color-scheme: dark)'
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return theme === 'dark' || (theme === 'system' && systemDark)
}

export function App() {
  const [subs, setSubs] = useState<Sub[] | null>(null)
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [today, setToday] = useState(() => localYmd())
  const [filter, setFilter] = useState<Filter>('all')
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [editing, setEditing] = useState<Sub | 'new' | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const i18n = useMemo(() => makeI18n(resolveLang(settings.lang)), [settings.lang])
  const { t } = i18n
  const dark = useDark(settings.theme)

  // Theme + status bar.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.lang = i18n.lang
    if (isNative()) {
      void StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {})
      void StatusBar.setBackgroundColor({ color: dark ? '#0a0a0a' : '#f5f5f5' }).catch(() => {})
    }
  }, [dark, i18n.lang])

  // Initial load.
  useEffect(() => {
    void Promise.all([loadSubs(), loadSettings()])
      .then(([list, s]) => {
        setSettings(s)
        setSubs(list)
      })
      .catch((err: unknown) => {
        console.error(err)
        setSubs([])
      })
  }, [])

  // Keep reminders in sync with the list, settings and language.
  useEffect(() => {
    if (!subs) return
    void ensureChannel(i18n)
      .then(() => reschedule(subs, i18n, settings.remindHour))
      .catch((err: unknown) => console.error('SubShelf: reschedule failed', err))
  }, [subs, i18n, settings.remindHour])

  const commit = useCallback(
    (next: Sub[]) => {
      setSubs(next)
      saveSubs(next).catch((err: unknown) => {
        console.error(err)
        toast.error(t('saveErr'))
      })
    },
    [t],
  )

  const updateSettings = (s: Settings) => {
    setSettings(s)
    saveSettings(s).catch((err: unknown) => console.error(err))
  }

  const exitSelect = useCallback(() => {
    setSelectMode(false)
    setSelected(new Set())
  }, [])

  // Android: refresh "today" on resume, back button closes layers first.
  const layers = useRef({ editing, settingsOpen, selectMode })
  layers.current = { editing, settingsOpen, selectMode }
  useEffect(() => {
    const resume = CapApp.addListener('resume', () => setToday(localYmd()))
    const back = CapApp.addListener('backButton', () => {
      const l = layers.current
      if (l.editing) setEditing(null)
      else if (l.settingsOpen) setSettingsOpen(false)
      else if (l.selectMode) exitSelect()
      else void CapApp.exitApp()
    })
    return () => {
      void resume.then((h) => h.remove())
      void back.then((h) => h.remove())
    }
  }, [exitSelect])

  const items = useMemo(() => {
    const list = (subs ?? []).map((s) => ({ s, next: nextCharge(s, today) }))
    const rank = (i: (typeof list)[number]) => (i.s.status === 'cancelled' ? 2 : i.next ? 0 : 1)
    return list.sort((a, b) => {
      const d = rank(a) - rank(b)
      if (d) return d
      if (a.next && b.next) return a.next.date.localeCompare(b.next.date)
      return a.s.name.localeCompare(b.s.name)
    })
  }, [subs, today])

  const counts = useMemo(() => {
    const c = { all: items.length, trial: 0, active: 0, cancelled: 0 }
    for (const i of items) c[i.s.status] += 1
    return c
  }, [items])

  const visible = items.filter((i) => filter === 'all' || i.s.status === filter)

  const saveForm = async (fields: Omit<Sub, 'id' | 'createdAt' | 'cancelledAt'>) => {
    if (!subs || !editing) return
    if (editing === 'new') {
      const sub: Sub = {
        ...fields,
        id: nextId(subs),
        createdAt: Date.now(),
        cancelledAt: fields.status === 'cancelled' ? today : null,
      }
      commit([...subs, sub])
      if ((await notifState()) === 'prompt') await requestNotifs()
    } else {
      const cancelledAt =
        fields.status !== 'cancelled'
          ? null
          : editing.status === 'cancelled'
            ? editing.cancelledAt
            : today
      commit(subs.map((s) => (s.id === editing.id ? { ...s, ...fields, cancelledAt } : s)))
    }
    setEditing(null)
  }

  const removeEditing = () => {
    if (!subs || !editing || editing === 'new') return
    if (!window.confirm(t('confirmDelete', { name: editing.name }))) return
    commit(subs.filter((s) => s.id !== editing.id))
    setEditing(null)
  }

  const markCancelled = (sub: Sub) => {
    if (!subs || !window.confirm(t('confirmCancel', { name: sub.name }))) return
    commit(
      subs.map((s) => (s.id === sub.id ? { ...s, status: 'cancelled', cancelledAt: today } : s)),
    )
    toast(t('markedCancelled', { name: sub.name }))
  }

  const openCancelLink = (sub: Sub) => {
    const url =
      sub.cancelUrl ??
      `https://www.google.com/search?q=${encodeURIComponent(`how to cancel ${sub.name} subscription`)}`
    if (isNative()) void Browser.open({ url })
    else window.open(url, '_blank', 'noopener,noreferrer')
  }

  const bulk = (action: 'cancel' | 'delete') => {
    if (!subs || selected.size === 0) return
    const n = selected.size
    if (!window.confirm(t(action === 'cancel' ? 'confirmBulkCancel' : 'confirmBulkDelete', { n })))
      return
    commit(
      action === 'delete'
        ? subs.filter((s) => !selected.has(s.id))
        : subs.map((s) =>
            selected.has(s.id) && s.status !== 'cancelled'
              ? { ...s, status: 'cancelled', cancelledAt: today }
              : s,
          ),
    )
    exitSelect()
  }

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const hasSubs = (subs?.length ?? 0) > 0
  const soon = items.filter(
    (i) => i.s.status !== 'cancelled' && i.next && daysUntil(i.next.date, today) <= 3,
  )

  return (
    <I18nContext.Provider value={i18n}>
      <div className={cn('min-h-dvh', settings.refraction && 'refract')}>
        <GlassFilter />
        <Aurora />

        <header className="glass glass-bar sticky top-0 z-20 px-5 pt-[calc(14px+env(safe-area-inset-top))] pb-3">
          <div className="mx-auto flex max-w-[560px] items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold tracking-[-0.03em]">
                {selectMode ? t('selected', { n: selected.size }) : 'SubShelf'}
              </h1>
              {!selectMode ? <p className="text-sm text-fg-3">{t('tagline')}</p> : null}
            </div>
            <button
              type="button"
              className="grid size-11 shrink-0 place-items-center rounded-full text-fg-2 active:bg-hover"
              aria-label={t('settings')}
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 className="size-5" />
            </button>
          </div>
        </header>

        <main className="mx-auto flex max-w-[560px] flex-col gap-4 px-4 pt-4 pb-[calc(120px+env(safe-area-inset-bottom))]">
          {subs === null ? (
            <p className="py-10 text-center text-fg-3">{t('loading')}</p>
          ) : !hasSubs ? (
            <div className="glass mt-6 rounded-3xl px-6 py-10 text-center">
              <h2 className="text-2xl font-semibold tracking-[-0.02em]">{t('emptyTitle')}</h2>
              <p className="mx-auto mt-2 max-w-sm text-md text-fg-2">{t('emptyText')}</p>
              <button
                type="button"
                className="btn-primary mx-auto mt-6 px-6"
                onClick={() => setEditing('new')}
              >
                <Plus className="size-4" /> {t('addFirst')}
              </button>
            </div>
          ) : (
            <>
              <Summary items={items} today={today} />

              {soon.length > 0 ? (
                <div className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger ring-1 ring-danger/20 ring-inset">
                  <strong className="font-semibold">{t('soon')}</strong>{' '}
                  {soon
                    .slice(0, 4)
                    .map((i) => {
                      const d = i.next ? daysUntil(i.next.date, today) : 0
                      const when =
                        d < 0
                          ? t('whenAlready')
                          : d === 0
                            ? t('whenToday')
                            : d === 1
                              ? t('whenTomorrow')
                              : t('whenShort', { n: d })
                      return `${i.s.name} (${when})`
                    })
                    .join(', ')}
                </div>
              ) : null}

              <Segmented<Filter>
                label={t('filterLabel')}
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'all', label: t('filterAll'), count: counts.all },
                  { value: 'trial', label: t('filterTrial'), count: counts.trial },
                  { value: 'active', label: t('filterActive'), count: counts.active },
                  { value: 'cancelled', label: t('filterCancelled'), count: counts.cancelled },
                ]}
              />

              <div className="flex flex-col gap-3">
                <AnimatePresence initial={false} mode="popLayout">
                  {visible.map(({ s, next }) => (
                    <SubCard
                      key={s.id}
                      sub={s}
                      next={next}
                      today={today}
                      selectMode={selectMode}
                      selected={selected.has(s.id)}
                      onToggle={() => toggle(s.id)}
                      onEdit={() => setEditing(s)}
                      onCancelLink={() => openCancelLink(s)}
                      onMarkCancelled={() => markCancelled(s)}
                    />
                  ))}
                </AnimatePresence>
                {visible.length === 0 ? (
                  <p className="py-8 text-center text-fg-3">{t('listEmptyFilter')}</p>
                ) : null}
              </div>
            </>
          )}
        </main>

        {hasSubs ? (
          <nav className="fixed inset-x-0 bottom-[calc(16px+env(safe-area-inset-bottom))] z-30 flex justify-center px-4">
            <AnimatePresence mode="wait" initial={false}>
              {selectMode ? (
                <motion.div
                  key="select"
                  className="glass glass-dock flex items-center gap-1 rounded-full p-1.5"
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.96 }}
                >
                  <button
                    type="button"
                    className="dock-btn"
                    onClick={() =>
                      setSelected(
                        new Set(
                          visible.filter((i) => i.s.status !== 'cancelled').map((i) => i.s.id),
                        ),
                      )
                    }
                  >
                    <ListChecks /> {t('selectAll')}
                  </button>
                  <button
                    type="button"
                    className="dock-btn text-success"
                    disabled={selected.size === 0}
                    onClick={() => bulk('cancel')}
                  >
                    <CheckCheck /> {t('markCancelled')}
                  </button>
                  <button
                    type="button"
                    className="dock-btn text-danger"
                    disabled={selected.size === 0}
                    onClick={() => bulk('delete')}
                  >
                    <Trash2 />
                  </button>
                  <button
                    type="button"
                    className="dock-btn"
                    aria-label={t('done')}
                    onClick={exitSelect}
                  >
                    <X />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="main"
                  className="glass glass-dock flex items-center gap-1 rounded-full p-1.5"
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.96 }}
                >
                  <button type="button" className="dock-btn" onClick={() => setSelectMode(true)}>
                    <ListChecks /> {t('select')}
                  </button>
                  <button
                    type="button"
                    className="dock-btn dock-primary"
                    onClick={() => setEditing('new')}
                  >
                    <Plus /> {t('add')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </nav>
        ) : null}

        <Sheet
          open={editing !== null}
          onClose={() => setEditing(null)}
          title={editing === 'new' ? t('formNew') : t('formEdit')}
        >
          {editing !== null ? (
            <SubForm
              key={editing === 'new' ? 'new' : editing.id}
              initial={draftFrom(editing === 'new' ? null : editing, today)}
              today={today}
              isEdit={editing !== 'new'}
              onSave={(f) => void saveForm(f)}
              onDelete={removeEditing}
            />
          ) : null}
        </Sheet>

        <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title={t('settings')}>
          <SettingsPanel
            settings={settings}
            onChange={updateSettings}
            subs={subs ?? []}
            onImport={commit}
          />
        </Sheet>

        <Toaster
          position="top-center"
          theme={dark ? 'dark' : 'light'}
          offset={{ top: 'calc(12px + env(safe-area-inset-top))' }}
          toastOptions={{ className: 'glass-toast' }}
        />
      </div>
    </I18nContext.Provider>
  )
}
