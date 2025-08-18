import jimp from "jimp";

async function normalizeToPng(inputPath, outputPath) {
  const image = await jimp.read(inputPath);

  // Convert and save as PNG
  return new Promise((resolve, reject) => {
    image.getBuffer(jimp.MIME_PNG, (err, buffer) => {
      if (err) return reject(err);

      // Write to output file
      import("fs").then(fs => {
        fs.writeFileSync(outputPath, buffer);
        console.log(`✅ Saved: ${outputPath}`);
        resolve();
      });
    });
  });
}

async function main() {
  const inputPath = process.argv[2]; // pass image path as argument
  const outputPath = "output.png";

  console.log(`📂 Using input: ${inputPath}`);
  await normalizeToPng(inputPath, outputPath);
}

main();
