import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
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
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <SettingsIcon className="h-6 w-6 text-green-500" />
        <div>
          <h1 className="font-heading text-xl md:text-2xl font-bold text-slate-800 dark:text-white leading-tight">
            Workspace Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure sharing codes, update workspace information, and review security parameters.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Workspace info & Invite Code Card */}
        <div className="rounded-2xl border border-slate-200/60 bg-white dark:bg-slate-900 dark:border-slate-800 p-6 shadow-sm space-y-5 transition-colors">
          <h3 className="font-heading text-base font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
            General Configuration
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-3xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">Workspace Name</span>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{currentWorkspace?.name}</p>
            </div>
            <div>
              <span className="text-3xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">URL Identifier (Slug)</span>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{currentWorkspace?.slug}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-850 space-y-2">
            <span className="text-3xs font-semibold uppercase tracking-wider text-slate-400 block">Workspace Invite Code</span>
            <div className="flex max-w-md items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 shadow-inner">
              <span className="font-mono text-xs font-bold text-slate-750 dark:text-slate-350 select-all flex-1 px-1">
                {currentWorkspace?.inviteCode}
              </span>
              <button
                onClick={handleCopyInviteCode}
                className="rounded-md bg-white hover:bg-slate-50 p-1.5 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-850 hover:text-green-500 text-slate-500 cursor-pointer shadow-sm transition-colors"
                title="Copy code to clipboard"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-3xs text-slate-400">
              Share this code with team members. They can enter it in their dashboard switcher to join instantly.
            </p>
          </div>
        </div>

        {/* Danger Zone */}
        {isAdmin && (
          <div className="rounded-2xl border border-red-200/50 bg-red-50/10 dark:border-red-950/20 p-6 shadow-sm space-y-4">
            <h3 className="font-heading text-base font-bold text-red-650 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Danger Zone
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed">
              Once you delete a workspace, there is no going back. All messages, task lists, comment threads, and file records will be deleted from our database.
            </p>
            
            <button
              onClick={handleDeleteWorkspace}
              className="rounded-lg bg-red-500 hover:bg-red-650 px-4 py-2.5 text-xs font-bold text-white shadow transition-colors cursor-pointer"
            >
              Delete Workspace
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
