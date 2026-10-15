import { FaCheck, FaCloud, FaCloudDownloadAlt, FaSyncAlt } from 'react-icons/fa';
import type { UnifideckCloudLook } from '../home/cloud';

/**
 * Unifideck's cloud-save glyph for a state (its CloudSaveButton's, read 2026-10-11): a cloud, the turning arrows while
 * syncing (Unifideck's own spin class), the download cloud when out of sync, a cloud with a check when in sync. Drawn by
 * Home's cloud button and by our circle on a Unifideck page, so both match Unifideck's own button.
 */
export function UnifideckCloudGlyph({ look }: { look: UnifideckCloudLook }) {
    if (look.icon === 'sync') return <FaSyncAlt className="unifideck-cloud-spin" />;
    if (look.icon === 'download') return <FaCloudDownloadAlt />;
    if (look.icon === 'insync') {
        return (
            <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaCloud />
                <FaCheck className="unifideck-cloud-badge gh-uni-badge" style={{ position: 'absolute', right: -4, bottom: -3, filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.9))' }} />
            </span>
        );
    }
    return <FaCloud />;
}
