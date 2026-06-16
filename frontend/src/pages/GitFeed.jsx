import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateCurrentWorkspaceRepo } from '../redux/slices/workspaceSlice';
import {
  GitBranch,
  RefreshCw,
  Search,
  ExternalLink,
  Lock,
  Check,
  AlertCircle,
  Settings,
  Copy,
} from 'lucide-react';
import API from '../services/api';
import { toast } from 'react-toastify';
import { getSocket } from '../services/socket';

const GitFeed = () => {
  const { currentWorkspace, currentRole } = useSelector((state) => state.workspace);
  const dispatch = useDispatch();
  const [repoInput, setRepoInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const isAdminOrManager = ['Admin', 'Manager'].includes(currentRole);
  const [copied, setCopied] = useState(false);

  const backendBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
  const webhookUrl = `${backendBaseUrl}/git/webhook/${currentWorkspace?._id}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success('Webhook Payload URL copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Connect to WebSocket and listen for real-time commits updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !currentWorkspace?._id) return;

    const handleGitActivity = (updatedActivities) => {
      setActivities(updatedActivities || []);
      toast.success('⚡ Real-time Git push feed updated!');
    };

    socket.on('git_activity_received', handleGitActivity);

    return () => {
      socket.off('git_activity_received', handleGitActivity);
    };
  }, [currentWorkspace?._id]);

  // Fetch Git Activities
  const fetchActivities = useCallback(async (searchVal = '') => {
    if (!currentWorkspace?._id) return;
    setLoading(true);
    try {
      const response = await API.get('/git', {
        headers: {
          'x-workspace-id': currentWorkspace._id,
        },
        params: {
          search: searchVal,
        },
      });
      if (response.data?.success) {
        setActivities(response.data.activities || []);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to fetch git activities');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?._id]);

  // Synchronize repoInput with current workspace config
  useEffect(() => {
    if (currentWorkspace) {
      setRepoInput(currentWorkspace.gitRepository || '');
      // Automatically toggle config view if no repo is configured and user is admin/manager
      setShowConfig(!currentWorkspace.gitRepository && isAdminOrManager);
      fetchActivities();
    }
  }, [currentWorkspace, isAdminOrManager, fetchActivities]);

  // Handle Save Configuration
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (!currentWorkspace?._id) return;

    setSavingConfig(true);
    try {
      const response = await API.post(
        '/git/config',
        { gitRepository: repoInput },
        {
          headers: {
            'x-workspace-id': currentWorkspace._id,
          },
        }
      );

      if (response.data?.success) {
        toast.success(response.data.message || 'Repository configured successfully');
        
        // Update local workspace state repository reference via Redux dispatch
        dispatch(updateCurrentWorkspaceRepo(response.data.gitRepository));
        
        // Hide configuration if successfully configured
        if (response.data.gitRepository) {
          setShowConfig(false);
        }
        
        // Fetch new feed
        fetchActivities();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to configure repository');
    } finally {
      setSavingConfig(false);
    }
  };

  // Handle Trigger Sync
  const handleSync = async () => {
    if (!currentWorkspace?._id) return;

    setSyncing(true);
    try {
      let commits = [];
      try {
        // Fetch commits directly client-side first to bypass server rate limits
        const githubResponse = await fetch(
          `https://api.github.com/repos/${currentWorkspace.gitRepository}/commits?per_page=30`
        );
        if (githubResponse.ok) {
          commits = await githubResponse.json();
        }
      } catch (ghErr) {
        console.warn('Failed client-side fetch from GitHub, trying server-side sync...', ghErr.message);
      }

      const response = await API.post(
        '/git/sync',
        { commits },
        {
          headers: {
            'x-workspace-id': currentWorkspace._id,
          },
        }
      );

      if (response.data?.success) {
        toast.success(response.data.message || 'Commits synced successfully');
        setActivities(response.data.activities || []);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to sync git activities');
    } finally {
      setSyncing(false);
    }
  };

  // Debounced/Triggered Search
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchActivities(searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    fetchActivities('');
  };

  // Helper to format date nicely
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/50 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <GitBranch className="h-6 w-6 text-green-500" />
          <div>
            <h1 className="font-heading text-xl md:text-2xl font-bold text-slate-800 dark:text-white leading-tight">
              Git Activity Feed
            </h1>
            <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">
              Track code integrations, author commits, and project activities for this workspace.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        {currentWorkspace?.gitRepository && (
          <div className="flex items-center gap-2">
            {isAdminOrManager && (
              <button
                onClick={() => setShowConfig(!showConfig)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  showConfig
                    ? 'bg-slate-100 dark:bg-slate-850 text-slate-800 dark:text-white border-slate-300 dark:border-slate-700'
                    : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 dark:border-slate-800 text-slate-605 dark:text-slate-300 hover:text-emerald-500'
                }`}
              >
                <Settings className="h-4 w-4 animate-spin-hover" />
                Configure
              </button>
            )}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-4 py-2 text-xs font-bold rounded-xl shadow-md shadow-emerald-500/15 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Commits'}
            </button>
          </div>
        )}
      </div>

      {/* Configuration Section */}
      {showConfig && (
        <div className="glass-card p-6 shadow-md space-y-4 transition-all duration-300 animate-in fade-in slide-in-from-top-2">
          <h3 className="font-heading text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Settings className="h-4.5 w-4.5 text-emerald-500" />
            GitHub Repository Linkage
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Link a public GitHub repository in <code className="bg-slate-100 dark:bg-slate-850 px-1.5 py-0.5 rounded font-mono text-2xs text-slate-750 dark:text-slate-350">owner/repo</code> format (e.g. <code className="font-mono text-2xs text-emerald-500">facebook/react</code>) to capture commits and author feed directly in your workspace.
          </p>

          <form onSubmit={handleSaveConfig} className="flex flex-col sm:flex-row gap-3 max-w-xl pt-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="e.g. expressjs/express"
                disabled={!isAdminOrManager || savingConfig}
                className="w-full rounded-lg border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-950 pl-3.5 pr-8 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 disabled:bg-slate-50 dark:disabled:bg-slate-900 premium-input"
              />
              {currentWorkspace?.gitRepository && (
                <div className="absolute right-2.5 top-2.5 text-emerald-500" title="Repository linked">
                  <Check className="h-4.5 w-4.5" />
                </div>
              )}
            </div>
            {isAdminOrManager && (
              <button
                type="submit"
                disabled={savingConfig}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-4 py-2 text-xs font-bold shadow-md shadow-emerald-500/15 transition-all duration-205 hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {savingConfig ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Connect'
                )}
              </button>
            )}
          </form>
          {currentWorkspace?.gitRepository && (
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-heading text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-emerald-500" />
                  GitHub Webhook Setup (Real-Time Commits)
                </h4>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-3xs font-bold bg-emerald-500/10 text-emerald-500">
                  <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active Receiver
                </span>
              </div>
              
              <p className="text-2xs text-slate-550 dark:text-slate-400 leading-relaxed">
                Connect a GitHub webhook to push commits automatically to this dashboard in real-time.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-3xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block mb-1">
                    Webhook Payload URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={webhookUrl}
                      className="flex-1 rounded-lg border border-slate-205 dark:border-slate-850 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-2xs font-mono text-slate-600 dark:text-slate-350 outline-none select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopyUrl}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-2xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-250 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="text-3xs font-bold text-slate-440 dark:text-slate-500 uppercase tracking-wider block mb-1">
                      Content Type
                    </span>
                    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-2xs font-mono text-slate-600 dark:text-slate-350">
                      application/json
                    </div>
                  </div>
                  <div>
                    <span className="text-3xs font-bold text-slate-440 dark:text-slate-500 uppercase tracking-wider block mb-1">
                      Event Trigger
                    </span>
                    <div className="inline-flex rounded-lg border border-emerald-250/20 bg-emerald-500/5 dark:border-emerald-950/20 dark:bg-emerald-950/5 px-3 py-1.5 text-2xs text-emerald-500 font-semibold">
                      Just the push event
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                  <h5 className="text-3xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">GitHub configuration steps:</h5>
                  <ol className="list-decimal list-inside text-3xs text-slate-500 dark:text-slate-400 space-y-1.5 leading-relaxed">
                    <li>Go to your GitHub repository and click on <strong>Settings</strong> at the top.</li>
                    <li>Select <strong>Webhooks</strong> in the left sidebar, then click <strong>Add webhook</strong>.</li>
                    <li>Paste the <strong>Payload URL</strong> copied above into the Payload URL field.</li>
                    <li>Choose <strong>application/json</strong> for the Content type.</li>
                    <li>Keep <strong>Just the push event</strong> selected.</li>
                    <li>Click <strong>Add webhook</strong> at the bottom.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
          {!isAdminOrManager && (
            <div className="flex items-center gap-1.5 text-slate-450 text-2xs mt-1">
              <Lock className="h-3.5 w-3.5" /> Only workspace Admins and Managers can edit repository linkage.
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      {currentWorkspace?.gitRepository ? (
        <div className="space-y-4">
          {/* Active Repo Status Card */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-emerald-250/20 bg-emerald-500/5 dark:border-emerald-950/20 dark:bg-emerald-950/5 text-xs text-slate-700 dark:text-slate-350">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 dark:bg-emerald-950/35 text-emerald-500">
                <GitBranch className="h-3.5 w-3.5" />
              </span>
              <div>
                Connected repository:{' '}
                <a
                  href={`https://github.com/${currentWorkspace.gitRepository}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-emerald-500 hover:text-emerald-600 hover:underline inline-flex items-center gap-0.5"
                >
                  {currentWorkspace.gitRepository}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
            {activities.length > 0 && (
              <div className="text-3xs text-slate-400 dark:text-slate-500 font-bold">
                Last updated: {formatDate(activities[0].createdAt)}
              </div>
            )}
          </div>

          {/* Search Filters */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search commits by message, author, or SHA..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-950 pl-9 pr-8 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 premium-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 top-2 text-xs font-bold text-slate-400 hover:text-slate-655"
                >
                  Clear
                </button>
              )}
            </div>
            <button
              type="submit"
              className="rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 text-xs font-semibold px-4 cursor-pointer text-slate-600 dark:text-slate-300 transition-colors"
            >
              Search
            </button>
          </form>

          {/* Timeline Feed Container */}
          <div className="pt-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
                <p className="text-xs text-slate-400">Loading commit activity...</p>
              </div>
            ) : activities.length === 0 ? (
              <div className="glass-card p-12 text-center space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-850 text-slate-400">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div className="max-w-sm mx-auto space-y-1">
                  <h4 className="font-heading text-sm font-bold text-slate-800">No activities found</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {searchQuery
                      ? 'No cached commits matched your search parameters. Try adjusting your query keywords.'
                      : 'We haven\'t synced any commits from this repository yet. Click "Sync Commits" above to populate the feed.'}
                  </p>
                </div>
                {!searchQuery && (
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-4.5 py-2 text-xs font-bold shadow-md shadow-emerald-500/15 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex items-center gap-1.5 mx-auto"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    Sync Commits Now
                  </button>
                )}
              </div>
            ) : (
              <div className="relative border-l border-slate-200/70 dark:border-slate-850 ml-4 pl-6 space-y-6">
                {activities.map((activity) => (
                  <div key={activity.sha} className="relative group">
                    {/* Timeline Dot */}
                    <span className="absolute -left-[31px] top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 border-white bg-slate-100 dark:border-slate-950 dark:bg-slate-900 group-hover:bg-emerald-500 group-hover:border-emerald-100 transition-colors duration-250 shadow-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 group-hover:bg-white"></span>
                    </span>

                    {/* Commit Card */}
                    <div className="glass-card glass-card-hover p-4 hover:shadow-md space-y-3">
                      {/* Author Header */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={activity.authorAvatar}
                            alt={activity.authorName}
                            onError={(e) => {
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(activity.authorName)}&background=22C55E&color=fff`;
                            }}
                            className="h-6 w-6 rounded-full object-cover border border-slate-100 dark:border-slate-800"
                          />
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-200 hover:underline">
                            {activity.authorName}
                          </div>
                          <span className="text-slate-300 dark:text-slate-800 font-semibold">•</span>
                          <span className="text-3xs text-slate-450 dark:text-slate-500 font-semibold">
                            {formatDate(activity.date)}
                          </span>
                        </div>

                        {/* External Commit Link / SHA */}
                        <div className="flex items-center gap-2">
                          <a
                            href={activity.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-3xs font-bold bg-slate-50 hover:bg-emerald-50 dark:bg-slate-950 dark:hover:bg-emerald-950/20 text-slate-500 hover:text-emerald-500 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-850 hover:border-emerald-200 dark:hover:border-emerald-950/40 transition-all shadow-inner flex items-center gap-1"
                          >
                            <span>{activity.sha.substring(0, 7)}</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </div>
                      </div>

                      {/* Commit Message */}
                      <p className="text-xs text-slate-750 dark:text-slate-300 font-semibold leading-relaxed break-words whitespace-pre-wrap">
                        {activity.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty / Onboarding State */
        <div className="glass-card p-8 md:p-12 text-center space-y-6 transition-colors max-w-2xl mx-auto shadow-md">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 shadow-inner">
            <GitBranch className="h-8 w-8" />
          </div>
          
          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="font-heading text-lg font-bold text-slate-800 dark:text-white">
              Connect a GitHub Repository
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Integrate your codebase activities to keep the team informed on commits, documentation upgrades, and version milestones directly in SyncFlow.
            </p>
          </div>

          {isAdminOrManager ? (
            <div className="pt-2 max-w-sm mx-auto">
              <button
                onClick={() => setShowConfig(true)}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-2.5 text-xs font-bold shadow-md shadow-emerald-500/15 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Configure Repository Linkage
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-205 dark:border-slate-855 text-2xs text-slate-500 dark:text-slate-400 max-w-md mx-auto text-left leading-relaxed">
              <Lock className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>
                Please ask your workspace <strong>Admin</strong> or <strong>Manager</strong> to configure the repository to display the Git Activity stream.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GitFeed;
