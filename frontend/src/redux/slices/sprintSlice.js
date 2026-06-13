import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../../services/api';

// Fetch all sprints for a workspace
export const fetchSprints = createAsyncThunk(
  'sprint/fetchAll',
  async (workspaceId, { rejectWithValue }) => {
    try {
      const response = await API.get(`/sprints?workspaceId=${workspaceId}`);
      return response.data; // expects { success: true, sprints: [...] }
    } catch (error) {
      return rejectWithValue(
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message
      );
    }
  }
);

// Create a new sprint
export const createSprint = createAsyncThunk(
  'sprint/create',
  async (sprintData, { rejectWithValue }) => {
    try {
      const response = await API.post('/sprints/create', sprintData);
      return response.data; // expects { success: true, sprint: ... }
    } catch (error) {
      return rejectWithValue(
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message
      );
    }
  }
);

// Update sprint status/details
export const updateSprint = createAsyncThunk(
  'sprint/update',
  async ({ id, status, name, startDate, endDate }, { rejectWithValue }) => {
    try {
      const response = await API.put(`/sprints/${id}`, { status, name, startDate, endDate });
      return response.data; // expects { success: true, sprint: ... }
    } catch (error) {
      return rejectWithValue(
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message
      );
    }
  }
);

// Fetch sprint report data
export const fetchSprintReport = createAsyncThunk(
  'sprint/fetchReport',
  async (sprintId, { rejectWithValue }) => {
    try {
      const response = await API.get(`/sprints/${sprintId}/report`);
      return response.data; // expects { success: true, sprint: ..., stats: ..., burndownData: [...] }
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
  sprints: [],
  activeSprint: null,
  selectedSprintReport: null,
  loading: false,
  reportLoading: false,
  error: null,
};

const sprintSlice = createSlice({
  name: 'sprint',
  initialState,
  reducers: {
    clearSprintState(state) {
      state.sprints = [];
      state.activeSprint = null;
      state.selectedSprintReport = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch sprints
      .addCase(fetchSprints.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSprints.fulfilled, (state, action) => {
        state.loading = false;
        state.sprints = action.payload.sprints;
        // Find active sprint
        state.activeSprint = action.payload.sprints.find((s) => s.status === 'Active') || null;
      })
      .addCase(fetchSprints.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create Sprint
      .addCase(createSprint.fulfilled, (state, action) => {
        state.sprints.unshift(action.payload.sprint);
      })
      // Update Sprint
      .addCase(updateSprint.fulfilled, (state, action) => {
        const index = state.sprints.findIndex((s) => s._id === action.payload.sprint._id);
        if (index !== -1) {
          state.sprints[index] = action.payload.sprint;
        }
        // Update active sprint reference
        if (action.payload.sprint.status === 'Active') {
          // Deactivate any other active sprint locally
          state.sprints = state.sprints.map((s) =>
            s._id === action.payload.sprint._id ? action.payload.sprint : s.status === 'Active' ? { ...s, status: 'Planned' } : s
          );
          state.activeSprint = action.payload.sprint;
        } else if (state.activeSprint?._id === action.payload.sprint._id) {
          state.activeSprint = null;
        }
      })
      // Fetch Report
      .addCase(fetchSprintReport.pending, (state) => {
        state.reportLoading = true;
      })
      .addCase(fetchSprintReport.fulfilled, (state, action) => {
        state.reportLoading = false;
        state.selectedSprintReport = action.payload; // contains sprint, stats, burndownData
      })
      .addCase(fetchSprintReport.rejected, (state, action) => {
        state.reportLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearSprintState } = sprintSlice.actions;
export default sprintSlice.reducer;
