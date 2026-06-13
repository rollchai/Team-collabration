import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../../services/api';

// Thunks
export const fetchTasks = createAsyncThunk(
  'task/fetchByWorkspace',
  async (workspaceId, { rejectWithValue }) => {
    try {
      const response = await API.get(`/tasks?workspaceId=${workspaceId}`);
      return response.data; // expects { success: true, tasks: [...] }
    } catch (error) {
      return rejectWithValue(
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message
      );
    }
  }
);

export const createTask = createAsyncThunk(
  'task/create',
  async (taskData, { rejectWithValue }) => {
    try {
      const response = await API.post('/tasks/create', taskData);
      return response.data; // expects { success: true, task: ... }
    } catch (error) {
      return rejectWithValue(
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message
      );
    }
  }
);

export const updateTask = createAsyncThunk(
  'task/update',
  async ({ id, updateData }, { rejectWithValue }) => {
    try {
      const response = await API.put(`/tasks/${id}`, updateData);
      return response.data; // expects { success: true, task: ... }
    } catch (error) {
      return rejectWithValue(
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message
      );
    }
  }
);

export const deleteTask = createAsyncThunk(
  'task/delete',
  async (id, { rejectWithValue }) => {
    try {
      await API.delete(`/tasks/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message
      );
    }
  }
);

export const addComment = createAsyncThunk(
  'task/addComment',
  async ({ taskId, text }, { rejectWithValue }) => {
    try {
      const response = await API.post(`/tasks/${taskId}/comments`, { text });
      return response.data; // expects { success: true, task: ... }
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
  tasks: [],
  loading: false,
  error: null,
};

const taskSlice = createSlice({
  name: 'task',
  initialState,
  reducers: {
    clearTaskState(state) {
      state.tasks = [];
    },
    updateTaskLocally(state, action) {
      const index = state.tasks.findIndex((t) => t._id === action.payload._id);
      if (index !== -1) {
        state.tasks[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch tasks
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload.tasks;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create Task
      .addCase(createTask.fulfilled, (state, action) => {
        state.tasks.unshift(action.payload.task);
      })
      // Update Task
      .addCase(updateTask.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(
          (t) => t._id === action.payload.task._id
        );
        if (index !== -1) {
          state.tasks[index] = action.payload.task;
        }
      })
      // Delete Task
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.tasks = state.tasks.filter((t) => t._id !== action.payload);
      })
      // Add Comment
      .addCase(addComment.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(
          (t) => t._id === action.payload.task._id
        );
        if (index !== -1) {
          state.tasks[index] = action.payload.task;
        }
      });
  },
});

export const { clearTaskState, updateTaskLocally } = taskSlice.actions;
export default taskSlice.reducer;
