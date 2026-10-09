import React from 'react';
import { PrayerDock, PrayerDockProps } from './PrayerDock';
import { PrayerRequestModal } from './PrayerRequestModal';

export interface PrayerWallHubProps extends PrayerDockProps {
  onOpenPrayerModal?: () => void;
}

export const PrayerWallHub: React.FC<PrayerWallHubProps> = (props) => {
  return <PrayerDock {...props} />;
};

export { PrayerRequestModal };
export default PrayerWallHub;
