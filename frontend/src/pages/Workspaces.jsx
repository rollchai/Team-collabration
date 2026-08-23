import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import {
  Plus,
  Users,
  LogOut,
  Loader2,
  ArrowRight,
  Shield,
  Compass,
  X,
  Flame,
  Globe,
  Settings,
  ShieldCheck,
  Zap,
  CheckCircle2,
  MessageSquare,
  FileText
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
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const CARD_COVER_GRADIENTS = [
  'from-violet-600/30 via-indigo-600/10 to-transparent',
  'from-blue-600/30 via-indigo-600/10 to-transparent',
  'from-fuchsia-600/30 via-pink-600/10 to-transparent',
  'from-emerald-600/30 via-teal-600/10 to-transparent'
];

const CARD_TEXT_GRADIENTS = [
  'from-violet-500 to-indigo-500',
  'from-blue-400 to-indigo-400',
  'from-fuchsia-400 to-pink-400',
  'from-emerald-400 to-teal-400'
];

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

  const triggerRef = useRef(null);
  const scrollSectionRef = useRef(null);

  // Fetch workspaces on mount
  useEffect(() => {
    dispatch(fetchWorkspaces());
  }, [dispatch]);

  // GSAP scroll trigger and animation setups
  useEffect(() => {
    if (loading || workspaces.length === 0) return;

    const ctx = gsap.context(() => {
      const isDesktop = window.innerWidth >= 768;

      if (isDesktop && scrollSectionRef.current && triggerRef.current) {
        const scrollWidth = scrollSectionRef.current.scrollWidth;
        const viewportWidth = window.innerWidth;
        const xVal = -(scrollWidth - viewportWidth + 120);

        gsap.to(scrollSectionRef.current, {
          x: xVal,
          ease: 'none',
          scrollTrigger: {
            trigger: triggerRef.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        });

        // Horizontal progress tracker
        gsap.to('.scroll-progress-indicator', {
          scaleX: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: triggerRef.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: true,
          },
        });

        // Numerical scroll progress counter
        gsap.to('.scroll-num-indicator', {
          scrollTrigger: {
            trigger: triggerRef.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: true,
            onUpdate: (self) => {
              const progress = self.progress;
              const total = workspaces.length + 1; // Workspaces + Quick Action Panel
              const currentIndex = Math.min(
                Math.floor(progress * total) + 1,
                total
              );
              const indEl = document.getElementById('scroll-active-num');
              if (indEl) indEl.innerText = `0${currentIndex}`;
            }
          }
        });
      }

      // Continuous drifting animations for floating widgets
      gsap.to('.hero-float-1', {
        y: -18,
        x: 12,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut'
      });
      gsap.to('.hero-float-2', {
        y: 16,
        x: -14,
        duration: 5,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut'
      });
      gsap.to('.hero-float-3', {
        y: -12,
        x: -8,
        duration: 3.5,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut'
      });

      // Stagger entry animations for workspace cards
      gsap.fromTo(
        '.workspace-card-item',
        { opacity: 0, y: 45, scale: 0.96 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          stagger: 0.08,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: triggerRef.current || '.workspace-trigger-fallback',
            start: 'top 75%'
          }
        }
      );

      // Hero text reveal
      gsap.fromTo(
        '.gsap-hero-title',
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 1.2, ease: 'power4.out' }
      );

      gsap.fromTo(
        '.gsap-hero-text',
        { opacity: 0, y: 25 },
        { opacity: 1, y: 0, duration: 0.9, delay: 0.3, ease: 'power3.out' }
      );

      gsap.fromTo(
        '.gsap-hero-ctas',
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.8, delay: 0.5, ease: 'power3.out' }
      );

      gsap.fromTo(
        '.gsap-hero-canvas',
        { opacity: 0, scale: 0.96, y: 35 },
        { opacity: 1, scale: 1, y: 0, duration: 1.1, delay: 0.6, ease: 'power3.out' }
      );

      // Statistics counting values
      const stats = { workspacesVal: 0, sprintsVal: 0, actionsVal: 0 };
      gsap.to(stats, {
        workspacesVal: 50,
        sprintsVal: 120,
        actionsVal: 25000,
        duration: 1.8,
        ease: 'power1.out',
        scrollTrigger: {
          trigger: '.stats-section-trigger',
          start: 'top 85%',
        },
        onUpdate: () => {
          const wEl = document.getElementById('stat-workspaces');
          const sEl = document.getElementById('stat-sprints');
          const aEl = document.getElementById('stat-actions');
          if (wEl) wEl.innerText = Math.floor(stats.workspacesVal) + '+';
          if (sEl) sEl.innerText = Math.floor(stats.sprintsVal) + '+';
          if (aEl) aEl.innerText = Math.floor(stats.actionsVal).toLocaleString() + '+';
        }
      });
    });

    return () => {
      ctx.revert();
    };
  }, [workspaces, loading]);

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
    <div className="min-h-screen w-full bg-slate-50 dark:bg-[#050811] flex flex-col text-slate-800 dark:text-slate-100 transition-colors duration-300 relative overflow-x-hidden">
      
      {/* Background ambient light radial glows */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute left-1/4 top-1/4 h-[500px] w-[500px] rounded-full bg-violet-500/5 dark:bg-violet-500/2 blur-[120px]" />
        <div className="absolute right-1/4 bottom-1/3 h-[600px] w-[600px] rounded-full bg-indigo-500/5 dark:bg-indigo-500/2 blur-[140px]" />
      </div>

      {/* FIXED TOP HEADER */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/40 dark:bg-[#050811]/40 backdrop-blur-xl border-b border-slate-200/20 dark:border-slate-805 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-500 to-indigo-500 text-white font-extrabold text-xl shadow-lg shadow-violet-500/20">
              ⚡
            </span>
            <span className="font-heading font-extrabold text-lg tracking-tight text-violet-600 dark:text-violet-400">
              SyncFlow
            </span>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-xl border border-slate-205 dark:border-slate-805 hover:bg-slate-100 dark:hover:bg-slate-900/60 px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-rose-500 cursor-pointer shadow-3xs transition-colors focus:outline-none"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </motion.button>
        </div>
      </header>

      {/* ANIMATED HERO SECTION */}
      <section className="relative min-h-screen w-full flex flex-col justify-center items-center text-center px-6 overflow-hidden z-10 pt-32 pb-24 shrink-0 gap-10">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-violet-500/10 dark:bg-violet-500/5 rounded-full blur-[130px] pointer-events-none -z-10" />
        
        <div className="max-w-3xl space-y-6 pt-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-3xs font-extrabold tracking-wider uppercase bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 shadow-inner select-none">
            <Flame className="h-3 w-3" /> everything your team needs. in one workspace
          </span>
          <h1 className="gsap-hero-title font-heading text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] select-none">
            Everything Your Team Needs.<br />
            <span className="bg-gradient-to-r from-violet-500 via-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">
              In One Workspace.
            </span>
          </h1>
          <p className="gsap-hero-text text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium max-w-xl mx-auto leading-relaxed">
            Welcome back, {user?.name || 'User'}. Bring sprint boards, discussion channels, file libraries, and live commit feeds together under customizable space panels.
          </p>
          <div className="gsap-hero-ctas flex flex-col sm:flex-row gap-3.5 justify-center pt-2">
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-655 px-5.5 py-3 text-xs font-extrabold text-white shadow-lg shadow-violet-500/15 cursor-pointer transition-transform hover:scale-[1.02] focus:outline-none"
            >
              <Plus className="h-4 w-4" /> Start New Workspace
            </button>
            <button
              onClick={() => setJoinOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-205 dark:border-slate-805 hover:bg-slate-100/50 dark:hover:bg-slate-900/60 px-5.5 py-3 text-xs font-extrabold text-slate-655 dark:text-slate-350 transition-colors cursor-pointer focus:outline-none"
            >
              <Users className="h-4 w-4" /> Join via Invite Code
            </button>
          </div>
        </div>

        {/* HERO DASHBOARD CANVAS */}
        <div className="gsap-hero-canvas relative w-full max-w-4xl h-56 sm:h-80 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/30 backdrop-blur-xl shadow-2xl p-4 sm:p-6 overflow-hidden mt-2">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-500/35 to-transparent"></div>
          {/* Cyber mockup UI */}
          <div className="grid grid-cols-12 gap-4 h-full text-left">
            {/* Sidebar list mock */}
            <div className="col-span-3 border-r border-slate-200/40 dark:border-slate-805 pr-4 space-y-4 hidden sm:block">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-500" />
                <div className="h-3 w-3 rounded-full bg-amber-500" />
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
              </div>
              <div className="space-y-2">
                <div className="h-3.5 w-16 bg-violet-500/10 rounded" />
                <div className="h-3 w-full bg-slate-200/50 dark:bg-slate-800/40 rounded" />
                <div className="h-3 w-4/5 bg-slate-200/50 dark:bg-slate-800/40 rounded" />
              </div>
            </div>
            {/* Main window mock */}
            <div className="col-span-12 sm:col-span-9 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200/40 dark:border-slate-800/50 pb-2.5">
                <div className="h-4 w-32 bg-slate-200/70 dark:bg-slate-800/60 rounded" />
                <div className="h-4 w-12 bg-violet-500/10 rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-2/3 bg-slate-200/50 dark:bg-slate-800/40 rounded" />
                <div className="h-3 w-full bg-slate-200/50 dark:bg-slate-800/40 rounded" />
                <div className="h-3 w-4/5 bg-slate-200/50 dark:bg-slate-800/40 rounded" />
              </div>
              <div className="h-20 sm:h-28 w-full border border-slate-200/30 dark:border-slate-800/30 bg-slate-50/50 dark:bg-slate-955/15 rounded-xl p-3 flex items-end">
                <div className="h-7 w-full bg-slate-200/65 dark:bg-slate-800/60 rounded-lg flex items-center px-3 text-slate-400 text-3xs font-semibold">
                  Type a sprint issue or code command...
                </div>
              </div>
            </div>
          </div>

          {/* Floating UI Widget 1 (Task Checklist) */}
          <div className="hero-float-1 absolute top-12 left-6 w-48 p-3.5 rounded-xl border border-slate-200/40 dark:border-slate-800 bg-white/90 dark:bg-slate-955/80 backdrop-blur-md shadow-lg space-y-2.5 hidden md:block select-none pointer-events-none">
            <span className="flex items-center gap-1.5 text-3xs font-extrabold uppercase text-slate-455 tracking-wider">
              <CheckCircle2 className="h-3.5 w-3.5 text-violet-500" /> Active Tasks
            </span>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-2xs font-bold text-slate-700 dark:text-slate-350">
                <div className="h-1.5 w-1.5 bg-violet-500 rounded-full" /> Setup Redux Slice
              </div>
              <div className="flex items-center gap-2 text-2xs font-bold text-slate-700 dark:text-slate-350">
                <div className="h-1.5 w-1.5 bg-indigo-500 rounded-full" /> Design dashboard visual
              </div>
              <div className="flex items-center gap-2 text-2xs font-bold text-slate-700 dark:text-slate-350">
                <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full" /> Integrate socket feeds
              </div>
            </div>
          </div>

          {/* Floating UI Widget 2 (Chat Bubble) */}
          <div className="hero-float-2 absolute bottom-12 right-6 w-52 p-3 rounded-xl border border-slate-200/40 dark:border-slate-800 bg-white/90 dark:bg-slate-955/80 backdrop-blur-md shadow-lg flex gap-2.5 items-start hidden md:flex select-none pointer-events-none text-left">
            <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-violet-500 to-indigo-500 flex items-center justify-center text-white text-3xs font-extrabold">
              JD
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex justify-between items-center">
                <span className="text-3xs font-extrabold text-slate-900 dark:text-white">John Doe</span>
                <span className="text-[9px] text-slate-400">Just now</span>
              </div>
              <p className="text-3xs font-bold text-slate-500 dark:text-slate-400 leading-tight">
                Hey guys, I completed the wiki documentation pages! ⚡
              </p>
            </div>
          </div>

          {/* Floating UI Widget 3 (User Ring) */}
          <div className="hero-float-3 absolute top-6 right-16 px-3 py-1.5 rounded-full border border-slate-200/40 dark:border-slate-805 bg-white/80 dark:bg-slate-955/70 backdrop-blur-md shadow-lg flex items-center gap-2 hidden lg:flex select-none pointer-events-none">
            <div className="flex -space-x-2">
              <div className="h-5 w-5 rounded-full bg-violet-600 text-white font-extrabold text-[9px] flex items-center justify-center border border-white/20">A</div>
              <div className="h-5 w-5 rounded-full bg-indigo-600 text-white font-extrabold text-[9px] flex items-center justify-center border border-white/20">B</div>
              <div className="h-5 w-5 rounded-full bg-emerald-600 text-white font-extrabold text-[9px] flex items-center justify-center border border-white/20">C</div>
              <div className="h-5 w-5 rounded-full bg-rose-600 text-white font-extrabold text-[9px] flex items-center justify-center border border-white/20">D</div>
            </div>
            <span className="text-3xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              5 Members Active
            </span>
          </div>
        </div>

        {/* Floating Scroll mouse down */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 select-none pointer-events-none">
          <span className="text-3xs font-extrabold uppercase tracking-widest text-slate-455 dark:text-slate-500">Explore Workspaces</span>
          <div className="w-5 h-8 border-2 border-slate-200 dark:border-slate-800 rounded-full flex justify-center p-1">
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-1.5 h-1.5 bg-violet-500 rounded-full"
            />
          </div>
        </div>
      </section>

      {/* LOADER */}
      {loading ? (
        <div className="flex flex-col justify-center items-center py-40 z-10 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider animate-pulse">Loading workspaces...</p>
        </div>
      ) : workspaces.length === 0 ? (
        
        /* EMPTY ONBOARDING STATE */
        <section className="min-h-[50vh] w-full flex items-center justify-center px-6 py-12 z-10 shrink-0">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="glass-card p-8 md:p-14 shadow-2xl text-center max-w-xl w-full space-y-6 border border-slate-200/50 dark:border-slate-800/80 relative"
          >
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-500/40 to-transparent"></div>
            <div className="h-16 w-16 bg-violet-500/10 dark:bg-violet-950/20 text-violet-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-violet-500/20">
              <Compass className="h-8 w-8 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="font-heading font-extrabold text-xl text-slate-900 dark:text-white">
                Launch your first workspace
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed font-semibold">
                SyncFlow workspaces are private hubs where your team schedules sprint boards, hosts discussion channels, and files documents.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3.5 justify-center pt-2">
              <button
                onClick={() => setCreateOpen(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 px-5.5 py-3 text-xs font-bold text-white shadow-md shadow-violet-500/15 cursor-pointer transition-transform hover:scale-[1.02] focus:outline-none"
              >
                <Plus className="h-4 w-4" /> Create Workspace
              </button>
              <button
                onClick={() => setJoinOpen(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-205 dark:border-slate-805 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 px-5.5 py-3 text-xs font-bold text-slate-655 dark:text-slate-350 transition-colors cursor-pointer focus:outline-none"
              >
                <Users className="h-4 w-4" /> Join via Code
              </button>
            </div>
          </motion.div>
        </section>
      ) : (

        /* WORKSPACES HORIZONTAL PINNED SHOWCASE */
        <section ref={triggerRef} className="relative w-full md:h-[140vh] shrink-0 block">
          
          {/* Sticky view holder (USING FLEX COLUMN WITH justify-between FOR NATURAL NON-OVERLAPPING ORDER) */}
          <div className="md:sticky md:top-0 md:h-screen md:overflow-hidden flex flex-col justify-between w-full bg-slate-50 dark:bg-[#050811] transition-colors duration-300 z-10 pt-20 pb-6">

            {/* Showcase Section Title (Responsive) */}
            <div className="px-6 md:px-24 mb-2 text-center md:text-left select-none shrink-0">
              <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Your Workspaces
              </h2>
              <p className="text-2xs md:text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                Select a space to access sprint boards, discussion channels, and file directories
              </p>
            </div>

            {/* Horizontal translate container wrapper (Centered vertically in the middle remaining height) */}
            <div className="flex-1 flex items-center overflow-hidden w-full min-h-0">
              <div 
                ref={scrollSectionRef} 
                className="flex flex-col md:flex-row gap-8 items-center w-full md:w-max px-6 md:px-24 py-6 md:py-0"
              >
                {workspaces.map((w, idx) => (
                  <div
                    key={w.workspace._id}
                    onClick={() => handleSelectWorkspace(w)}
                    className="workspace-card-item glass-card glass-card-hover w-full md:w-[480px] h-auto md:h-[480px] shrink-0 max-w-[90vw] flex flex-col justify-between overflow-hidden cursor-pointer group border border-slate-200/55 dark:border-slate-800/80 transition-all select-none duration-300"
                  >
                    {/* Card mockup dashboard visual representing image cover */}
                    <div className="relative h-44 w-full overflow-hidden border-b border-slate-200/10 dark:border-slate-805 bg-[#070b13] flex items-center justify-center p-4">
                      <div className="absolute inset-0 bg-grid-pattern opacity-15 pointer-events-none" />
                      <div className={`absolute inset-0 bg-gradient-to-br ${CARD_COVER_GRADIENTS[idx % CARD_COVER_GRADIENTS.length]} opacity-60`} />
                      
                      {/* Glowing particle ring behind name */}
                      <div className="absolute w-28 h-28 rounded-full bg-violet-500/10 dark:bg-violet-500/5 blur-2xl group-hover:scale-125 transition-transform duration-500" />

                      {/* Cyber Mock dashboard list elements inside the card header to make it visually dense */}
                      <div className="absolute bottom-3 left-4 right-4 flex justify-between items-center pointer-events-none select-none opacity-40 group-hover:opacity-75 transition-opacity duration-300 font-mono text-[9px] text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="h-3 w-3 text-violet-400" />
                          <span>sprint_v2_active</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3 w-3 text-violet-400" />
                          <span>docs_vault</span>
                        </div>
                      </div>
                      
                      <div className="relative z-10 flex flex-col items-center gap-2">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${CARD_TEXT_GRADIENTS[idx % CARD_TEXT_GRADIENTS.length]} flex items-center justify-center text-white font-extrabold text-2xl shadow-lg border border-white/10 group-hover:scale-105 transition-all duration-300`}>
                          {w.workspace.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                    </div>

                    {/* Body Details */}
                    <div className="p-6 md:p-8 flex-1 flex flex-col justify-between space-y-4 text-left">
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-3xs font-extrabold uppercase bg-violet-500/10 text-violet-655 dark:text-violet-400 border border-violet-500/20">
                            <ShieldCheck className="h-3 w-3" /> {w.role}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-3xs font-extrabold uppercase bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
                            Active
                          </span>
                        </div>

                        <h3 className="font-heading font-extrabold text-lg md:text-xl text-slate-900 dark:text-white group-hover:text-violet-500 transition-colors leading-snug">
                          {w.workspace.name}
                        </h3>
                        
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                          Discuss with team members, coordinate sprint backlogs, log wiki notes, and stream repository commits seamlessly inside customizable discussion rooms.
                        </p>
                      </div>

                      <div className="space-y-4 pt-3.5 border-t border-slate-100 dark:border-slate-900/60">
                        <div className="flex items-center gap-4 text-xs font-bold text-slate-455 dark:text-slate-500">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-violet-500" />
                            {w.workspace.members?.length || 1} members
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap className="h-4 w-4 text-violet-500" />
                            Live Hub
                          </span>
                        </div>

                        <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 group-hover:from-violet-600 group-hover:to-indigo-655 px-5 py-3 text-xs font-extrabold text-white shadow-md shadow-violet-500/10 transition-all cursor-pointer focus:outline-none">
                          Open Workspace <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* QUICK ACTIONS HORIZONTAL PANEL */}
                <div className="workspace-card-item glass-card w-full md:w-[480px] h-[360px] md:h-[480px] shrink-0 max-w-[90vw] flex flex-col justify-center items-center p-8 text-center border-2 border-dashed border-slate-350 dark:border-slate-805 bg-slate-50/20 dark:bg-slate-950/5 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
                  <div className="w-14 h-14 bg-violet-500/10 dark:bg-violet-950/20 text-violet-500 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-violet-500/20 group-hover:scale-110 transition-transform">
                    <Plus className="h-7 w-7" />
                  </div>
                  <h3 className="font-heading font-extrabold text-lg text-slate-900 dark:text-white mb-2">
                    Need another workspace?
                  </h3>
                  <p className="text-xs text-slate-455 dark:text-slate-400 font-semibold max-w-xs mb-8 leading-relaxed">
                    Launch a clean space for a separate project or join a colleague’s workspace by entering their invite code.
                  </p>
                  <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button
                      onClick={(e) => { e.stopPropagation(); setCreateOpen(true); }}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-md shadow-violet-500/10 cursor-pointer focus:outline-none z-10"
                    >
                      <Plus className="h-4 w-4" /> Create Workspace
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setJoinOpen(true); }}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-205 dark:border-slate-855 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 px-5 py-3 text-xs font-bold text-slate-655 dark:text-slate-350 transition-colors cursor-pointer focus:outline-none z-10"
                    >
                      <Users className="h-4 w-4" /> Join via Code
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Status / Navigation strip (In normal flex flow, guarantees zero overlapping) */}
            <div className="px-6 md:px-24 hidden md:flex justify-between items-center z-30 select-none shrink-0 pb-2">
              {/* Left: Scroll guide */}
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                <span className="text-3xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Scroll vertically to navigate workspaces
                </span>
              </div>

              {/* Center: Large premium progress tracker */}
              <div className="flex items-center gap-4 scroll-num-indicator font-mono">
                <span id="scroll-active-num" className="text-sm font-extrabold text-violet-500 dark:text-violet-400">01</span>
                <div className="relative w-48 h-[2px] bg-slate-200 dark:bg-slate-800">
                  <div className="scroll-progress-indicator absolute top-0 left-0 h-full bg-violet-500 origin-left scale-x-0 w-full" />
                </div>
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500">0{workspaces.length + 1}</span>
              </div>

              {/* Right: Quick Stats */}
              <div className="flex items-center gap-6 text-3xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                <span>Active workspaces: {workspaces.length}</span>
                <span>Role: Member</span>
              </div>
            </div>

          </div>
        </section>
      )}

      {/* ANIMATED STATISTICS SECTION */}
      <section className="relative w-full py-24 px-6 bg-[#04060b] text-white overflow-hidden stats-section-trigger z-25 border-t border-slate-900/70 shrink-0">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-violet-500/5 rounded-full blur-[90px] pointer-events-none" />
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-around gap-12 text-center relative z-10">
          <div className="space-y-2">
            <h3 id="stat-workspaces" className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">0+</h3>
            <p className="text-3xs font-extrabold uppercase tracking-widest text-slate-400">Total Teams Onboarded</p>
          </div>
          <div className="space-y-2">
            <h3 id="stat-sprints" className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-455 to-fuchsia-400 bg-clip-text text-transparent">0+</h3>
            <p className="text-3xs font-extrabold uppercase tracking-widest text-slate-400">Sprint Backlogs Managed</p>
          </div>
          <div className="space-y-2">
            <h3 id="stat-actions" className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-fuchsia-400 to-pink-400 bg-clip-text text-transparent">0+</h3>
            <p className="text-3xs font-extrabold uppercase tracking-widest text-slate-455">Live Socket Updates</p>
          </div>
        </div>
      </section>

      {/* WORKSPACE DETAILS / BOTTOM CTA */}
      <section className="relative w-full py-28 px-6 bg-slate-50 dark:bg-[#050811] border-t border-slate-200/20 dark:border-slate-900/50 z-25 flex flex-col items-center text-center overflow-hidden shrink-0">
        {/* Decorative background glows */}
        <div className="absolute -bottom-1/3 left-1/3 w-[450px] h-[450px] bg-violet-500/10 dark:bg-violet-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
        
        <div className="max-w-2xl w-full glass-card p-10 md:p-14 border border-slate-205 dark:border-slate-805 shadow-2xl relative">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-500/40 to-transparent"></div>
          
          <h2 className="font-heading text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight mb-4">
            Build with your squad.
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium max-w-lg mx-auto mb-8 leading-relaxed font-semibold">
            Collaborate on sprint timelines, discussion threads, document storage, and live repository commits under customizable workspaces.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-teal-655 px-6 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-violet-500/15 cursor-pointer focus:outline-none"
            >
              <Plus className="h-4.5 w-4.5" /> Start New Workspace
            </button>
            <button
              onClick={() => setJoinOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-205 dark:border-slate-855 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 px-6 py-3.5 text-xs font-extrabold text-slate-655 dark:text-slate-350 transition-colors cursor-pointer focus:outline-none"
            >
              <Users className="h-4.5 w-4.5" /> Join via Invite Code
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative w-full py-16 px-6 border-t border-slate-200/30 dark:border-slate-900 bg-white dark:bg-[#04060b] z-25 text-left shrink-0">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-500 to-indigo-500 text-white font-extrabold text-xl shadow-md shadow-violet-500/20">
                ⚡
              </span>
              <span className="font-heading font-extrabold text-lg tracking-tight text-violet-600 dark:text-violet-400">
                SyncFlow
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed font-semibold">
              SyncFlow is an all-in-one team collaboration platform connecting message threads, task schedules, document vaults, and webhook streams.
            </p>
            <div className="flex items-center gap-3.5 pt-2">
              <a href="https://github.com" target="_blank" rel="noreferrer" className="text-slate-405 hover:text-slate-900 dark:hover:text-white transition-colors" aria-label="GitHub">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                </svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="text-slate-405 hover:text-slate-900 dark:hover:text-white transition-colors" aria-label="Twitter">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="text-slate-405 hover:text-slate-900 dark:hover:text-white transition-colors" aria-label="LinkedIn">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="text-3xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Platform</h4>
            <ul className="space-y-2.5 text-xs text-slate-455 dark:text-slate-400 font-medium font-semibold">
              <li><a href="#channels" className="hover:text-emerald-500 transition-colors">Discussion Rooms</a></li>
              <li><a href="#sprints" className="hover:text-emerald-500 transition-colors">Sprint Backlogs</a></li>
              <li><a href="#vault" className="hover:text-emerald-500 transition-colors">Document Directory</a></li>
              <li><a href="#git" className="hover:text-emerald-500 transition-colors">Git Integrations</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-3xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Resources</h4>
            <ul className="space-y-2.5 text-xs text-slate-455 dark:text-slate-400 font-medium font-semibold">
              <li><a href="#docs" className="hover:text-emerald-500 transition-colors">Documentation</a></li>
              <li><a href="#guides" className="hover:text-emerald-500 transition-colors">Platform Guides</a></li>
              <li><a href="#api" className="hover:text-emerald-500 transition-colors">API Reference</a></li>
              <li><a href="#status" className="hover:text-emerald-500 transition-colors">System Status</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-3xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Company</h4>
            <ul className="space-y-2.5 text-xs text-slate-455 dark:text-slate-400 font-medium font-semibold">
              <li><a href="#about" className="hover:text-emerald-500 transition-colors">About Us</a></li>
              <li><a href="#careers" className="hover:text-emerald-500 transition-colors">Careers</a></li>
              <li><a href="#privacy" className="hover:text-emerald-500 transition-colors">Privacy Policy</a></li>
              <li><a href="#terms" className="hover:text-emerald-500 transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-slate-200/40 dark:border-slate-900/60 flex flex-col sm:flex-row items-center justify-between text-3xs text-slate-400 font-medium gap-4 font-semibold">
          <p>&copy; {new Date().getFullYear()} SyncFlow SaaS Platform. All rights reserved.</p>
          <p className="flex items-center gap-1">Built for modern agile teams.</p>
        </div>
      </footer>

      {/* MODAL: CREATE WORKSPACE */}
      <AnimatePresence>
        {createOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-105 dark:border-slate-805"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3 mb-4">
                <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Plus className="h-5 w-5 text-emerald-500" /> Create Workspace
                </h3>
                <button
                  onClick={() => setCreateOpen(false)}
                  className="text-slate-405 hover:text-slate-605 rounded p-1 cursor-pointer transition-colors focus:outline-none"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-3xs font-semibold text-slate-455 dark:text-slate-500 uppercase block mb-1 tracking-wider">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Marketing, Project Space"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-950/40 px-3.5 py-2.5 text-xs text-slate-800 dark:text-white outline-none premium-input placeholder-slate-400"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-850">
                  <button
                    type="button"
                    onClick={() => setCreateOpen(false)}
                    disabled={creating}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850 disabled:opacity-50 transition-colors focus:outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !newWorkspaceName.trim()}
                    className="rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/10 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer focus:outline-none"
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: JOIN WORKSPACE */}
      <AnimatePresence>
        {joinOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900/60 p-6 shadow-2xl border border-slate-105 dark:border-slate-805"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3 mb-4">
                <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Users className="h-5 w-5 text-emerald-500" /> Join a Workspace
                </h3>
                <button
                  onClick={() => setJoinOpen(false)}
                  className="text-slate-405 hover:text-slate-600 rounded p-1 cursor-pointer transition-colors focus:outline-none"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="text-3xs font-semibold text-slate-455 dark:text-slate-500 uppercase block mb-1 tracking-wider">
                    Invite Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. a1b2c3d4"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-950/40 px-3.5 py-2.5 text-xs text-slate-800 dark:text-white outline-none premium-input placeholder-slate-400"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-850">
                  <button
                    type="button"
                    onClick={() => setJoinOpen(false)}
                    disabled={joining}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850 disabled:opacity-50 transition-colors focus:outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={joining || !inviteCode.trim()}
                    className="rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/10 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer focus:outline-none"
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Workspaces;
