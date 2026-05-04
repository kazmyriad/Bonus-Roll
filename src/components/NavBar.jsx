// Needed Tabs: Dice Settings, Profile, Dice roller
// We will def need vite for User info within the components
import { useDispatch, useSelector } from "react-redux";
import { setActiveLink } from "../features/nav/navSlice";
import '../styles.css'
// Use Redux to omit the data from navbar to react elements for pages

const links = [
    {id: "roller", label: "Roller"},
    {id: "settings", label: "Settings"},
    {id: "profile", label:"Profile"}
];

function NavBar(){
    const dispatch = useDispatch();

    const activeLink = useSelector((state) => state.nav.activeLink);

     return (
        <nav>        
            <div className="navContainer">
                {links.map((link) => (
                        <button
                            key={link.id}
                            className={activeLink === link.id ? "navControls active" : "navControls"}
                            onClick={() => dispatch(setActiveLink(link.id))}
                        >
                            {link.label}
                            </button>
                ))}
            </div>
        </nav>
    )
    
}


export default NavBar