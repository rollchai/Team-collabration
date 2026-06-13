import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import workspaceReducer from './slices/workspaceSlice';
import channelReducer from './slices/channelSlice';
import taskReducer from './slices/taskSlice';
import notificationReducer from './slices/notificationSlice';
import sprintReducer from './slices/sprintSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    workspace: workspaceReducer,
    channel: channelReducer,
    task: taskReducer,
    notification: notificationReducer,
    sprint: sprintReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Turn off serialization warnings for socket.io instances if held
    }),
});

export default store;
