import { useState } from "react";
import NavBar from "./components/NavBar.jsx";
import { useSelector } from "react-redux";
import Roller from "./components/Roller.jsx";
import Settings from "./components/Settings.jsx";
import Profile from "./components/Profile.jsx";

function App() {
  const activeLink = useSelector((state) => state.nav.activeLink);

  const [session, setSession] = useState({
    acctId: "",
    token: "",
    selectedGameId: "",
  });

  return (
    <div>
      <NavBar />
      {activeLink === "roller" && <Roller session={session} />}
      {activeLink === "settings" && (
        <Settings session={session} setSession={setSession} />
      )}
      {activeLink === "profile" && (
        <Profile session={session} setSession={setSession} />
      )}
    </div>
  );
}

export default App;
