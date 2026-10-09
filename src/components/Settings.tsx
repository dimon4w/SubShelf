import { useEffect, useRef, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Share } from '@capacitor/share'
import { REMIND_OPTIONS, type Sub } from '@/lib/dates'
import { useI18n } from '@/lib/i18n'
import { isNative, notifState, requestNotifs, sendTest, type NotifState } from '@/lib/notify'
import {
  ACCENTS,
  exportJson,
  importJson,
  type Accent,
  type LangPref,
  type Settings as SettingsT,
  type ThemePref,
} from '@/lib/store'
import { cn } from '@/lib/cn'
import { ChoiceSheet, Sheet } from './Sheet'
import { FormRow, remindKey } from './SubForm'

export const ACCENT_COLORS: Record<Accent, { light: string; dark: string }> = {
  mono: { light: '#0a0a0a', dark: '#f5f5f5' },
  blue: { light: '#007aff', dark: '#0a84ff' },
  cyan: { light: '#32ade6', dark: '#64d2ff' },
  purple: { light: '#af52de', dark: '#bf5af2' },
  green: { light: '#34c759', dark: '#30d158' },
  orange: { light: '#ff9500', dark: '#ff9f0a' },
  pink: { light: '#ff2d55', dark: '#ff375f' },
}

type Picker = 'theme' | 'hour' | 'remind' | 'lang' | 'xiaomi' | null

