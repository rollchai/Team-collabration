import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchWorkspaces } from '../redux/slices/workspaceSlice';
import API from '../services/api';
import { toast } from 'react-toastify';

const Settings = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { currentWorkspace, currentRole } = useSelector((state) => state.workspace);
  const [copied, setCopied] = React.useState(false);

  // Copy invite link/code to clipboard
  const handleCopyInviteCode = () => {
    if (!currentWorkspace?.inviteCode) return;
    navigator.clipboard.writeText(currentWorkspace.inviteCode);
    setCopied(true);
    toast.success('Invite code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Delete Workspace (Admin only)
  const handleDeleteWorkspace = async () => {
    if (
      !window.confirm(
        `⚠️ WARNING: Are you absolutely sure you want to delete the workspace "${currentWorkspace?.name}"? All chats, tasks, and files will be permanently erased. This action CANNOT be undone.`
      )
    ) {
      return;
    }

    try {
      await API.delete(`/workspace/${currentWorkspace._id}`); // We will support this route or mock delete action
      toast.success('Workspace deleted successfully');
      dispatch(fetchWorkspaces()); // Refresh workspaces
      navigate('/');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete workspace');
    }
  };

  const isAdmin = currentRole === 'Admin';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6 max-w-4xl"
    >
      {/* Page Header */}
      <div className="flex items-center gap-3 border-b border-slate-200/50 dark:border-slate-800 pb-4">
        <SettingsIcon className="h-5.5 w-5.5 text-emerald-500" />
        <div>
          <h1 className="font-heading text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white leading-tight">
            Workspace Settings
          </h1>
          <p className="text-xs text-slate-505 dark:text-slate-400 mt-0.5">
            Configure sharing codes, update workspace information, and review security parameters.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Workspace info & Invite Code Card */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="glass-card p-6 rounded-2xl shadow-sm space-y-5 transition-all duration-200"
        >
          <h3 className="font-heading text-base font-extrabold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-805 pb-3">
            General Configuration
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-3xs font-extrabold uppercase tracking-wider text-slate-400 block mb-1">Workspace Name</span>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{currentWorkspace?.name}</p>
            </div>
            <div>
              <span className="text-3xs font-extrabold uppercase tracking-wider text-slate-400 block mb-1">URL Identifier (Slug)</span>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{currentWorkspace?.slug}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-805 space-y-2">
            <span className="text-3xs font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">Workspace Invite Code</span>
            <div className="flex max-w-md items-center gap-2 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 shadow-inner focus-within:border-emerald-500/35 transition-colors">
              <span className="font-mono text-xs font-bold text-slate-750 dark:text-slate-350 select-all flex-1 px-2">
                {currentWorkspace?.inviteCode}
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCopyInviteCode}
                className="rounded-lg bg-white hover:bg-slate-50 p-1.5 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-850 hover:text-emerald-500 text-slate-500 cursor-pointer shadow-2xs transition-colors"
                title="Copy code to clipboard"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </motion.button>
            </div>
            <p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold leading-relaxed">
              Share this code with team members. They can enter it in their dashboard switcher to join instantly.
            </p>
          </div>
        </motion.div>

        {/* Danger Zone */}
        {isAdmin && (
          <motion.div 
            whileHover={{ y: -2 }}
            className="rounded-2xl border border-red-500/20 bg-red-500/5 dark:border-red-500/10 p-6 shadow-sm space-y-4 transition-all duration-200"
          >
            <h3 className="font-heading text-base font-extrabold text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Danger Zone
            </h3>
            <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed font-semibold">
              Once you delete a workspace, there is no going back. All messages, task lists, comment threads, and file records will be deleted from our database.
            </p>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDeleteWorkspace}
              className="rounded-xl bg-red-500 hover:bg-red-600 px-4.5 py-2.5 text-xs font-bold text-white shadow transition-colors cursor-pointer"
            >
              Delete Workspace
            </motion.button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default Settings;
