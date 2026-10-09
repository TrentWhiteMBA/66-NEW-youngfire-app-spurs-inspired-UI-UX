import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { SanctuaryScheduleView } from './SanctuaryScheduleView';

export const SanctuaryCalendarHub: React.FC<any> = (props) => {
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);

  useEffect(() => {
    const eventsRef = collection(db, 'sanctuary_calendar_events');
    const q = query(eventsRef, orderBy('date', 'asc'));

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const liveEvents = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setCalendarEvents(liveEvents);
    }, (err) => {
      console.warn("Realtime Sanctuary Calendar sync notice:", err?.message || err);
    });

    return () => unsubscribe();
  }, []);

  return <SanctuaryScheduleView {...props} liveEvents={calendarEvents} />;
};

export default SanctuaryCalendarHub;
