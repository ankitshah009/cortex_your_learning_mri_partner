import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { HomePage } from "./app/HomePage";
import { LandingPage } from "./app/LandingPage";
import { CoursePage } from "./app/CoursePage";
import { HomeworkPage } from "./app/HomeworkPage";
import { SolvePage } from "./app/SolvePage";
import { CustomProblemPage } from "./app/CustomProblemPage";
import { JudgeMode } from "./components/judge/JudgePanel";

/**
 * First visit in a session shows the cinematic landing page; entering reveals
 * the app without navigating, so every existing link to "/" keeps working.
 */
function EntryGate() {
  const [entered, setEntered] = useState(
    () => sessionStorage.getItem("cortex-entered") === "1",
  );
  if (!entered) {
    return (
      <LandingPage
        onEnter={() => {
          sessionStorage.setItem("cortex-entered", "1");
          setEntered(true);
        }}
      />
    );
  }
  return <HomePage />;
}

export function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<EntryGate />} />
        <Route path="/course/:courseId" element={<CoursePage />} />
        <Route path="/homework/:homeworkId" element={<HomeworkPage />} />
        <Route path="/solve/:problemId" element={<SolvePage />} />
        <Route path="/custom" element={<CustomProblemPage />} />
      </Routes>
      {/* Judge mode: press J anywhere to see the live diagnostic engine output */}
      <JudgeMode />
    </>
  );
}
