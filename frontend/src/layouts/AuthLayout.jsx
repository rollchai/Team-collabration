import React from 'react';
import { Outlet } from 'react-router-dom';
import { MessageSquare, LayoutGrid, FolderHeart, GitBranch } from 'lucide-react';
import { motion } from 'framer-motion';

const AuthLayout = () => {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#050811] p-4 sm:p-6 lg:p-8 overflow-hidden transition-colors">
      
      {/* Premium Ambient Glow Lights */}
      <motion.div 
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.45, 0.3],
          x: [0, 20, 0],
          y: [0, -20, 0]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-1/4 left-1/4 w-80 h-80 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -z-10"
      />
      <motion.div 
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
          x: [0, -30, 0],
          y: [0, 30, 0]
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
        className="absolute bottom-1/4 right-1/4 w-[380px] h-[380px] bg-teal-500/10 dark:bg-teal-500/5 rounded-full blur-3xl pointer-events-none -z-10"
      />

      {/* Floating Decorative Glass Spheres */}
      <motion.div
        animate={{
          y: [0, -15, 0],
          rotate: [0, 360, 360]
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute top-10 right-10 w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 backdrop-blur-[2px] border border-white/10 hidden lg:block"
      />
      <motion.div
        animate={{
          y: [0, 20, 0],
          rotate: [360, 0, 0]
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute bottom-10 left-10 w-32 h-32 rounded-full bg-gradient-to-br from-teal-500/10 to-emerald-500/10 backdrop-blur-[2px] border border-white/10 hidden lg:block"
      />

      <div className="grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-3xl bg-white/70 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/60 shadow-2xl backdrop-blur-xl md:grid-cols-2">
        
        {/* Branding Sidebar Panel */}
        <div className="hidden flex-col justify-between bg-gradient-to-br from-[#0a0f1d] to-[#02050e] p-10 text-white md:flex border-r border-slate-200/5 dark:border-slate-800/20 relative overflow-hidden">
          {/* Grid background effect */}
          <div className="absolute inset-0 bg-grid-pattern opacity-25"></div>
          {/* cover glowing line */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent"></div>
          
          <div className="relative z-10">
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-2.5 font-heading font-extrabold text-2xl tracking-tight"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
                ⚡
              </span>
              <span className="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">SyncFlow</span>
            </motion.div>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mt-2 text-slate-400 text-xs font-semibold"
            >
              Modern Workspace Management Platform
            </motion.p>
          </div>

          <div className="space-y-7 relative z-10">
            <motion.h2 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-3xl font-extrabold font-heading leading-tight tracking-tight bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-transparent"
            >
              Unify your team’s chat, tasks, and files.
            </motion.h2>
            
            <div className="space-y-4 text-xs text-slate-350">
              {[
                { icon: <MessageSquare className="h-3.5 w-3.5" />, text: "Real-Time Channel & DM Chats" },
                { icon: <LayoutGrid className="h-3.5 w-3.5" />, text: "Interactive Sprint Kanban Boards" },
                { icon: <FolderHeart className="h-3.5 w-3.5" />, text: "Drag-and-Drop Shared Document Vault" },
                { icon: <GitBranch className="h-3.5 w-3.5" />, text: "Git commit feeds & deployment webhooks" }
              ].map((item, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + idx * 0.1, duration: 0.4 }}
                  className="flex items-center gap-3"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 shadow-2xs">
                    {item.icon}
                  </span>
                  <span className="font-semibold text-slate-300">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <p className="text-4xs text-slate-500 font-bold tracking-wider uppercase relative z-10">
            &copy; {new Date().getFullYear()} SyncFlow. All rights reserved.
          </p>
        </div>

        {/* Content Form Panel */}
        <div className="flex flex-col justify-center p-8 sm:p-12 bg-white/30 dark:bg-slate-900/10 backdrop-blur-md">
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

