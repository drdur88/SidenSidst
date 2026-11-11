/// <reference types="vite/client" />

import React from "react";
import { createRoot } from "react-dom/client";
import NewsApp from "../app/news-app";
import "../app/news.css";

const apiOrigin = import.meta.env.VITE_API_ORIGIN || "https://siden-sidst-beta.doriansorian.chatgpt.site";
const root = document.getElementById("root");
if (!root) throw new Error("Siden sidst could not find its application root.");

createRoot(root).render(
  <React.StrictMode>
    <NewsApp basePath={import.meta.env.BASE_URL} apiOrigin={apiOrigin} />
  </React.StrictMode>,
);
