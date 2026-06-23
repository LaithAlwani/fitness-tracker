import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Every Monday morning, drop a body-weight reminder for users who haven't
// already weighed in this week.
crons.weekly(
  "weekly body-weight reminder",
  { dayOfWeek: "monday", hourUTC: 14, minuteUTC: 0 },
  internal.notifications.ensureWeeklyForAll,
);

// Daily "move today" nudge — late afternoon, for users still inactive that day.
crons.daily(
  "daily exercise reminder",
  { hourUTC: 17, minuteUTC: 0 },
  internal.notifications.ensureDailyForAll,
);

export default crons;
