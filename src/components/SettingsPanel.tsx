import { useEffect, useState, type ReactNode } from 'react'
import { Share } from '@capacitor/share'
import { toast } from 'sonner'
import type { Sub } from '@/lib/dates'
import { useI18n } from '@/lib/i18n'
import { isNative, notifState, requestNotifs, sendTest, type NotifState } from '@/lib/notify'
import { exportJson, importJson, type LangPref, type Settings, type ThemePref } from '@/lib/store'
import { Segmented } from './Segmented'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-line pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-xs font-semibold tracking-[0.04em] text-fg-3 uppercase">{title}</h3>
      {children}
    </section>
  )
}

export function SettingsPanel({
  settings,
  onChange,
  subs,
  onImport,
}: {
  settings: Settings
  onChange: (s: Settings) => void
  subs: Sub[]
  onImport: (subs: Sub[]) => void
}) {
  const i18n = useI18n()
  const { t } = i18n
  const [perm, setPerm] = useState<NotifState>('unsupported')
  const [importText, setImportText] = useState('')

  useEffect(() => {
    void notifState().then(setPerm)
  }, [])

  const doImport = () => {
    try {
      const list = importJson(importText)
      if (!window.confirm(t('importConfirm', { n: subs.length, m: list.length }))) return
      onImport(list)
      setImportText('')
      toast(t('importDone', { n: list.length }))
    } catch (err) {
      console.error(err)
      toast.error(t('importErr'))
    }
  }

  const share = async () => {
    const text = exportJson(subs)
    try {
      if (isNative()) await Share.share({ title: 'SubShelf backup', text, dialogTitle: 'SubShelf' })
      else {
        await navigator.clipboard.writeText(text)
        toast(t('backupCopied'))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exportJson(subs))
      toast(t('backupCopied'))
    } catch (err) {
      console.error(err)
      toast.error(String(err))
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Section title={t('sAppearance')}>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-fg-2">{t('sTheme')}</span>
          <Segmented<ThemePref>
            label={t('sTheme')}
            stretch
            value={settings.theme}
            onChange={(theme) => onChange({ ...settings, theme })}
            options={[
              { value: 'system', label: t('themeSystem') },
              { value: 'light', label: t('themeLight') },
              { value: 'dark', label: t('themeDark') },
            ]}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-fg-2">{t('sLang')}</span>
          <Segmented<LangPref>
            label={t('sLang')}
            stretch
            value={settings.lang}
            onChange={(lang) => onChange({ ...settings, lang })}
            options={[
              { value: 'system', label: t('langSystem') },
              { value: 'ru', label: 'Русский' },
              { value: 'en', label: 'English' },
            ]}
          />
        </div>
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="block font-medium">{t('sGlass')}</span>
            <span className="block text-sm text-fg-3">{t('sGlassHint')}</span>
          </span>
          <input
            type="checkbox"
            className="switch"
            checked={settings.refraction}
            onChange={(e) => onChange({ ...settings, refraction: e.target.checked })}
          />
        </label>
      </Section>

      <Section title={t('sReminders')}>
        <p className="text-sm text-fg-3">{t('sRemindHint')}</p>
        <label className="flex items-center justify-between gap-4">
          <span className="font-medium">{t('sRemindHour')}</span>
          <select
            className="input tabular w-28"
            value={settings.remindHour}
            onChange={(e) => onChange({ ...settings, remindHour: Number(e.target.value) })}
          >
            {Array.from({ length: 16 }, (_, i) => i + 7).map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm font-medium">
          {perm === 'granted'
            ? t('notifGranted')
            : perm === 'denied'
              ? t('notifDenied')
              : perm === 'prompt'
                ? t('notifPrompt')
                : t('notifWebOnly')}
        </p>
        <div className="flex flex-wrap gap-2">
          {perm === 'prompt' ? (
            <button
              type="button"
              className="pill-btn"
              onClick={() => void requestNotifs().then(setPerm)}
            >
              {t('notifAllow')}
            </button>
          ) : null}
          {perm === 'granted' ? (
            <button
              type="button"
              className="pill-btn"
              onClick={() =>
                void sendTest(i18n)
                  .then(() => toast(t('notifTestSent')))
                  .catch((err: unknown) => toast.error(String(err)))
              }
            >
              {t('notifTest')}
            </button>
          ) : null}
        </div>
      </Section>

      <Section title={t('sBackup')}>
        <p className="text-sm text-fg-3">{t('dataLocal')}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="pill-btn" onClick={() => void share()}>
            {t('backupShare')}
          </button>
          <button type="button" className="pill-btn" onClick={() => void copy()}>
            {t('backupCopy')}
          </button>
        </div>
        <textarea
          className="input min-h-24 py-2.5 font-mono text-sm"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder={t('importPh')}
          spellCheck={false}
        />
        <button
          type="button"
          className="btn-primary self-start px-5"
          disabled={!importText.trim()}
          onClick={doImport}
        >
          {t('importBtn')}
        </button>
      </Section>

      <p className="tabular text-center text-xs text-fg-3">
        SubShelf · {t('version', { v: __APP_VERSION__ })}
      </p>
    </div>
  )
}
