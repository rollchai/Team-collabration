import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Trophy,
  Users,
  CheckCircle2,
  TrendingUp,
  Loader2,
  ShieldAlert,
  Award,
  Sparkles,
  Clock,
  CheckSquare
} from 'lucide-react';
import { fetchTasks } from '../redux/slices/taskSlice';

const Performance = () => {
  const dispatch = useDispatch();
  const { currentWorkspace } = useSelector((state) => state.workspace);
  const { tasks, loading } = useSelector((state) => state.task);

  useEffect(() => {
    if (currentWorkspace?._id) {
      dispatch(fetchTasks(currentWorkspace._id));
    }
  }, [currentWorkspace, dispatch]);

  // Calculations
  const completedTasks = tasks.filter((t) => t.status === 'Completed');
  const totalCompleted = completedTasks.length;
  const pendingTasks = tasks.filter((t) => t.status !== 'Completed').length;

  // Group completed tasks by assignee
  const solverCounts = {};
  completedTasks.forEach((task) => {
    if (task.assignee) {
      const key = task.assignee._id || task.assignee.name || 'Unassigned';
      if (!solverCounts[key]) {
        solverCounts[key] = {
          id: key,
          name: task.assignee.name || 'Unassigned',
          avatar: task.assignee.avatar,
          email: task.assignee.email || '',
          count: 0,
        };
      }
      solverCounts[key].count += 1;
    }
  });

  const topSolvers = Object.values(solverCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topSolver = topSolvers[0] || null;
  const maxSolved = topSolvers.length > 0 ? Math.max(...topSolvers.map(s => s.count)) : 1;

  // Additional Insights
  const highPrioritySolved = completedTasks.filter((t) => t.priority === 'High').length;
  const mediumPrioritySolved = completedTasks.filter((t) => t.priority === 'Medium').length;
  const normalPrioritySolved = totalCompleted - highPrioritySolved - mediumPrioritySolved;

  // Solver Participation Rate (Members who solved at least 1 task)
  const uniqueSolversCount = Object.keys(solverCounts).length;

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 ring-1 ring-amber-500/20">
            <Trophy className="h-5.5 w-5.5 animate-pulse" />
          </div>
          <div>
            <h1 className="font-heading text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight leading-tight">
              Workspace Leaderboard
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Track team contributions, tickets resolved, and contribution statistics.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="space-y-6 flex-1 flex flex-col">
          {/* Overview Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Cards 1: Total Solved */}
            <div className="glass-card p-4 rounded-2xl flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-4xs font-extrabold uppercase tracking-wider text-slate-400">Total Solved</p>
                <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mt-0.5">{totalCompleted} issues</h4>
              </div>
            </div>

            {/* Cards 2: Top Solver */}
            <div className="glass-card p-4 rounded-2xl flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                <Award className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-4xs font-extrabold uppercase tracking-wider text-slate-400">Top Contributor</p>
                <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mt-0.5 truncate max-w-[130px]">
                  {topSolver ? topSolver.name : 'None yet'}
                </h4>
              </div>
            </div>

            {/* Cards 3: Pending Issues */}
            <div className="glass-card p-4 rounded-2xl flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-4xs font-extrabold uppercase tracking-wider text-slate-400">Pending Issues</p>
                <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mt-0.5">{pendingTasks} tickets</h4>
              </div>
            </div>

            {/* Cards 4: Participation */}
            <div className="glass-card p-4 rounded-2xl flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-4xs font-extrabold uppercase tracking-wider text-slate-400">Active Solvers</p>
                <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mt-0.5">{uniqueSolversCount} members</h4>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch flex-1">
            {/* Leaderboard Chart (Colspan 2) */}
            <div className="xl:col-span-2 glass-card p-6 rounded-2xl flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-200/40 dark:border-slate-800/60 pb-4 mb-5">
                <h3 className="font-heading font-extrabold text-sm text-slate-850 dark:text-white flex items-center gap-2">
                  <TrendingUp className="h-4.5 w-4.5 text-emerald-500" />
                  Performance Leaderboard
                </h3>
                <span className="text-4xs font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Resolved standings
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-5 pr-1 scrollbar-premium">
                {topSolvers.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center text-slate-400 py-16">
                    <div className="flex h-16 w-16 bg-slate-50 dark:bg-slate-900 rounded-full items-center justify-center text-slate-350 dark:text-slate-800 border border-slate-100 dark:border-slate-800 shadow-inner mb-4">
                      <Trophy className="h-8 w-8 text-slate-400" />
                    </div>
                    <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-200">No Contribution Data</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
                      Issues and tasks resolved in the Kanban board will appear here, charting developer velocity and top contributors.
                    </p>
                  </div>
                ) : (
                  topSolvers.map((solver, index) => {
                    const percentageOfMax = Math.round((solver.count / maxSolved) * 100);
                    const percentageOfTotal = Math.round((solver.count / totalCompleted) * 100);

                    return (
                      <div key={solver.id} className="flex items-start gap-4 p-3.5 rounded-2xl bg-white/40 dark:bg-slate-950/15 border border-slate-200/40 dark:border-slate-800/50 hover:border-emerald-500/20 transition-all duration-200 group">
                        
                        {/* Rank Badge */}
                        <div className="shrink-0 flex flex-col items-center justify-center w-8">
                          {index === 0 ? (
                            <span className="text-2xl" title="First Place Gold">🥇</span>
                          ) : index === 1 ? (
                            <span className="text-2xl" title="Second Place Silver">🥈</span>
                          ) : index === 2 ? (
                            <span className="text-2xl" title="Third Place Bronze">🥉</span>
                          ) : (
                            <span className="text-sm font-black text-slate-400 dark:text-slate-600">
                              #{index + 1}
                            </span>
                          )}
                        </div>

                        {/* Solver Avatar */}
                        <img
                          src={solver.avatar}
                          alt={solver.name}
                          className="h-10 w-10 rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-slate-900 shrink-0"
                        />

                        {/* Solver Performance Graph details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                            <div>
                              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-500 transition-colors">
                                {solver.name}
                              </h4>
                              <p className="text-4xs text-slate-450 dark:text-slate-500 font-semibold">{solver.email}</p>
                            </div>
                            <div className="text-left sm:text-right shrink-0">
                              <span className="text-xs font-black text-emerald-500 block">
                                {solver.count} resolved issue{solver.count !== 1 ? 's' : ''}
                              </span>
                              <span className="text-4xs font-bold text-slate-400">
                                {percentageOfTotal}% of total resolved
                              </span>
                            </div>
                          </div>

                          {/* Relative contribution percentage bar */}
                          <div className="w-full bg-slate-100 dark:bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-200/40 dark:border-slate-855">
                            <div
                              className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500 shadow-xs"
                              style={{ width: `${percentageOfMax}%` }}
                            ></div>
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Insights Sidebar (Colspan 1) */}
            <div className="xl:col-span-1 flex flex-col gap-6">
              
              {/* Task Breakdown Stats */}
              <div className="glass-card p-6 rounded-2xl flex flex-col">
                <h3 className="font-heading font-extrabold text-xs text-slate-800 dark:text-white uppercase tracking-wider border-b border-slate-200/40 dark:border-slate-800/60 pb-3 mb-4 flex items-center gap-2">
                  <CheckSquare className="h-4.5 w-4.5 text-emerald-500" />
                  Category Breakdown
                </h3>

                <div className="space-y-4">
                  {/* High Priority */}
                  <div className="p-3.5 rounded-xl bg-slate-50/40 dark:bg-slate-950/20 border border-slate-200/40 dark:border-slate-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
                      <span className="text-xs font-bold text-slate-750 dark:text-slate-350">High Priority</span>
                    </div>
                    <span className="px-2.5 py-0.5 text-xs font-black bg-rose-500/10 text-rose-500 border border-rose-500/15 rounded-lg">
                      {highPrioritySolved}
                    </span>
                  </div>

                  {/* Medium Priority */}
                  <div className="p-3.5 rounded-xl bg-slate-50/40 dark:bg-slate-950/20 border border-slate-200/40 dark:border-slate-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                      <span className="text-xs font-bold text-slate-750 dark:text-slate-350">Medium Priority</span>
                    </div>
                    <span className="px-2.5 py-0.5 text-xs font-black bg-amber-500/10 text-amber-500 border border-amber-500/15 rounded-lg">
                      {mediumPrioritySolved}
                    </span>
                  </div>

                  {/* Normal Priority */}
                  <div className="p-3.5 rounded-xl bg-slate-50/40 dark:bg-slate-950/20 border border-slate-200/40 dark:border-slate-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      <span className="text-xs font-bold text-slate-750 dark:text-slate-350">Normal/Low</span>
                    </div>
                    <span className="px-2.5 py-0.5 text-xs font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/15 rounded-lg">
                      {normalPrioritySolved}
                    </span>
                  </div>
                </div>
              </div>

              {/* Leaderboard Onboarding explanation */}
              <div className="glass-card p-6 rounded-2xl bg-gradient-to-br from-amber-500/5 via-teal-500/5 to-emerald-500/5 border border-emerald-500/10 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-extrabold text-emerald-600 dark:text-emerald-450 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-emerald-500 animate-spin" style={{ animationDuration: '3s' }} />
                    How to level up?
                  </h4>
                  <p className="text-3xs text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed font-medium">
                    Points and ranks are computed directly based on finished tickets. Ensure tasks are successfully dragged into the **"Completed"** column on the Kanban board to sync solver performance logs dynamically.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Performance;
