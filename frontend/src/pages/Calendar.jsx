import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { fetchTasks } from '../redux/slices/taskSlice';

const Calendar = () => {
  const dispatch = useDispatch();
  const { currentWorkspace } = useSelector((state) => state.workspace);
  const { tasks, loading } = useSelector((state) => state.task);

  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (currentWorkspace?._id) {
      dispatch(fetchTasks(currentWorkspace._id));
    }
  }, [currentWorkspace, dispatch]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Helper arrays
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calendar calculations
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Previous month padding days
  const prevMonthDays = new Date(year, month, 0).getDate();
  const calendarCells = [];

  // 1. Add previous month padding days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarCells.push({
      date: new Date(year, month - 1, prevMonthDays - i),
      isCurrentMonth: false,
    });
  }

  // 2. Add current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
    });
  }

  // 3. Add next month padding days to complete grid rows
  const remainingCells = 42 - calendarCells.length; // 6 rows * 7 days = 42 cells
  for (let i = 1; i <= remainingCells; i++) {
    calendarCells.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
    });
  }

  // Navigate months
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Check if a task is scheduled on a cell date
  const getTasksForDate = (date) => {
    return tasks.filter((t) => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return (
        d.getFullYear() === date.getFullYear() &&
        d.getMonth() === date.getMonth() &&
        d.getDate() === date.getDate()
      );
    });
  };

  const isToday = (date) => {
    const today = new Date();
    return (
      today.getFullYear() === date.getFullYear() &&
      today.getMonth() === date.getMonth() &&
      today.getDate() === date.getDate()
    );
  };

  // Upcoming Tasks Calculation (sorted by due date, incomplete tasks)
  const upcomingTasks = tasks
    .filter((t) => t.dueDate && t.status !== 'Completed')
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5);

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Calendar Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <CalendarIcon className="h-5.5 w-5.5" />
          </div>
          <div>
            <h1 className="font-heading text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight leading-tight">
              {monthNames[month]} {year}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Track project deadlines, scheduled releases, and sprint timelines.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrevMonth}
            className="rounded-xl border border-slate-205/65 dark:border-slate-800 p-2 hover:bg-slate-50 dark:hover:bg-slate-900/30 text-slate-500 hover:text-emerald-500 transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="rounded-xl border border-slate-205/65 dark:border-slate-800 px-4 py-2 text-xs font-bold text-slate-655 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/30 cursor-pointer transition-colors"
          >
            Today
          </button>
          <button
            onClick={handleNextMonth}
            className="rounded-xl border border-slate-205/65 dark:border-slate-800 p-2 hover:bg-slate-50 dark:hover:bg-slate-900/30 text-slate-500 hover:text-emerald-500 transition-colors cursor-pointer"
          >
            <ChevronRight className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 flex-1 items-stretch">
          
          {/* Main Month Grid (Colspan 3) */}
          <div className="xl:col-span-3 glass-card rounded-2xl overflow-hidden flex flex-col">
            {/* Days labels */}
            <div className="grid grid-cols-7 border-b border-slate-200/40 dark:border-slate-800/60 text-center bg-slate-50/40 dark:bg-slate-950/20 py-3">
              {daysOfWeek.map((day) => (
                <span key={day} className="text-3xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {day}
                </span>
              ))}
            </div>

            {/* Monthly grid */}
            <div className="grid grid-cols-7 grid-rows-6 flex-1 divide-x divide-y divide-slate-200/30 dark:divide-slate-800/50">
              {calendarCells.map((cell, idx) => {
                const dayTasks = getTasksForDate(cell.date);
                const cellIsToday = isToday(cell.date);

                return (
                  <div
                    key={idx}
                    className={`flex flex-col min-h-[85px] p-2.5 space-y-1.5 transition-all duration-150 group overflow-hidden ${
                      cell.isCurrentMonth
                        ? 'bg-transparent hover:bg-slate-50/30 dark:hover:bg-slate-900/5'
                        : 'bg-slate-50/30 dark:bg-slate-950/10 opacity-45'
                    }`}
                  >
                    {/* Day Date Label */}
                    <div className="flex items-center justify-between">
                      <span className={`text-2xs font-extrabold leading-none flex h-5.5 w-5.5 items-center justify-center rounded-xl transition-all ${
                        cellIsToday
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20'
                          : cell.isCurrentMonth
                          ? 'text-slate-750 dark:text-slate-300'
                          : 'text-slate-400'
                      }`}>
                        {cell.date.getDate()}
                      </span>
                    </div>

                    {/* Day Tasks list */}
                    <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin">
                      {dayTasks.map((task) => (
                        <div
                          key={task._id}
                          className={`px-2 py-1 rounded-lg text-4xs font-extrabold truncate border transition-all ${
                            task.status === 'Completed'
                              ? 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/15'
                              : task.priority === 'High'
                              ? 'bg-rose-500/5 text-rose-600 dark:text-rose-450 border-rose-500/15'
                              : 'bg-amber-500/5 text-amber-600 dark:text-amber-450 border-amber-500/15'
                          }`}
                          title={`${task.title} [${task.status}]`}
                        >
                          {task.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agenda Sidebar (Colspan 1) */}
          <div className="xl:col-span-1 flex flex-col gap-5">
            {/* Quick overview widget */}
            <div className="glass-card p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <ListTodo className="h-4.5 w-4.5 text-emerald-500" />
                Upcoming Deadlines
              </h3>

              {upcomingTasks.length === 0 ? (
                <div className="text-center py-6 text-slate-400 dark:text-slate-500">
                  <p className="text-xs font-bold">Clear Schedule</p>
                  <p className="text-3xs mt-0.5 leading-relaxed">No upcoming deadlines found for this workspace.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingTasks.map((task) => (
                    <div
                      key={task._id}
                      className="p-3 rounded-xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/60 flex items-start gap-3 hover:border-emerald-500/20 transition-all duration-200"
                    >
                      <div className="mt-0.5">
                        {task.priority === 'High' ? (
                          <AlertCircle className="h-4 w-4 text-rose-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-205 truncate">
                          {task.title}
                        </h4>
                        <p className="text-4xs text-slate-400 mt-1 flex items-center gap-1 font-semibold">
                          <span>Due:</span>
                          <span className="text-slate-500 dark:text-slate-400">
                            {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick tips panel */}
            <div className="glass-card p-5 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border border-emerald-500/10">
              <h4 className="text-xs font-extrabold text-emerald-600 dark:text-emerald-450">Calendar Tips</h4>
              <p className="text-3xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed font-medium">
                Deadlines added directly to Kanban tasks appear here automatically. Completed tasks are colored green, and high-priority milestones feature rose/red borders to ensure visibility.
              </p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default Calendar;

