export interface Preset {
  label: string;
  text: string;
}

export interface PresetGroup {
  label: string;
  presets: Preset[];
}

/** Example systems from the lecture slides and exercises (augmented matrices). */
export const gaussPresetGroups: PresetGroup[] = [
  {
    label: "Vorlesung",
    presets: [
      {
        label: "Folie 7",
        text: `
2.0   -3.0   -17.0
5.0   -7.0   -36.0`,
      },
      {
        label: "Folie 13",
        text: `
6.0   -1.0   -1.0    4.0
1.0    1.0   10.0   -6.0
2.0   -1.0    1.0   -2.0`,
      },
    ],
  },
  {
    label: "Gauss",
    presets: [
      {
        label: "Übung 1",
        text: `
 1.0    1.0   2.0    8.0
-1.0   -2.0   3.0    1.0
 3.0   -7.0   4.0   10.0`,
      },
      {
        label: "Übung 2",
        text: `
 2.0    2.0   2.0    0.0
-2.0    5.0   2.0    1.0
 8.0    1.0   4.0   -1.0`,
      },
      {
        label: "Übung 3",
        text: `
 1.0   -1.0    2.0   -1.0   -1.0
 2.0    1.0   -2.0   -2.0   -2.0
-1.0    2.0   -4.0    1.0    1.0
 3.0    0.0    0.0   -3.0   -3.0`,
      },
      {
        label: "Übung 4",
        text: `
0.0   -2.0    3.0    1.0
3.0    6.0   -3.0   -2.0
6.0    6.0    3.0    5.0`,
      },
      {
        label: "Übung 5",
        text: `
2.0   -3.0   -2.0
2.0    1.0    1.0
3.0    2.0    1.0`,
      },
      {
        label: "Übung 6",
        text: `
3.0    2.0   -1.0   -15.0
5.0    3.0    2.0     0.0
3.0    1.0    3.0    11.0
6.0   -4.0    2.0    30.0`,
      },
      {
        label: "Übung 7",
        text: `
 4.0   -8.0   12.0
 3.0   -6.0    9.0
-2.0    4.0   -6.0`,
      },
      {
        label: "Übung 8",
        text: `
0.0   10.0   -4.0    1.0    1.0
1.0    4.0   -1.0    1.0    2.0
3.0    2.0    1.0    2.0    5.0
2.0   -8.0    2.0   -2.0   -4.0
1.0   -6.0    3.0    0.0    1.0`,
      },
    ],
  },
  {
    label: "Gauss-Jordan",
    presets: [
      {
        label: "Übung 9",
        text: `
 5.0    3.0    2.0   1.0   0.0   0.0
-1.0   -1.0    1.0   0.0   1.0   0.0
-3.0   -2.0   -1.0   0.0   0.0   1.0`,
      },
    ],
  },
];
