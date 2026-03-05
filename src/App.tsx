import { useState } from "react";
import "./App.css";
import { HomePage } from "./page/home";

type Page = "HOME";
function App() {
  const [page, setPage] = useState<Page>("HOME");

  return (
    <>
      <div>
        <button onClick={() => setPage("HOME")}>HOME</button>
        <button onClick={() => setPage("HOME")}>HOME</button>
        <button onClick={() => setPage("HOME")}>HOME</button>
      </div>
      {page && <HomePage />}
    </>
  );
}

export default App;
