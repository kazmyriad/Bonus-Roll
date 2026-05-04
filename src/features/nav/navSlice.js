import { createSlice } from "@reduxjs/toolkit";

const initialState ={
    isOpen: false, 
    activeLink: "roller",
    // Which page is currently active? What page are we on?
};

const navSlice = createSlice({
    name: "nav",
    initialState,
    reducers: {
        // FUNCTIONS - these are the things allowed to update the navbars state - your REDUCRS
        // toggleMenu: (state) => {
        //     state.isOpen = !state.isOpen;
        // }, 
        // changes state of window/... if closed, open and vice versa
        // closeMenu: (state) => {
        //     state.isOpen = false;
        // }

        setActiveLink: (state, action) =>{
            state.activeLink = action.payload;
            // state.isOpen = false;
        }
    }
});

export const { setActiveLink } = navSlice.actions;
export default navSlice.reducer;

