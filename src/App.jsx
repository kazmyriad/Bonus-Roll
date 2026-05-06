import { useState, useEffect } from "react";
import "./styles.css";
import LoginPage from "./components/LoginPage.jsx";
import CreateAccountPage from "./components/CreateAccountPage.jsx";
import ManageGamesPage from "./components/ManageGamesPage.jsx";
import PlayerPage from "./components/PlayerPage.jsx";

const API_BASE = "http://127.0.0.1:3000";

function App() {
  const [token, setToken] = useState(null);
  const [acctId, setAcctId] = useState(null);
  const [session, setSession] = useState("login");

  // Functions here are for auth tokens, checked when pages load
  // Using local storage here to persist token, is there a more secure way
  // to do this

  //might be best to pass acc ID along with token as a state (object)
  //kind of already wrote it out and am lazy though

// <---- GRABBING AUTH TOKENSs ---->
  useEffect(()=> {
    const storedToken = localStorage.getItem("token");
    if (storedToken){
      setToken(storedToken);
    }
  }, []);
  // sets token once

  useEffect(()=>{
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
      setSession("login");
    }
  }, [token]);
  // updates when token changes

  function initializeSession(data){
    setToken(data.token);
    setAcctId(data.acctId);
    setSession("manage");
  }

  function logOut(){
    setToken(null);
    setAcctId(null);
    setSession("login");
  }

  // Not in the notes but: if session = this, display this page and pass these props
  return(
    <>
      {session === "login" && <LoginPage onLogin={initializeSession} onNavigate={setSession} />}
      {session === "create" && <CreateAccountPage onLogin={initializeSession} onNavigate={setSession} />}
      {session === "manage" && token && acctId && <ManageGamesPage session={{ acctId, token }} onLogout={logOut} />}
      {session === "player" && token && <PlayerPage token={token} />}
    </>
  )
    
}

export default App;
