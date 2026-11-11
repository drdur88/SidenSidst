"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import ArticleFeed from "./article-feed";
import CaseApp from "./case-app";
import "./cases.css";

export default function NewsApp({ basePath = "/", apiOrigin = "" }: { basePath?: string; apiOrigin?: string }) {
  const [articles, setArticles] = useState(false);
  useEffect(() => { const params = new URLSearchParams(location.search); if (params.has("artikel") && !params.has("sag")) setArticles(true); }, []);
  function returnToCases() {
    const url = new URL(location.href); url.searchParams.delete("artikel");
    history.replaceState(null, "", url.pathname + url.search + url.hash);
    setArticles(false); window.scrollTo({ top: 0, behavior: "instant" });
  }
  return articles ? <div className="c-legacy"><div className="c-legacy-return"><div className="n-wrap"><button onClick={returnToCases}><ArrowLeft size={16}/> Tilbage til mine sager</button><span>Dit nyhedsfeed og dine gemte artikler</span></div></div><ArticleFeed basePath={basePath} apiOrigin={apiOrigin}/></div> : <CaseApp basePath={basePath} apiOrigin={apiOrigin} onNewsFeed={() => { setArticles(true); window.scrollTo({ top: 0, behavior: "instant" }); }}/>
}
