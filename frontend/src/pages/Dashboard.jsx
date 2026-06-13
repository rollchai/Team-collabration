import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  ListTodo,
  CheckCircle,
  Clock,
  MessageSquare,
  Users,
  ChevronRight,
  Plus,
  FolderOpen,
  Download,
  Calendar,
  Globe,
  Settings,
  Activity,
  UserCheck,
  BookOpen,
  Trophy,
  BarChart3,
} from 'lucide-react';
import { fetchTasks } from '../redux/slices/taskSlice';
import { setCurrentWorkspace } from '../redux/slices/workspaceSlice';
import API from '../services/api';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.auth);
  const { workspaces, currentWorkspace, currentRole } = useSelector((state) => state.workspace);
  const { tasks, loading: tasksLoading } = useSelector((state) => state.task);
  const { channels } = useSelector((state) => state.channel);

  // Custom states for dashboard widgets
  const [members, setMembers] = useState([]);
  const [files, setFiles] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [loadingWidgets, setLoadingWidgets] = useState(false);

  useEffect(() => {
    if (currentWorkspace?._id) {
      dispatch(fetchTasks(currentWorkspace._id));
      loadDashboardWidgets();
    }
  }, [currentWorkspace, dispatch]);

  const loadDashboardWidgets = async () => {
    if (!currentWorkspace?._id) return;
    setLoadingWidgets(true);
    try {
      // 1. Fetch workspace members
      const membersRes = await API.get(`/members?workspaceId=${currentWorkspace._id}`);
      setMembers(membersRes.data.members || []);

      // 2. Fetch shared files
      const filesRes = await API.get(`/files?workspaceId=${currentWorkspace._id}`);
      setFiles(filesRes.data.files || []);
    } catch (err) {
      console.error('Error loading dashboard widgets:', err);
    } finally {
      setLoadingWidgets(false);
    }
  };

  // Fetch recent messages once channels load
  useEffect(() => {
    const generalChannel = channels.find((c) => c.isGroup && c.name.toLowerCase() === 'general') || channels[0];
    if (generalChannel?._id) {
      API.get(`/chat/messages/${generalChannel._id}`)
        .then((res) => {
          setRecentMessages(res.data.messages.slice(-4) || []);
        })
        .catch((err) => console.error('Error loading discussions preview:', err));
    } else {
      setRecentMessages([]);
    }
  }, [channels]);

  // Calculations
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'In Progress').length;
  const todoTasks = tasks.filter((t) => t.status === 'Todo').length;

  const myTasks = tasks.filter(
    (t) => t.assignee && t.assignee._id === user?._id
  );

  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const onlineMembers = members.filter((m) => m.user?.status === 'online');

  // Member Performance Leaderboard: group completed tasks by assignee
  const completedTasksCount = {};
  tasks.forEach((task) => {
    if (task.status === 'Completed' && task.assignee) {
      const key = task.assignee._id || task.assignee.name || 'Unassigned';
      if (!completedTasksCount[key]) {
        completedTasksCount[key] = {
          id: key,
          name: task.assignee.name || 'Unassigned',
          avatar: task.assignee.avatar,
          count: 0,
        };
      }
      completedTasksCount[key].count += 1;
    }
  });

  const topSolvers = Object.values(completedTasksCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const maxSolved = topSolvers.length > 0 ? Math.max(...topSolvers.map(s => s.count)) : 1;

  // Helper: Format file size
  const formatKB = (bytes) => {
    if (!bytes) return '0 KB';
    return (bytes / 1024).toFixed(1) + ' KB';
  };

  return (
    <div className="space-y-6">
      {/* Notion-Style Workspace Cover & Avatar Header */}
      <div className="rounded-3xl border border-slate-200/50 dark:border-slate-805 bg-white dark:bg-slate-900 overflow-hidden shadow-sm relative transition-all duration-300">
        {/* Cover Canvas */}
        <div className="h-32 w-full bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-emerald-600/5 dark:from-emerald-950/20 dark:to-slate-900/10 border-b border-slate-150 dark:border-slate-800/40 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
          {/* Neon Glow Spotlight */}
          <div className="absolute -left-12 -top-12 h-36 w-36 rounded-full bg-emerald-400/10 blur-2xl"></div>
          <div className="absolute right-10 -bottom-10 h-32 w-32 rounded-full bg-teal-400/10 blur-xl"></div>
        </div>

        {/* Floating Avatar & Details container */}
        <div className="px-6 pb-6 pt-12 relative">
          {/* Floating Icon Avatar */}
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white font-extrabold text-3xl shadow-xl border-4 border-white dark:border-slate-900 flex items-center justify-center absolute -top-10 left-6 z-10 select-none">
            {currentWorkspace?.name?.charAt(0).toUpperCase() || 'S'}
          </div>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white leading-none">
                  {currentWorkspace?.name}
                </h1>
                <span className="px-2 py-0.5 rounded-md text-3xs font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 tracking-wide uppercase select-none">
                  {currentRole}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Workspace URL Identifier: <span className="font-mono bg-slate-50 dark:bg-slate-950/50 px-1.5 py-0.5 rounded text-emerald-500 font-bold">{currentWorkspace?.slug}</span>
              </p>
            </div>

            {/* Overlapping member avatars stack */}
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2.5 overflow-hidden">
                {members.slice(0, 5).map((m) => (
                  <img
                    key={m._id}
                    src={m.user?.avatar}
                    alt={m.user?.name}
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover shadow-sm"
                    title={m.user?.name}
                  />
                ))}
                {members.length > 5 && (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-3xs font-bold text-slate-505 border-2 border-white dark:border-slate-900 shadow-sm">
                    +{members.length - 5}
                  </span>
                )}
              </div>
              <div className="text-left leading-tight">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-350">{members.length} member{members.length !== 1 ? 's' : ''}</p>
                <p className="text-4xs text-emerald-500 font-bold flex items-center gap-0.5 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> {onlineMembers.length} active now
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics & Progress Dashboard Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Progress Glass Card */}
        <div className="lg:col-span-2 glass-card p-6 flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="font-heading font-extrabold text-sm text-slate-850 dark:text-white flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-emerald-500" />
              Workspace Productivity Progress
            </h3>
            <p className="text-3xs text-slate-450 mt-0.5 font-medium">Calculation of completed tasks across all workspace columns.</p>
          </div>

          <div className="my-4 space-y-2.5">
            <div className="flex justify-between items-end">
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Kanban Board Tasks Completion</span>
              <span className="text-sm font-black text-emerald-500">{taskProgress}%</span>
            </div>
            {/* Glowing progress bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-200/40 dark:border-slate-850/50">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500 shadow-md shadow-emerald-500/20 pulse-glow"
                style={{ width: `${taskProgress}%` }}
              ></div>
            </div>
          </div>

          <div className="flex justify-between items-center text-3xs text-slate-400 font-bold uppercase tracking-wider">
            <span>{completedTasks} completed</span>
            <span>{todoTasks + inProgressTasks} pending</span>
          </div>
        </div>

        {/* Mini Stats Card Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card glass-card-hover p-4 flex flex-col justify-between">
            <span className="text-3xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">To Do</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-800 dark:text-white leading-none">{todoTasks}</span>
              <span className="h-2 w-2 rounded-full bg-blue-500"></span>
            </div>
          </div>

          <div className="glass-card glass-card-hover p-4 flex flex-col justify-between">
            <span className="text-3xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">In Progress</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-800 dark:text-white leading-none">{inProgressTasks}</span>
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Content Panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Left Double-Col Column: Tasks & Files Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Assigned to Me tasks feed */}
          <div className="glass-card p-6 flex flex-col h-[350px]">
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-850 pb-3.5 mb-4">
              <h3 className="font-heading font-extrabold text-sm text-slate-850 dark:text-slate-100 flex items-center gap-2">
                <ListTodo className="h-4.5 w-4.5 text-emerald-500" />
                My Assigned Tickets ({myTasks.length})
              </h3>
              <button
                onClick={() => navigate(`/workspace/${currentWorkspace?.slug}/tasks`)}
                className="text-xs font-extrabold text-emerald-500 hover:text-emerald-600 flex items-center gap-0.5 hover:underline"
              >
                Open Board <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 scrollbar-premium">
              {myTasks.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-950 mb-3 text-slate-400 dark:text-slate-800 shadow-inner">
                    <ListTodo className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-750 dark:text-slate-300">All caught up!</p>
                  <p className="text-3xs text-slate-450 dark:text-slate-500 mt-0.5">No tickets currently assigned to your profile.</p>
                </div>
              ) : (
                myTasks.map((t) => (
                  <div
                    key={t._id}
                    onClick={() => navigate(`/workspace/${currentWorkspace?.slug}/tasks`)}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200/50 dark:border-slate-850 bg-white/40 dark:bg-slate-950/20 hover:border-emerald-300 dark:hover:border-emerald-800 hover:bg-white dark:hover:bg-slate-900 transition-all cursor-pointer hover:shadow-xs"
                  >
                    <div className="truncate pr-4">
                      <h4 className="text-xs font-bold text-slate-750 dark:text-slate-250 truncate leading-snug">
                        {t.title}
                      </h4>
                      <span className="text-4xs text-slate-450 dark:text-slate-500 font-semibold mt-1.5 block">
                        Due Date: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'Unscheduled'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-4xs font-bold ${
                        t.priority === 'High' ? 'bg-red-50 text-red-500 dark:bg-red-950/20' : t.priority === 'Medium' ? 'bg-amber-50 text-amber-500 dark:bg-amber-950/20' : 'bg-slate-100 text-slate-550'
                      }`}>
                        {t.priority}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Shared Assets/Files feed */}
          <div className="glass-card p-6 flex flex-col h-[350px]">
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-850 pb-3.5 mb-4">
              <h3 className="font-heading font-extrabold text-sm text-slate-850 dark:text-slate-100 flex items-center gap-2">
                <FolderOpen className="h-4.5 w-4.5 text-emerald-500" />
                Recent Workspace Assets
              </h3>
              <button
                onClick={() => navigate(`/workspace/${currentWorkspace?.slug}/files`)}
                className="text-xs font-extrabold text-emerald-500 hover:text-emerald-600 flex items-center gap-0.5 hover:underline"
              >
                Go to Vault <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 scrollbar-premium">
              {files.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-950 mb-3 text-slate-400 dark:text-slate-800 shadow-inner">
                    <FolderOpen className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-750 dark:text-slate-300">No assets shared</p>
                  <p className="text-3xs text-slate-450 dark:text-slate-500 mt-0.5">Shared chat files and document listings will appear here.</p>
                </div>
              ) : (
                files.slice(0, 4).map((f) => (
                  <div
                    key={f._id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200/50 dark:border-slate-850 bg-white/40 dark:bg-slate-950/20"
                  >
                    <div className="truncate pr-4 flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 text-xs shadow-inner">
                        📄
                      </span>
                      <div className="truncate">
                        <h4 className="text-xs font-bold text-slate-750 dark:text-slate-250 truncate leading-snug" title={f.name}>
                          {f.name}
                        </h4>
                        <span className="text-4xs text-slate-450 dark:text-slate-500 font-semibold mt-1 block">
                          Size: {formatKB(f.size)} • By {f.uploadedBy?.name || 'User'}
                        </span>
                      </div>
                    </div>
                    <a
                      href={f.url}
                      download={f.name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-400 hover:text-emerald-500 transition-colors shadow-2xs border border-slate-200/40 dark:border-slate-800 bg-white dark:bg-slate-900"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Member Performance Leaderboard */}
          <div className="glass-card p-6 flex flex-col h-[350px]">
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-850 pb-3.5 mb-4">
              <h3 className="font-heading font-extrabold text-sm text-slate-850 dark:text-slate-100 flex items-center gap-2">
                <Trophy className="h-4.5 w-4.5 text-amber-500 animate-bounce" />
                Team Solver Leaderboard
              </h3>
              <span className="text-4xs font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Top 10 Performers
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-premium">
              {topSolvers.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-slate-400 py-10">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-950 mb-3 text-slate-400 dark:text-slate-800 shadow-inner">
                    <BarChart3 className="h-6 w-6 text-slate-405" />
                  </div>
                  <p className="text-xs font-bold text-slate-750 dark:text-slate-300">No data available</p>
                  <p className="text-3xs text-slate-455 dark:text-slate-500 mt-0.5 max-w-[280px]">Resolve issue tasks on the Kanban board to populate member performance graphs.</p>
                </div>
              ) : (
                topSolvers.map((solver, index) => {
                  const percentage = Math.max(5, Math.round((solver.count / maxSolved) * 100));
                  return (
                    <div key={solver.id} className="flex items-center gap-3">
                      {/* Rank Indicator */}
                      <span className={`w-5 text-center text-xs font-black ${
                        index === 0 ? 'text-amber-500' : index === 1 ? 'text-slate-400' : index === 2 ? 'text-amber-600' : 'text-slate-400'
                      }`}>
                        #{index + 1}
                      </span>
                      
                      {/* Solver Avatar */}
                      <img
                        src={solver.avatar}
                        alt={solver.name}
                        className="h-7 w-7 rounded-full object-cover border border-slate-100 dark:border-slate-800 shadow-2xs"
                      />
                      
                      {/* Solver Name & Bar Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center text-3xs font-extrabold text-slate-700 dark:text-slate-205 mb-1">
                          <span className="truncate">{solver.name}</span>
                          <span className="text-emerald-500 shrink-0 font-black">{solver.count} ticket{solver.count !== 1 ? 's' : ''} solved</span>
                        </div>
                        {/* Horizontal Bar Chart representation */}
                        <div className="w-full bg-slate-100 dark:bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-200/40 dark:border-slate-855">
                          <div
                            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500 shadow-sm shadow-emerald-500/10"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Single-Col Column: Quick Shortcuts, Online status & Chat Preview */}
        <div className="space-y-6">
          {/* Quick shortcuts card */}
          <div className="glass-card p-6">
            <h3 className="font-heading font-extrabold text-sm text-slate-850 dark:text-slate-100 border-b border-slate-200/50 dark:border-slate-850 pb-3 mb-4">
              Quick Navigation
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              <button
                onClick={() => navigate(`/workspace/${currentWorkspace?.slug}/chat`)}
                className="flex items-center gap-3 rounded-xl border border-slate-200/50 dark:border-slate-855 p-3 hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10 text-left transition-all cursor-pointer group hover:translate-x-0.5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-750 dark:text-slate-200 group-hover:text-emerald-500 transition-colors leading-tight">
                    Discuss in Chat
                  </h4>
                  <p className="text-4xs text-slate-450 dark:text-slate-500 font-semibold mt-0.5">Participate in workspace channel DMs</p>
                </div>
              </button>

              <button
                onClick={() => navigate(`/workspace/${currentWorkspace?.slug}/wiki`)}
                className="flex items-center gap-3 rounded-xl border border-slate-200/50 dark:border-slate-855 p-3 hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10 text-left transition-all cursor-pointer group hover:translate-x-0.5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-750 dark:text-slate-200 group-hover:text-emerald-500 transition-colors leading-tight">
                    Workspace Wiki
                  </h4>
                  <p className="text-4xs text-slate-450 dark:text-slate-500 font-semibold mt-0.5">Explore files directory and knowledge base</p>
                </div>
              </button>
            </div>
          </div>

          {/* Teammates Active / Online presence */}
          <div className="glass-card p-6 flex flex-col h-[280px]">
            <h3 className="font-heading font-extrabold text-sm text-slate-850 dark:text-slate-100 border-b border-slate-200/50 dark:border-slate-850 pb-3 mb-4 flex items-center justify-between">
              <span>Teammates Online</span>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-4xs font-extrabold text-emerald-500 pulse-glow">
                {onlineMembers.length} ACTIVE
              </span>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3 scrollbar-premium">
              {onlineMembers.length === 0 ? (
                <p className="text-center text-3xs text-slate-400 italic py-8">Everyone is offline right now.</p>
              ) : (
                onlineMembers.map((m) => (
                  <div key={m._id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850/80">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={m.user?.avatar}
                        alt={m.user?.name}
                        className="h-7 w-7 rounded-full object-cover border border-slate-100 dark:border-slate-800"
                      />
                      <div className="truncate text-3xs">
                        <h4 className="font-bold text-slate-700 dark:text-slate-200 truncate">{m.user?.name}</h4>
                        <p className="text-slate-400 truncate w-32 font-medium mt-0.5">{m.user?.email}</p>
                      </div>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent discussion previews */}
          <div className="glass-card p-6 flex flex-col h-[320px]">
            <h3 className="font-heading font-extrabold text-sm text-slate-850 dark:text-slate-100 border-b border-slate-200/50 dark:border-slate-855 pb-3 mb-4">
              Discussion Feed Preview
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3.5 scrollbar-premium pr-0.5">
              {recentMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center text-slate-400 h-full py-4">
                  <MessageSquare className="h-8 w-8 text-slate-300 dark:text-slate-800 mb-2" />
                  <p className="text-4xs font-bold">No discussions logged yet.</p>
                </div>
              ) : (
                recentMessages.map((m) => (
                  <div key={m._id} className="flex gap-2.5 items-start">
                    <img
                      src={m.sender?.avatar}
                      alt={m.sender?.name}
                      className="h-6.5 w-6.5 rounded-full object-cover border border-slate-100 dark:border-slate-800"
                    />
                    <div className="flex-1 bg-slate-50/50 dark:bg-slate-950/25 p-2 rounded-xl border border-slate-200/40 dark:border-slate-850 text-3xs leading-relaxed">
                      <div className="flex justify-between font-bold text-slate-705 dark:text-slate-350 mb-0.5">
                        <span>{m.sender?.name}</span>
                        <span className="text-4xs text-slate-400 font-semibold">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 truncate">{m.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick-Switch Other Workspaces list */}
          <div className="glass-card p-6 flex flex-col h-[240px]">
            <h3 className="font-heading font-extrabold text-sm text-slate-850 dark:text-slate-100 border-b border-slate-200/50 dark:border-slate-855 pb-3 mb-4">
              Switch Workspaces
            </h3>

            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-premium pr-0.5">
              {workspaces.filter(w => w.workspace._id !== currentWorkspace?._id).length === 0 ? (
                <p className="text-center text-3xs text-slate-400 italic py-8">No other workspaces joined.</p>
              ) : (
                workspaces
                  .filter(w => w.workspace._id !== currentWorkspace?._id)
                  .map((w) => (
                    <button
                      key={w.workspace._id}
                      onClick={() => {
                        dispatch(setCurrentWorkspace(w.workspace));
                        navigate(`/workspace/${w.workspace.slug}/dashboard`);
                      }}
                      className="flex w-full items-center justify-between p-2 rounded-xl bg-slate-50/40 hover:bg-emerald-500/5 dark:bg-slate-955/20 border border-slate-150 dark:border-slate-850/80 transition-all hover:translate-x-0.5 text-left text-3xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-200/60 dark:bg-slate-950 font-black text-emerald-500">
                          {w.workspace.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="truncate">{w.workspace.name}</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-450" />
                    </button>
                  ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
