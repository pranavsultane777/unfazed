import { Calendar as BigCalendar } from 'react-big-calendar';

export default function Calendar({ localizer, events, onSelectEvent, date, view, onNavigate, onView }) {
  return (
    <BigCalendar
      localizer={localizer}
      events={events}
      startAccessor="start"
      endAccessor="end"
      onSelectEvent={onSelectEvent}
      date={date}
      view={view}
      onNavigate={onNavigate}
      onView={onView}
      views={['month', 'week', 'day', 'agenda']}
      style={{ height: '100%' }}
    />
  );
}
