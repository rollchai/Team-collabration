import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';

// Pages
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import Dashboard from '../pages/Dashboard';
import Chat from '../pages/Chat';
import Tasks from '../pages/Tasks';
import Files from '../pages/Files';
import Calendar from '../pages/Calendar';
import Members from '../pages/Members';
import Wiki from '../pages/Wiki';
import Workspaces from '../pages/Workspaces';
import Settings from '../pages/Settings';
import GitFeed from '../pages/GitFeed';
import Performance from '../pages/Performance';
import Timeline from '../pages/Timeline';

// Guards
import ProtectedRoute from '../components/ProtectedRoute';
import RoleRoute from '../components/RoleRoute';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Route>

      {/* Protected App Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Workspace specific paths */}
        <Route path="workspace/:slug/dashboard" element={<Dashboard />} />
        <Route path="workspace/:slug/chat" element={<Chat />} />
        <Route path="workspace/:slug/tasks" element={<Tasks />} />
        <Route path="workspace/:slug/files" element={<Files />} />
        <Route path="workspace/:slug/calendar" element={<Calendar />} />
        <Route path="workspace/:slug/performance" element={<Performance />} />
        <Route path="workspace/:slug/timeline" element={<Timeline />} />
        <Route path="workspace/:slug/members" element={<Members />} />
        <Route path="workspace/:slug/wiki" element={<Wiki />} />
        <Route path="workspace/:slug/git-feed" element={<GitFeed />} />
        
        {/* Admin/Manager settings panel */}
        <Route
          path="workspace/:slug/settings"
          element={
            <RoleRoute allowedRoles={['Admin', 'Manager']}>
              <Settings />
            </RoleRoute>
          }
        />
        
        {/* Catch and redirect workspace relative roots */}
        <Route path="workspace/:slug" element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Standalone Workspaces Selector */}
      <Route
        path="/workspaces"
        element={
          <ProtectedRoute>
            <Workspaces />
          </ProtectedRoute>
        }
      />

      {/* Fallback route - ProtectedRoute loader will redirect as appropriate */}
      <Route path="*" element={<Navigate to="/workspaces" replace />} />
    </Routes>
  );
};

export default AppRoutes;
