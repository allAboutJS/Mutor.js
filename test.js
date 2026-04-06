const smallText = "x";
const mediumText =
  "Hello, this is a medium length string for testing purposes.";
const largeText =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";

function testConcatenation(text, label) {
  const iterations = 100;

  // Test 1: String +=
  console.time(`${label} - String +=`);
  let result1 = "";
  for (let i = 0; i < iterations; i++) {
    result1 += text;
  }
  console.timeEnd(`${label} - String +=`);

  // Test 2: Array push + join
  console.time(`${label} - Array push + join`);
  let result2 = [];
  for (let i = 0; i < iterations; i++) {
    result2.push(text);
  }
  result2 = result2.join("");
  console.timeEnd(`${label} - Array push + join`);

  console.log("---");
}

testConcatenation(smallText, "Small text");
testConcatenation(mediumText, "Medium text");
testConcatenation(largeText, "Large text");

function countLinesToIdx(str, idx) {
  let linesCount = 1,
    lastNewlineIdx = 0;

  while (lastNewlineIdx < str.length) {
    const prevNewlineIdx = lastNewlineIdx;
    lastNewlineIdx = str.indexOf("\n", lastNewlineIdx);
    if (lastNewlineIdx > idx || lastNewlineIdx === -1) {
      lastNewlineIdx = prevNewlineIdx;
      break;
    }

    linesCount++;
    lastNewlineIdx++;
  }

  return { linesCount, lastNewlineIdx };
}

function getLineSnapshot(str, lineIdx, idx) {
  const nextNewlineIdx = str.indexOf("\n", lineIdx);
  const line = str.slice(
    lineIdx,
    nextNewlineIdx === -1 ? undefined : nextNewlineIdx,
  );
  return { line, pos: lineIdx - idx };
}

function constructPointer(pos, offset) {
  return "_".repeat(Math.abs(pos) + offset) + "^";
}

const str = ` 
Hello there,
Onah Victor.
Fuck Me!
Too`;
const nameIdx = str.indexOf("T");
const { lastNewlineIdx, linesCount } = countLinesToIdx(str, nameIdx);
const snapshot = getLineSnapshot(str, lastNewlineIdx, nameIdx);

console.log(linesCount, "|", snapshot.line);
console.log(constructPointer(snapshot.pos, 4));
