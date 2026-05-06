import { useState, useEffect } from "react";
import axios from "axios";
import "./styles.css";
import LoginPage from "./components/LoginPage.jsx";
import CreateAccountPage from "./components/CreateAccountPage.jsx";
import ManageGamesPage from "./components/ManageGamesPage.jsx";
import PlayerPage from "./components/PlayerPage.jsx";

const api = axios.create({
  baseURL: "http://127.0.0.1:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

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
    const params = new URLSearchParams(window.location.search);
    const page = params.get("page");

  if (page === "player") {
    setSession("player");
    return;
  } 
    const storedToken = localStorage.getItem("token");
    const storedAcctId = localStorage.getItem("acctId");
    if (storedToken && storedAcctId) {
      api.get(`/accounts/${storedAcctId}`, {
        headers: { Authorization: storedToken },
      })
      .then((response) => {
        if (response.status === 200) {
          setToken(storedToken);
          setAcctId(storedAcctId);
          setSession("manage");
        } else {
          console.log("Invalid Token");
        }
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("acctId");
        setSession("login");
      });
    }
  }, []);
  // sets token once

  // validating tokens
  useEffect(()=>{
    if (token && acctId) {
      localStorage.setItem("token", token);
      localStorage.setItem("acctId", acctId);
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("acctId");
    }
  }, [token, acctId]);
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
      {session === "player" && <PlayerPage token={token} />}
    </>
  )
    
}

export default App;
