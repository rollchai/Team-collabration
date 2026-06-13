import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Users,
  LogOut,
  Loader2,
  ArrowRight,
  Shield,
  Compass,
  X,
} from 'lucide-react';
import {
  fetchWorkspaces,
  setCurrentWorkspace,
  createWorkspace,
  joinWorkspaceByCode,
  clearWorkspaceState,
} from '../redux/slices/workspaceSlice';
import { logout } from '../redux/slices/authSlice';
import { disconnectSocket } from '../services/socket';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Workspaces = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user } = useSelector((state) => state.auth);
  const { workspaces, loading } = useSelector((state) => state.workspace);

  // Modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [creating, setCreating] = useState(false);

  const [joinOpen, setJoinOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);

  // Fetch workspaces on mount
  useEffect(() => {
    dispatch(fetchWorkspaces());
  }, [dispatch]);

  // Handle Workspace Selection
  const handleSelectWorkspace = (w) => {
    dispatch(setCurrentWorkspace(w.workspace));
    navigate(`/workspace/${w.workspace.slug}/dashboard`);
  };

  // Handle Create Workspace
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    setCreating(true);
    try {
      const resultAction = await dispatch(createWorkspace({ name: newWorkspaceName }));
      if (createWorkspace.fulfilled.match(resultAction)) {
        toast.success(`Workspace "${newWorkspaceName}" created successfully!`);
        setNewWorkspaceName('');
        setCreateOpen(false);
        navigate(`/workspace/${resultAction.payload.workspace.slug}/dashboard`);
      } else {
        toast.error(resultAction.payload || 'Failed to create workspace');
      }
    } catch (err) {
      toast.error('An error occurred during workspace creation');
    } finally {
      setCreating(false);
    }
  };

  // Handle Join Workspace
  const handleJoin = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setJoining(true);
    try {
      const resultAction = await dispatch(joinWorkspaceByCode(inviteCode));
      if (joinWorkspaceByCode.fulfilled.match(resultAction)) {
        toast.success('Workspace joined successfully!');
        setInviteCode('');
        setJoinOpen(false);
        dispatch(fetchWorkspaces()); // Refresh lists
        navigate(`/workspace/${resultAction.payload.workspace.slug}/dashboard`);
      } else {
        toast.error(resultAction.payload || 'Invalid invite code or already joined');
      }
    } catch (err) {
      toast.error('An error occurred while joining the workspace');
    } finally {
      setJoining(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    disconnectSocket();
    dispatch(logout());
    dispatch(clearWorkspaceState());
    navigate('/login');
  };

  return (
    <div className="min-h-screen w-screen bg-slate-50 dark:bg-[#080B11] flex flex-col justify-between text-slate-800 dark:text-slate-100 transition-colors duration-300 relative overflow-hidden">
      {/* Background Ambient Radial Glow Highlights */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute left-1/4 top-1/4 h-[400px] w-[400px] rounded-full bg-emerald-500/3 dark:bg-emerald-500/2 blur-[100px]"></div>
        <div className="absolute right-1/4 bottom-1/4 h-[500px] w-[500px] rounded-full bg-teal-500/3 dark:bg-teal-500/2 blur-[120px]"></div>
      </div>

      <ToastContainer position="top-right" autoClose={3000} />

      {/* TOP HEADER */}
      <header className="max-w-6xl w-full mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white font-extrabold text-xl shadow-lg shadow-emerald-500/10">
            S
          </span>
          <span className="font-heading font-extrabold text-lg tracking-tight bg-gradient-to-r from-emerald-450 to-teal-550 bg-clip-text text-transparent">
            SyncFlow
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200/60 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-900/60 px-4 py-2 text-xs font-bold text-slate-505 dark:text-slate-400 hover:text-red-500 cursor-pointer shadow-2xs transition-all"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </header>

      {/* MAIN CONTENT WORKSPACE PANEL */}
      <main className="max-w-4xl w-full mx-auto px-6 py-10 flex-1 flex flex-col justify-center relative z-10">
        <div className="space-y-2 text-center md:text-left mb-8 max-w-xl">
          <h1 className="font-heading text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            Launch your workspaces.
          </h1>
          <p className="text-sm text-slate-550 dark:text-slate-400 font-medium">
            Choose a workspace to launch your team channels, tasks, files directory, and wikis.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
          </div>
        ) : workspaces.length === 0 ? (
          /* EMPTY ONBOARDING STATE */
          <div className="glass-card p-8 md:p-12 shadow-md text-center max-w-xl mx-auto space-y-6 transition-colors">
            <div className="h-16 w-16 bg-emerald-500/10 dark:bg-emerald-950/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Compass className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="font-heading font-extrabold text-lg text-slate-850 dark:text-white">
                Create your first workspace
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                SyncFlow workspaces are private hubs where your team schedules sprints, holds discussion rooms, and documents notes.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={() => setCreateOpen(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 px-5 py-3 text-xs font-bold text-white shadow-md shadow-emerald-500/15 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer animate-pulse"
              >
                <Plus className="h-4 w-4" /> Create Workspace
              </button>
              <button
                onClick={() => setJoinOpen(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-205 dark:border-slate-805 hover:bg-slate-50 dark:hover:bg-slate-900 px-5 py-3 text-xs font-bold text-slate-655 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <Users className="h-4 w-4" /> Join via Invite Code
              </button>
            </div>
          </div>
        ) : (
          /* WORKSPACES GRID LIST */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workspaces.map((w) => (
              <div
                key={w.workspace._id}
                onClick={() => handleSelectWorkspace(w)}
                className="glass-card glass-card-hover p-6 flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white font-extrabold text-xl shadow-md shadow-emerald-500/15 select-none border border-emerald-400/20">
                    {w.workspace.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="truncate pr-2">
                    <h3 className="font-heading font-extrabold text-sm text-slate-850 dark:text-white truncate group-hover:text-emerald-500 transition-colors">
                      {w.workspace.name}
                    </h3>
                    <div className="flex items-center gap-3 text-3xs text-slate-400 dark:text-slate-500 mt-1.5 font-bold">
                      <span className="flex items-center gap-0.5">
                        <Users className="h-3.5 w-3.5 text-emerald-500" />
                        {w.workspace.members?.length || 1} members
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Shield className="h-3.5 w-3.5 text-emerald-500" />
                        Role: {w.role}
                      </span>
                    </div>
                  </div>
                </div>
                
                <button className="rounded-xl p-2.5 text-slate-400 group-hover:text-emerald-500 group-hover:bg-emerald-500/10 dark:group-hover:bg-emerald-950/30 border border-transparent group-hover:border-emerald-500/20 transition-all cursor-pointer">
                  <ArrowRight className="h-4.5 w-4.5" />
                </button>
              </div>
            ))}

            {/* QUICK ACTIONS CARD */}
            <div className="rounded-2xl border border-dashed border-slate-350 dark:border-slate-800 p-6 flex items-center justify-center gap-4 bg-slate-50/30 dark:bg-slate-950/10 shadow-inner">
              <button
                onClick={() => setCreateOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 px-4.5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/15 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Create
              </button>
              <button
                onClick={() => setJoinOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-205 dark:border-slate-805 hover:bg-white dark:hover:bg-slate-900/50 px-4.5 py-2.5 text-xs font-bold text-slate-655 dark:text-slate-300 transition-all cursor-pointer"
              >
                <Users className="h-4 w-4" /> Join Code
              </button>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="max-w-6xl w-full mx-auto px-6 py-6 border-t border-slate-200/40 dark:border-slate-900 text-center text-3xs text-slate-405 font-medium relative z-10">
        &copy; {new Date().getFullYear()} SyncFlow SaaS Platform. All rights reserved.
      </footer>

      {/* MODAL: CREATE WORKSPACE */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-805 scale-in duration-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-805 pb-3 mb-4">
              <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Plus className="h-5 w-5 text-emerald-500" /> Create Workspace
              </h3>
              <button
                onClick={() => setCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded p-1 cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-3xs font-semibold text-slate-400 dark:text-slate-500 uppercase block mb-1 tracking-wider">
                  Workspace Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Marketing, Project Space"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full rounded-lg border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-955 px-3.5 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-green-500 premium-input"
                  required
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  disabled={creating}
                  className="rounded-lg px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newWorkspaceName.trim()}
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/10 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating...
                    </>
                  ) : (
                    'Create'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: JOIN WORKSPACE */}
      {joinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-805 scale-in duration-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-805 pb-3 mb-4">
              <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Users className="h-5 w-5 text-emerald-500" /> Join a Workspace
              </h3>
              <button
                onClick={() => setJoinOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded p-1 cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="text-3xs font-semibold text-slate-400 dark:text-slate-500 uppercase block mb-1 tracking-wider">
                  Invite Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. a1b2c3d4"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full rounded-lg border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-955 px-3.5 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-green-500 premium-input"
                  required
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setJoinOpen(false)}
                  disabled={joining}
                  className="rounded-lg px-4 py-2 text-xs font-bold text-slate-505 hover:bg-slate-100 dark:hover:bg-slate-850 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joining || !inviteCode.trim()}
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/10 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {joining ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Joining...
                    </>
                  ) : (
                    'Join'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workspaces;
