import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import { Nav } from "./components/Nav";
import { Landing } from "./pages/Landing";
import { AppPage } from "./pages/App";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0B0B0F]">
        <Nav />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<AppPage />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
