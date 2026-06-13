import React from 'react';
import { Outlet } from 'react-router-dom';
import { MessageSquare, LayoutGrid, FolderHeart, GitBranch } from 'lucide-react';

const AuthLayout = () => {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#090D16] p-4 sm:p-6 lg:p-8 overflow-hidden transition-colors">
      
      {/* Premium Ambient Glow Lights */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse duration-[8000ms]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[380px] h-[380px] bg-teal-500/10 dark:bg-teal-500/5 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse duration-[10000ms] delay-1000"></div>

      <div className="grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-3xl bg-white/70 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/60 shadow-2xl backdrop-blur-xl md:grid-cols-2">
        
        {/* Branding Sidebar Panel */}
        <div className="hidden flex-col justify-between bg-gradient-to-br from-[#0F172A] to-[#020617] p-10 text-white md:flex border-r border-slate-200/10 relative overflow-hidden">
          {/* subtle decoration glow inside sidebar */}
          <span className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></span>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 font-heading font-extrabold text-2xl tracking-tight">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
                ⚡
              </span>
              <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">SyncFlow</span>
            </div>
            <p className="mt-2 text-slate-400 text-xs font-semibold">
              Modern Workspace Management Platform
            </p>
          </div>

          <div className="space-y-7 relative z-10">
            <h2 className="text-3xl font-extrabold font-heading leading-tight tracking-tight bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Unify your team’s chat, tasks, and files.
            </h2>
            
            <div className="space-y-4 text-xs text-slate-350">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-2xs">
                  <MessageSquare className="h-3.5 w-3.5" />
                </span>
                <span className="font-semibold">Real-Time Channel & DM Chats</span>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-2xs">
                  <LayoutGrid className="h-3.5 w-3.5" />
                </span>
                <span className="font-semibold">Interactive Sprint Kanban Boards</span>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-2xs">
                  <FolderHeart className="h-3.5 w-3.5" />
                </span>
                <span className="font-semibold">Drag-and-Drop Shared Document Vault</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-2xs">
                  <GitBranch className="h-3.5 w-3.5" />
                </span>
                <span className="font-semibold">Git commit feeds & deployment webhooks</span>
              </div>
            </div>
          </div>

          <p className="text-4xs text-slate-500 font-bold tracking-wider uppercase relative z-10">
            &copy; 2026 SyncFlow. All rights reserved.
          </p>
        </div>

        {/* Content Form Panel */}
        <div className="flex flex-col justify-center p-8 sm:p-12 bg-white/40 dark:bg-slate-900/10 backdrop-blur-md">
          {/* Mobile branding header */}
          <div className="mb-8 flex justify-center md:hidden">
            <div className="flex items-center gap-2 font-heading font-extrabold text-2xl text-slate-800 dark:text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-md">
                ⚡
              </span>
              <span>SyncFlow</span>
            </div>
          </div>
          
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-350">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;

