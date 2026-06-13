import Sprint from '../models/Sprint.js';
import Task from '../models/Task.js';

// @desc    Create a new sprint
// @route   POST /api/sprints/create
// @access  Private
export const createSprint = async (req, res, next) => {
  const { name, workspaceId, startDate, endDate } = req.body;

  try {
    if (!name || !workspaceId || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'All fields (name, workspaceId, startDate, endDate) are required' });
    }

    const sprint = await Sprint.create({
      name,
      workspace: workspaceId,
      startDate,
      endDate,
      status: 'Planned',
    });

    res.status(201).json({
      success: true,
      sprint,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all sprints for a workspace
// @route   GET /api/sprints
// @access  Private
export const getSprints = async (req, res, next) => {
  const { workspaceId } = req.query;

  try {
    if (!workspaceId) {
      return res.status(400).json({ success: false, message: 'Workspace ID query parameter is required' });
    }

    const sprints = await Sprint.find({ workspace: workspaceId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      sprints,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a sprint (status, details)
// @route   PUT /api/sprints/:id
// @access  Private
export const updateSprint = async (req, res, next) => {
  const { id } = req.params;
  const { name, startDate, endDate, status } = req.body;

  try {
    let sprint = await Sprint.findById(id);
    if (!sprint) {
      return res.status(404).json({ success: false, message: 'Sprint not found' });
    }

    if (name) sprint.name = name;
    if (startDate) sprint.startDate = startDate;
    if (endDate) sprint.endDate = endDate;

    if (status) {
      sprint.status = status;
      if (status === 'Completed') {
        sprint.completedAt = new Date();

        // Agile Best Practice: When a sprint is completed, any unfinished tasks are returned to the Backlog.
        // Unfinished tasks are tasks where status is NOT 'Completed'.
        await Task.updateMany(
          { sprint: id, status: { $ne: 'Completed' } },
          { $set: { sprint: null } }
        );
      }
    }

    await sprint.save();

    res.json({
      success: true,
      sprint,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get sprint statistics & burndown chart data
// @route   GET /api/sprints/:id/report
// @access  Private
export const getSprintReport = async (req, res, next) => {
  const { id } = req.params;

  try {
    const sprint = await Sprint.findById(id);
    if (!sprint) {
      return res.status(404).json({ success: false, message: 'Sprint not found' });
    }

    const tasks = await Task.find({ sprint: id });

    // Calculate story points and task completion statistics
    let totalPoints = 0;
    let completedPoints = 0;
    let completedCount = 0;

    tasks.forEach((task) => {
      const pts = task.storyPoints || 1;
      totalPoints += pts;
      if (task.status === 'Completed') {
        completedPoints += pts;
        completedCount++;
      }
    });

    const totalTasks = tasks.length;
    const completionRatio = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

    // Generate Burndown Chart Data
    const burndownData = [];
    const start = new Date(sprint.startDate);
    const end = new Date(sprint.endDate);

    // Normalize dates to midnight for consistent comparisons
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const totalMs = end.getTime() - start.getTime();
    const totalDays = Math.max(1, Math.round(totalMs / (1000 * 60 * 60 * 24)));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const current = new Date(start);

    for (let d = 0; d <= totalDays; d++) {
      const dateString = current.toISOString().split('T')[0];

      // Ideal Burndown line (evenly spaced decline from totalPoints to 0)
      const idealPoints = Math.max(0, parseFloat((totalPoints - (totalPoints / totalDays) * d).toFixed(1)));

      // Actual Remaining Points as of this date
      let actualCompletedPoints = 0;
      tasks.forEach((task) => {
        if (task.status === 'Completed' && task.completedAt) {
          const completedDate = new Date(task.completedAt);
          completedDate.setHours(0, 0, 0, 0);
          if (completedDate <= current) {
            actualCompletedPoints += task.storyPoints || 1;
          }
        }
      });

      const remainingPoints = totalPoints - actualCompletedPoints;

      // Only display actual burndown data for past/current days
      const isPastOrToday = current <= today;

      burndownData.push({
        day: `Day ${d}`,
        date: dateString,
        ideal: idealPoints,
        remaining: isPastOrToday ? remainingPoints : null,
      });

      // Increment day
      current.setDate(current.getDate() + 1);
    }

    // Velocity calculation (average completed story points of past 3 sprints)
    const pastCompletedSprints = await Sprint.find({
      workspace: sprint.workspace,
      status: 'Completed',
    })
      .sort({ completedAt: -1 })
      .limit(3);

    const velocities = [];
    for (const s of pastCompletedSprints) {
      const sTasks = await Task.find({ sprint: s._id, status: 'Completed' });
      const sprintVelocity = sTasks.reduce((acc, t) => acc + (t.storyPoints || 1), 0);
      velocities.push({ sprintName: s.name, velocity: sprintVelocity });
    }

    const avgVelocity = velocities.length > 0
      ? Math.round(velocities.reduce((acc, v) => acc + v.velocity, 0) / velocities.length)
      : completedPoints; // Fallback to current completed points if no past sprints

    res.json({
      success: true,
      sprint,
      stats: {
        totalTasks,
        completedCount,
        completionRatio,
        totalPoints,
        completedPoints,
        avgVelocity,
        velocities,
      },
      burndownData,
    });
  } catch (error) {
    next(error);
  }
};
