import { useEffect, useRef, useState } from 'react';
import { backupFilename, exportBackup, importBackup, requestPersistence, resetAll, type ImportMode } from '@/db/backup';
import { useSettings } from '@/db/hooks';
import { updateSettings } from '@/db/repo';
import { IconShare, IconTrash, IconUpload } from '@/ui/icons';
import { toast } from '@/ui/Toast';

export function DataSection() {
  const settings = useSettings();
  const [persisted, setPersisted] = useState<boolean | undefined>();
  const [pending, setPending] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void requestPersistence().then(setPersisted);
  }, []);

  const doExport = async () => {
    const data = await exportBackup();
    const name = backupFilename();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const f = new File([blob], name, { type: 'application/json' });
    try {
      if (navigator.canShare?.({ files: [f] })) {
        await navigator.share({ files: [f], title: 'GoldGains backup' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
      await updateSettings({ lastBackupAt: Date.now() });
      toast('Backup ready — save it to Files or iCloud Drive');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast('Couldn’t create the backup', { tone: 'error' });
    }
  };

  const doImport = async (mode: ImportMode) => {
    if (!pending) return;
    const r = await importBackup(pending, mode);
    setPending(null);
    toast(r.ok ? `${r.message} ${r.counts?.entries ?? 0} food logs, ${r.counts?.workouts ?? 0} workouts.` : r.message, { tone: r.ok ? 'default' : 'error' });
  };

  const daysSince = settings.lastBackupAt ? Math.floor((Date.now() - settings.lastBackupAt) / 86_400_000) : undefined;

  return (
    <section className="card p-4">
      <h3 className="text-[17px] font-semibold tracking-tight">Your data</h3>
      <p className="mt-1 text-[12.5px] text-muted">
        Everything is stored on this device only. Deleting the home-screen app deletes your data, so keep a backup in Files or iCloud Drive.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
        <div className="rounded-xl bg-surface-2 px-3 py-2">
          <div className="text-muted">Last backup</div>
          <div className={`font-semibold ${daysSince === undefined || daysSince > 7 ? 'text-over' : ''}`}>
            {daysSince === undefined ? 'Never' : daysSince === 0 ? 'Today' : `${daysSince} day${daysSince > 1 ? 's' : ''} ago`}
          </div>
        </div>
        <div className="rounded-xl bg-surface-2 px-3 py-2">
          <div className="text-muted">Storage</div>
          <div className="font-semibold">{persisted ? 'Protected' : persisted === false ? 'Standard' : 'Unknown'}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="btn btn-gold" onClick={() => void doExport()}>
          <IconShare size={18} /> Back up
        </button>
        <button className="btn btn-ghost" onClick={() => file.current?.click()}>
          <IconUpload size={18} /> Restore
        </button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            if (f.size > 80 * 1024 * 1024) return toast('That file is too large', { tone: 'error' });
            setPending(await f.text());
          }}
        />
      </div>
      {pending ? (
        <div className="animate-pop-in mt-3 rounded-2xl border border-gold/30 bg-gold/5 p-3">
          <p className="text-[13px]">How should this backup be restored?</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button className="btn btn-ghost min-h-10 text-[13px]" onClick={() => void doImport('merge')}>
              Merge with this phone
            </button>
            <button className="btn btn-danger min-h-10 text-[13px]" onClick={() => void doImport('replace')}>
              Replace everything
            </button>
          </div>
          <button className="mt-2 w-full text-[12px] text-muted" onClick={() => setPending(null)}>
            Cancel
          </button>
        </div>
      ) : null}
      <div className="mt-4 border-t border-line pt-3">
        {!confirmReset ? (
          <button className="flex items-center gap-2 text-[13px] text-over" onClick={() => setConfirmReset(true)}>
            <IconTrash size={16} /> Erase all GoldGains data
          </button>
        ) : (
          <div className="animate-pop-in">
            <p className="text-[13px]">This permanently erases every log, food, workout and setting on this device.</p>
            <div className="mt-2 flex gap-2">
              <button className="btn btn-ghost min-h-10 flex-1 text-[13px]" onClick={() => setConfirmReset(false)}>
                Keep my data
              </button>
              <button
                className="btn btn-danger min-h-10 flex-1 text-[13px]"
                onClick={async () => {
                  await resetAll();
                  location.reload();
                }}
              >
                Erase everything
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
