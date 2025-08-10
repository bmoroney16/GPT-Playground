/**
 * Generate an ASCII visualization of a tide-driven wave grid.
 * Each call returns a string representing the grid at a given time.
 */
function generateTideFrame({
  grid = 10,
  amp = 0.45,
  freq = 0.65,
  speed = 0.6,
  tidePeriod = 18,
  time = 0,
}) {
  const rows = [];
  for (let z = 0; z < grid; z++) {
    let row = "";
    for (let x = 0; x < grid; x++) {
      const wave = Math.sin((x + time * speed) * freq);
      const tide = Math.sin(time / tidePeriod);
      const y = wave * amp + tide * amp;
      row += y > 0 ? "~" : "_";
    }
    rows.push(row);
  }
  return rows.join("\n");
}

module.exports = { generateTideFrame };

if (require.main === module) {
  for (let i = 0; i < 3; i++) {
    console.log(generateTideFrame({ time: i }));
    console.log();
  }
}
