export interface Badge {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export const badges: Badge[] = [
  { id: "first-steps", icon: "🌱", title: "First steps", description: "Solve your first practice exercise." },
  { id: "on-a-roll", icon: "🔥", title: "On a roll", description: "5 correct answers in a row in one topic." },
  { id: "unstoppable", icon: "⚡", title: "Unstoppable", description: "10 correct answers in a row in one topic." },
  { id: "all-rounder", icon: "🧭", title: "All-rounder", description: "Solve at least one exercise in every topic." },
  { id: "master", icon: "👑", title: "Master", description: "Earn all three mastery stars in a topic." },
  { id: "sprinter", icon: "⏱️", title: "Sprinter", description: "Answer 8 or more correctly in a 60-second sprint." },
  { id: "habit", icon: "📅", title: "Habit", description: "Practise on 3 days in a row." },
  { id: "echelon", icon: "🪜", title: "Echelon expert", description: "Row-reduce a matrix to reduced row echelon form." },
  { id: "under-par", icon: "⛳", title: "Under par", description: "Solve a Gauss-Jordan challenge within par." },
  { id: "right-angle", icon: "📐", title: "Right angle", description: "Find two orthogonal non-zero vectors in the 3D tool." },
  { id: "transformer", icon: "🎬", title: "Transformer", description: "Watch a matrix transform space in the 3D tool." },
  { id: "flatland", icon: "🥞", title: "Flatland", description: "Find a matrix that squashes space flat (det A = 0)." },
];

export const badgeById = (id: string) => badges.find((b) => b.id === id);
