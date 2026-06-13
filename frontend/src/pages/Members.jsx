import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Users,
  Plus,
  Loader2,
  Mail,
  Shield,
  Trash2,
  UserCheck,
  Award,
  Globe,
  Radio
} from 'lucide-react';
import API from '../services/api';
import { toast } from 'react-toastify';
import { fetchWorkspaces } from '../redux/slices/workspaceSlice';

const Members = () => {
  const dispatch = useDispatch();

  const { currentWorkspace, currentRole } = useSelector((state) => state.workspace);
  const { user: currentUser } = useSelector((state) => state.auth);

  // States
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);

  // Invite Form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Member');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // Load members
  const loadMembers = () => {
    if (!currentWorkspace?._id) return;
    setLoading(true);
    API.get(`/members?workspaceId=${currentWorkspace._id}`)
      .then((res) => {
        setMembers(res.data.members);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
        toast.error('Failed to load members');
      });
  };

  useEffect(() => {
    loadMembers();
  }, [currentWorkspace]);

  // Submit email invitation
  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    try {
      await API.post('/workspace/invite', {
        email: inviteEmail,
        role: inviteRole,
        workspaceId: currentWorkspace._id,
      });

      toast.success(`Invitation sent to ${inviteEmail}!`);
      setInviteEmail('');
      setInviteRole('Member');
      setInviteModalOpen(false);
      loadMembers(); // Refresh list
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  // Change member role (restricted to Admins)
  const handleChangeRole = async (userId, newRole) => {
    try {
      await API.put('/members/role', {
        workspaceId: currentWorkspace._id,
        userId,
        role: newRole,
      });

      toast.success('Role updated successfully');
      loadMembers(); // Refresh list
      dispatch(fetchWorkspaces()); // Refresh workspaces configuration
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update member role');
    }
  };

  const isAdmin = currentRole === 'Admin';

  // Dynamic statistics
  const totalCount = members.length;
  const onlineCount = members.filter(m => m.user?.status === 'online').length;
  const adminCount = members.filter(m => m.role === 'Admin').length;
  const managerCount = members.filter(m => m.role === 'Manager').length;

  // Role style selector helper
  const getRoleStyle = (role) => {
    switch (role) {
      case 'Admin':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shadow-emerald-500/5';
      case 'Manager':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 shadow-indigo-500/5';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/15';
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Users className="h-5.5 w-5.5" />
          </div>
          <div>
            <h1 className="font-heading text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight leading-tight">
              Team Directory
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Manage team roles, presence, and invite new members to collaborate.
            </p>
          </div>
        </div>

        {/* Invite button - only Manager/Admin */}
        {['Admin', 'Manager'].includes(currentRole) && (
          <button
            onClick={() => setInviteModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-650 px-4.5 py-2 text-xs font-extrabold text-white shadow-md shadow-emerald-500/15 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <Plus className="h-4.5 w-4.5" /> Invite Teammate
          </button>
        )}
      </div>

      {/* Directory Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Members */}
        <div className="glass-card p-4 rounded-2xl flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-4xs font-extrabold uppercase tracking-wider text-slate-400">Total Teammates</p>
            <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mt-0.5">{totalCount}</h4>
          </div>
        </div>

        {/* Active Now */}
        <div className="glass-card p-4 rounded-2xl flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0 relative">
            <Radio className="h-5 w-5 animate-pulse" />
            <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-emerald-500"></span>
          </div>
          <div>
            <p className="text-4xs font-extrabold uppercase tracking-wider text-slate-400">Online Now</p>
            <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mt-0.5">{onlineCount}</h4>
          </div>
        </div>

        {/* Admins */}
        <div className="glass-card p-4 rounded-2xl flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <p className="text-4xs font-extrabold uppercase tracking-wider text-slate-400">Administrators</p>
            <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mt-0.5">{adminCount}</h4>
          </div>
        </div>

        {/* Managers */}
        <div className="glass-card p-4 rounded-2xl flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-4xs font-extrabold uppercase tracking-wider text-slate-400">Workspace Managers</p>
            <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mt-0.5">{managerCount}</h4>
          </div>
        </div>
      </div>

      {/* Members list */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => {
            const isMe = member.user?._id === currentUser?._id;
            const isOnline = member.user?.status === 'online';
            const isAway = member.user?.status === 'away';
            
            return (
              <div
                key={member._id}
                className="glass-card glass-card-hover p-5 rounded-2xl flex flex-col justify-between border border-slate-200/50 dark:border-slate-800/60 shadow-md group relative overflow-hidden"
              >
                {/* Decorative spotlight glow behind avatar on card hover */}
                <span className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-emerald-500/5 blur-xl group-hover:bg-emerald-500/10 transition-all duration-300"></span>
                
                <div className="flex items-start gap-4">
                  {/* Styled Avatar with presence rings */}
                  <div className="relative">
                    <img
                      src={member.user?.avatar}
                      alt={member.user?.name}
                      className={`h-14 w-14 rounded-full object-cover ring-2 ${
                        isOnline 
                          ? 'ring-emerald-500/30 dark:ring-emerald-400/40' 
                          : isAway 
                          ? 'ring-amber-500/30 dark:ring-amber-400/40' 
                          : 'ring-slate-200 dark:ring-slate-800'
                      } shadow-md`}
                    />
                    <span className={`absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                      isOnline ? 'bg-emerald-500' : isAway ? 'bg-amber-500' : 'bg-slate-400'
                    }`}></span>
                  </div>
                  
                  <div className="truncate flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-extrabold text-slate-850 dark:text-slate-100 leading-tight truncate">
                        {member.user?.name}
                      </h3>
                      {isMe && (
                        <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-4xs font-extrabold px-1.5 py-0.5 rounded-md uppercase border border-emerald-500/20 shrink-0">
                          Me
                        </span>
                      )}
                    </div>
                    <p className="text-3xs text-slate-400 dark:text-slate-500 truncate mt-1 flex items-center gap-1">
                      <Mail className="h-3 w-3 inline text-slate-350 dark:text-slate-600" />
                      {member.user?.email}
                    </p>
                    <div className="mt-3.5 flex items-center gap-1.5">
                      <span className={`inline-flex px-2.5 py-0.5 text-3xs font-extrabold uppercase rounded-full tracking-wide ${getRoleStyle(member.role)}`}>
                        {member.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Role Changer Dropdown - only Admins can change other users' roles */}
                {isAdmin && !isMe && currentWorkspace?.owner !== member.user?._id && (
                  <div className="mt-5 pt-4 border-t border-slate-150/40 dark:border-slate-800/60 flex items-center justify-between gap-2">
                    <span className="text-4xs font-extrabold uppercase tracking-wider text-slate-400">Manage Privileges</span>
                    <select
                      value={member.role}
                      onChange={(e) => handleChangeRole(member.user?._id, e.target.value)}
                      className="rounded-xl border border-slate-205/65 dark:border-slate-800 bg-white/50 dark:bg-slate-950 px-2.5 py-1 text-3xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 backdrop-blur-md cursor-pointer transition-all duration-200"
                    >
                      <option value="Member">Member</option>
                      <option value="Manager">Manager</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* INVITE TEAMMATE MODAL */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white/90 dark:bg-slate-900/95 p-6 shadow-2xl border border-white/20 dark:border-slate-800/80 backdrop-blur-lg scale-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-extrabold text-slate-850 dark:text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-500" />
                Invite a Teammate
              </h3>
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-655 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Add your colleagues by entering their email address. They will be added to the workspace general chat room instantly.
            </p>
            <form onSubmit={handleSendInvite} className="mt-5 space-y-4">
              <div>
                <label className="text-3xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="email"
                    placeholder="teammate@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-205/65 dark:border-slate-800 bg-white/30 dark:bg-slate-950/40 pl-10.5 pr-3.5 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 backdrop-blur-md transition-all duration-200 placeholder-slate-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-3xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">
                  Assigned Workspace Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full rounded-xl border border-slate-205/65 dark:border-slate-800 bg-white/30 dark:bg-slate-950/40 px-3.5 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 backdrop-blur-md transition-all duration-200 cursor-pointer"
                >
                  <option value="Member">Member (default permissions)</option>
                  <option value="Manager">Manager (can manage tasks/channels)</option>
                  <option value="Admin">Admin (full configuration controls)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-550 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-855 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-650 px-4.5 py-2.5 text-xs font-extrabold text-white shadow-md disabled:opacity-55 cursor-pointer transition-all duration-200"
                >
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Members;

