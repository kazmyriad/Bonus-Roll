// NEEDS to be imported to index.html, and is the main entry point for the app
// Define page contents here
// import {COMPONENT NAME} from ''

import NavBar from './components/NavBar.jsx'
import { useSelector } from "react-redux";
import Roller from "./components/Roller.jsx";
import Settings from "./components/Settings.jsx";
import Profile from "./components/Profile.jsx";



function App(){
    const activeLink = useSelector((state) => state.nav.activeLink);

    return(
        <div>
            <NavBar />
            {activeLink === "roller" && <Roller />}
            {activeLink === "settings" && <Settings />}
            {activeLink === "profile" && <Profile />}
        </div>
    )
    
}

export default App