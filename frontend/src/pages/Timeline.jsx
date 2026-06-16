import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  Loader2,
  Clock,
  AlertCircle,
  HelpCircle,
  User,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchTasks } from '../redux/slices/taskSlice';

const Timeline = () => {
  const dispatch = useDispatch();
  const { currentWorkspace } = useSelector((state) => state.workspace);
  const { tasks, loading } = useSelector((state) => state.task);

  // Focus Date: center the timeline around this date (defaults to today)
  const [focusDate, setFocusDate] = useState(new Date());

  useEffect(() => {
    if (currentWorkspace?._id) {
      dispatch(fetchTasks(currentWorkspace._id));
    }
  }, [currentWorkspace, dispatch]);

  // Construct a 30-day timeline scale: 7 days before focus date to 22 days after
  const timelineDays = [];
  const startDay = new Date(focusDate);
  startDay.setDate(startDay.getDate() - 7);

  for (let i = 0; i < 30; i++) {
    const day = new Date(startDay);
    day.setDate(day.getDate() + i);
    timelineDays.push(day);
  }

  const windowStart = timelineDays[0];
  const windowEnd = timelineDays[29];

  // Helper: check if two dates represent the same day
  const isSameDay = (d1, d2) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const today = new Date();

  // Shift focus date by days
  const shiftTimeline = (days) => {
    const nextDate = new Date(focusDate);
    nextDate.setDate(nextDate.getDate() + days);
    setFocusDate(nextDate);
  };

  // Filter tasks: scheduled vs unscheduled
  const scheduledTasks = tasks.filter((t) => t.dueDate);
  const unscheduledTasks = tasks.filter((t) => !t.dueDate);

  // Helper: map a task to its column start and span in our 30-day scale
  const getTaskGridPosition = (task) => {
    // Start date defaults to task creation date
    const taskStart = new Date(task.createdAt);
    // End date is the due date
    const taskEnd = new Date(task.dueDate);

    // Make sure start is before end
    if (taskStart > taskEnd) {
      taskStart.setTime(taskEnd.getTime() - 24 * 60 * 60 * 1000 * 2); // 2 days before
    }

    // Convert dates to timestamps at midnight to calculate day offsets
    const startMidnight = new Date(taskStart.getFullYear(), taskStart.getMonth(), taskStart.getDate());
    const endMidnight = new Date(taskEnd.getFullYear(), taskEnd.getMonth(), taskEnd.getDate());
    const winStartMidnight = new Date(windowStart.getFullYear(), windowStart.getMonth(), windowStart.getDate());

    const msPerDay = 24 * 60 * 60 * 1000;
    
    // Grid indices (0 to 29)
    let startIdx = Math.floor((startMidnight.getTime() - winStartMidnight.getTime()) / msPerDay);
    let endIdx = Math.floor((endMidnight.getTime() - winStartMidnight.getTime()) / msPerDay);

    // Filter out if task is completely outside the window
    if (endIdx < 0 || startIdx >= 30) {
      return null;
    }

    // Clamp indices to timeline window bounds
    const clampedStart = Math.max(0, startIdx);
    const clampedEnd = Math.min(29, endIdx);

    // gridColumnStart is 1-indexed, and span goes from clampedStart to clampedEnd + 1
    return {
      startCol: clampedStart + 1,
      endCol: clampedEnd + 2, // +2 for grid span inclusive bounds
      outOfBoundsStart: startIdx < 0,
      outOfBoundsEnd: endIdx >= 30,
    };
  };

  // Framer Motion Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 350, damping: 25 } }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 h-full flex flex-col"
    >
      {/* Timeline Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 ring-1 ring-emerald-500/20">
            <CalendarIcon className="h-5.5 w-5.5" />
          </div>
          <div>
            <h1 className="font-heading text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight leading-tight">
              Roadmap Timeline
            </h1>
            <p className="text-xs text-slate-505 dark:text-slate-400 mt-1">
              Gantt-style workspace mapping. Track sprints, task durations, and due dates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => shiftTimeline(-7)}
            className="rounded-xl border border-slate-205/65 dark:border-slate-800 px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-550 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900/30 cursor-pointer"
          >
            ← Prev Week
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setFocusDate(new Date())}
            className="rounded-xl border border-slate-205/65 dark:border-slate-800 px-4.5 py-2 text-xs font-bold text-slate-655 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/30 cursor-pointer"
          >
            Today
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => shiftTimeline(7)}
            className="rounded-xl border border-slate-205/65 dark:border-slate-800 px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-550 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900/30 cursor-pointer"
          >
            Next Week →
          </motion.button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-stretch flex-1">
          {/* Gantt Timeline Board (Colspan 3) */}
          <div className="xl:col-span-3 glass-card rounded-2xl flex flex-col overflow-hidden shadow-sm">
            {/* Timeline Axis Headers */}
            <div className="flex bg-slate-50/50 dark:bg-slate-955/30 border-b border-slate-200/40 dark:border-slate-800/60 select-none">
              {/* Left Title Label Block spacer */}
              <div className="w-[180px] shrink-0 p-4 font-heading font-extrabold text-3xs uppercase tracking-wider text-slate-400 dark:text-slate-500 border-r border-slate-200/40 dark:border-slate-800/60 flex items-center">
                Workspace Tasks
              </div>
              
              {/* Scrollable date grid header */}
              <div className="flex-1 overflow-x-auto scrollbar-none">
                <div className="grid grid-cols-30 min-w-[750px] h-full text-center divide-x divide-slate-200/30 dark:divide-slate-800/40 py-2">
                  {timelineDays.map((day, idx) => {
                    const isFocus = isSameDay(day, focusDate);
                    const isTodayDay = isSameDay(day, today);
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                    return (
                      <div
                        key={idx}
                        className={`flex flex-col items-center justify-center py-1 text-4xs font-bold leading-tight ${
                          isTodayDay
                            ? 'text-emerald-500 font-extrabold'
                            : isWeekend
                            ? 'text-slate-400 dark:text-slate-605 bg-slate-50/30 dark:bg-slate-950/5'
                            : 'text-slate-505 dark:text-slate-400'
                        }`}
                      >
                        <span>{day.toLocaleDateString([], { weekday: 'narrow' })}</span>
                        <span className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-lg ${
                          isTodayDay
                            ? 'bg-emerald-500 text-white font-black shadow-sm'
                            : isFocus
                            ? 'bg-slate-200/60 dark:bg-slate-800 font-black'
                            : ''
                        }`}>
                          {day.getDate()}
                        </span>
                        {day.getDate() === 1 && (
                          <span className="text-[8px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-0.5">
                            {day.toLocaleDateString([], { month: 'short' })}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Gantt Timeline Tracks List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100/50 dark:divide-slate-850/60 scrollbar-premium">
              <AnimatePresence mode="wait">
                {scheduledTasks.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center text-slate-400 py-24 text-center"
                  >
                    <div className="h-14 w-14 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-350 dark:text-slate-700 shadow-inner mb-3">
                      <CalendarIcon className="h-7 w-7" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-750 dark:text-slate-305">No Scheduled Tasks</h4>
                    <p className="text-[10px] text-slate-455 dark:text-slate-500 mt-1 max-w-[280px]">
                      To plot roadmap Gantt lines, assign a **due date** to tasks inside the Kanban workspace.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="gantt-tracks"
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                  >
                    {scheduledTasks.map((task) => {
                      const pos = getTaskGridPosition(task);
                      if (!pos) return null; // Outside currently viewed timeline window

                      const { startCol, endCol, outOfBoundsStart, outOfBoundsEnd } = pos;

                      return (
                        <motion.div 
                          variants={itemVariants}
                          key={task._id} 
                          className="flex min-h-[50px] items-stretch hover:bg-slate-50/20 dark:hover:bg-slate-900/5 transition-colors group"
                        >
                          
                          {/* Left Task description sidebar */}
                          <div className="w-[180px] shrink-0 p-3.5 border-r border-slate-205/45 dark:border-slate-800/60 flex items-center gap-2.5 min-w-0">
                            {task.assignee ? (
                              <img
                                src={task.assignee.avatar}
                                alt={task.assignee.name}
                                className="h-5.5 w-5.5 rounded-full object-cover shrink-0 border border-slate-100 dark:border-slate-800 shadow-2xs"
                                title={task.assignee.name}
                              />
                            ) : (
                              <div className="h-5.5 w-5.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center text-4xs shrink-0 border border-slate-200/50">
                                <User className="h-3 w-3" />
                              </div>
                            )}
                            <span className="text-3xs font-extrabold text-slate-700 dark:text-slate-205 truncate group-hover:text-emerald-500 transition-colors" title={task.title}>
                              {task.title}
                            </span>
                          </div>

                          {/* Right Timeline grid tracks */}
                          <div className="flex-1 min-w-[750px] relative select-none">
                            {/* Background vertical dotted grid markers */}
                            <div className="absolute inset-0 grid grid-cols-30 divide-x divide-slate-100/30 dark:divide-slate-850/20 pointer-events-none">
                              {Array.from({ length: 30 }).map((_, i) => (
                                <div key={i} className="h-full"></div>
                              ))}
                            </div>

                            {/* Draggable-Looking Gantt Bar */}
                            <div className="absolute inset-y-0 py-2.5 left-0 right-0">
                              <div className="grid grid-cols-30 h-full w-full">
                                <motion.div
                                  initial={{ scaleX: 0, originX: 0 }}
                                  animate={{ scaleX: 1 }}
                                  transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.15 }}
                                  className={`rounded-lg py-0.5 px-2.5 text-4xs font-black truncate border flex items-center justify-between shadow-2xs group-hover:shadow-xs transition-all relative ${
                                    task.status === 'Completed'
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-500/20 shadow-emerald-500/2'
                                      : task.priority === 'High'
                                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-455 border-rose-500/20 shadow-rose-500/2'
                                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-455 border-amber-500/20'
                                  }`}
                                  style={{
                                    gridColumnStart: startCol,
                                    gridColumnEnd: endCol,
                                  }}
                                  title={`${task.title} (Deadline: ${new Date(task.dueDate).toLocaleDateString()})`}
                                >
                                  {/* Left fading edge boundary if task started before window view */}
                                  {outOfBoundsStart && (
                                    <span className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-r from-transparent to-current opacity-25 rounded-l-lg"></span>
                                  )}
                                  
                                  <span className="truncate pr-1 select-none">{task.title}</span>
                                  <span className="shrink-0 text-[8px] font-bold opacity-60">
                                    {new Date(task.dueDate).toLocaleDateString([], { month: '2-digit', day: '2-digit' })}
                                  </span>

                                  {/* Right fading edge boundary if task ends after window view */}
                                  {outOfBoundsEnd && (
                                    <span className="absolute right-0 top-0 bottom-0 w-2.5 bg-gradient-to-l from-transparent to-current opacity-25 rounded-r-lg"></span>
                                  )}
                                </motion.div>
                              </div>
                            </div>

                          </div>

                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Unscheduled Tasks Drawer (Colspan 1) */}
          <div className="xl:col-span-1 glass-card p-5 rounded-2xl flex flex-col h-full overflow-hidden shadow-sm">
            <h3 className="font-heading font-extrabold text-xs text-slate-800 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-805 pb-3 mb-4 flex items-center gap-2">
              <ListTodo className="h-4.5 w-4.5 text-emerald-500" />
              Unscheduled Backlog
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-0.5 scrollbar-premium">
              {unscheduledTasks.length === 0 ? (
                <p className="text-center text-[10px] text-slate-400 italic py-8">No backlog items.</p>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-3"
                >
                  {unscheduledTasks.map((task) => (
                    <motion.div
                      variants={itemVariants}
                      key={task._id}
                      whileHover={{ y: -2 }}
                      className="p-3 rounded-xl bg-white/40 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-850/65 flex flex-col gap-2 hover:border-emerald-500/20 transition-all duration-205"
                    >
                      <h4 className="text-xs font-bold text-slate-750 dark:text-slate-200 leading-tight">
                        {task.title}
                      </h4>
                      
                      <div className="flex items-center justify-between mt-1">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wide ${
                          task.priority === 'High'
                            ? 'bg-rose-500/15 text-rose-500 border border-rose-500/20'
                            : task.priority === 'Medium'
                            ? 'bg-amber-500/15 text-amber-500 border border-amber-500/20'
                            : 'bg-slate-500/10 text-slate-400'
                        }`}>
                          {task.priority}
                        </span>
                        
                        <div className="flex items-center gap-1.5 text-4xs font-bold text-slate-450">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>Created: {new Date(task.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Timeline;
