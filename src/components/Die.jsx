import { useState } from 'react';  // Import useState for state management
import '../styles.css';

function Die(props) {
    const { sides, dieColor } = props; // Destructure props for easier access
    
    // Use states to track roll value
    const [roll, setRoll] = useState(sides);

    // Function to roll the die and update its value, using states to help re-render
    const handleRoll = () => {
        const newRoll = Math.floor(Math.random() * sides) + 1;
        setRoll(newRoll);
        console.log("Die returned " + newRoll);
    };

    // When "rolling with advantage", roll the die twice and keep the higher value
    const handleRollWithAdvantage = () => {
        const firstRoll = Math.floor(Math.random() * sides) + 1;
        const secondRoll = Math.floor(Math.random() * sides) + 1;
        const newRoll = Math.max(firstRoll, secondRoll);
        setRoll(newRoll);
        console.log("Advantaged die returned " + newRoll);
    };

    // When "rolling with disadvantage", roll the die twice and keep the lower value
    const handleRollWithDisadvantage = () => {
        const firstRoll = Math.floor(Math.random() * sides) + 1;
        const secondRoll = Math.floor(Math.random() * sides) + 1;
        const newRoll = Math.min(firstRoll, secondRoll);
        setRoll(newRoll);
        console.log("Disadvantaged die returned " + newRoll);
    };

    // Button that can be clicked to roll the die
    return (
        <div>
            <p>D{sides}</p>
            <p class="square" style={{ backgroundColor: dieColor }}>{roll}</p>
            <button onClick={handleRoll}>Roll</button>
            <button onClick={handleRollWithAdvantage}>Roll with advantage</button>
            <button onClick={handleRollWithDisadvantage}>Roll with disadvantage</button>
        </div>
    );
}

export default Die;