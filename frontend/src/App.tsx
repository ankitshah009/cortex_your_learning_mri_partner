import { Routes, Route } from "react-router-dom";
import { HomePage } from "./app/HomePage";
import { CoursePage } from "./app/CoursePage";
import { HomeworkPage } from "./app/HomeworkPage";
import { SolvePage } from "./app/SolvePage";
import { JudgeMode } from "./components/judge/JudgePanel";

export function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/course/:courseId" element={<CoursePage />} />
        <Route path="/homework/:homeworkId" element={<HomeworkPage />} />
        <Route path="/solve/:problemId" element={<SolvePage />} />
      </Routes>
      {/* Judge mode: press J anywhere to see the live diagnostic engine output */}
      <JudgeMode />
    </>
  );
}
