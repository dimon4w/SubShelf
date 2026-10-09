import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { List, Plus, User } from 'lucide-react'
import { App as CapApp } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { popBack, useBack } from '@/lib/back'
import { localYmd, nextCharge, type Sub } from '@/lib/dates'
import { I18nContext, makeI18n, resolveLang } from '@/lib/i18n'
import { withIconData } from '@/lib/icons'
import { ensureChannel, isNative, notifState, requestNotifs, reschedule } from '@/lib/notify'
import {
  defaultSettings,
  loadSettings,
  loadSubs,
  nextId,
  saveSettings,
  saveSubs,
  type Settings as SettingsT,
} from '@/lib/store'
import { cn } from '@/lib/cn'
import { Detail } from '@/components/Detail'
import { Home } from '@/components/Home'
import { Profile } from '@/components/Profile'
import { ACCENT_COLORS, Settings } from '@/components/Settings'
import { ConfirmDialog, Sheet, Toast, type ConfirmState, type ToastState } from '@/components/Sheet'
import { SubForm, type SubFields } from '@/components/SubForm'

type Tab = 'subs' | 'profile'

function useDark(theme: SettingsT['theme']): boolean {
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
  const [settings, setSettings] = useState<SettingsT>(defaultSettings)
  const [today, setToday] = useState(() => localYmd())
  const [tab, setTab] = useState<Tab>('subs')
  const [page, setPage] = useState<'main' | 'settings'>('main')
  const [detailId, setDetailId] = useState<number | null>(null)
  const [form, setForm] = useState<{ sub: Sub | null; restore: boolean } | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [actions, setActions] = useState<Sub | null>(null)
  const [renaming, setRenaming] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const i18n = useMemo(() => makeI18n(resolveLang(settings.lang)), [settings.lang])
  const { t } = i18n
  const dark = useDark(settings.theme)
  const online = settings.autoIcons

  // Theme, accent, status bar.
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', dark)
    root.lang = i18n.lang
    root.style.setProperty('--accent', ACCENT_COLORS[settings.accent][dark ? 'dark' : 'light'])
    root.style.setProperty(
      '--on-accent',
      settings.accent === 'mono' ? (dark ? '#000000' : '#ffffff') : '#ffffff',
    )
    if (isNative()) {
      void StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {})
      void StatusBar.setBackgroundColor({ color: dark ? '#000000' : '#f2f2f2' }).catch(() => {})
    }
  }, [dark, i18n.lang, settings.accent])

  // Initial load (migrates v1 data on first run).
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

  // Reminders follow the list, debounced so typing and quick edits do not hammer the bridge.
  useEffect(() => {
    if (!subs) return
    const tm = window.setTimeout(() => {
      void ensureChannel(i18n)
        .then(() => reschedule(subs, i18n, settings.remindHour))
        .catch((err: unknown) => console.error('SubShelf: reschedule failed', err))
    }, 500)
    return () => window.clearTimeout(tm)
  }, [subs, i18n, settings.remindHour])

  const notify = useCallback((text: string, action?: ToastState['action']) => {
    setToast({ id: Date.now(), text, action })
  }, [])
  const clearToast = useCallback(() => setToast(null), [])

  const commit = useCallback(
    (next: Sub[]) => {
      setSubs(next)
      saveSubs(next).catch((err: unknown) => {
        console.error(err)
        notify(t('saveErr'))
      })
    },
    [notify, t],
  )
  const subsRef = useRef<Sub[]>([])
  subsRef.current = subs ?? []

  const updateSettings = (s: SettingsT) => {
    setSettings(s)
    saveSettings(s).catch((err: unknown) => console.error(err))
  }

  // Android: refresh "today" on resume; the back button closes the top layer first.
  useEffect(() => {
    const resume = CapApp.addListener('resume', () => setToday(localYmd()))
    const back = CapApp.addListener('backButton', () => {
      if (!popBack()) void CapApp.exitApp()
    })
    return () => {
      void resume.then((h) => h.remove())
      void back.then((h) => h.remove())
    }
  }, [])
  useBack(tab === 'profile', () => setTab('subs'))
  useBack(tab === 'profile' && page === 'settings', () => setPage('main'))

  const items = useMemo(
    () =>
      (subs ?? [])
        .filter((s) => !s.archivedAt)
        .map((s) => ({ s, next: nextCharge(s, today) }))
        .sort((a, b) => {
          const ra = a.next?.overdue ? 0 : a.next ? 1 : 2
          const rb = b.next?.overdue ? 0 : b.next ? 1 : 2
          if (ra !== rb) return ra - rb
          if (a.next && b.next && a.next.date !== b.next.date)
            return a.next.date < b.next.date ? -1 : 1
          return a.s.name.localeCompare(b.s.name)
        }),
    [subs, today],
  )

  const detail = subs?.find((s) => s.id === detailId) ?? null

  /** Cache the icon image right after saving, so the list works offline and never refetches. */
  const cacheIcon = useCallback(
    (id: number) => {
      const s = subsRef.current.find((x) => x.id === id)
      if (!s || !online) return
      void withIconData(s.icon, online).then((icon) => {
        if (icon === s.icon || !icon.data) return
        commit(subsRef.current.map((x) => (x.id === id ? { ...x, icon } : x)))
      })
    },
    [commit, online],
  )

  const saveForm = async (fields: SubFields) => {
    if (!subs || !form) return
    let id: number
    if (!form.sub) {
      id = nextId(subs)
      commit([...subs, { ...fields, id, createdAt: Date.now(), archivedAt: null }])
      notify(t('addedToast', { name: fields.name }))
    } else {
      id = form.sub.id
      commit(
        subs.map((s) =>
          s.id === id ? { ...s, ...fields, archivedAt: form.restore ? null : s.archivedAt } : s,
        ),
      )
      notify(form.restore ? t('restoredToast', { name: fields.name }) : t('savedToast'))
      if (form.restore) {
        setTab('subs')
        setPage('main')
      }
    }
    setForm(null)
    setTimeout(() => cacheIcon(id), 50)
    if ((await notifState()) === 'prompt') await requestNotifs()
  }

  const askCancel = (sub: Sub) => {
    setDetailId(null)
    setConfirm({
      title: t('confirmCancelTitle', { name: sub.name }),
      body: t('confirmCancelBody'),
      yes: t('confirmCancelYes'),
      onYes: () => {
        const list = subsRef.current
        commit(list.map((s) => (s.id === sub.id ? { ...s, archivedAt: today } : s)))
        notify(t('movedToHistory', { name: sub.name }), {
          label: t('undo'),
          run: () =>
            commit(subsRef.current.map((s) => (s.id === sub.id ? { ...s, archivedAt: null } : s))),
        })
      },
    })
  }

  const askDelete = (sub: Sub) => {
    setDetailId(null)
    setConfirm({
      title: t('confirmDeleteTitle', { name: sub.name }),
      body: t('confirmDeleteBody'),
      yes: t('delete'),
      danger: true,
      onYes: () => commit(subsRef.current.filter((s) => s.id !== sub.id)),
    })
  }

  const openEdit = (sub: Sub) => {
    setDetailId(null)
    setTimeout(() => setForm({ sub, restore: false }), 120)
  }

  const accentOn = settings.accent !== 'mono'

  return (
    <I18nContext.Provider value={i18n}>
      <div className={cn('shell', settings.surface === 'glass' && 'glass-bar')}>
        <div ref={scrollRef} className="scroll">
          <div className="content">
            {tab === 'subs' ? (
              <Home
                items={items}
                loading={subs === null}
                today={today}
                online={online}
                accent={accentOn}
                onAdd={() => setForm({ sub: null, restore: false })}
                onOpen={(s) => setDetailId(s.id)}
                onLongPress={setActions}
              />
            ) : page === 'settings' ? (
              <Settings
                settings={settings}
                dark={dark}
                subs={subs ?? []}
                onChange={updateSettings}
                onImport={commit}
                onBack={() => setPage('main')}
                notify={notify}
                confirm={(text, onYes) =>
                  setConfirm({ title: t('importFile'), body: text, yes: t('done'), onYes })
                }
              />
            ) : (
              <Profile
                subs={subs ?? []}
                name={settings.profileName}
                online={online}
                onRename={() => setRenaming(true)}
                onRestore={(s) => setForm({ sub: s, restore: true })}
                onOpenSettings={() => setPage('settings')}
              />
            )}
          </div>
        </div>

        <nav className="tabbar" aria-label={t('subs')}>
          <div className="tabs">
            <button
              type="button"
              className={cn('tab', tab === 'subs' && 'is-on')}
              aria-current={tab === 'subs' ? 'page' : undefined}
              onClick={() => {
                if (tab === 'subs') scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
                setTab('subs')
              }}
            >
              <List size={22} strokeWidth={1.9} />
              <span className="t-cap line">{t('subs')}</span>
            </button>
            <button
              type="button"
              className={cn('tab', tab === 'profile' && 'is-on')}
              aria-current={tab === 'profile' ? 'page' : undefined}
              onClick={() => {
                setTab('profile')
                setPage('main')
              }}
            >
              <User size={22} strokeWidth={1.9} />
              <span className="t-cap line">{t('profile')}</span>
            </button>
          </div>
          <button
            type="button"
            className="fab"
            aria-label={t('add')}
            onClick={() => setForm({ sub: null, restore: false })}
          >
            <Plus size={26} strokeWidth={2} />
          </button>
        </nav>

        <Detail
          sub={detail}
          next={detail ? nextCharge(detail, today) : null}
          today={today}
          online={online}
          onClose={() => setDetailId(null)}
          onEdit={openEdit}
          onCancelSub={askCancel}
          onDelete={askDelete}
        />

        <SubForm
          open={form !== null}
          sub={form?.sub ?? null}
          restore={form?.restore ?? false}
          today={today}
          online={online}
          defaultRemind={settings.defaultRemind}
          onSave={(f) => void saveForm(f)}
          onClose={() => setForm(null)}
        />

        <Sheet open={actions !== null} onClose={() => setActions(null)} label={actions?.name ?? ''}>
          {actions ? (
            <>
              <div className="sheet-head">
                <span className="t-head line grow">{actions.name}</span>
              </div>
              <div className="sheet-body">
                <div className="group">
                  {[
                    { label: t('edit'), run: () => openEdit(actions) },
                    { label: t('actionCancel'), run: () => askCancel(actions) },
                    { label: t('delete'), run: () => askDelete(actions), danger: true },
                  ].map((a) => (
                    <button
                      key={a.label}
                      type="button"
                      className={cn('row row-form row-plain', a.danger && 'dng')}
                      onClick={() => {
                        setActions(null)
                        a.run()
                      }}
                    >
                      <span className="t-body line grow">{a.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </Sheet>

        <RenameSheet
          open={renaming}
          value={settings.profileName ?? ''}
          title={t('rename')}
          saveLabel={t('save')}
          onSave={(name) => updateSettings({ ...settings, profileName: name.trim() || null })}
          onClose={() => setRenaming(false)}
        />

        <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} noLabel={t('notNow')} />
        <Toast toast={toast} onDone={clearToast} />
      </div>
    </I18nContext.Provider>
  )
}

function RenameSheet({
  open,
  value,
  title,
  saveLabel,
  onSave,
  onClose,
}: {
  open: boolean
  value: string
  title: string
  saveLabel: string
  onSave: (v: string) => void
  onClose: () => void
}) {
  const [v, setV] = useState(value)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (open) setV(value)
  }, [open, value])
  return (
    <Sheet open={open} onClose={onClose} label={title} onOpened={() => ref.current?.focus()}>
      <div className="sheet-head">
        <span className="t-head line grow">{title}</span>
      </div>
      <div className="sheet-body">
        <input
          ref={ref}
          className="name-input wide-input"
          value={v}
          maxLength={40}
          onChange={(e) => setV(e.target.value)}
        />
      </div>
      <div className="sheet-foot">
        <button
          type="button"
          className="btn btn-primary btn-wide"
          onClick={() => {
            onSave(v)
            onClose()
          }}
        >
          {saveLabel}
        </button>
      </div>
    </Sheet>
  )
}
