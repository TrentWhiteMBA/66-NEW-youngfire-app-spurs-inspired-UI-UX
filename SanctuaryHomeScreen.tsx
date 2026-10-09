import React from 'react';
import { SpursSanctuaryHero, SpursSanctuaryHeroProps } from './SpursSanctuaryHero';

export interface SanctuaryHomeScreenProps extends SpursSanctuaryHeroProps {
  onOpenPrayerModal?: () => void;
}

export const SanctuaryHomeScreen: React.FC<SanctuaryHomeScreenProps> = (props) => {
  return <SpursSanctuaryHero {...props} />;
};

export default SanctuaryHomeScreen;
