import axios from 'axios';
import Workspace from '../models/Workspace.js';
import GitActivity from '../models/GitActivity.js';

// @desc    Configure Git Repository for a workspace
// @route   POST /api/git/config
// @access  Private (Admin, Manager)
export const configureGitRepository = async (req, res, next) => {
  const { gitRepository } = req.body;

  try {
    const workspace = req.workspace; // Attached by authorizeWorkspaceRole middleware

    if (gitRepository && gitRepository.trim() !== '') {
      let trimmedRepo = gitRepository.trim();
      
      // Automatically extract 'owner/repo' from full GitHub HTTP URLs or SSH URLs
      trimmedRepo = trimmedRepo
        .replace(/^(https?:\/\/github\.com\/|git@github\.com:)/i, '')
        .replace(/\.git$/i, '')
        .replace(/\/+$/, '');

      const repoRegex = /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/;
      
      if (!repoRegex.test(trimmedRepo)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid repository format. Please use "owner/repo" (e.g. facebook/react) or a full GitHub link.',
        });
      }

      // Verify the public repository exists on GitHub
      try {
        const headers = { 'User-Agent': 'CompanyTeams-App' };
        if (process.env.GITHUB_TOKEN) {
          headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
        }
        await axios.get(`https://api.github.com/repos/${trimmedRepo}`, { headers });
      } catch (err) {
        console.error('[ConfigureGit] Repository verification failed:', err.message);
        
        // Only block configuration if we are sure the repo doesn't exist (404)
        if (err.response && err.response.status === 404) {
          return res.status(400).json({
            success: false,
            message: 'GitHub repository not found, or it is private. Please ensure the repository is public and spelled correctly.',
          });
        }
        
        // For rate limiting (403), network timeouts, etc., log a warning but let the configuration proceed
        console.warn('[ConfigureGit] Bypassing verification check due to rate-limiting or network error.');
      }

      workspace.gitRepository = trimmedRepo;
    } else {
      workspace.gitRepository = '';
    }

    await workspace.save();

    res.json({
      success: true,
      message: 'Git repository configured successfully',
      gitRepository: workspace.gitRepository,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Sync latest Git commits from GitHub API
// @route   POST /api/git/sync
// @access  Private (Admin, Manager, Member)
export const syncGitActivities = async (req, res, next) => {
  try {
    const workspace = req.workspace; // Attached by authorizeWorkspaceRole middleware

    if (!workspace.gitRepository) {
      return res.status(400).json({
        success: false,
        message: 'No Git repository configured for this workspace. Please configure one first.',
      });
    }

    let commits = [];

    // If commits are passed in the request body, use them directly (client-side fetch bypasses rate limits)
    if (req.body.commits && Array.isArray(req.body.commits)) {
      commits = req.body.commits;
    } else {
      // Fetch the last 30 commits from the GitHub repository
      const headers = { 'User-Agent': 'CompanyTeams-App' };
      if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
      }
      const response = await axios.get(
        `https://api.github.com/repos/${workspace.gitRepository}/commits?per_page=30`,
        { headers }
      );
      commits = response.data;
    }

    if (!Array.isArray(commits)) {
      return res.status(500).json({
        success: false,
        message: 'Unexpected response format from GitHub API',
      });
    }

    // Format commits for DB insertion
    const activitiesToSave = commits.map((c) => {
      const authorName = c.commit.author.name || (c.author && c.author.login) || 'Unknown Author';
      const authorAvatar = (c.author && c.author.avatar_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=22C55E&color=fff`;

      return {
        workspace: workspace._id,
        sha: c.sha,
        authorName,
        authorAvatar,
        message: c.commit.message,
        url: c.html_url,
        date: new Date(c.commit.author.date),
      };
    });

    // Write commits to MongoDB in bulk to avoid duplicates
    const operations = activitiesToSave.map((activity) => ({
      updateOne: {
        filter: { workspace: workspace._id, sha: activity.sha },
        update: { $set: activity },
        upsert: true,
      },
    }));

    if (operations.length > 0) {
      await GitActivity.bulkWrite(operations);
    }

    // Fetch the stored activities to return the updated list
    const updatedActivities = await GitActivity.find({ workspace: workspace._id })
      .sort({ date: -1 })
      .limit(100);

    res.json({
      success: true,
      message: `Successfully synced ${activitiesToSave.length} commits`,
      activities: updatedActivities,
    });
  } catch (error) {
    console.error('[SyncGitActivities] Error:', error.message);
    if (error.response) {
      if (error.response.status === 403) {
        return res.status(403).json({
          success: false,
          message: 'GitHub API limit exceeded or access forbidden. Please try again later.',
        });
      }
      if (error.response.status === 404) {
        return res.status(404).json({
          success: false,
          message: 'GitHub repository not found or private. Please check workspace configuration.',
        });
      }
    }
    next(error);
  }
};

// @desc    Get synced Git activities
// @route   GET /api/git
// @access  Private (Admin, Manager, Member)
export const getGitActivities = async (req, res, next) => {
  try {
    const workspaceId = req.workspace._id; // Attached by authorizeWorkspaceRole middleware
    const { search } = req.query;

    let query = { workspace: workspaceId };

    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { message: searchRegex },
        { authorName: searchRegex },
        { sha: searchRegex },
      ];
    }

    const activities = await GitActivity.find(query)
      .sort({ date: -1 })
      .limit(100);

    res.json({
      success: true,
      activities,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Receive GitHub webhook push notifications
// @route   POST /api/git/webhook/:workspaceId
// @access  Public (Called by GitHub webhook service)
export const githubWebhookHandler = async (req, res, next) => {
  const { workspaceId } = req.params;

  try {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    const githubEvent = req.headers['x-github-event'];
    console.log(`[GitHubWebhook] Event received: "${githubEvent}" for workspace: ${workspace.name}`);

    // If it's a ping event (sent when webhook is first created), return success
    if (githubEvent === 'ping') {
      return res.status(200).json({ success: true, message: 'Webhook registered successfully' });
    }

    if (githubEvent !== 'push') {
      return res.status(200).json({
        success: true,
        message: `Event type "${githubEvent}" received. We only process push events.`,
      });
    }

    const payload = req.body;
    const commits = payload.commits;

    if (!commits || !Array.isArray(commits) || commits.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No commits in payload to process',
      });
    }

    // Format commits for DB insertion
    const activitiesToSave = commits.map((c) => {
      const authorName = c.author.name || c.author.username || 'Unknown Author';
      const authorAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=22C55E&color=fff`;

      return {
        workspace: workspace._id,
        sha: c.id,
        authorName,
        authorAvatar,
        message: c.message,
        url: c.url,
        date: new Date(c.timestamp),
      };
    });

    // Write commits to MongoDB in bulk, avoiding duplicates
    const operations = activitiesToSave.map((activity) => ({
      updateOne: {
        filter: { workspace: workspace._id, sha: activity.sha },
        update: { $set: activity },
        upsert: true,
      },
    }));

    if (operations.length > 0) {
      await GitActivity.bulkWrite(operations);
    }

    // Retrieve active SocketIO server instance
    const io = req.app.get('socketio');
    if (io) {
      // Fetch the updated activities list
      const updatedActivities = await GitActivity.find({ workspace: workspace._id })
        .sort({ date: -1 })
        .limit(100);

      // Broadcast update to all sockets subscribed to this workspace
      io.in(`workspace_${workspace._id}`).emit('git_activity_received', updatedActivities);
      console.log(`[GitHubWebhook] Broadcasted git update to workspace_${workspace._id}`);
    }

    res.status(200).json({
      success: true,
      message: `Successfully processed and synced ${activitiesToSave.length} commits via webhook`,
    });
  } catch (error) {
    console.error('[GitHubWebhook] Error handling webhook:', error.message);
    next(error);
  }
};

