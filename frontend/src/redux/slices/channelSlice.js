import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../../services/api';

// Thunks
export const fetchChannels = createAsyncThunk(
  'channel/fetchByWorkspace',
  async (workspaceId, { rejectWithValue }) => {
    try {
      const response = await API.get(`/channel/workspace/${workspaceId}`);
      return response.data; // expects { success: true, channels: [...] }
    } catch (error) {
      return rejectWithValue(
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message
      );
    }
  }
);

export const createChannel = createAsyncThunk(
  'channel/create',
  async (channelData, { rejectWithValue }) => {
    try {
      // workspaceId should be passed in headers, so authorizeWorkspaceRole handles it. 
      // We pass it in headers manually or through config
      const response = await API.post('/channel/create', channelData, {
        headers: {
          'x-workspace-id': channelData.workspaceId,
        },
      });
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

export const fetchOrCreateDM = createAsyncThunk(
  'channel/fetchOrCreateDM',
  async (dmData, { rejectWithValue }) => {
    try {
      const response = await API.post('/channel/dm', dmData);
      return response.data; // expects { success: true, channel: ... }
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
  channels: [],
  currentChannel: null, // Active channel or DM object
  loading: false,
  error: null,
};

const channelSlice = createSlice({
  name: 'channel',
  initialState,
  reducers: {
    setCurrentChannel(state, action) {
      state.currentChannel = action.payload;
    },
    clearChannelState(state) {
      state.channels = [];
      state.currentChannel = null;
    },
    addChannelLocally(state, action) {
      state.channels.push(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch channels
      .addCase(fetchChannels.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChannels.fulfilled, (state, action) => {
        state.loading = false;
        state.channels = action.payload.channels;
        // Auto-select general channel if available
        const general = action.payload.channels.find(
          (c) => c.name === 'general'
        );
        if (general && !state.currentChannel) {
          state.currentChannel = general;
        } else if (action.payload.channels.length > 0 && !state.currentChannel) {
          state.currentChannel = action.payload.channels[0];
        }
      })
      .addCase(fetchChannels.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create Channel
      .addCase(createChannel.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createChannel.fulfilled, (state, action) => {
        state.loading = false;
        state.channels.push(action.payload.channel);
        state.currentChannel = action.payload.channel;
      })
      .addCase(createChannel.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // DM Channel
      .addCase(fetchOrCreateDM.fulfilled, (state, action) => {
        state.currentChannel = action.payload.channel;
      });
  },
});

export const { setCurrentChannel, clearChannelState, addChannelLocally } = channelSlice.actions;
export default channelSlice.reducer;
