import { offlineNoticeText } from '../shared/offline/offline_utils';

interface OfflineResultNoticeProps {
  visible?: boolean;
  detail?: string;
}

export default function OfflineResultNotice({ visible, detail }: OfflineResultNoticeProps) {
  if (!visible) return null;
  return (
    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-200 text-xs flex flex-col gap-1">
      <span className="font-bold">{offlineNoticeText()}</span>
      {detail ? <span>{detail}</span> : null}
    </div>
  );
}
