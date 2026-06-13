import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { getSocket, connectSocket, disconnectSocket } from '../services/socket';
import {
  LayoutDashboard,
  MessageSquare,
  ListTodo,
  FolderOpen,
  Calendar,
  CalendarRange,
  Users,
  Settings,
  Bell,
  Sun,
  Moon,
  Search,
  LogOut,
  ChevronDown,
  Plus,
  Loader2,
  Menu,
  X,
  User as UserIcon,
  Circle,
  Hash,
  BookOpen,
  Compass,
  GitBranch,
  Trophy,
} from 'lucide-react';

// Actions
import { logout } from '../redux/slices/authSlice';
import {
  fetchWorkspaces,
  setCurrentWorkspace,
  createWorkspace,
  joinWorkspaceByCode,
} from '../redux/slices/workspaceSlice';
import { fetchChannels, addChannelLocally } from '../redux/slices/channelSlice';
import { fetchNotifications, addLiveNotification, markRead } from '../redux/slices/notificationSlice';
import { updateTaskLocally } from '../redux/slices/taskSlice';

// API Client
import API from '../services/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Socket export reference for components to reuse
export let socket = null;

const DashboardLayout = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { slug } = useParams();

  const { user } = useSelector((state) => state.auth);
  const { workspaces, currentWorkspace, currentRole, loading: workspaceLoading } = useSelector(
    (state) => state.workspace
  );
  const { notifications } = useSelector((state) => state.notification);

  // UI States
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem('theme') === 'dark' || false
  );

  // Modals
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [joinWorkspaceOpen, setJoinWorkspaceOpen] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');

  // Global search input
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ messages: [], tasks: [], files: [] });
  const [searching, setSearching] = useState(false);

  // Toggle Theme
  const toggleTheme = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  };

  // Sync dark theme on mount
  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark-mode');
      setDarkMode(true);
    }
  }, []);

  // Fetch workspaces and notifications on mount
  useEffect(() => {
    dispatch(fetchWorkspaces());
    dispatch(fetchNotifications());
  }, [dispatch]);

  // Synchronize currentWorkspace based on URL slug
  useEffect(() => {
    if (workspaces.length > 0 && slug) {
      const matched = workspaces.find((w) => w.workspace.slug === slug);
      if (matched) {
        dispatch(setCurrentWorkspace(matched.workspace));
      }
    }
  }, [slug, workspaces, dispatch]);

  // If no slug is specified, redirect to workspaces selector
  useEffect(() => {
    if (!slug) {
      navigate('/workspaces', { replace: true });
    }
  }, [slug, navigate]);

  // Fetch channels when workspace changes
  useEffect(() => {
    if (currentWorkspace?._id) {
      dispatch(fetchChannels(currentWorkspace._id));
      const currentSocket = getSocket();
      if (currentSocket) {
        currentSocket.emit('join_workspace', currentWorkspace._id);
      }
    }
  }, [currentWorkspace?._id, dispatch]);

  // Socket Connection setup
  useEffect(() => {
    if (!user) return;

    // Connect socket via the singleton connectSocket method (Strict Mode safe)
    socket = connectSocket(user);

    // Global listener setup
    const handleConnected = () => {
      console.log('Socket client initialized');
    };
    
    socket.on('connected', handleConnected);

    return () => {
      if (socket) {
        socket.off('connected', handleConnected);
      }
    };
  }, [user]);

  // Socket Event Listeners setup (detached from socket connection lifecycle)
  useEffect(() => {
    if (!user) return;
    const currentSocket = getSocket();

    const handleNotification = (newNotification) => {
      dispatch(addLiveNotification(newNotification));
      toast.info(`🔔 ${newNotification.title}: ${newNotification.message}`, {
        onClick: () => navigate(newNotification.link || `/workspace/${slug}/dashboard`),
      });
    };

    const handleTaskUpdated = (updatedTask) => {
      dispatch(updateTaskLocally(updatedTask));
    };

    const handleChannelCreated = (newChannel) => {
      dispatch(addChannelLocally(newChannel));
    };

    currentSocket.on('notification_received', handleNotification);
    currentSocket.on('task_updated_broadcast', handleTaskUpdated);
    currentSocket.on('channel_created_broadcast', handleChannelCreated);

    return () => {
      currentSocket.off('notification_received', handleNotification);
      currentSocket.off('task_updated_broadcast', handleTaskUpdated);
      currentSocket.off('channel_created_broadcast', handleChannelCreated);
    };
  }, [user, slug, navigate, dispatch]);

  // User presence handler api
  const updateUserStatus = async (status) => {
    try {
      const response = await API.put('/auth/me', { status }); // We will implement status update in settings page / user routes
      // or simple update state locally for demo
      toast.success(`Presence set to ${status}`);
      setProfileDropdownOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Create Workspace
  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    try {
      console.log('Dispatching createWorkspace thunk for name:', newWorkspaceName);
      const resultAction = await dispatch(createWorkspace({ name: newWorkspaceName }));
      
      if (createWorkspace.fulfilled.match(resultAction)) {
        toast.success(`Workspace "${newWorkspaceName}" created!`);
        setNewWorkspaceName('');
        setCreateWorkspaceOpen(false);
        navigate(`/workspace/${resultAction.payload.workspace.slug}/dashboard`);
      } else {
        console.error('Create workspace action rejected:', resultAction.payload);
        toast.error(resultAction.payload || 'Failed to create workspace');
      }
    } catch (error) {
      console.error('Unhandled frontend error during workspace creation:', error);
      toast.error(error.message || 'Error creating workspace');
    }
  };

  // Join Workspace via Invite Code
  const handleJoinWorkspace = async (e) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) return;

    try {
      console.log('Dispatching joinWorkspaceByCode thunk for code:', inviteCodeInput);
      const resultAction = await dispatch(joinWorkspaceByCode(inviteCodeInput));
      
      if (joinWorkspaceByCode.fulfilled.match(resultAction)) {
        toast.success('Joined workspace successfully!');
        setInviteCodeInput('');
        setJoinWorkspaceOpen(false);
        dispatch(fetchWorkspaces()); // Refresh lists
        navigate(`/workspace/${resultAction.payload.workspace.slug}/dashboard`);
      } else {
        console.error('Join workspace action rejected:', resultAction.payload);
        toast.error(resultAction.payload || 'Failed to join workspace. Check the code.');
      }
    } catch (error) {
      console.error('Unhandled frontend error during workspace joining:', error);
      toast.error(error.message || 'Error joining workspace');
    }
  };

  // Global search triggers
  const executeSearch = async (val) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults({ messages: [], tasks: [], files: [] });
      return;
    }
    setSearching(true);
    try {
      // Execute multi-entity search
      const [msgRes, taskRes, fileRes] = await Promise.all([
        API.get(`/chat/message?search=${val}&workspaceId=${currentWorkspace?._id}`).catch(() => ({ data: { messages: [] } })), // handle missing endpoints gracefully
        API.get(`/tasks?search=${val}&workspaceId=${currentWorkspace?._id}`).catch(() => ({ data: { tasks: [] } })),
        API.get(`/files?search=${val}&workspaceId=${currentWorkspace?._id}`).catch(() => ({ data: { files: [] } })),
      ]);

      // Or fallback mock search locally from redux if needed
      setSearchResults({
        messages: msgRes.data?.messages || [],
        tasks: taskRes.data?.tasks || [],
        files: fileRes.data?.files || [],
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    disconnectSocket();
    dispatch(logout());
    dispatch(clearWorkspaceState());
    navigate('/login');
  };

  // Active styles for sidebar menu
  const getMenuClass = (pathName) => {
    const isMatched = location.pathname.endsWith(pathName);
    return `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
      isMatched
        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 border border-emerald-400/20 scale-[1.01]'
        : 'text-slate-655 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white border border-transparent'
    }`;
  };

  if (workspaceLoading && workspaces.length === 0) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  const activeWorkspaceName = currentWorkspace?.name || 'SyncFlow';
  const unreadNotifications = notifications.filter((n) => !n.read).length;

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${darkMode ? 'dark-mode dark' : 'bg-slate-50'}`}>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />

      {/* LEFT SIDEBAR - Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-955/65 backdrop-blur-lg transition-transform duration-300 md:static md:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Workspace Switcher Header */}
        <div className="relative border-b border-slate-200/50 dark:border-slate-800/50 px-4 py-3.5">
          <button
            onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
            className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white font-bold text-lg shadow-md shadow-emerald-500/10">
                {activeWorkspaceName.charAt(0).toUpperCase()}
              </span>
              <div>
                <h2 className="font-heading font-bold text-sm text-slate-850 dark:text-slate-100 truncate w-36">
                  {activeWorkspaceName}
                </h2>
                <p className="text-xs font-semibold text-slate-400">
                  Role: <span className="text-emerald-500 font-bold">{currentRole}</span>
                </p>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </button>

          {/* Workspace Dropdown Panel */}
          {workspaceDropdownOpen && (
            <div className="absolute left-4 right-4 top-16 z-40 mt-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="max-h-48 overflow-y-auto space-y-1">
                {workspaces.map((w) => (
                  <button
                    key={w.workspace._id}
                    onClick={() => {
                      dispatch(setCurrentWorkspace(w.workspace));
                      setWorkspaceDropdownOpen(false);
                      setSidebarOpen(false);
                      navigate(`/workspace/${w.workspace.slug}/dashboard`);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
                      currentWorkspace?._id === w.workspace._id
                        ? 'bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 dark:bg-slate-800 font-bold">
                      {w.workspace.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate">{w.workspace.name}</span>
                  </button>
                ))}
              </div>
              <div className="my-2 border-t border-slate-100 dark:border-slate-800"></div>
              <button
                onClick={() => {
                  setWorkspaceDropdownOpen(false);
                  navigate('/workspaces');
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Compass className="h-4 w-4 text-green-500" /> Switch Workspaces
              </button>
              <button
                onClick={() => {
                  setCreateWorkspaceOpen(true);
                  setWorkspaceDropdownOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors"
              >
                <Plus className="h-4 w-4" /> Create Workspace
              </button>
              <button
                onClick={() => {
                  setJoinWorkspaceOpen(true);
                  setWorkspaceDropdownOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              >
                <Users className="h-4 w-4" /> Join Workspace
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {currentWorkspace ? (
            <>
              <button onClick={() => { navigate(`/workspace/${currentWorkspace.slug}/dashboard`); setSidebarOpen(false); }} className="w-full text-left block">
                <span className={getMenuClass('dashboard')}>
                  <LayoutDashboard className="h-4.5 w-4.5" /> Dashboard
                </span>
              </button>
              <button onClick={() => { navigate(`/workspace/${currentWorkspace.slug}/wiki`); setSidebarOpen(false); }} className="w-full text-left block">
                <span className={getMenuClass('wiki')}>
                  <BookOpen className="h-4.5 w-4.5" /> Workspace Wiki
                </span>
              </button>
              <button onClick={() => { navigate(`/workspace/${currentWorkspace.slug}/git-feed`); setSidebarOpen(false); }} className="w-full text-left block">
                <span className={getMenuClass('git-feed')}>
                  <GitBranch className="h-4.5 w-4.5" /> Git Activity
                </span>
              </button>
              <button onClick={() => { navigate(`/workspace/${currentWorkspace.slug}/chat`); setSidebarOpen(false); }} className="w-full text-left block">
                <span className={getMenuClass('chat')}>
                  <MessageSquare className="h-4.5 w-4.5" /> Chat & Channels
                </span>
              </button>
              <button onClick={() => { navigate(`/workspace/${currentWorkspace.slug}/tasks`); setSidebarOpen(false); }} className="w-full text-left block">
                <span className={getMenuClass('tasks')}>
                  <ListTodo className="h-4.5 w-4.5" /> Tasks
                </span>
              </button>
              <button onClick={() => { navigate(`/workspace/${currentWorkspace.slug}/files`); setSidebarOpen(false); }} className="w-full text-left block">
                <span className={getMenuClass('files')}>
                  <FolderOpen className="h-4.5 w-4.5" /> Files
                </span>
              </button>
              <button onClick={() => { navigate(`/workspace/${currentWorkspace.slug}/calendar`); setSidebarOpen(false); }} className="w-full text-left block">
                <span className={getMenuClass('calendar')}>
                  <Calendar className="h-4.5 w-4.5" /> Calendar
                </span>
              </button>
              <button onClick={() => { navigate(`/workspace/${currentWorkspace.slug}/timeline`); setSidebarOpen(false); }} className="w-full text-left block">
                <span className={getMenuClass('timeline')}>
                  <CalendarRange className="h-4.5 w-4.5" /> Timeline
                </span>
              </button>
              <button onClick={() => { navigate(`/workspace/${currentWorkspace.slug}/performance`); setSidebarOpen(false); }} className="w-full text-left block">
                <span className={getMenuClass('performance')}>
                  <Trophy className="h-4.5 w-4.5" /> Leaderboard
                </span>
              </button>
              <button onClick={() => { navigate(`/workspace/${currentWorkspace.slug}/members`); setSidebarOpen(false); }} className="w-full text-left block">
                <span className={getMenuClass('members')}>
                  <Users className="h-4.5 w-4.5" /> Members
                </span>
              </button>
              
              {/* Only Manager / Admin roles can access Settings */}
              {['Admin', 'Manager'].includes(currentRole) && (
                <button onClick={() => { navigate(`/workspace/${currentWorkspace.slug}/settings`); setSidebarOpen(false); }} className="w-full text-left block">
                  <span className={getMenuClass('settings')}>
                    <Settings className="h-4.5 w-4.5" /> Settings
                  </span>
                </button>
              )}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-4 text-center">
              <p className="text-xs text-slate-400">Please create or join a workspace to start.</p>
            </div>
          )}
        </nav>

        {/* User Presence Footer */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-4">
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="relative">
                <img
                  src={user?.avatar}
                  alt={user?.name}
                  className="h-9 w-9 rounded-full object-cover shadow-sm border border-slate-100"
                />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500 dark:border-slate-900"></span>
              </div>
              <div className="truncate w-36">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
                  {user?.name}
                </h4>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
            </button>

            {/* Profile Dropdown */}
            {profileDropdownOpen && (
              <div className="absolute bottom-12 left-0 right-0 z-40 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 shadow-lg animate-in fade-in slide-in-from-bottom-1 duration-150">
                <div className="px-2 py-1 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Set Status
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => updateUserStatus('online')}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    <Circle className="h-2 w-2 fill-green-500 text-green-500" /> Online
                  </button>
                  <button
                    onClick={() => updateUserStatus('away')}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    <Circle className="h-2 w-2 fill-amber-500 text-amber-500" /> Away
                  </button>
                </div>
                <div className="my-2 border-t border-slate-100 dark:border-slate-800"></div>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN VIEW CONTENT CONTAINER */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* TOP NAVBAR */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-950/70 backdrop-blur-md px-4 md:px-6 shadow-sm sticky top-0 z-20 transition-all duration-300">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
            >
              {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            
            {/* Page Header (or dynamic header depending on route) */}
            <div className="hidden items-center gap-2 text-sm text-slate-400 sm:flex">
              <span>SyncFlow</span>
              <span>/</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {activeWorkspaceName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Global Search trigger button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 text-sm shadow-inner transition-all duration-150"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search channels, tasks, files...</span>
              <kbd className="hidden rounded bg-white dark:bg-slate-800 px-1.5 py-0.5 text-2xs font-bold font-mono text-slate-400 shadow sm:inline">
                Ctrl+K
              </kbd>
            </button>

            {/* Light/Dark Toggle */}
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle theme"
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-3xs font-bold text-white ring-2 ring-white dark:ring-slate-900">
                    {unreadNotifications}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 z-50 w-80 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3 bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="font-heading font-bold text-sm text-slate-800 dark:text-slate-100">
                      Notifications
                    </h3>
                    {unreadNotifications > 0 && (
                      <button
                        onClick={() => dispatch(markRead())}
                        className="text-xs font-semibold text-green-500 hover:text-green-600"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-900">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-xs text-slate-400">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n._id}
                          onClick={() => {
                            dispatch(markRead(n._id));
                            setNotificationsOpen(false);
                            if (n.link) navigate(n.link);
                          }}
                          className={`flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer ${
                            !n.read ? 'bg-green-50/20 dark:bg-green-950/5' : ''
                          }`}
                        >
                          <div className="mt-0.5 rounded-full bg-green-100 dark:bg-green-950/20 p-1 text-green-600">
                            🔔
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight">
                              {n.title}
                            </h4>
                            <p className="mt-0.5 text-2xs text-slate-500 dark:text-slate-400">
                              {n.message}
                            </p>
                            <span className="mt-1 block text-3xs text-slate-400">
                              {new Date(n.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT CONTAINER */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 dark:bg-slate-950 transition-colors">
          <Outlet />
        </main>
      </div>

      {/* CREATE WORKSPACE MODAL */}
      {createWorkspaceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-800 scale-in duration-200">
            <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
              Create a new workspace
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Workspaces are shared hubs where teams can chat, structure boards, and share resources.
            </p>
            <form onSubmit={handleCreateWorkspace} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Workspace Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Marketing, Project Omega"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm text-slate-800 dark:text-white outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCreateWorkspaceOpen(false)}
                  className="rounded-lg px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-green-500 hover:bg-green-600 px-4 py-2 text-xs font-bold text-white shadow"
                >
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOIN WORKSPACE MODAL */}
      {joinWorkspaceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-800 scale-in duration-200">
            <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
              Join a Workspace
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Enter the unique workspace invitation code to join your team.
            </p>
            <form onSubmit={handleJoinWorkspace} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Invite Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. a1b2c3d4"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm text-slate-800 dark:text-white outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setJoinWorkspaceOpen(false)}
                  className="rounded-lg px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-green-500 hover:bg-green-600 px-4 py-2 text-xs font-bold text-white shadow"
                >
                  Join Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GLOBAL SEARCH MODAL */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 backdrop-blur-xs p-4 pt-16 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-100 dark:border-slate-800 scale-in duration-150 overflow-hidden">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 px-4 py-3 bg-slate-50 dark:bg-slate-950/20">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search messages, tasks, files..."
                value={searchQuery}
                onChange={(e) => executeSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm text-slate-800 dark:text-white outline-none"
                autoFocus
              />
              <button
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery('');
                  setSearchResults({ messages: [], tasks: [], files: [] });
                }}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="max-h-96 overflow-y-auto p-4 space-y-4">
              {searching ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-green-500" />
                </div>
              ) : !searchQuery ? (
                <p className="text-center text-xs text-slate-400 py-4">
                  Type something to search this workspace...
                </p>
              ) : searchResults.messages.length === 0 && searchResults.tasks.length === 0 && searchResults.files.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-4">
                  No matching results found.
                </p>
              ) : (
                <>
                  {/* Message Results */}
                  {searchResults.messages.length > 0 && (
                    <div>
                      <h4 className="text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Messages</h4>
                      <div className="space-y-2">
                        {searchResults.messages.map((m) => (
                          <div
                            key={m._id}
                            onClick={() => {
                              setSearchOpen(false);
                              navigate(`/workspace/${currentWorkspace.slug}/chat`);
                            }}
                            className="p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all text-xs"
                          >
                            <div className="flex justify-between font-bold text-slate-600 dark:text-slate-300">
                              <span>{m.sender?.name}</span>
                              <span className="text-3xs text-slate-400">{new Date(m.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 mt-1 truncate">{m.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Task Results */}
                  {searchResults.tasks.length > 0 && (
                    <div>
                      <h4 className="text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tasks</h4>
                      <div className="space-y-2">
                        {searchResults.tasks.map((t) => (
                          <div
                            key={t._id}
                            onClick={() => {
                              setSearchOpen(false);
                              navigate(`/workspace/${currentWorkspace.slug}/tasks`);
                            }}
                            className="flex justify-between items-center p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all text-xs"
                          >
                            <div>
                              <h5 className="font-bold text-slate-700 dark:text-slate-200">{t.title}</h5>
                              <p className="text-3xs text-slate-400 mt-0.5">Status: <span className="text-green-500">{t.status}</span></p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-3xs font-bold ${
                              t.priority === 'High' ? 'bg-red-50 text-red-500' : t.priority === 'Medium' ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-500'
                            }`}>
                              {t.priority}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* File Results */}
                  {searchResults.files.length > 0 && (
                    <div>
                      <h4 className="text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Files</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {searchResults.files.map((f) => (
                          <a
                            key={f._id}
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-100 dark:hover:border-slate-700 text-xs"
                          >
                            <span className="font-medium text-green-600 hover:underline truncate w-72">{f.name}</span>
                            <span className="text-3xs text-slate-400">{(f.size / 1024).toFixed(1)} KB</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
