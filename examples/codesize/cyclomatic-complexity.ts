// Threshold lowered to 3 for this example. See ../.oxlintrc.json.
const handler = (value) => {
  if (value) return 1;
  if (!value) return 2;
};
