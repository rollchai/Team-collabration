import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../../services/api';

// Thunks
export const fetchWorkspaces = createAsyncThunk(
  'workspace/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await API.get('/workspace');
      return response.data; // expects { success: true, workspaces: [...] }
    } catch (error) {
      return rejectWithValue(
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message
      );
    }
  }
);

export const createWorkspace = createAsyncThunk(
  'workspace/create',
  async (workspaceData, { rejectWithValue }) => {
    try {
      const response = await API.post('/workspace/create', workspaceData);
      return response.data; // expects { success: true, workspace: ..., defaultChannel: ... }
    } catch (error) {
      return rejectWithValue(
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message
      );
    }
  }
);

export const inviteUser = createAsyncThunk(
  'workspace/invite',
  async (inviteData, { rejectWithValue }) => {
    try {
      const response = await API.post('/workspace/invite', inviteData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message
      );
    }
  }
);

export const joinWorkspaceByCode = createAsyncThunk(
  'workspace/join',
  async (inviteCode, { rejectWithValue }) => {
    try {
      const response = await API.post(`/workspace/join/${inviteCode}`);
      return response.data;
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
  workspaces: [],
  currentWorkspace: null, // Holds the active workspace object
  currentRole: 'Member',  // User's role in active workspace
  loading: false,
  error: null,
};

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setCurrentWorkspace(state, action) {
      const workspaceObj = action.payload; // can be complete workspace object
      if (workspaceObj) {
        state.currentWorkspace = workspaceObj;
        // Search user's role in this workspace
        // Note: workspaceObj might be nested in the format { workspace, role }
        const matched = state.workspaces.find(
          (w) => w.workspace._id === workspaceObj._id
        );
        state.currentRole = matched ? matched.role : 'Member';
      } else {
        state.currentWorkspace = null;
        state.currentRole = 'Member';
      }
    },
    clearWorkspaceState(state) {
      state.workspaces = [];
      state.currentWorkspace = null;
      state.currentRole = 'Member';
    },
    updateCurrentWorkspaceRepo(state, action) {
      if (state.currentWorkspace) {
        state.currentWorkspace.gitRepository = action.payload;
        const matched = state.workspaces.find(
          (w) => w.workspace._id === state.currentWorkspace._id
        );
        if (matched) {
          matched.workspace.gitRepository = action.payload;
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch workspaces
      .addCase(fetchWorkspaces.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkspaces.fulfilled, (state, action) => {
        state.loading = false;
        state.workspaces = action.payload.workspaces;
        if (action.payload.workspaces.length > 0 && !state.currentWorkspace) {
          // Default to first workspace
          state.currentWorkspace = action.payload.workspaces[0].workspace;
          state.currentRole = action.payload.workspaces[0].role;
        }
      })
      .addCase(fetchWorkspaces.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create Workspace
      .addCase(createWorkspace.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createWorkspace.fulfilled, (state, action) => {
        state.loading = false;
        const newW = {
          workspace: action.payload.workspace,
          role: 'Admin',
        };
        state.workspaces.push(newW);
        state.currentWorkspace = action.payload.workspace;
        state.currentRole = 'Admin';
      })
      .addCase(createWorkspace.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setCurrentWorkspace, clearWorkspaceState, updateCurrentWorkspaceRepo } = workspaceSlice.actions;
export default workspaceSlice.reducer;
