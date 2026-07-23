import { Bell, Bot, CircleAlert, CircleCheck, CircleOff } from 'lucide-react';
import { useEffect, useState } from 'react';

const healthUrl = import.meta.env.VITE_KEEPER_HEALTH_URL ?? '';

export default function KeeperStatus({ notificationsEnabled, onEnableNotifications }) {
  const [health, setHealth] = useState({ status: healthUrl ? 'loading' : 'unconfigured' });

  useEffect(() => {
    if (!healthUrl) return undefined;
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(healthUrl, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        if (active) setHealth(payload);
      } catch (error) {
        if (active) setHealth({ status: 'offline', error: error.message });
      }
    };
    load();
    const timer = window.setInterval(load, 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const icon = health.status === 'ok'
    ? <CircleCheck size={16} />
    : ['degraded', 'loading'].includes(health.status) ? <CircleAlert size={16} /> : <CircleOff size={16} />;
  const label = health.status === 'unconfigured'
    ? 'Health URL not configured'
    : health.status === 'offline' ? 'Offline' : health.status === 'loading' ? 'Checking' : health.status;

  return (
    <div className="keeper-status">
      <div className="keeper-copy">
        <span className={`keeper-indicator status-${health.status}`}>{icon} {label}</span>
        <strong><Bot size={17} /> Permissionless automation</strong>
        <small>Anyone can execute trigger-ready orders or refund expired orders. Manual actions stay available when a keeper is offline.</small>
      </div>
      {window.Notification && (
        <button className="outline-mini-button" onClick={onEnableNotifications} disabled={notificationsEnabled}>
          <Bell size={15} /> {notificationsEnabled ? 'Notifications on' : 'Enable notifications'}
        </button>
      )}
    </div>
  );
}
