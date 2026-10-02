import { L, type L10n } from "@/lib/i18n/text";

export interface Badge {
  id: string;
  icon: string;
  title: L10n;
  description: L10n;
}

export const badges: Badge[] = [
  { id: "first-steps", icon: "🌱", title: L("First steps", "Erste Schritte"), description: L("Solve your first practice exercise.", "Löse deine erste Übungsaufgabe.") },
  { id: "on-a-roll", icon: "🔥", title: L("On a roll", "Im Lauf"), description: L("5 correct answers in a row in one topic.", "5 richtige Antworten in Folge in einem Thema.") },
  { id: "unstoppable", icon: "⚡", title: L("Unstoppable", "Unaufhaltsam"), description: L("10 correct answers in a row in one topic.", "10 richtige Antworten in Folge in einem Thema.") },
  { id: "all-rounder", icon: "🧭", title: L("All-rounder", "Allrounder"), description: L("Solve at least one exercise in every topic.", "Löse in jedem Thema mindestens eine Aufgabe.") },
  { id: "master", icon: "👑", title: L("Master", "Meister"), description: L("Earn all three mastery stars in a topic.", "Hole alle drei Meisterschaftssterne in einem Thema.") },
  { id: "sprinter", icon: "⏱️", title: L("Sprinter", "Sprinter"), description: L("Answer 8 or more correctly in a 60-second sprint.", "Beantworte in einem 60-Sekunden-Sprint 8 oder mehr richtig.") },
  { id: "habit", icon: "📅", title: L("Habit", "Gewohnheit"), description: L("Practise on 3 days in a row.", "Übe an 3 Tagen in Folge.") },
  { id: "echelon", icon: "🪜", title: L("Echelon expert", "Stufenprofi"), description: L("Row-reduce a matrix to reduced row echelon form.", "Bringe eine Matrix auf reduzierte Zeilenstufenform.") },
  { id: "under-par", icon: "⛳", title: L("Under par", "Unter Par"), description: L("Solve a Gauss-Jordan challenge within par.", "Löse eine Gauss-Jordan-Challenge innerhalb von Par.") },
  { id: "right-angle", icon: "📐", title: L("Right angle", "Rechter Winkel"), description: L("Find two orthogonal non-zero vectors in the 3D tool.", "Finde im 3D-Werkzeug zwei orthogonale Vektoren ≠ 0.") },
  { id: "transformer", icon: "🎬", title: L("Transformer", "Transformer"), description: L("Watch a matrix transform space in the 3D tool.", "Sieh im 3D-Werkzeug zu, wie eine Matrix den Raum verformt.") },
  { id: "order-matters", icon: "🔀", title: L("Order matters", "Reihenfolge zählt"), description: L("Discover that AB ≠ BA in the matrix multiplication tab.", "Entdecke im Tab Matrix × Matrix, dass AB ≠ BA.") },
  { id: "inverter", icon: "🔁", title: L("Inverter", "Invertierer"), description: L("Compute an inverse and confirm that A·A⁻¹ = E.", "Berechne eine Inverse und bestätige A·A⁻¹ = E.") },
  { id: "decomposer", icon: "🧱", title: L("Decomposer", "Zerleger"), description: L("Work through an LU decomposition all the way to the solution x.", "Rechne eine LR-Zerlegung bis zur Lösung x durch.") },
  { id: "predictor", icon: "🔮", title: L("Predictor", "Hellseher"), description: L("Predict every multiplier of an LU decomposition in quiz mode.", "Sage im Quiz-Modus jeden Faktor einer LR-Zerlegung richtig voraus.") },
  { id: "flatland", icon: "🥞", title: L("Flatland", "Flachland"), description: L("Find a matrix that squashes space flat (det A = 0).", "Finde eine Matrix, die den Raum flach drückt (det A = 0).") },
];

export const badgeById = (id: string) => badges.find((b) => b.id === id);
