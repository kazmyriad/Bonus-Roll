import Die from '../components/Die.jsx';
import DieMaker from '../components/DieMaker.jsx';

function Roller() {
  return (
    <div>
      <h1>Dice Roller</h1>

      <DieMaker />

      <Die sides={6} dieColor="#18ea34" />
      <Die sides={20} dieColor="#ea1818" />
      <Die sides={4} dieColor="#18abea" />
      <Die sides={12} dieColor="#ea18c7" />
    </div>
  );
}

export default Roller;