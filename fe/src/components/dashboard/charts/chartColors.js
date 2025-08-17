export const plotlyColors = [
  '#1890ff',
  '#E15759', // Red
  '#F28E2B', // Orange
  '#59A14F', // Green
  '#76B7B2', // Teal
  '#EDC948', // Yellow
  '#B07AA1', // Purple
  '#FF9DA7', // Pink
  '#9C755F', // Brown
  '#BAB0AC', // Gray
  '#8CD17D', // Light Green
  '#D37295', // Rose
  '#FABFD2', // Light Pink
  '#A0CBE8', // Sky Blue
  '#FFBE7D'  // Peach
];

export function getPlotlyColor(index) {
  return plotlyColors[index % plotlyColors.length];
}
