const context = {
  config: {
    title: "",
    setTitle(title) {
      this.title = title;
    },
  },

  meta: {
    generatedAt: Date.now(),
  },

  users: Array.from({ length: 10 }, (_, i) => ({
    name: `User_${i}`,
    email: i % 2 === 0 ? `user${i}@mail.com` : null,
    active: i % 3 !== 0,

    profile:
      i % 2 === 0
        ? {
            age: 20 + i,
            location: {
              city: "Abuja",
              country: "Nigeria",
            },
            score: Math.random() * 100,
          }
        : null,

    tasks: Array.from({ length: 5 }, (_, j) => ({
      title: `Task_${i}_${j}`,
      priority: ["low", "medium", "high"][j % 3],
      completed: j % 2 === 0,
      tags: ["api", "frontend", "backend"].slice(0, (j % 3) + 1),

      subtasks: Array.from({ length: j % 3 }, (_, k) => ({
        title: `Subtask_${i}_${j}_${k}`,
        done: k % 2 === 0,
      })),
    })),

    meta: i % 2 === 0 ? { lastLogin: Date.now() - i * 1000000 } : null,
  })),

  utils: {
    formatDate(ts) {
      return new Date(Number(ts)).toISOString();
    },
    join(arr, sep) {
      return arr?.join(sep);
    },
    uppercase(str) {
      return str?.toUpperCase();
    },
  },

  math: {
    round(num, dp = 2) {
      return Number(num?.toFixed(dp));
    },
    percent(a, b) {
      if (!b) return 0;
      return ((a / b) * 100)?.toFixed(1);
    },
  },

  stats: {
    countCompleted(tasks) {
      return tasks?.filter((t) => t.completed).length;
    },
    countPending(tasks) {
      return tasks?.filter((t) => !t.completed).length;
    },
    totalTasks(users) {
      return users?.reduce((acc, u) => acc + u.tasks.length, 0);
    },
    totalCompleted(users) {
      return users?.reduce(
        (acc, u) => acc + u.tasks.filter((t) => t.completed).length,
        0,
      );
    },
    totalPending(users) {
      return users?.reduce(
        (acc, u) => acc + u.tasks.filter((t) => !t.completed).length,
        0,
      );
    },
    topUsers(users, n) {
      return [...users]
        ?.sort(
          (a, b) =>
            b.tasks.filter((t) => t.completed).length -
            a.tasks.filter((t) => t.completed).length,
        )
        ?.slice(0, n);
    },
  },
};

export default context;
