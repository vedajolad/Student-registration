// frontend/src/App.jsx

import { useState, useEffect } from "react";
import "./App.css";

const API_URL = "http://localhost:5000";

export default function App() {
  const [habit, setHabit] = useState("");
  const [habits, setHabits] = useState([]);
  const [checkins, setCheckins] = useState({});
  const [loading, setLoading] = useState(true);

  // Load all habits and check-ins
  const refreshAll = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/habits`);
      const habitData = await res.json();
      setHabits(habitData);

      const allCheckins = {};

      for (const h of habitData) {
        const r = await fetch(`${API_URL}/habits/${h.id}/checkins`);
        allCheckins[h.id] = await r.json();
      }

      setCheckins(allCheckins);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  // Add Habit
  const addHabit = async () => {
    if (!habit.trim()) return;

    try {
      await fetch(`${API_URL}/habits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: habit.trim() }),
      });

      setHabit("");
      await refreshAll();
    } catch (err) {
      console.error(err);
    }
  };

  // Check In
  const checkIn = async (id) => {
    try {
      await fetch(`${API_URL}/habits/${id}/checkin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      await refreshAll();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Habit
  const deleteHabit = async (id) => {
    try {
      await fetch(`${API_URL}/habits/${id}`, {
        method: "DELETE",
      });

      await refreshAll();
    } catch (err) {
      console.error(err);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="container">
      <h1>🔥 Habit Tracker</h1>

      <div className="newHabit">
        <input
          type="text"
          placeholder="e.g. Drink 2L water"
          value={habit}
          onChange={(e) => setHabit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addHabit();
            }
          }}
        />

        <button onClick={addHabit}>Add Habit</button>
      </div>

      {loading ? (
        <p>Loading your habits...</p>
      ) : habits.length === 0 ? (
        <p>No habits yet. Add one above to get started!</p>
      ) : (
        habits.map((h) => (
          <div className="habit-card" key={h.id}>
            <h3>{h.name}</h3>

            <p className="streak">
              {h.streak > 0
                ? `🔥 ${h.streak} day streak`
                : "No streak yet — check in today!"}
            </p>

            <button
              disabled={(checkins[h.id] || []).includes(today)}
              onClick={() => checkIn(h.id)}
            >
              {(checkins[h.id] || []).includes(today)
                ? "✅ Checked in today"
                : "Check In"}
            </button>

            <div className="history">
              {Array.from({ length: 7 }).map((_, index) => {
                const date = new Date();
                date.setDate(date.getDate() - (6 - index));

                const fullDate = date.toISOString().slice(0, 10);
                const done = (checkins[h.id] || []).includes(fullDate);

                return (
                  <div
                    key={index}
                    className={done ? "day done" : "day"}
                  >
                    {date.getDate()}
                  </div>
                );
              })}
            </div>

            <button
              className="delete"
              onClick={() => deleteHabit(h.id)}
            >
              Delete Habit
            </button>
          </div>
        ))
      )}
    </div>
  );
}