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

export default crons;
