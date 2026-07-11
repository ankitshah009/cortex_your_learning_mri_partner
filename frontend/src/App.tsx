import { Routes, Route } from "react-router-dom";
import { HomePage } from "./app/HomePage";
import { HomeworkPage } from "./app/HomeworkPage";
import { SolvePage } from "./app/SolvePage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/homework/:homeworkId" element={<HomeworkPage />} />
      <Route path="/solve/:problemId" element={<SolvePage />} />
    </Routes>
  );
}
