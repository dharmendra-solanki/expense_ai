import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiRouter from "./routes/api.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 8000;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://expense-trackers-ai.netlify.app"
    ],
    credentials: true,
  })
);

app.use(express.json());

app.use("/api", apiRouter);

app.get("/", (req, res) => {
  res.send("AI Expense Tracker Backend is running!");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});