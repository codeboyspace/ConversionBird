const express = require("express");
const imageRoutes = require("./routes/ImageRoute");

const app = express();
const PORT = 3000;

app.use("/api/images", imageRoutes);
app.use("/uploads/output", express.static("uploads/output"));


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
