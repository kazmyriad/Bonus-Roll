function DieMaker() {
    return (
        <div>
            <form>
                <label for="sides">Number of sides: </label>
                {/* Needs an onChange handler? I guess? Idk */}
                <input type="number" id="sides" min="1" max="100" defaultValue="6"></input>
                <br></br>
                <label for="color">Color: </label>
                {/* Does this need an onChange handler too? I have no earthly idea. Im so sleepy. */}
                <input type="color" id="color" value="#FF0000"></input>
                <br></br>
                <button type="submit" onClick={() => createDie}>Create Die</button>
            </form>
        </div>
    )
}

// JAIL!!!! //
///////////////////////////////////////////////////////////////////////////////////

// function createDie() {
//     const sides = document.getElementById("sides").value;
//     const color = document.getElementById("color").value;

//     console.log("Creating a " + sides + "-sided die with color " + color);
// }

///////////////////////////////////////////////////////////////////////////////////

export default DieMaker;