import React from 'react';
import { SlidingNavDrawer, SlidingNavDrawerProps } from './SlidingNavDrawer';

export interface SanctuaryNavigationDrawerProps extends SlidingNavDrawerProps {
  onOpenPrayerModal?: () => void;
}

export const SanctuaryNavigationDrawer: React.FC<SanctuaryNavigationDrawerProps> = (props) => {
  return <SlidingNavDrawer {...props} />;
};

export default SanctuaryNavigationDrawer;
