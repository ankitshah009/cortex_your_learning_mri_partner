import { Routes, Route } from "react-router-dom";
import { HomePage } from "./app/HomePage";
import { HomeworkPage } from "./app/HomeworkPage";
import { SolvePage } from "./app/SolvePage";
import { CustomProblemPage } from "./app/CustomProblemPage";
import { JudgeMode } from "./components/judge/JudgePanel";

export function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/homework/:homeworkId" element={<HomeworkPage />} />
        <Route path="/solve/:problemId" element={<SolvePage />} />
        <Route path="/custom" element={<CustomProblemPage />} />
      </Routes>
      {/* Judge mode: press J anywhere to see the live diagnostic engine output */}
      <JudgeMode />
    </>
  );
}
