import React from 'react';
import { useSelector } from 'react-redux';
import { ShieldAlert } from 'lucide-react';

const RoleRoute = ({ children, allowedRoles }) => {
  const { currentRole } = useSelector((state) => state.workspace);

  if (!allowedRoles.includes(currentRole)) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center bg-white rounded-2xl shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30 text-red-500 mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Access Denied
        </h3>
        <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          This section requires {allowedRoles.join(' or ')} permissions. Your current role is <strong>{currentRole}</strong>.
        </p>
      </div>
    );
  }

  return children;
};

export default RoleRoute;
