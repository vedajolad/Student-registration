// backend/index.js

const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const app = express();
app.use(cors());
app.use(express.json());

// Connect to SQLite
const db = new Database("data.db");

// Create habits table
db.prepare(`
CREATE TABLE IF NOT EXISTS habits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
)
`).run();

// Create checkins table
db.prepare(`
CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  habit_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  UNIQUE(habit_id, date)
)
`).run();

// Simple streak calculation
function calculateStreak(id) {
  return db.prepare(
    "SELECT COUNT(*) AS total FROM checkins WHERE habit_id=?"
  ).get(id).total;
}

// Create Habit
app.post("/habits", (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  const created_at = new Date().toISOString();

  const result = db.prepare(
    "INSERT INTO habits(name,created_at) VALUES(?,?)"
  ).run(name.trim(), created_at);

  res.status(201).json({
    id: result.lastInsertRowid,
    name,
    created_at,
    streak: 0,
  });
});

// Get All Habits
app.get("/habits", (req, res) => {
  const habits = db.prepare(
    "SELECT * FROM habits ORDER BY created_at"
  ).all();

  const data = habits.map(h => ({
    ...h,
    streak: calculateStreak(h.id),
  }));

  res.json(data);
});

// Check In
app.post("/habits/:id/checkin", (req, res) => {
  const id = req.params.id;
  const date =
    req.body.date || new Date().toISOString().slice(0, 10);

  const habit = db.prepare(
    "SELECT * FROM habits WHERE id=?"
  ).get(id);

  if (!habit) {
    return res.status(404).json({ error: "Habit not found" });
  }

  try {
    const checked_at = new Date().toISOString();

    const result = db.prepare(
      "INSERT INTO checkins(habit_id,date,checked_at) VALUES(?,?,?)"
    ).run(id, date, checked_at);

    res.status(201).json({
      id: result.lastInsertRowid,
      habit_id: id,
      date,
      checked_at,
      streak: calculateStreak(id),
    });

  } catch {
    res.status(409).json({
      error: "Already checked in for this date",
    });
  }
});

// Get Checkins
app.get("/habits/:id/checkins", (req, res) => {
  const rows = db.prepare(
    "SELECT date FROM checkins WHERE habit_id=? ORDER BY date DESC"
  ).all(req.params.id);

  res.json(rows.map(r => r.date));
});

// Delete One Checkin
app.delete("/habits/:id/checkin/:date", (req, res) => {
  db.prepare(
    "DELETE FROM checkins WHERE habit_id=? AND date=?"
  ).run(req.params.id, req.params.date);

  res.json({ message: "Checkin removed" });
});

// Delete Habit
app.delete("/habits/:id", (req, res) => {
  db.prepare(
    "DELETE FROM checkins WHERE habit_id=?"
  ).run(req.params.id);

  db.prepare(
    "DELETE FROM habits WHERE id=?"
  ).run(req.params.id);

  res.json({
    message: `Habit ${req.params.id} and its checkins deleted`,
  });
});

// Start Server
app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});