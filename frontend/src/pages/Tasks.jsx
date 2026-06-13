import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Plus,
  Loader2,
  Calendar as CalendarIcon,
  User as UserIcon,
  MessageSquare,
  Trash2,
  AlertCircle,
  X,
  MessageCircle,
  TrendingUp,
  Trophy,
  Play,
  Check,
  ChevronRight,
  ChevronDown,
  Layers,
  BarChart2,
  CalendarRange,
} from 'lucide-react';
import {
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  addComment,
} from '../redux/slices/taskSlice';
import {
  fetchSprints,
  createSprint,
  updateSprint,
  fetchSprintReport,
} from '../redux/slices/sprintSlice';
import { socket } from '../layouts/DashboardLayout';
import API from '../services/api';
import { toast } from 'react-toastify';

// Custom SVG Line Chart Component for Burndown Chart
const BurndownChart = ({ data }) => {
  if (!data || data.length === 0) return null;

  const width = 600;
  const height = 300;
  const padding = { top: 20, right: 30, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Find max Y value (story points)
  const maxY = Math.max(
    ...data.map((d) => Math.max(d.ideal || 0, d.remaining || 0)),
    1
  );

  const pointsCount = data.length;

  // Calculate coordinates for Ideal Burn
  const idealPoints = data.map((d, index) => {
    const x = padding.left + (index / (pointsCount - 1)) * chartWidth;
    const y = padding.top + chartHeight - (d.ideal / maxY) * chartHeight;
    return { x, y };
  });

  // Calculate coordinates for Actual Burn
  const actualPoints = data
    .map((d, index) => {
      if (d.remaining === null) return null;
      const x = padding.left + (index / (pointsCount - 1)) * chartWidth;
      const y = padding.top + chartHeight - (d.remaining / maxY) * chartHeight;
      return { x, y, val: d.remaining, date: d.date, day: d.day };
    })
    .filter(Boolean);

  // Generate SVG path for Ideal Line
  const idealPath = idealPoints.reduce(
    (path, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${path} L ${pt.x} ${pt.y}`),
    ''
  );

  // Generate SVG path for Actual Line
  const actualPath = actualPoints.reduce(
    (path, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${path} L ${pt.x} ${pt.y}`),
    ''
  );

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[500px]">
        {/* Y Axis Gridlines and Labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const val = Math.round(maxY * ratio);
          const y = padding.top + chartHeight - ratio * chartHeight;
          return (
            <g key={ratio}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
                className="dark:stroke-slate-800"
                strokeDasharray="4,4"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                className="text-[10px] fill-slate-400 font-bold dark:fill-slate-500"
              >
                {val} SP
              </text>
            </g>
          );
        })}

        {/* X Axis Labels */}
        {data.map((d, index) => {
          // Show every 2nd or 3rd label depending on sprint length to prevent overlap
          if (pointsCount > 8 && index % 2 !== 0 && index !== pointsCount - 1) return null;
          const x = padding.left + (index / (pointsCount - 1)) * chartWidth;
          return (
            <g key={index}>
              <text
                x={x}
                y={height - padding.bottom + 20}
                textAnchor="middle"
                className="text-[9px] fill-slate-400 font-bold dark:fill-slate-500"
              >
                {d.day}
              </text>
            </g>
          );
        })}

        {/* Ideal Line */}
        <path
          d={idealPath}
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="2.5"
          strokeDasharray="5,5"
          className="dark:stroke-slate-700"
        />

        {/* Actual Line */}
        {actualPath && (
          <path
            d={actualPath}
            fill="none"
            stroke="#10b981"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Actual Line Dots */}
        {actualPoints.map((pt, index) => (
          <g key={index} className="group/dot">
            <circle
              cx={pt.x}
              cy={pt.y}
              r="4.5"
              fill="#10b981"
              stroke="#ffffff"
              strokeWidth="1.5"
              className="cursor-pointer dark:stroke-slate-900"
            />
            {/* Tooltip on Hover */}
            <g className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200">
              <rect
                x={pt.x - 45}
                y={pt.y - 36}
                width="90"
                height="24"
                rx="6"
                fill="#1e293b"
                className="dark:fill-slate-950"
              />
              <text
                x={pt.x}
                y={pt.y - 21}
                textAnchor="middle"
                fill="#ffffff"
                className="text-[9px] font-extrabold"
              >
                {pt.val} SP Remaining
              </text>
            </g>
          </g>
        ))}

        {/* Chart Legend */}
        <g transform={`translate(${padding.left + 20}, ${padding.top + 10})`}>
          <line x1="0" y1="0" x2="15" y2="0" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4,4" className="dark:stroke-slate-700" />
          <text x="20" y="4" className="text-[10px] fill-slate-500 font-bold dark:fill-slate-400">Ideal Burn</text>
          <line x1="100" y1="0" x2="115" y2="0" stroke="#10b981" strokeWidth="2.5" />
          <text x="120" y="4" className="text-[10px] fill-slate-500 font-bold dark:fill-slate-400">Actual Remaining</text>
        </g>
      </svg>
    </div>
  );
};

const Tasks = () => {
  const dispatch = useDispatch();

  const { currentWorkspace } = useSelector((state) => state.workspace);
  const { tasks, loading: tasksLoading } = useSelector((state) => state.task);
  const { sprints, activeSprint, selectedSprintReport, loading: sprintsLoading, reportLoading } = useSelector((state) => state.sprint);
  const { user } = useSelector((state) => state.auth);

  // Agile Sub-Tabs: 'board' (Active Board), 'backlog' (Sprint/Backlog Planner), 'reports' (Sprint Reports)
  const [activeTab, setActiveTab] = useState('board');

  // Kanban Columns
  const columns = ['Todo', 'In Progress', 'Completed'];

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [createSprintModalOpen, setCreateSprintModalOpen] = useState(false);

  // Form States (Tasks)
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskSprint, setTaskSprint] = useState('');
  const [taskStoryPoints, setTaskStoryPoints] = useState(1);

  // Form States (Sprints)
  const [sprintName, setSprintName] = useState('');
  const [sprintStart, setSprintStart] = useState('');
  const [sprintEnd, setSprintEnd] = useState('');

  // Report Filter
  const [selectedReportSprintId, setSelectedReportSprintId] = useState('');

  // Comment input
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Team members list
  const [members, setMembers] = useState([]);

  // Fetch workspaces tasks and sprints
  useEffect(() => {
    if (currentWorkspace?._id) {
      dispatch(fetchTasks(currentWorkspace._id));
      dispatch(fetchSprints(currentWorkspace._id));

      // Get workspace members
      API.get(`/members?workspaceId=${currentWorkspace._id}`)
        .then((res) => setMembers(res.data.members))
        .catch((err) => console.error(err));
    }
  }, [currentWorkspace, dispatch]);

  // Handle default tab routing or loading active report
  useEffect(() => {
    if (activeTab === 'reports') {
      if (selectedReportSprintId) {
        dispatch(fetchSprintReport(selectedReportSprintId));
      } else if (activeSprint) {
        setSelectedReportSprintId(activeSprint._id);
        dispatch(fetchSprintReport(activeSprint._id));
      } else if (sprints.length > 0) {
        setSelectedReportSprintId(sprints[0]._id);
        dispatch(fetchSprintReport(sprints[0]._id));
      }
    }
  }, [activeTab, selectedReportSprintId, activeSprint, sprints]);

  // Handle Drag Start
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  // Handle Drag Over
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Handle Drop on Kanban Column
  const handleDrop = async (e, targetStatus) => {
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;

    try {
      const resultAction = await dispatch(
        updateTask({
          id: taskId,
          updateData: { status: targetStatus },
        })
      );

      if (updateTask.fulfilled.match(resultAction)) {
        if (socket) {
          socket.emit('task_updated', resultAction.payload.task);
        }
      }
    } catch (err) {
      toast.error('Failed to update task status');
    }
  };

  // Create Task Submit
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const taskData = {
      title: taskTitle,
      description: taskDesc,
      workspaceId: currentWorkspace._id,
      priority: taskPriority,
      storyPoints: Number(taskStoryPoints),
    };

    if (taskAssignee) taskData.assigneeId = taskAssignee;
    if (taskDueDate) taskData.dueDate = taskDueDate;
    if (taskSprint) taskData.sprintId = taskSprint;

    try {
      const resultAction = await dispatch(createTask(taskData));
      if (createTask.fulfilled.match(resultAction)) {
        toast.success('Task created successfully!');
        setTaskTitle('');
        setTaskDesc('');
        setTaskAssignee('');
        setTaskPriority('Medium');
        setTaskDueDate('');
        setTaskSprint('');
        setTaskStoryPoints(1);
        setCreateModalOpen(false);

        if (socket) {
          socket.emit('task_updated', resultAction.payload.task);
        }
      } else {
        toast.error(resultAction.payload || 'Failed to create task');
      }
    } catch (err) {
      toast.error('Error creating task');
    }
  };

  // View Task Details Modal
  const openDetailsModal = (task) => {
    setSelectedTask(task);
    setDetailsModalOpen(true);
  };

  // Add Comment on Task Details
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedTask) return;

    setSubmittingComment(true);
    try {
      const resultAction = await dispatch(
        addComment({
          taskId: selectedTask._id,
          text: newCommentText,
        })
      );
      if (addComment.fulfilled.match(resultAction)) {
        setSelectedTask(resultAction.payload.task); // Update modal details
        setNewCommentText('');
        if (socket) {
          socket.emit('task_updated', resultAction.payload.task);
        }
      } else {
        toast.error(resultAction.payload || 'Failed to post comment');
      }
    } catch (err) {
      toast.error('Error adding comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      const resultAction = await dispatch(deleteTask(taskId));
      if (deleteTask.fulfilled.match(resultAction)) {
        toast.success('Task deleted');
        setDetailsModalOpen(false);
        if (socket) {
          socket.emit('task_updated', { _id: taskId, deleted: true });
        }
      } else {
        toast.error(resultAction.payload || 'Failed to delete task');
      }
    } catch (err) {
      toast.error('Error deleting task');
    }
  };

  // Update Sprint of a Task (Agile Board planning action)
  const handleMoveTaskSprint = async (taskId, targetSprintId) => {
    try {
      const resultAction = await dispatch(
        updateTask({
          id: taskId,
          updateData: { sprintId: targetSprintId || null },
        })
      );
      if (updateTask.fulfilled.match(resultAction)) {
        toast.success('Task moved successfully');
        if (socket) {
          socket.emit('task_updated', resultAction.payload.task);
        }
      }
    } catch (err) {
      toast.error('Failed to move task');
    }
  };

  // Update story points of a task directly in the Backlog view
  const handleUpdateStoryPoints = async (taskId, points) => {
    try {
      const resultAction = await dispatch(
        updateTask({
          id: taskId,
          updateData: { storyPoints: Number(points) },
        })
      );
      if (updateTask.fulfilled.match(resultAction)) {
        if (socket) {
          socket.emit('task_updated', resultAction.payload.task);
        }
      }
    } catch (err) {
      toast.error('Failed to update story points');
    }
  };

  // Create Sprint Submit
  const handleCreateSprintSubmit = async (e) => {
    e.preventDefault();
    if (!sprintName.trim() || !sprintStart || !sprintEnd) return;

    try {
      const resultAction = await dispatch(
        createSprint({
          name: sprintName,
          workspaceId: currentWorkspace._id,
          startDate: sprintStart,
          endDate: sprintEnd,
        })
      );

      if (createSprint.fulfilled.match(resultAction)) {
        toast.success('Sprint created!');
        setSprintName('');
        setSprintStart('');
        setSprintEnd('');
        setCreateSprintModalOpen(false);
      } else {
        toast.error(resultAction.payload || 'Failed to create sprint');
      }
    } catch (err) {
      toast.error('Error creating sprint');
    }
  };

  // Start Sprint (Planned -> Active)
  const handleStartSprint = async (sprintId) => {
    try {
      const resultAction = await dispatch(
        updateSprint({
          id: sprintId,
          status: 'Active',
        })
      );
      if (updateSprint.fulfilled.match(resultAction)) {
        toast.success('Sprint started successfully!');
      } else {
        toast.error(resultAction.payload || 'Failed to start sprint');
      }
    } catch (err) {
      toast.error('Error starting sprint');
    }
  };

  // Complete Sprint (Active -> Completed)
  const handleCompleteSprint = async (sprintId) => {
    try {
      const resultAction = await dispatch(
        updateSprint({
          id: sprintId,
          status: 'Completed',
        })
      );
      if (updateSprint.fulfilled.match(resultAction)) {
        toast.success('Sprint completed successfully!');
        // Refresh tasks as unfinished ones return to Backlog
        dispatch(fetchTasks(currentWorkspace._id));
      } else {
        toast.error(resultAction.payload || 'Failed to complete sprint');
      }
    } catch (err) {
      toast.error('Error completing sprint');
    }
  };

  // Update selected task in real-time when store updates
  useEffect(() => {
    if (selectedTask) {
      const updated = tasks.find((t) => t._id === selectedTask._id);
      if (updated) setSelectedTask(updated);
    }
  }, [tasks, selectedTask]);

  // Filter tasks to show ONLY active sprint tasks on the Active Board tab
  const activeSprintTasks = activeSprint
    ? tasks.filter((t) => t.sprint?._id === activeSprint._id)
    : [];

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-4">
        <div>
          <h1 className="font-heading text-xl md:text-2xl font-bold text-slate-800 dark:text-white leading-tight">
            Sprint Board & Backlog
          </h1>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">
            Manage Agile sprint cycles, story point backlogs, and team burndown metrics.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setCreateSprintModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors shadow-sm cursor-pointer"
          >
            <CalendarRange className="h-4.5 w-4.5 text-emerald-500" /> Create Sprint
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 px-4.5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/15 cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
          >
            <Plus className="h-4.5 w-4.5" /> Create Task
          </button>
        </div>
      </div>

      {/* Agile Tabs */}
      <div className="flex items-center border-b border-slate-200/60 dark:border-slate-850 pb-px">
        <button
          onClick={() => setActiveTab('board')}
          className={`px-4 py-2.5 text-xs font-extrabold tracking-wide border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'board'
              ? 'border-emerald-500 text-emerald-500'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600'
          }`}
        >
          <Layers className="h-4 w-4" /> Active Sprint Board
        </button>
        <button
          onClick={() => setActiveTab('backlog')}
          className={`px-4 py-2.5 text-xs font-extrabold tracking-wide border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'backlog'
              ? 'border-emerald-500 text-emerald-500'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600'
          }`}
        >
          <BarChart2 className="h-4 w-4" /> Backlog Planner
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2.5 text-xs font-extrabold tracking-wide border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'reports'
              ? 'border-emerald-500 text-emerald-500'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600'
          }`}
        >
          <TrendingUp className="h-4 w-4" /> Sprint Reports
        </button>
      </div>

      {/* RENDER ACTIVE TAB */}
      {tasksLoading || sprintsLoading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : activeTab === 'board' ? (
        /* TAB 1: ACTIVE KANBAN BOARD */
        !activeSprint ? (
          <div className="flex flex-col items-center justify-center text-center p-12 rounded-3xl bg-slate-50/50 dark:bg-slate-900/10 border border-slate-200/40 dark:border-slate-850/50 border-dashed py-24">
            <Layers className="h-12 w-12 text-slate-350 dark:text-slate-600 mb-4 animate-bounce" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Active Sprint</h3>
            <p className="text-xs text-slate-450 dark:text-slate-500 max-w-sm mt-1.5 leading-relaxed">
              There is currently no active sprint running. Go to the **Backlog Planner** tab to structure your sprints and start one.
            </p>
            <button
              onClick={() => setActiveTab('backlog')}
              className="mt-5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 text-xs font-bold transition-all shadow-2xs"
            >
              Go to Backlog Planner
            </button>
          </div>
        ) : (
          <div className="space-y-4 flex-1 flex flex-col">
            {/* Active Sprint Info Panel */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/5 border border-emerald-500/15 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/15">
                  <Play className="h-4 w-4 fill-white" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800 dark:text-white leading-tight">
                    {activeSprint.name} is Active
                  </h4>
                  <p className="text-3xs text-slate-450 dark:text-slate-550 font-bold mt-0.5">
                    Start: {new Date(activeSprint.startDate).toLocaleDateString()} • End: {new Date(activeSprint.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-3xs font-extrabold bg-emerald-500 text-white px-2.5 py-1 rounded-lg shadow-sm">
                  {activeSprintTasks.reduce((acc, t) => acc + (t.storyPoints || 1), 0)} Story Points
                </span>
                <button
                  onClick={() => handleCompleteSprint(activeSprint._id)}
                  className="flex items-center gap-1 rounded-xl bg-red-500 hover:bg-red-650 px-4 py-2 text-3xs font-bold text-white shadow transition-colors cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" /> Complete Sprint
                </button>
              </div>
            </div>

            {/* Kanban Columns */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 flex-1 items-start">
              {columns.map((status) => {
                const columnTasks = activeSprintTasks.filter((t) => t.status === status);
                return (
                  <div
                    key={status}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, status)}
                    className="flex flex-col h-[calc(100vh-21rem)] rounded-2xl bg-slate-50/50 dark:bg-slate-900/15 p-4 border border-slate-200/40 dark:border-slate-850/50 backdrop-blur-md transition-all duration-300"
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between mb-4 px-1.5">
                      <span className="font-heading font-extrabold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        {status}
                      </span>
                      <span className="rounded-full bg-slate-200/70 dark:bg-slate-800 px-2.5 py-0.5 text-2xs font-extrabold text-slate-605 dark:text-slate-400">
                        {columnTasks.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-premium">
                      {columnTasks.length === 0 ? (
                        <div className="flex h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center text-slate-400 p-4 text-xs font-semibold bg-white/20 dark:bg-slate-950/5">
                          No active tasks.
                        </div>
                      ) : (
                        columnTasks.map((task) => (
                          <div
                            key={task._id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task._id)}
                            onClick={() => openDetailsModal(task)}
                            className={`rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 dark:border-slate-850/80 p-4 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing hover:border-emerald-300 dark:hover:border-emerald-800 transition-all duration-200 hover:-translate-y-0.5 ${
                              task.priority === 'High'
                                ? 'border-l-4 border-l-red-500'
                                : task.priority === 'Medium'
                                ? 'border-l-4 border-l-amber-500'
                                : 'border-l-4 border-l-emerald-500'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2.5">
                              <span className={`px-2 py-0.5 rounded text-3xs font-bold ${
                                task.priority === 'High'
                                  ? 'bg-red-50 text-red-500 dark:bg-red-950/20 dark:text-red-400'
                                  : task.priority === 'Medium'
                                  ? 'bg-amber-50 text-amber-500 dark:bg-amber-950/20 dark:text-amber-400'
                                  : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-450'
                              }`}>
                                {task.priority}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-extrabold text-slate-500 dark:text-slate-400">
                                  {task.storyPoints || 1} SP
                                </span>
                                {task.dueDate && (
                                  <span className="flex items-center gap-1 text-3xs text-slate-400 dark:text-slate-500 font-semibold">
                                    <CalendarIcon className="h-3 w-3 text-emerald-500" />
                                    {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                              </div>
                            </div>

                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                              {task.title}
                            </h4>

                            <p className="text-3xs text-slate-450 dark:text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                              {task.description || 'No description provided'}
                            </p>

                            <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-850 pt-3">
                              <div className="flex items-center gap-1 text-3xs text-slate-400 dark:text-slate-500 font-bold">
                                <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
                                <span>{task.comments?.length || 0} Comments</span>
                              </div>

                              {task.assignee ? (
                                <div className="flex items-center gap-1.5" title={`Assignee: ${task.assignee.name}`}>
                                  <img
                                    src={task.assignee.avatar}
                                    alt={task.assignee.name}
                                    className="h-5.5 w-5.5 rounded-full object-cover shadow border border-slate-100 dark:border-slate-800"
                                  />
                                </div>
                              ) : (
                                <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400" title="Unassigned">
                                  <UserIcon className="h-3 w-3" />
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : activeTab === 'backlog' ? (
        /* TAB 2: BACKLOG & SPRINT PLANNER */
        <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-17.5rem)] pr-1 scrollbar-premium">
          {/* Active Sprint Backlog Section */}
          {activeSprint && (
            <div className="rounded-2xl border border-emerald-500/15 bg-white dark:bg-slate-900 dark:border-slate-850 p-4 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
                <div className="flex items-center gap-2">
                  <Play className="h-4.5 w-4.5 text-emerald-500 fill-emerald-500" />
                  <h3 className="font-heading text-sm font-extrabold text-slate-800 dark:text-white">
                    {activeSprint.name} (Active Sprint)
                  </h3>
                  <span className="text-3xs text-slate-400 dark:text-slate-500 font-bold">
                    ({tasks.filter((t) => t.sprint?._id === activeSprint._id).length} Tasks)
                  </span>
                </div>
                <button
                  onClick={() => handleCompleteSprint(activeSprint._id)}
                  className="rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500 hover:text-white text-red-500 px-3.5 py-1.5 text-3xs font-extrabold transition-colors cursor-pointer"
                >
                  Complete Sprint
                </button>
              </div>

              <div className="space-y-2.5">
                {tasks.filter((t) => t.sprint?._id === activeSprint._id).length === 0 ? (
                  <p className="text-3xs text-slate-400 dark:text-slate-500 italic text-center py-4">No tasks in active sprint. Move tasks from the backlog below.</p>
                ) : (
                  tasks
                    .filter((t) => t.sprint?._id === activeSprint._id)
                    .map((task) => (
                      <SprintTaskRow
                        key={task._id}
                        task={task}
                        members={members}
                        sprints={sprints}
                        onMoveSprint={handleMoveTaskSprint}
                        onUpdatePoints={handleUpdateStoryPoints}
                        onOpenDetails={openDetailsModal}
                      />
                    ))
                )}
              </div>
            </div>
          )}

          {/* Planned Sprints */}
          {sprints
            .filter((s) => s.status === 'Planned')
            .map((sprint) => {
              const sprintTasks = tasks.filter((t) => t.sprint?._id === sprint._id);
              return (
                <div key={sprint._id} className="rounded-2xl border border-slate-200/60 bg-white dark:bg-slate-900 dark:border-slate-850 p-4 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
                    <div className="flex items-center gap-2">
                      <CalendarRange className="h-4.5 w-4.5 text-slate-400" />
                      <h3 className="font-heading text-sm font-extrabold text-slate-800 dark:text-white">
                        {sprint.name} (Planned Sprint)
                      </h3>
                      <span className="text-3xs text-slate-400 dark:text-slate-500 font-bold">
                        ({sprintTasks.length} Tasks • {sprintTasks.reduce((acc, t) => acc + (t.storyPoints || 1), 0)} SP)
                      </span>
                    </div>
                    {!activeSprint && (
                      <button
                        onClick={() => handleStartSprint(sprint._id)}
                        className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500 hover:text-white text-emerald-500 px-3.5 py-1.5 text-3xs font-extrabold transition-colors cursor-pointer"
                      >
                        Start Sprint
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {sprintTasks.length === 0 ? (
                      <p className="text-3xs text-slate-400 dark:text-slate-500 italic text-center py-4">No tasks in this sprint. Assign tasks below.</p>
                    ) : (
                      sprintTasks.map((task) => (
                        <SprintTaskRow
                          key={task._id}
                          task={task}
                          members={members}
                          sprints={sprints}
                          onMoveSprint={handleMoveTaskSprint}
                          onUpdatePoints={handleUpdateStoryPoints}
                          onOpenDetails={openDetailsModal}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}

          {/* Master Product Backlog */}
          <div className="rounded-2xl border border-slate-200/60 bg-white dark:bg-slate-900 dark:border-slate-850 p-4 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-3">
              <Layers className="h-4.5 w-4.5 text-indigo-500" />
              <h3 className="font-heading text-sm font-extrabold text-slate-800 dark:text-white">
                Product Backlog
              </h3>
              <span className="text-3xs text-slate-400 dark:text-slate-500 font-bold">
                ({tasks.filter((t) => !t.sprint).length} Tasks • {tasks.filter((t) => !t.sprint).reduce((acc, t) => acc + (t.storyPoints || 1), 0)} SP)
              </span>
            </div>

            <div className="space-y-2.5">
              {tasks.filter((t) => !t.sprint).length === 0 ? (
                <p className="text-3xs text-slate-400 dark:text-slate-500 italic text-center py-6">Backlog is empty. Create a task to add it to the product backlog.</p>
              ) : (
                tasks
                  .filter((t) => !t.sprint)
                  .map((task) => (
                    <SprintTaskRow
                      key={task._id}
                      task={task}
                      members={members}
                      sprints={sprints}
                      onMoveSprint={handleMoveTaskSprint}
                      onUpdatePoints={handleUpdateStoryPoints}
                      onOpenDetails={openDetailsModal}
                    />
                  ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* TAB 3: AGILE SPRINT REPORTS & BURNDOWN */
        <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-17.5rem)] pr-1 scrollbar-premium">
          {/* Sprint Filter */}
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-4 border border-slate-200/60 dark:border-slate-850 rounded-2xl shadow-sm">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Select Sprint:</label>
            <select
              value={selectedReportSprintId}
              onChange={(e) => setSelectedReportSprintId(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-1.5 text-xs text-slate-800 dark:text-white outline-none focus:border-green-500 premium-input"
            >
              {sprints.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.status})
                </option>
              ))}
            </select>
          </div>

          {reportLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : selectedSprintReport ? (
            <>
              {/* Reports Dashboard Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Completion ratio card */}
                <div className="rounded-2xl border border-slate-200/60 bg-white dark:bg-slate-900 dark:border-slate-850 p-4 shadow-sm flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completion Ratio</span>
                    <h4 className="text-xl font-extrabold text-slate-800 dark:text-white mt-0.5">
                      {selectedSprintReport.stats.completionRatio}%
                    </h4>
                    <span className="text-4xs text-slate-450 dark:text-slate-550 block font-bold mt-0.5">
                      {selectedSprintReport.stats.completedCount} / {selectedSprintReport.stats.totalTasks} Tasks
                    </span>
                  </div>
                </div>

                {/* Completed Story Points Card */}
                <div className="rounded-2xl border border-slate-200/60 bg-white dark:bg-slate-900 dark:border-slate-850 p-4 shadow-sm flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                    <Check className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completed Points</span>
                    <h4 className="text-xl font-extrabold text-slate-800 dark:text-white mt-0.5">
                      {selectedSprintReport.stats.completedPoints} SP
                    </h4>
                    <span className="text-4xs text-slate-450 dark:text-slate-550 block font-bold mt-0.5">
                      Out of {selectedSprintReport.stats.totalPoints} SP Target
                    </span>
                  </div>
                </div>

                {/* Team Velocity Card */}
                <div className="rounded-2xl border border-slate-200/60 bg-white dark:bg-slate-900 dark:border-slate-850 p-4 shadow-sm flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Average Velocity</span>
                    <h4 className="text-xl font-extrabold text-slate-800 dark:text-white mt-0.5">
                      {selectedSprintReport.stats.avgVelocity} SP
                    </h4>
                    <span className="text-4xs text-slate-450 dark:text-slate-550 block font-bold mt-0.5">
                      Completed points / sprint
                    </span>
                  </div>
                </div>

                {/* Sprint Status */}
                <div className="rounded-2xl border border-slate-200/60 bg-white dark:bg-slate-900 dark:border-slate-850 p-4 shadow-sm flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                    <CalendarIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sprint Status</span>
                    <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mt-1 uppercase">
                      {selectedSprintReport.sprint.status}
                    </h4>
                    <span className="text-4xs text-slate-450 dark:text-slate-550 block font-bold mt-0.5">
                      Ends {new Date(selectedSprintReport.sprint.endDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Burndown Chart Panel */}
              <div className="rounded-2xl border border-slate-200/60 bg-white dark:bg-slate-900 dark:border-slate-850 p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="font-heading text-sm font-extrabold text-slate-800 dark:text-white">
                    Sprint Burndown Chart
                  </h3>
                  <p className="text-3xs text-slate-400 dark:text-slate-550 font-bold mt-0.5">
                    Plots remaining work (in Story Points) against the sprint timeline.
                  </p>
                </div>
                <BurndownChart data={selectedSprintReport.burndownData} />
              </div>

              {/* Velocity Chart / Completed Sprints */}
              {selectedSprintReport.stats.velocities && selectedSprintReport.stats.velocities.length > 0 && (
                <div className="rounded-2xl border border-slate-200/60 bg-white dark:bg-slate-900 dark:border-slate-850 p-6 shadow-sm space-y-4">
                  <div>
                    <h3 className="font-heading text-sm font-extrabold text-slate-800 dark:text-white">
                      Velocity History
                    </h3>
                    <p className="text-3xs text-slate-400 dark:text-slate-550 font-bold mt-0.5">
                      Completed story points across the last few completed sprints.
                    </p>
                  </div>
                  <div className="flex items-end gap-6 h-36 pt-4 px-2">
                    {selectedSprintReport.stats.velocities.map((v, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                        <span className="text-3xs font-extrabold text-slate-500 dark:text-slate-400">
                          {v.velocity} SP
                        </span>
                        <div
                          style={{ height: `${Math.min(100, Math.max(15, (v.velocity / (selectedSprintReport.stats.totalPoints || 10)) * 80))}%` }}
                          className="w-10 rounded-t-lg bg-gradient-to-t from-emerald-500 to-teal-500 shadow-sm"
                        ></div>
                        <span className="text-4xs font-bold text-slate-400 dark:text-slate-500 truncate w-16 text-center">
                          {v.sprintName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 text-slate-400 dark:text-slate-550">
              No sprint reports available.
            </div>
          )}
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-800 scale-in duration-200 overflow-hidden">
            <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-500" />
              Add Workspace Task
            </h3>
            <form onSubmit={handleCreateTask} className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="text-3xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Design UI prototypes, Configure deployment pipelines"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 premium-input"
                  required
                />
              </div>

              <div>
                <label className="text-3xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Task details and scope of work..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 h-24 resize-none premium-input"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-3xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                    Assignee
                  </label>
                  <select
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 premium-input"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.user._id} value={m.user._id}>
                        {m.user.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-3xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 premium-input"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-3xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                    Story Points (SP)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={taskStoryPoints}
                    onChange={(e) => setTaskStoryPoints(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 premium-input"
                    required
                  />
                </div>

                <div>
                  <label className="text-3xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                    Sprint Cycle
                  </label>
                  <select
                    value={taskSprint}
                    onChange={(e) => setTaskSprint(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 premium-input"
                  >
                    <option value="">Move to Backlog</option>
                    {sprints
                      .filter((s) => s.status !== 'Completed')
                      .map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name} ({s.status})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-3xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 premium-input"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-150 dark:hover:bg-slate-850 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-green-500 hover:bg-green-600 px-4 py-2 text-xs font-bold text-white shadow transition-colors cursor-pointer"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SPRINT MODAL */}
      {createSprintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-800 scale-in duration-200 overflow-hidden">
            <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <CalendarRange className="h-5 w-5 text-emerald-500" />
              Create Agile Sprint
            </h3>
            <form onSubmit={handleCreateSprintSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-3xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                  Sprint Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sprint 1, Q3 Release Backlog"
                  value={sprintName}
                  onChange={(e) => setSprintName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 premium-input"
                  required
                />
              </div>

              <div>
                <label className="text-3xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={sprintStart}
                  onChange={(e) => setSprintStart(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 premium-input"
                  required
                />
              </div>

              <div>
                <label className="text-3xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={sprintEnd}
                  onChange={(e) => setSprintEnd(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 premium-input"
                  required
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateSprintModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-150 dark:hover:bg-slate-850 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-green-500 hover:bg-green-600 px-4 py-2 text-xs font-bold text-white shadow transition-colors cursor-pointer"
                >
                  Create Sprint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TASK DETAILS & COMMENTS MODAL */}
      {detailsModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-850 scale-in duration-200 grid grid-cols-1 md:grid-cols-5 gap-6 h-[85vh] overflow-hidden">
            
            {/* Left Col (Task title, comments feed) */}
            <div className="md:col-span-3 flex flex-col h-full overflow-hidden">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3.5 mb-4">
                <h3 className="font-heading text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                  {selectedTask.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-h-20 overflow-y-auto leading-relaxed">
                  {selectedTask.description || 'No description provided.'}
                </p>
              </div>

              {/* Comments Feed */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 scrollbar-premium">
                <h4 className="text-2xs font-bold text-slate-450 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-emerald-500" /> Comments ({selectedTask.comments?.length || 0})
                </h4>

                {selectedTask.comments?.length === 0 ? (
                  <p className="text-3xs text-slate-400 dark:text-slate-500 italic text-center py-6">No comments yet. Write a message below.</p>
                ) : (
                  selectedTask.comments.map((comment) => (
                    <div key={comment._id} className="flex gap-2.5 items-start">
                      <img
                        src={comment.user?.avatar}
                        alt={comment.user?.name}
                        className="h-7 w-7 rounded-full border border-slate-105 dark:border-slate-805 object-cover"
                      />
                      <div className="flex-1 bg-slate-50 dark:bg-slate-950/20 p-2.5 rounded-xl border border-slate-250 dark:border-slate-850 text-xs">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-bold text-slate-700 dark:text-slate-350">{comment.user?.name}</span>
                          <span className="text-3xs text-slate-400 dark:text-slate-500 font-semibold">{new Date(comment.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 leading-normal">{comment.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Write comment input */}
              <form onSubmit={handleAddComment} className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-850 dark:text-white outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 premium-input"
                  required
                />
                <button
                  type="submit"
                  disabled={submittingComment}
                  className="rounded-lg bg-green-500 hover:bg-green-600 px-4 py-2 text-xs font-bold text-white shadow disabled:opacity-55 cursor-pointer transition-colors"
                >
                  Post
                </button>
              </form>
            </div>

            {/* Right Col (Task settings details) */}
            <div className="md:col-span-2 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-6 flex flex-col justify-between h-full overflow-hidden">
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-450 uppercase tracking-wider">Properties</span>
                  <button
                    onClick={() => setDetailsModalOpen(false)}
                    className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Status */}
                <div>
                  <label className="text-3xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Status</label>
                  <span className="inline-block px-2.5 py-1 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 border border-emerald-200/50 rounded-lg">
                    {selectedTask.status}
                  </span>
                </div>

                {/* Story Points */}
                <div>
                  <label className="text-3xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Story Points</label>
                  <span className="inline-block px-2.5 py-1 text-xs font-bold bg-slate-50 dark:bg-slate-950 text-slate-550 border border-slate-200 dark:border-slate-800 rounded-lg">
                    {selectedTask.storyPoints || 1} SP
                  </span>
                </div>

                {/* Sprint Cycle */}
                <div>
                  <label className="text-3xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Sprint Cycle</label>
                  <span className="inline-block px-2.5 py-1 text-xs font-bold bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-500 border border-indigo-200/20 rounded-lg">
                    {selectedTask.sprint?.name || 'Backlog'}
                  </span>
                </div>

                {/* Priority */}
                <div>
                  <label className="text-3xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Priority</label>
                  <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded-lg ${
                    selectedTask.priority === 'High'
                      ? 'bg-red-50 text-red-500 border border-red-200/50 dark:bg-red-950/20 dark:text-red-400 dark:border-red-950/40'
                      : selectedTask.priority === 'Medium'
                      ? 'bg-amber-50 text-amber-500 border border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-950/40'
                      : 'bg-slate-100 text-slate-500 border border-slate-200/50 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-850'
                  }`}>
                    {selectedTask.priority}
                  </span>
                </div>

                {/* Due Date */}
                <div>
                  <label className="text-3xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Due Date</label>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-605 dark:text-slate-350">
                    <CalendarIcon className="h-4 w-4 text-emerald-500" />
                    <span>
                      {selectedTask.dueDate
                        ? new Date(selectedTask.dueDate).toLocaleDateString(undefined, {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : 'No date scheduled'}
                    </span>
                  </div>
                </div>

                {/* Assignee */}
                <div>
                  <label className="text-3xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Assignee</label>
                  {selectedTask.assignee ? (
                    <div className="flex items-center gap-2.5">
                      <img
                        src={selectedTask.assignee.avatar}
                        alt={selectedTask.assignee.name}
                        className="h-8 w-8 rounded-full border border-slate-105 dark:border-slate-805 object-cover"
                      />
                      <div className="truncate text-xs">
                        <p className="font-bold text-slate-700 dark:text-slate-300 truncate w-32 leading-tight">
                          {selectedTask.assignee.name}
                        </p>
                        <p className="text-3xs text-slate-450 dark:text-slate-500 truncate w-32 font-semibold mt-0.5">{selectedTask.assignee.email}</p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-550 font-semibold italic">Unassigned</span>
                  )}
                </div>
              </div>

              {/* Delete task button */}
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleDeleteTask(selectedTask._id)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-200 hover:bg-red-50 hover:text-red-650 p-2.5 text-xs font-bold text-red-500 dark:border-red-955/25 dark:hover:bg-red-950/20 transition-all cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" /> Delete Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Subcomponent: Sprint Task Row inside the backlog view
const SprintTaskRow = ({
  task,
  members,
  sprints,
  onMoveSprint,
  onUpdatePoints,
  onOpenDetails,
}) => {
  return (
    <div
      onClick={() => onOpenDetails(task)}
      className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-xl border border-slate-200/50 bg-slate-50/15 hover:bg-slate-100/40 dark:border-slate-850 dark:bg-slate-950/5 dark:hover:bg-slate-950/30 transition-all hover:-translate-y-0.5 cursor-pointer shadow-3xs"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span
          className={`h-2.5 w-2.5 rounded-full shrink-0 ${
            task.priority === 'High'
              ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
              : task.priority === 'Medium'
              ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
              : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
          }`}
          title={`${task.priority} Priority`}
        />
        <div className="min-w-0">
          <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate leading-snug">
            {task.title}
          </h4>
          <p className="text-[10px] text-slate-450 dark:text-slate-500 font-bold mt-0.5">
            Status: <span className="text-emerald-500">{task.status}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap" onClick={(e) => e.stopPropagation()}>
        {/* Story points quick editor */}
        <div className="flex items-center gap-1.5" title="Story Points">
          <span className="text-4xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Points:</span>
          <input
            type="number"
            min="1"
            max="40"
            value={task.storyPoints || 1}
            onChange={(e) => onUpdatePoints(task._id, e.target.value)}
            className="w-10 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-1 py-0.5 text-center text-xs font-bold text-slate-805 dark:text-white outline-none focus:border-green-500 premium-input"
          />
        </div>

        {/* Sprint selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-4xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sprint:</span>
          <select
            value={task.sprint?._id || ''}
            onChange={(e) => onMoveSprint(task._id, e.target.value)}
            className="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 py-0.5 text-3xs font-extrabold text-slate-705 dark:text-slate-350 outline-none focus:border-green-500 premium-input"
          >
            <option value="">Backlog</option>
            {sprints
              .filter((s) => s.status !== 'Completed')
              .map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
          </select>
        </div>

        {/* Assignee display */}
        {task.assignee ? (
          <img
            src={task.assignee.avatar}
            alt={task.assignee.name}
            className="h-5.5 w-5.5 rounded-full object-cover border border-slate-100 dark:border-slate-800 shadow-sm"
            title={`Assigned to ${task.assignee.name}`}
          />
        ) : (
          <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-slate-150 dark:bg-slate-850 text-slate-400" title="Unassigned">
            <UserIcon className="h-2.5 w-2.5" />
          </span>
        )}
      </div>
    </div>
  );
};

export default Tasks;
