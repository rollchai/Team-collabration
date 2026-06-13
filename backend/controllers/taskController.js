import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

// @desc    Create a new task
// @route   POST /api/tasks/create
// @access  Private
export const createTask = async (req, res, next) => {
  const { title, description, workspaceId, assigneeId, priority, dueDate, sprintId, storyPoints } = req.body;

  try {
    if (!title || !workspaceId) {
      return res.status(400).json({ success: false, message: 'Title and Workspace ID are required' });
    }

    const taskData = {
      title,
      description,
      workspace: workspaceId,
      priority: priority || 'Medium',
      createdBy: req.user._id,
    };

    if (assigneeId) {
      taskData.assignee = assigneeId;
    }

    if (dueDate) {
      taskData.dueDate = dueDate;
    }

    if (sprintId) {
      taskData.sprint = sprintId;
    }

    if (storyPoints !== undefined) {
      taskData.storyPoints = storyPoints;
    }

    let task = await Task.create(taskData);
    task = await Task.findById(task._id)
      .populate('assignee', 'name email avatar status')
      .populate('createdBy', 'name email avatar status')
      .populate('sprint');

    // Create notification for assignee
    if (assigneeId && assigneeId !== req.user._id.toString()) {
      await Notification.create({
        recipient: assigneeId,
        sender: req.user._id,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `You have been assigned to the task: ${title}`,
        link: `/workspace/task-board`, // We will handle dynamic redirection on frontend
      });
    }

    res.status(201).json({
      success: true,
      task,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all tasks for a workspace
// @route   GET /api/tasks
// @access  Private
export const getTasks = async (req, res, next) => {
  const { workspaceId } = req.query;

  try {
    if (!workspaceId) {
      return res.status(400).json({ success: false, message: 'Workspace ID query parameter is required' });
    }

    const tasks = await Task.find({ workspace: workspaceId })
      .populate('assignee', 'name email avatar status')
      .populate('createdBy', 'name email avatar status')
      .populate('sprint')
      .populate('comments.user', 'name avatar email')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      tasks,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a task (status, assignee, details)
// @route   PUT /api/tasks/:id
// @access  Private
export const updateTask = async (req, res, next) => {
  const { id } = req.params;
  const { title, description, assigneeId, status, priority, dueDate, sprintId, storyPoints } = req.body;

  try {
    let task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const originalAssignee = task.assignee ? task.assignee.toString() : null;

    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (status) {
      // Set completedAt date when transitioning to Completed
      if (status === 'Completed' && task.status !== 'Completed') {
        task.completedAt = new Date();
      } else if (status !== 'Completed') {
        task.completedAt = null;
      }
      task.status = status;
    }
    if (priority) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (storyPoints !== undefined) task.storyPoints = storyPoints;
    if (sprintId !== undefined) {
      task.sprint = sprintId || null;
    }
    if (assigneeId !== undefined) {
      task.assignee = assigneeId || null;
    }

    await task.save();

    task = await Task.findById(id)
      .populate('assignee', 'name email avatar status')
      .populate('createdBy', 'name email avatar status')
      .populate('sprint')
      .populate('comments.user', 'name avatar email');

    // Notify new assignee if changed
    if (
      assigneeId &&
      assigneeId !== req.user._id.toString() &&
      assigneeId !== originalAssignee
    ) {
      await Notification.create({
        recipient: assigneeId,
        sender: req.user._id,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `You have been assigned to the task: ${task.title}`,
        link: `/workspace/task-board`,
      });
    }

    // Notify assignee about status updates
    if (
      status &&
      task.assignee &&
      task.assignee._id.toString() !== req.user._id.toString()
    ) {
      await Notification.create({
        recipient: task.assignee._id,
        sender: req.user._id,
        type: 'task_updated',
        title: 'Task Status Updated',
        message: `The task "${task.title}" has been updated to "${status}"`,
        link: `/workspace/task-board`,
      });
    }

    res.json({
      success: true,
      task,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private
export const deleteTask = async (req, res, next) => {
  const { id } = req.params;

  try {
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await Task.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add comment to a task
// @route   POST /api/tasks/:id/comments
// @access  Private
export const addTaskComment = async (req, res, next) => {
  const { id } = req.params;
  const { text } = req.body;

  try {
    if (!text) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.comments.push({
      user: req.user._id,
      text,
    });

    await task.save();

    const updatedTask = await Task.findById(id)
      .populate('assignee', 'name email avatar status')
      .populate('createdBy', 'name email avatar status')
      .populate('comments.user', 'name avatar email');

    // Notify assignee if someone else comments
    if (
      updatedTask.assignee &&
      updatedTask.assignee._id.toString() !== req.user._id.toString()
    ) {
      await Notification.create({
        recipient: updatedTask.assignee._id,
        sender: req.user._id,
        type: 'task_updated',
        title: 'New Comment on Task',
        message: `${req.user.name} commented on "${updatedTask.title}"`,
        link: `/workspace/task-board`,
      });
    }

    res.json({
      success: true,
      task: updatedTask,
    });
  } catch (error) {
    next(error);
  }
};
