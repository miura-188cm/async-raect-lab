import { useState } from "react";
import "./App.css";
import { HomePage } from "./page/home";

type Page = "SUSPENSE";
function App() {
  const [page, setPage] = useState<Page>("SUSPENSE");

  return (
    <>
      <div>
        <button onClick={() => setPage("SUSPENSE")}>SUSPENSE</button>

      </div>
      {page && <HomePage />}
    </>
  );
}

export default App;
