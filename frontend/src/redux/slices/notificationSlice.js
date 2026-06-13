import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../../services/api';

// Thunks
export const fetchNotifications = createAsyncThunk(
  'notification/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await API.get('/notifications');
      return response.data; // expects { success: true, notifications: [...] }
    } catch (error) {
      return rejectWithValue(
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message
      );
    }
  }
);

export const markRead = createAsyncThunk(
  'notification/markRead',
  async (notificationId, { rejectWithValue }) => {
    try {
      const response = await API.put('/notifications/mark-read', { notificationId });
      return { notificationId, data: response.data };
    } catch (error) {
      return rejectWithValue(
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message
      );
    }
  }
);

const initialState = {
  notifications: [],
  loading: false,
  error: null,
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    addLiveNotification(state, action) {
      state.notifications.unshift(action.payload);
    },
    clearNotificationState(state) {
      state.notifications = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload.notifications;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Mark Read
      .addCase(markRead.fulfilled, (state, action) => {
        const { notificationId } = action.payload;
        if (notificationId) {
          const index = state.notifications.findIndex(
            (n) => n._id === notificationId
          );
          if (index !== -1) {
            state.notifications[index].read = true;
          }
        } else {
          // All marked read
          state.notifications.forEach((n) => {
            n.read = true;
          });
        }
      });
  },
});

export const { addLiveNotification, clearNotificationState } = notificationSlice.actions;
export default notificationSlice.reducer;