export function Settings({
  settings,
  dark,
  subs,
  onChange,
  onImport,
  onBack,
  notify,
  confirm,
}: {
  settings: SettingsT
  dark: boolean
  subs: Sub[]
  onChange: (s: SettingsT) => void
  onImport: (subs: Sub[]) => void
  onBack: () => void
  notify: (text: string) => void
  confirm: (text: string, onYes: () => void) => void
}) {
  const i18n = useI18n()
  const { t } = i18n
  const [picker, setPicker] = useState<Picker>(null)
  const [perm, setPerm] = useState<NotifState>('unsupported')
  const fileRef = useRef<HTMLInputElement>(null)
  const set = (patch: Partial<SettingsT>) => onChange({ ...settings, ...patch })

  useEffect(() => {
    void notifState().then(setPerm)
  }, [])

  const themeLabel: Record<ThemePref, string> = {
    system: t('themeSystem'),
    light: t('themeLight'),
    dark: t('themeDark'),
  }
  const langLabel: Record<LangPref, string> = {
    system: t('langSystem'),
    ru: 'Русский',
    en: 'English',
  }

  const doExport = async () => {
    const text = exportJson(subs)
    try {
      if (isNative()) await Share.share({ title: 'SubShelf backup', text, dialogTitle: 'SubShelf' })
      else {
        await navigator.clipboard.writeText(text)
        notify(t('backupCopied'))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const doImport = async (file: File) => {
    try {
      const list = importJson(await file.text())
      confirm(t('importConfirm', { n: subs.length, m: list.length }), () => {
        onImport(list)
        notify(t('importDone', { n: list.length }))
      })
    } catch (err) {
      console.error(err)
      notify(t('importErr'))
    }
  }

  const testNotif = async () => {
    let p = perm
    if (p === 'prompt') {
      p = await requestNotifs()
      setPerm(p)
    }
    if (p === 'granted') {
      await sendTest(i18n)
      notify(t('notifTestSent'))
    } else notify(p === 'unsupported' ? t('notifWebOnly') : t('notifDenied'))
  }

  return (
    <div>
      <button type="button" className="btn btn-ghost back-btn" onClick={onBack}>
        <ChevronLeft size={22} /> <span className="t-body line">{t('profile')}</span>
      </button>
      <div className="t-title line page-title">{t('settings')}</div>

      <div className="t-cap c3 line sec-cap">{t('sAppearance')}</div>
      <div className="group">
        <FormRow
          label={t('sTheme')}
          values={[themeLabel[settings.theme]]}
          onClick={() => setPicker('theme')}
        />
        <div className="row row-plain row-stack no-press">
          <span className="t-body line">{t('sAccent')}</span>
          <div className="swatches" role="radiogroup" aria-label={t('sAccent')}>
            {ACCENTS.map((a) => (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={settings.accent === a}
                aria-label={t(`accent${a}`)}
                className={cn('swatch', settings.accent === a && 'is-on')}
                style={{
                  background:
                    a === 'mono'
                      ? 'linear-gradient(135deg,#0a0a0a 50%,#f5f5f5 50%)'
                      : ACCENT_COLORS[a][dark ? 'dark' : 'light'],
                }}
                onClick={() => set({ accent: a })}
              />
            ))}
          </div>
        </div>
        <SwitchRow
          label={t('sGlass')}
          on={settings.surface === 'glass'}
          onToggle={() => set({ surface: settings.surface === 'glass' ? 'solid' : 'glass' })}
        />
      </div>

      <div className="t-cap c3 line sec-cap">{t('sReminders')}</div>
      <div className="group">
        <FormRow
          label={t('sRemindHour')}
          values={[`${String(settings.remindHour).padStart(2, '0')}:00`]}
          onClick={() => setPicker('hour')}
        />
        <FormRow
          label={t('sDefaultRemind')}
          values={[
            t(remindKey(settings.defaultRemind)),
            t(remindKey(settings.defaultRemind, true)),
          ]}
          onClick={() => setPicker('remind')}
        />
        <button type="button" className="row row-form row-plain" onClick={() => void testNotif()}>
          <span className="t-body line grow acc">
            {perm === 'prompt' ? t('notifAllow') : t('notifTest')}
          </span>
        </button>
        <FormRow
          label={t('xiaomi')}
          values={['']}
          onClick={() => setPicker('xiaomi')}
          className="row-label-grow"
        />
      </div>

      <div className="t-cap c3 line sec-cap">{t('sIcons')}</div>
      <div className="group">
        <SwitchRow
          label={t('sAutoIcons')}
          on={settings.autoIcons}
          onToggle={() => set({ autoIcons: !settings.autoIcons })}
        />
      </div>
      <p className="t-sub c3 multi foot-note">{t('sAutoIconsHint')}</p>

      <div className="t-cap c3 line sec-cap">{t('sData')}</div>
      <div className="group">
        <FormRow
          label={t('sLang')}
          values={[langLabel[settings.lang]]}
          onClick={() => setPicker('lang')}
        />
        <FormRow
          label={t('exportCopy')}
          values={['']}
          onClick={() => void doExport()}
          className="row-label-grow"
        />
        <FormRow
          label={t('importFile')}
          values={['']}
          onClick={() => fileRef.current?.click()}
          className="row-label-grow"
        />
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json,text/plain"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void doImport(f)
        }}
      />

      <div className="t-cap c3 line center version">{t('version', { v: __APP_VERSION__ })}</div>

      <ChoiceSheet<ThemePref>
        open={picker === 'theme'}
        title={t('sTheme')}
        options={(['system', 'light', 'dark'] as ThemePref[]).map((v) => ({
          value: v,
          label: themeLabel[v],
        }))}
        value={settings.theme}
        onPick={(v) => set({ theme: v })}
        onClose={() => setPicker(null)}
      />
      <ChoiceSheet<number>
        open={picker === 'hour'}
        title={t('sRemindHour')}
        options={Array.from({ length: 16 }, (_, i) => ({
          value: i + 7,
          label: `${String(i + 7).padStart(2, '0')}:00`,
        }))}
        value={settings.remindHour}
        onPick={(v) => set({ remindHour: v })}
        onClose={() => setPicker(null)}
      />
      <ChoiceSheet
        open={picker === 'remind'}
        title={t('sDefaultRemind')}
        options={REMIND_OPTIONS.map((r) => ({ value: r, label: t(remindKey(r)) }))}
        value={settings.defaultRemind}
        onPick={(v) => set({ defaultRemind: v })}
        onClose={() => setPicker(null)}
      />
      <ChoiceSheet<LangPref>
        open={picker === 'lang'}
        title={t('sLang')}
        options={(['system', 'ru', 'en'] as LangPref[]).map((v) => ({
          value: v,
          label: langLabel[v],
        }))}
        value={settings.lang}
        onPick={(v) => set({ lang: v })}
        onClose={() => setPicker(null)}
      />
      <Sheet open={picker === 'xiaomi'} onClose={() => setPicker(null)} label={t('xiaomi')}>
        <div className="sheet-head">
          <span className="t-head line grow">{t('xiaomi')}</span>
        </div>
        <div className="sheet-body">
          <ol className="t-body multi steps">
            <li>{t('xiaomi1')}</li>
            <li>{t('xiaomi2')}</li>
            <li>{t('xiaomi3')}</li>
            <li>{t('xiaomi4')}</li>
          </ol>
        </div>
      </Sheet>
    </div>
  )
}

function SwitchRow({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="row row-form row-plain"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
    >
      <span className="t-body line grow">{label}</span>
      <span className={cn('switch none', on && 'is-on')} />
    </button>
  )
}
